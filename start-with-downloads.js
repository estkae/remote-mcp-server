/**
 * Remote MCP Server mit Office Tools und Download-Links
 *
 * Quick Start für lokales Testing
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// SERVER_URL setzen
process.env.SERVER_URL = SERVER_URL;

console.log('🚀 Remote MCP Server mit Download-Links');
console.log('═'.repeat(70));
console.log('');

// File-Server laden
const { setupFileServer, startTokenCleanupJob } = require('./file-server');
const officeTools = require('./production-tools-office-with-downloads');

// File-Server aktivieren
setupFileServer(app);
startTokenCleanupJob(15);

console.log('✅ File-Server aktiviert');
console.log('✅ Office Tools mit Download-Links geladen');
console.log('');

// Skills laden
let skillDefinitions = null;

async function loadSkillDefinitions() {
  try {
    const filePath = path.join(__dirname, 'skills', 'skill-definitions.json');
    const data = await fs.readFile(filePath, 'utf-8');
    skillDefinitions = JSON.parse(data);
    console.log(`✅ ${skillDefinitions.skills.length} Skills geladen`);
    return true;
  } catch (error) {
    console.error('⚠️  Skill-Definitionen nicht gefunden');
    skillDefinitions = { skills: [] };
    return false;
  }
}

// POST /execute - Tool ausführen
app.post('/execute', async (req, res) => {
  const { tool, parameters } = req.body;

  console.log(`🔧 Execute: ${tool}`);

  try {
    let result;

    // Office Tools mit Download-Links
    if (['create_powerpoint', 'create_powerpoint_presentation'].includes(tool)) {
      result = await officeTools.createPowerPoint(parameters);
      console.log(`📥 Download: ${result.download_url}`);
    }
    else if (['create_excel', 'create_excel_spreadsheet'].includes(tool)) {
      result = await officeTools.createExcel(parameters);
      console.log(`📥 Download: ${result.download_url}`);
    }
    else if (['create_word', 'create_word_document'].includes(tool)) {
      result = await officeTools.createWord(parameters);
      console.log(`📥 Download: ${result.download_url}`);
    }
    else if (tool === 'list_all_skills') {
      result = {
        total_skills: skillDefinitions?.skills.length || 0,
        skills: skillDefinitions?.skills || [],
        message: 'Alle verfügbaren Skills'
      };
    }
    else {
      // Fallback
      result = {
        simulated: true,
        tool: tool,
        parameters: parameters,
        message: `Tool "${tool}" würde ausgeführt`,
        note: 'Implementiere dieses Tool für echte Funktionalität'
      };
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error(`❌ Execute-Fehler:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// GET /health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Remote MCP Server with Downloads',
    skills_loaded: skillDefinitions?.skills.length || 0,
    download_system: 'active',
    server_url: SERVER_URL
  });
});

// GET / - Root
app.get('/', (req, res) => {
  res.json({
    service: 'Remote MCP Server',
    version: '2.2.0',
    features: [
      'PowerPoint with Downloads',
      'Excel with Downloads',
      'Word with Downloads',
      'Skill Routing'
    ],
    endpoints: {
      execute: 'POST /execute',
      health: 'GET /health',
      files: 'GET /files',
      download: 'GET /download/:token'
    },
    documentation: 'See DOWNLOAD-LINKS-ALWAYS.md'
  });
});

// Server starten
async function startServer() {
  await loadSkillDefinitions();

  app.listen(PORT, () => {
    console.log('═'.repeat(70));
    console.log(`🌐 Server läuft auf: ${SERVER_URL}`);
    console.log('');
    console.log('📋 Endpoints:');
    console.log(`   POST ${SERVER_URL}/execute`);
    console.log(`   GET  ${SERVER_URL}/health`);
    console.log(`   GET  ${SERVER_URL}/files`);
    console.log(`   GET  ${SERVER_URL}/download/:token`);
    console.log('');
    console.log('🧪 Test PowerPoint:');
    console.log(`   curl -X POST ${SERVER_URL}/execute \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"tool":"create_powerpoint","parameters":{"title":"Test","slides":[{"title":"Slide 1","content":["Point 1"]}]}}'`);
    console.log('');
    console.log('✅ Server bereit für Anfragen!');
    console.log('═'.repeat(70));
  });
}

startServer();
