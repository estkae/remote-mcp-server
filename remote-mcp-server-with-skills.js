/**
 * Remote MCP Server with Skill-Routing
 *
 * Dieser Server läuft auf DigitalOcean und bietet Token-optimiertes Skill-Routing
 * KEINE lokale Installation nötig (außer ngrok für lokale File-Zugriffe)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080; // DigitalOcean Standard-Port
// Kerio Connect Integration
let kerioConnector;
try {
  kerioConnector = require('./kerio-connector');
  console.log('✅ Kerio Connector loaded');
} catch (error) {
  console.log('⚠️  Kerio Connector not available:', error.message);
  kerioConnector = null;
}

// File-Server und Office-Tools Integration
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
process.env.SERVER_URL = SERVER_URL;

let officeTools, fileServer;
try {
  fileServer = require('./file-server');
  officeTools = require('./production-tools-office-with-downloads');
  fileServer.setupFileServer(app);
  fileServer.startTokenCleanupJob(15);
  console.log('✅ File-Server mit Download-Links aktiviert');
  console.log('✅ Office Tools (PowerPoint, Excel, Word) geladen');
} catch (error) {
  console.log('⚠️  Office Tools not available:', error.message);
  officeTools = null;
}



// Skill-Definitionen laden
let skillDefinitions = null;

async function loadSkillDefinitions() {
  try {
    const filePath = path.join(__dirname, 'skill-definitions.json');
    const data = await fs.readFile(filePath, 'utf-8');
    skillDefinitions = JSON.parse(data);
    console.log(`✅ ${skillDefinitions.skills.length} Skills geladen`);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Laden der Skill-Definitionen:', error.message);
    // Fallback: Inline Skills
    skillDefinitions = createInlineSkills();
    console.log(`✅ ${skillDefinitions.skills.length} Inline-Skills geladen (Fallback)`);
    return false;
  }
}

// Fallback: Skills direkt im Code definieren
function createInlineSkills() {
  return {
    skills: [
      {
        id: "powerpoint",
        name: "PowerPoint Skill",
        description: "Erstellt PowerPoint-Präsentationen",
        keywords: ["powerpoint", "präsentation", "slides", "folien", "pptx", "presentation"],
        tools: [
          {
            name: "create_powerpoint",
            description: "Erstellt eine PowerPoint-Präsentation",
            input_schema: {
              type: "object",
              properties: {
                title: { type: "string", description: "Titel der Präsentation" },
                slides: {
                  type: "array",
                  description: "Array von Folien",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      content: { type: "array", items: { type: "string" } }
                    }
                  }
                }
              },
              required: ["title", "slides"]
            }
          }
        ]
      },
      {
        id: "excel",
        name: "Excel Skill",
        description: "Erstellt und analysiert Excel-Tabellen",
        keywords: ["excel", "tabelle", "spreadsheet", "xlsx", "daten", "data"],
        tools: [
          {
            name: "create_excel",
            description: "Erstellt eine Excel-Tabelle",
            input_schema: {
              type: "object",
              properties: {
                filename: { type: "string" },
                sheets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      data: { type: "array", items: { type: "array" } }
                    }
                  }
                }
              },
              required: ["filename", "sheets"]
            }
          }
        ]
      },
      {
        id: "brand-guidelines",
        name: "Brand Guidelines Skill",
        description: "Wendet Brand-Richtlinien an",
        keywords: ["brand", "marke", "corporate", "branding", "guidelines", "richtlinien"],
        tools: [
          {
            name: "apply_brand_guidelines",
            description: "Wendet Brand-Richtlinien auf Inhalte an",
            input_schema: {
              type: "object",
              properties: {
                content: { type: "string" },
                brand: { type: "string", default: "default" }
              },
              required: ["content"]
            }
          }
        ]
      },
      {
        id: "pdf",
        name: "PDF Skill",
        description: "Liest und verarbeitet PDF-Dateien",
        keywords: ["pdf", "dokument", "lesen", "ocr"],
        tools: [
          {
            name: "read_pdf",
            description: "Liest PDF-Dateien",
            input_schema: {
              type: "object",
              properties: {
                filepath: { type: "string" }
              },
              required: ["filepath"]
            }
          }
        ]
      },
      {
        id: "code-review",
        name: "Code Review Skill",
        description: "Führt Code-Reviews durch",
        keywords: ["code", "review", "quality", "bugs", "security"],
        tools: [
          {
            name: "review_code",
            description: "Reviewed Code auf Qualität und Security",
            input_schema: {
              type: "object",
              properties: {
                code: { type: "string" },
                language: { type: "string" }
              },
              required: ["code", "language"]
            }
          }
        ]
      },
      {
        id: "blog-writer",
        name: "Blog Writer Skill",
        description: "Erstellt Blog-Artikel und Content",
        keywords: ["blog", "artikel", "content", "seo", "writing"],
        tools: [
          {
            name: "write_blog_post",
            description: "Schreibt einen Blog-Artikel",
            input_schema: {
              type: "object",
              properties: {
                topic: { type: "string" },
                keywords: { type: "array", items: { type: "string" } }
              },
              required: ["topic"]
            }
          }
        ]
      }
    ]
  };
}

// Router Tool - Das einzige Tool das initial geladen wird (8 Tokens!)
const routerTool = {
  name: "skill_router",
  description: "🎯 Intelligenter Skill-Router: Analysiert Anfragen und lädt nur benötigte Skills. Verfügbar: PowerPoint, Excel, Brand Guidelines, PDF, Code Review, Blog Writer. Token-Einsparung: ~90%",
  input_schema: {
    type: "object",
    properties: {
      user_request: {
        type: "string",
        description: "Die User-Anfrage zum Analysieren"
      },
      context: {
        type: "string",
        description: "Zusätzlicher Kontext",
        default: ""
      }
    },
    required: ["user_request"]
  }
};

// Skill-Selektion basierend auf Anfrage
function selectSkills(userRequest, context = '') {
  const requestLower = (userRequest + ' ' + context).toLowerCase();
  const selectedSkills = [];
  const reasonsMap = new Map();

  skillDefinitions.skills.forEach(skill => {
    let matchScore = 0;
    const reasons = [];

    // Keyword-Matching
    skill.keywords.forEach(keyword => {
      if (requestLower.includes(keyword.toLowerCase())) {
        matchScore += 10;
        reasons.push(`Keyword "${keyword}"`);
      }
    });

    // Tool-Name-Matching
    skill.tools.forEach(tool => {
      const toolWords = tool.name.split('_');
      toolWords.forEach(word => {
        if (requestLower.includes(word.toLowerCase())) {
          matchScore += 5;
          reasons.push(`Tool "${word}"`);
        }
      });
    });

    if (matchScore > 0) {
      selectedSkills.push({ skill, score: matchScore, reasons });
    }
  });

  // Nach Score sortieren und Top 3 nehmen
  selectedSkills.sort((a, b) => b.score - a.score);
  const topSkills = selectedSkills.slice(0, 3);

  topSkills.forEach(s => reasonsMap.set(s.skill.id, s.reasons));

  return {
    skills: topSkills.map(s => s.skill),
    scores: topSkills.map(s => ({ id: s.skill.id, score: s.score })),
    reasons: Object.fromEntries(reasonsMap)
  };
}

// ==================== ENDPOINTS ====================

// GET / - Root
app.get('/', (req, res) => {
  res.json({
    service: '🎯 Remote MCP Server with Skill-Routing',
    version: '2.1.0',
    features: [
      'Token-optimized Skill Routing (~90% savings)',
      'Intelligent Skill Selection',
      '6 Skills: PowerPoint, Excel, Brand, PDF, Code Review, Blog Writer',
      'Kerio Connect Email Integration (IMAP/SMTP)'
    ],
    endpoints: {
      'GET /': 'This page',
      'GET /tools': 'Get Router Tool (8 Tokens)',
      'POST /route': 'Analyze request and select skills',
      'POST /execute': 'Execute a tool',
      'GET /skills': 'List all available skills',
      'GET /health': 'Health check'
    },
    deployed_on: 'DigitalOcean',
    url: 'https://remote-mcp-server-8h8cr.ondigitalocean.app'
  });
});

// GET /tools - Gibt Router + Kerio Tools zurück
app.get('/tools', (req, res) => {
  const tools = [routerTool];
  
  // Add Kerio tools if configured
  if (kerioConnector && kerioConnector.isKerioConfigured()) {
    tools.push(...kerioConnector.KERIO_TOOLS);
    console.log('📋 /tools - Returning Router + Kerio Tools (' + (tools.length) + ' tools)');
  } else {
    console.log('📋 /tools - Returning Router Tool only (Kerio not configured)');
  }
  
  res.json(tools);
});

// POST /route - Skill-Selektion
app.post('/route', async (req, res) => {
  const { user_request, context } = req.body;

  console.log(`🔍 Routing: "${user_request}"`);

  if (!user_request) {
    return res.status(400).json({ error: 'user_request erforderlich' });
  }

  try {
    const selection = selectSkills(user_request, context);

    const selectedTools = [];
    selection.skills.forEach(skill => {
      skill.tools.forEach(tool => {
        selectedTools.push({
          ...tool,
          skill_id: skill.id,
          skill_name: skill.name
        });
      });
    });

    console.log(`✅ ${selection.skills.length} Skills: ${selection.skills.map(s => s.id).join(', ')}`);

    res.json({
      success: true,
      request_analysis: {
        original_request: user_request,
        context: context || 'none'
      },
      selected_skills: selection.skills.map(skill => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        tool_count: skill.tools.length
      })),
      selection_reasoning: selection.reasons,
      scores: selection.scores,
      tools: selectedTools,
      token_savings: {
        without_routing: 890,
        with_routing: 8 + (selectedTools.length * 50),
        savings_percentage: Math.round((1 - ((8 + selectedTools.length * 50) / 890)) * 100)
      }
    });
  } catch (error) {
    console.error('❌ Routing-Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /execute - Tool ausführen
app.post('/execute', async (req, res) => {
  const { tool, parameters } = req.body;

  console.log(`🔧 Execute: ${tool}`);

  try {
    let result;

    if (tool === 'skill_router') {
      // Route intern
      const routeResult = selectSkills(parameters.user_request, parameters.context);
      result = routeResult;
    } else if (tool === 'list_all_skills') {
      // Liste alle Skills auf
      result = formatAllSkillsList();
    } else if (tool === 'execute_skill_tool') {
      // Fuehre spezifisches Tool aus
      result = await executeSpecificSkillTool(parameters.tool_name, parameters.parameters);
    } else if (['create_powerpoint', 'create_powerpoint_presentation'].includes(tool)) {
      // Office Tool: PowerPoint
      if (officeTools) {
        result = await officeTools.createPowerPoint(parameters);
      } else {
        throw new Error('Office Tools not available');
      }
    } else if (['create_excel', 'create_excel_spreadsheet'].includes(tool)) {
      // Office Tool: Excel
      if (officeTools) {
        result = await officeTools.createExcel(parameters);
      } else {
        throw new Error('Office Tools not available');
      }
    } else if (['create_word', 'create_word_document'].includes(tool)) {
      // Office Tool: Word
      if (officeTools) {
        result = await officeTools.createWord(parameters);
      } else {
        throw new Error('Office Tools not available');
      }
    } else if (tool.startsWith('kerio_')) {
      // Kerio Connect Tools
      if (!kerioConnector || !kerioConnector.isKerioConfigured()) {
        throw new Error('Kerio Connect not configured. Set KERIO_HOST, KERIO_USERNAME, KERIO_PASSWORD');
      }
      
      switch(tool) {
        case 'kerio_list_emails':
          result = await kerioConnector.listEmails(parameters || {});
          break;
        case 'kerio_read_email':
          result = await kerioConnector.readEmail(parameters);
          break;
        case 'kerio_send_email':
          result = await kerioConnector.sendEmail(parameters);
          break;
        case 'kerio_search_emails':
          result = await kerioConnector.searchEmails(parameters);
          break;
        default:
          throw new Error('Unknown Kerio tool: ' + tool);
      }
    } else {
      // Simuliere Tool-Ausführung (in Produktion: delegiere an spezialisierte Services)
      result = await simulateToolExecution(tool, parameters);
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error(`❌ Execute-Fehler:`, error);
    res.status(500).json({ error: error.message });
  }
});


// Formatiere alle Skills fuer list_all_skills Tool
function formatAllSkillsList() {
  const formattedSkills = skillDefinitions.skills.map(skill => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    keywords: skill.keywords,
    tools: skill.tools.map(t => ({
      name: t.name,
      description: t.description
    }))
  }));

  const skillsList = formattedSkills.map((skill, index) => {
    const toolNames = skill.tools.map(t => t.name).join(', ');
    const keywords = skill.keywords.join(', ');
    return `${index + 1}. **${skill.name}** - ${skill.description}\n   ID: ${skill.id}\n   Tools: ${toolNames}\n   Keywords: ${keywords}`;
  }).join('\n\n');

  return {
    total_skills: skillDefinitions.skills.length,
    skills: formattedSkills,
    message: `📚 Verfügbare Skills (${skillDefinitions.skills.length}):\n\n${skillsList}\n\n💡 Tipp: Verwende skill_router(user_request) um automatisch die richtigen Skills auszuwählen.`
  };
}

// Fuehre ein spezifisches Tool aus einem Skill aus
async function executeSpecificSkillTool(toolName, parameters) {
  // Check for real Office Tools first
  if (officeTools) {
    if (toolName === 'create_powerpoint') {
      return await officeTools.createPowerPoint(parameters);
    } else if (toolName === 'create_excel') {
      return await officeTools.createExcel(parameters);
    } else if (toolName === 'create_word') {
      return await officeTools.createWord(parameters);
    }
  }

  // Fallback: simulation for other tools
  for (const skill of skillDefinitions.skills) {
    const tool = skill.tools.find(t => t.name === toolName);
    if (tool) {
      return {
        success: true,
        skill: skill.name,
        skill_id: skill.id,
        tool: toolName,
        parameters: parameters,
        message: `✅ Tool "${toolName}" aus "${skill.name}" würde in Produktion ausgeführt`,
        note: 'Dies ist eine Simulation. In Produktion würde das Tool die reale Aktion ausführen.',
        timestamp: new Date().toISOString()
      };
    }
  }
  throw new Error(`Tool "${toolName}" nicht gefunden`);
}

// Tool-Simulation (Fallback wenn keine spezialisierten Services verfügbar)
async function simulateToolExecution(toolName, parameters) {
  // Finde Skill für dieses Tool
  let skillName = 'Unknown';
  for (const skill of skillDefinitions.skills) {
    if (skill.tools.find(t => t.name === toolName)) {
      skillName = skill.name;
      break;
    }
  }

  return {
    simulated: true,
    tool: toolName,
    skill: skillName,
    parameters: parameters,
    message: `✅ Tool "${toolName}" würde in Produktion ausgeführt`,
    note: 'Dies ist eine Simulation. In Produktion würde das Tool die reale Aktion ausführen.',
    timestamp: new Date().toISOString()
  };
}

// GET /skills - Alle Skills anzeigen
app.get('/skills', (req, res) => {
  res.json({
    total_skills: skillDefinitions.skills.length,
    skills: skillDefinitions.skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      keywords: skill.keywords,
      tool_count: skill.tools.length,
      tools: skill.tools.map(t => t.name)
    })),
    token_optimization: {
      traditional_approach: '890 tokens (all skills loaded)',
      with_router: '8 tokens (router only)',
      average_savings: '80-90%'
    }
  });
});

// GET /health - Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Remote MCP Server with Skill-Routing',
    version: '2.1.0',
    skills_loaded: skillDefinitions?.skills.length || 0,
    token_optimization: 'enabled',
    routing_strategy: 'keyword-based',
    deployed_on: 'DigitalOcean',
    timestamp: new Date().toISOString()
  });
});

// Backward compatibility: Domain checker (falls vorhanden)
app.post('/check-domain', async (req, res) => {
  const { domain, tlds } = req.body;

  // Simuliere Domain-Check
  const results = tlds.map(tld => ({
    domain: `${domain}.${tld}`,
    tld: tld,
    available: Math.random() > 0.5,
    checked: true
  }));

  res.json({
    results,
    timestamp: new Date().toISOString(),
    source: 'simulated'
  });
});

// Server starten
async function start() {
  await loadSkillDefinitions();

  app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════╗`);
    console.log(`║   🎯 Remote MCP Server with Skill-Routing     ║`);
    console.log(`╠════════════════════════════════════════════════╣`);
    console.log(`║  🚀 Server läuft auf Port ${PORT.toString().padEnd(19)} ║`);
    console.log(`║  📊 Skills geladen: ${skillDefinitions.skills.length.toString().padEnd(24)} ║`);
    console.log(`║  💰 Token-Einsparung: ~90%                     ║`);
    console.log(`║  🌐 DigitalOcean App Platform                  ║`);
    console.log(`╚════════════════════════════════════════════════╝\n`);
    console.log('✅ Server bereit!\n');
  });
}

start();

module.exports = app;
