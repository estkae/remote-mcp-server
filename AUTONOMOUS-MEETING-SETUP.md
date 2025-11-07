# Autonomes Meeting System - Remote Deployment Setup

## Überblick

Dieses System läuft **komplett remote** auf DigitalOcean - **KEINE lokale Installation nötig**!

```
┌─────────────────────────────────────────────────┐
│  DigitalOcean Cloud                             │
│                                                  │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  Claude-Webapp │◄───┤ Remote-MCP-Server│    │
│  │  (Frontend)    │    │  + Meeting Skill │    │
│  └────────────────┘    └──────────────────┘    │
│                                ▲                 │
│                                │                 │
│                        ┌───────┴────────┐       │
│                        │                 │       │
│                   ┌────▼─────┐   ┌─────▼────┐  │
│                   │  TypeDB  │   │  Azure   │  │
│                   │  Server  │   │  Speech  │  │
│                   └──────────┘   └──────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 1. TypeDB Server Deployment

### Option A: DigitalOcean App Platform (Empfohlen)

```bash
# 1. DigitalOcean CLI installieren (lokal nur für Deployment)
# Windows:
winget install DigitalOcean.Doctl

# Mac/Linux:
brew install doctl

# 2. Authentifizieren
doctl auth init

# 3. TypeDB App erstellen
doctl apps create --spec config/typedb-deployment.yaml

# 4. Status prüfen
doctl apps list

# 5. TypeDB URL notieren
doctl apps get YOUR_APP_ID
# URL wird etwa so aussehen: typedb-server-xxxxx.ondigitalocean.app:1729
```

### Option B: Docker Droplet

```bash
# 1. Droplet erstellen (mit Docker)
doctl compute droplet create typedb-server \
  --image docker-20-04 \
  --size s-1vcpu-1gb \
  --region fra1

# 2. SSH zum Droplet
doctl compute ssh typedb-server

# 3. TypeDB Container starten
docker run -d \
  --name typedb \
  -p 1729:1729 \
  -v typedb-data:/opt/typedb/server/data \
  --restart unless-stopped \
  vaticle/typedb:3.0.0

# 4. Firewall öffnen
ufw allow 1729/tcp

# 5. Test
curl http://YOUR_DROPLET_IP:1729
```

### Kosten

| Option | Größe | RAM | Storage | Preis/Monat |
|--------|-------|-----|---------|-------------|
| App Platform | professional-xs | 1 GB | 12 GB | ~$13 |
| Droplet | s-1vcpu-1gb | 1 GB | 25 GB | ~$6 |
| Droplet | s-2vcpu-2gb | 2 GB | 50 GB | ~$12 |

**Empfehlung:** Droplet s-1vcpu-1gb (günstiger, mehr Storage)

---

## 2. Remote-MCP-Server Erweitern

### Dependencies installieren

```bash
cd remote-mcp-server

# TypeDB Client und andere Dependencies
npm install typedb-client uuid handlebars microsoft-cognitiveservices-speech-sdk
```

### Environment Variables (.env)

```bash
# .env Datei erweitern

# TypeDB Connection
TYPEDB_HOST=YOUR_TYPEDB_DROPLET_IP:1729
# oder bei App Platform:
# TYPEDB_HOST=typedb-server-xxxxx.ondigitalocean.app:1729

# Anthropic (für Intent-Engine)
ANTHROPIC_API_KEY=sk-ant-...

# Azure Speech Services (optional, für Transkription)
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=westeurope

# OneDrive (bereits vorhanden)
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_TENANT_ID=...
```

### Skill-Definitions aktualisieren

Datei: `skill-definitions.json`

```json
{
  "skills": [
    ... existing skills ...,
    {
      "id": "meeting_management",
      "name": "Meeting Management",
      "description": "Autonomes Meeting-System mit Intent-Erkennung, Formular-Generierung und TypeDB-Integration",
      "keywords": [
        "meeting", "sitzung", "gemeinderat", "protokoll",
        "tagesordnung", "agenda", "teilnehmer", "besprechung"
      ],
      "tools": [
        {
          "name": "analyze_meeting_intent",
          "description": "Analysiert User-Prompt und erkennt Meeting-Intention automatisch",
          "input_schema": {
            "type": "object",
            "properties": {
              "user_prompt": { "type": "string" },
              "conversation_history": { "type": "array" }
            },
            "required": ["user_prompt"]
          }
        },
        {
          "name": "generate_meeting_form",
          "description": "Generiert dynamisches Formular für Meeting-Erstellung",
          "input_schema": {
            "type": "object",
            "properties": {
              "intent": { "type": "string" },
              "entities": { "type": "object" }
            },
            "required": ["intent"]
          }
        },
        {
          "name": "create_meeting",
          "description": "Erstellt Meeting in TypeDB",
          "input_schema": {
            "type": "object",
            "properties": {
              "date": { "type": "string" },
              "time": { "type": "string" },
              "location": { "type": "string" },
              "meeting_type": { "type": "string" },
              "participants": { "type": "array" },
              "topics": { "type": "array" }
            },
            "required": ["date", "time", "location", "meeting_type", "topics"]
          }
        },
        {
          "name": "get_meeting_details",
          "description": "Ruft Meeting-Details ab",
          "input_schema": {
            "type": "object",
            "properties": {
              "meeting_id": { "type": "string" }
            },
            "required": ["meeting_id"]
          }
        },
        {
          "name": "search_meetings",
          "description": "Sucht Meetings nach Kriterien",
          "input_schema": {
            "type": "object",
            "properties": {
              "meeting_type": { "type": "string" },
              "status": { "type": "string" },
              "date_from": { "type": "string" },
              "date_to": { "type": "string" }
            }
          }
        },
        {
          "name": "add_person",
          "description": "Fügt Person zur Datenbank hinzu",
          "input_schema": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "email": { "type": "string" },
              "role": { "type": "string" }
            },
            "required": ["name", "email"]
          }
        },
        {
          "name": "get_all_persons",
          "description": "Ruft alle Personen ab (für Teilnehmer-Auswahl)",
          "input_schema": {
            "type": "object",
            "properties": {}
          }
        }
      ]
    }
  ]
}
```

### Server-Integration

Füge in `remote-mcp-server-with-skills.js` hinzu (nach Line 53):

```javascript
// Meeting Management Skill Integration
let meetingSkill;
try {
  const MeetingManagementSkill = require('./skills/meeting-management-skill');
  meetingSkill = new MeetingManagementSkill();
  console.log('✅ Meeting Management Skill loaded');
} catch (error) {
  console.log('⚠️  Meeting Management Skill not available:', error.message);
  meetingSkill = null;
}
```

Dann im Tool-Execution Handler (ca. Line 200+):

```javascript
// In der Funktion die Tools ausführt, füge hinzu:

if (meetingSkill && tool_name.startsWith('analyze_meeting_') ||
    tool_name === 'generate_meeting_form' ||
    tool_name === 'create_meeting' ||
    tool_name === 'get_meeting_details' ||
    tool_name === 'search_meetings' ||
    tool_name === 'add_person' ||
    tool_name === 'get_all_persons') {

  const result = await meetingSkill.executeTool(tool_name, tool_input);
  return result;
}
```

---

## 3. TypeDB Schema laden

### Automatisch beim Start

Der TypeDB-Connector lädt das Schema automatisch bei Initialisierung wenn die Datenbank leer ist.

### Manuell (falls nötig)

```bash
# 1. TypeDB Console öffnen
# Lokal für Deployment:
typedb console --server=YOUR_TYPEDB_HOST:1729

# 2. Datenbank erstellen
> database create meeting_knowledge

# 3. Schema laden
> transaction meeting_knowledge schema write
> source typedb/schemas/meeting-schema.tql
> commit

# 4. Prüfen
> database list
```

---

## 4. Deployment auf DigitalOcean

### Remote-MCP-Server aktualisieren

```bash
# 1. Code commiten
git add .
git commit -m "feat: Add Meeting Management Skill with TypeDB integration"
git push origin main

# 2. DigitalOcean deployt automatisch (wenn GitHub connected)
# Oder manuell:
doctl apps create-deployment YOUR_MCP_APP_ID
```

### Umgebungsvariablen setzen

```bash
# DigitalOcean App Platform Dashboard
# → Your App → Settings → Environment Variables

# Neu hinzufügen:
TYPEDB_HOST=YOUR_TYPEDB_IP:1729
ANTHROPIC_API_KEY=sk-ant-...
AZURE_SPEECH_KEY=... (optional)
AZURE_SPEECH_REGION=westeurope (optional)
```

---

## 5. Testing

### Health Check

```bash
# TypeDB testen
curl http://YOUR_TYPEDB_HOST:1729

# MCP Server testen
curl https://remote-mcp-server-xxxxx.ondigitalocean.app/health

# Meeting Skill testen
curl -X POST https://remote-mcp-server-xxxxx.ondigitalocean.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_all_persons",
      "arguments": {}
    }
  }'
```

### Intent-Engine testen

```bash
curl -X POST https://remote-mcp-server-xxxxx.ondigitalocean.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "analyze_meeting_intent",
      "arguments": {
        "user_prompt": "Ich muss eine Gemeinderatssitzung für nächsten Dienstag organisieren mit den Themen Haushalt und Schulhaus"
      }
    }
  }'
```

Erwartete Antwort:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "analysis": {
      "intent": "meeting_schedule",
      "confidence": 0.95,
      "entities": {
        "date": "2025-11-11",
        "meeting_type": "gemeinderat",
        "topics": ["Haushalt", "Schulhaus"]
      },
      "action": "show_meeting_form",
      "reasoning": "User möchte eine Gemeinderatssitzung organisieren"
    }
  }
}
```

---

## 6. Claude-Webapp Integration

### Frontend: Dynamic Forms Renderer

Datei: `Claude-webapp/public/dynamic-forms.js` (neu erstellen)

```javascript
/**
 * Rendert dynamische Formulare die vom MCP Server generiert wurden
 */
class DynamicFormRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  async render(formSchema) {
    // Schema vom MCP Server erhalten
    const formHTML = this.generateFormHTML(formSchema);
    this.container.innerHTML = formHTML;
    this.attachEventListeners(formSchema);
  }

  generateFormHTML(schema) {
    return `
      <div class="dynamic-form" id="${schema.formId}">
        <h2>${schema.title}</h2>
        <p>${schema.description}</p>
        <form>
          ${schema.fields.map(field => this.renderField(field)).join('')}
          <div class="form-actions">
            ${schema.actions.map(action => `
              <button type="${action.type}" class="btn btn-${action.type}">
                ${action.label}
              </button>
            `).join('')}
          </div>
        </form>
      </div>
    `;
  }

  renderField(field) {
    switch (field.type) {
      case 'text':
        return `
          <div class="form-field">
            <label>${field.label}</label>
            <input type="text" name="${field.name}"
                   value="${field.defaultValue || ''}"
                   ${field.required ? 'required' : ''}>
          </div>
        `;
      // ... weitere Field-Types
    }
  }
}
```

### Backend: Intent-Route hinzufügen

Datei: `Claude-webapp/server.js`

Füge neue Route hinzu:

```javascript
// Intent-Analyse Route
app.post('/api/analyze-intent', authenticateToken, async (req, res) => {
  try {
    const { user_prompt, conversation_history } = req.body;

    // Call MCP Server
    const mcpResponse = await fetch(`${process.env.MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'analyze_meeting_intent',
          arguments: { user_prompt, conversation_history }
        }
      })
    });

    const result = await mcpResponse.json();

    // Wenn Intent erkannt: Generiere Formular
    if (result.result.analysis.intent === 'meeting_schedule') {
      const formResponse = await fetch(`${process.env.MCP_SERVER_URL}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'generate_meeting_form',
            arguments: {
              intent: result.result.analysis.intent,
              entities: result.result.analysis.entities
            }
          }
        })
      });

      const formResult = await formResponse.json();

      res.json({
        intent: result.result.analysis,
        form: formResult.result.formSchema
      });
    } else {
      res.json({ intent: result.result.analysis });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 7. Workflow: Sitzung erstellen

### User-Journey

```
1. User tippt im Chat:
   "Ich brauche eine Gemeinderatssitzung für Dienstag"

2. Claude-Webapp sendet zu /api/analyze-intent

3. MCP Server:
   - Intent-Engine analysiert → "meeting_schedule"
   - Form Generator erstellt Formular-Schema
   - Gibt beides zurück

4. Claude-Webapp:
   - Zeigt Claude's Antwort + dynamisches Formular an
   - Formular ist pre-filled mit erkannten Daten

5. User füllt restliche Felder aus, klickt "Erstellen"

6. Frontend sendet zu /api/meetings/create

7. MCP Server:
   - create_meeting Tool aufrufen
   - TypeDB speichert Meeting
   - Optional: OneDrive Dokumenten-Suche
   - Gibt Meeting-ID zurück

8. Claude-Webapp zeigt Erfolg + Meeting-Details
```

---

## 8. Kosten-Übersicht

### DigitalOcean

| Service | Größe | Preis/Monat |
|---------|-------|-------------|
| Remote-MCP-Server | Basic (512MB) | $5 |
| TypeDB Droplet | s-1vcpu-1gb | $6 |
| **Total** | | **$11** |

### Externe APIs

| Service | Free Tier | Bezahlt |
|---------|-----------|---------|
| Anthropic Claude | - | Usage-based |
| Azure Speech | 5h/Monat | $1/h |
| OneDrive API | Included | - |

### Gesamt-Schätzung

- **Minimum:** $11/Monat (nur Hosting)
- **Mit APIs:** $30-50/Monat (moderate Nutzung)

---

## 9. Nächste Schritte

### Phase 2: Erweiterte Features

- [ ] Speech-to-Text Integration (Azure Speech)
- [ ] Protocol Generator mit Handlebars Templates
- [ ] OneDrive Document Retrieval erweitern
- [ ] Learning Engine (Feedback-Loop)

### Phase 3: UI/UX

- [ ] Dynamic Forms Styling
- [ ] Meeting-Kalender-View
- [ ] Protocol-Vorschau
- [ ] Audio-Recorder im Frontend

---

## 10. Troubleshooting

### TypeDB Connection Failed

```bash
# Prüfe ob TypeDB läuft
curl http://YOUR_TYPEDB_HOST:1729

# Logs prüfen
doctl apps logs YOUR_TYPEDB_APP_ID --type run

# Firewall prüfen (bei Droplet)
ufw status
```

### Intent-Engine Fehler

```bash
# Prüfe Anthropic API Key
echo $ANTHROPIC_API_KEY

# Teste direkt
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model": "claude-sonnet-4-5-20250929", "max_tokens": 100, "messages": [{"role": "user", "content": "Hi"}]}'
```

### Schema nicht geladen

```bash
# Manuell laden (siehe Schritt 3)
typedb console --server=YOUR_TYPEDB_HOST:1729
> transaction meeting_knowledge schema write
> source typedb/schemas/meeting-schema.tql
> commit
```

---

## Support

Bei Fragen oder Problemen:
- GitHub Issues: https://github.com/AALS-Software-AG/...
- Dokumentation: AUTONOMOUS-MEETING-SYSTEM-ARCHITECTURE.md

---

**Viel Erfolg mit dem autonomen Meeting-System!** 🚀
