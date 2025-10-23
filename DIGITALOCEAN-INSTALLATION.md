# DigitalOcean Installation - Remote MCP Server mit Skills v2.1.0

Dieser Guide beschreibt die Installation des Remote MCP Servers mit Skill-Routing und Kerio Connect Integration auf DigitalOcean App Platform.

## Überblick

**Was wird installiert:**
- Remote MCP Server (Node.js/Express)
- Skill-Routing System
- Kerio Connect Email Integration
- Port 8080 (Standard)
- Version 2.1.0

## Voraussetzungen

- DigitalOcean Account
- Git Repository (GitHub, GitLab oder Bitbucket)
- Node.js ≥ 18.0.0 (wird automatisch von DigitalOcean bereitgestellt)

## Installation - Methode 1: One-Click Deploy (Empfohlen)

### Schritt 1: Deploy Button verwenden

1. Klicke auf den Deploy Button in der README oder verwende direkt:
   ```
   https://cloud.digitalocean.com/apps/new?repo=https://github.com/estkae/remote-mcp-server/tree/main
   ```

2. **DigitalOcean wird automatisch:**
   - Das Repository klonen
   - Node.js Umgebung einrichten
   - Dependencies installieren (`npm install`)
   - Den Server starten

### Schritt 2: App-Konfiguration überprüfen

Nach dem Deploy sollte die Konfiguration so aussehen:

- **Environment:** `Node.js`
- **Build Command:** `npm install`
- **Run Command:** `node remote-mcp-server-with-skills.js`
- **HTTP Port:** `8080`
- **Instance Size:** Basic XXS (ausreichend für Start)
- **Region:** Frankfurt (fra) oder deine bevorzugte Region

### Schritt 3: Environment Variables (Optional)

Falls du Kerio Connect nutzen möchtest, füge diese Variablen hinzu:

```bash
PORT=8080
NODE_ENV=production
KERIO_HOST=deine-domain.com
KERIO_USER=dein-username
KERIO_PASSWORD=dein-passwort
```

⚠️ **Wichtig:** Verwende DigitalOcean App Platform Secrets für sensible Daten!

## Installation - Methode 2: Manuelle Konfiguration

### Schritt 1: DigitalOcean App Platform öffnen

1. Gehe zu: https://cloud.digitalocean.com/apps
2. Klicke auf **"Create App"**
3. Wähle **"GitHub"** als Source

### Schritt 2: Repository verbinden

1. Autorisiere DigitalOcean für Zugriff auf dein GitHub
2. Wähle Repository: `estkae/remote-mcp-server`
3. Wähle Branch: `main` (oder deinen gewünschten Branch)
4. Klicke **"Next"**

### Schritt 3: Resources konfigurieren

DigitalOcean erkennt automatisch Node.js. Konfiguriere wie folgt:

**Service Settings:**
```yaml
Name: web
Environment: Node.js
Build Command: npm install
Run Command: node remote-mcp-server-with-skills.js
HTTP Port: 8080
```

**Instance:**
```
Type: Basic
Size: Basic XXS ($5/Monat)
```

### Schritt 4: Environment Variables setzen

Klicke auf **"Edit"** bei Environment Variables:

```
PORT=8080
NODE_ENV=production
```

### Schritt 5: App Name & Region

```
App Name: remote-mcp-server (oder dein eigener Name)
Region: Frankfurt (FRA)
```

### Schritt 6: Deploy starten

1. Klicke **"Next"** → **"Create Resources"**
2. Warte 2-3 Minuten auf das Deployment
3. Der Status wechselt zu **"Live"** ✅

## Nach der Installation

### 1. Server URL erhalten

Nach erfolgreichem Deployment findest du deine URL:

```
https://remote-mcp-server-xxxxx.ondigitalocean.app
```

### 2. Server testen

**Test 1: Health Check**
```bash
curl https://deine-app.ondigitalocean.app/
```

Erwartete Antwort:
```json
{
  "status": "ok",
  "server": "Remote MCP Server with Skills",
  "version": "2.1.0"
}
```

**Test 2: MCP Endpoint**
```bash
curl https://deine-app.ondigitalocean.app/mcp
```

**Test 3: Skills Liste**
```bash
curl https://deine-app.ondigitalocean.app/skills
```

Erwartete Antwort: Liste aller verfügbaren Skills

### 3. In MCP Client konfigurieren

Füge deinen Server in Claude Desktop, Cursor oder Windsurf hinzu:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "remote-skills": {
      "url": "https://deine-app.ondigitalocean.app/mcp",
      "description": "Remote MCP Server mit Skill-Routing"
    }
  }
}
```

**Cursor** (`~/Library/Application Support/Cursor/cursor_desktop_config.json`):
```json
{
  "mcpServers": {
    "remote-skills": {
      "url": "https://deine-app.ondigitalocean.app/mcp",
      "description": "Remote MCP Server mit Skill-Routing"
    }
  }
}
```

## Kerio Connect Integration (Optional)

Falls du Kerio Connect Email-Integration nutzen möchtest:

### 1. Environment Variables hinzufügen

In DigitalOcean App Platform → Settings → Environment Variables:

```bash
KERIO_HOST=mail.deine-domain.com
KERIO_USER=dein-username
KERIO_PASSWORD=dein-passwort
KERIO_PORT=993  # Optional, Standard ist 993
```

### 2. Kerio Connector Dateien prüfen

Stelle sicher, dass `kerio-connector.js` im Repository vorhanden ist.

### 3. Server neu deployen

Nach dem Hinzufügen der Umgebungsvariablen:
1. → Actions → **"Force Rebuild and Deploy"**
2. Prüfe Runtime Logs: "✅ Kerio Connector loaded"

## Logs & Monitoring

### Runtime Logs ansehen

1. DigitalOcean Dashboard → Deine App
2. Tab: **"Runtime Logs"**

Erwartete Ausgabe beim Start:
```
✅ X Skills geladen
⚠️  Kerio Connector not available (falls nicht konfiguriert)
oder
✅ Kerio Connector loaded (falls konfiguriert)

Server läuft auf Port 8080
```

### Deployment History

1. Tab: **"Deployments"**
2. Zeigt alle vergangenen Deployments
3. Möglichkeit zum Rollback

## Troubleshooting

### Problem: "Application failed to respond"

**Ursache:** Server startet nicht auf Port 8080

**Lösung:**
1. Prüfe Runtime Logs auf Fehler
2. Stelle sicher, dass PORT=8080 gesetzt ist
3. Prüfe, ob `node_modules` korrekt installiert wurden

### Problem: "Build failed"

**Ursache:** npm install schlägt fehl

**Lösung:**
1. Prüfe `package.json` auf Syntax-Fehler
2. Prüfe ob `package-lock.json` vorhanden ist
3. Force Rebuild versuchen

### Problem: 404 auf allen Endpoints

**Ursache:** Run Command ist falsch

**Lösung:**
1. Settings → Components → Edit
2. Run Command: `node remote-mcp-server-with-skills.js`
3. Speichern → Deploy

### Problem: Module not found

**Ursache:** Dependencies fehlen

**Lösung:**
1. Prüfe `package.json` Dependencies:
   ```json
   {
     "dependencies": {
       "express": "^4.18.2",
       "cors": "^2.8.5",
       "node-fetch": "^2.7.0",
       "imap": "^0.8.19",
       "mailparser": "^3.6.5",
       "nodemailer": "^6.9.7",
       "ical.js": "^1.5.0"
     }
   }
   ```
2. Commit und push
3. Force Rebuild

## Updates deployen

### Auto-Deploy (Standard)

DigitalOcean deployed automatisch bei jedem Push zum main Branch.

### Manuelles Deploy

1. Code committen und pushen
2. DigitalOcean → Deine App
3. Actions → **"Force Rebuild and Deploy"**

## Kosten

**Basic XXS Instance:**
- Preis: $5/Monat
- RAM: 512 MB
- vCPU: 0.5
- Bandbreite: 1 TB

**Ausreichend für:**
- Mehrere gleichzeitige Anfragen
- Skill-Routing
- Kerio Connect Integration

## Skalierung

Falls mehr Performance benötigt wird:

1. Settings → Components → Edit
2. Instance Size: Basic XS oder höher
3. Speichern → Deploy

## Sicherheit

### HTTPS

✅ Automatisch aktiviert durch DigitalOcean

### Secrets

Verwende **App Platform Secrets** für sensible Daten:

1. Settings → App-Level Environment Variables
2. Checkbox: **"Encrypt"**
3. Speichern

### CORS

CORS ist standardmäßig aktiviert in `remote-mcp-server-with-skills.js`.

Falls du CORS einschränken möchtest, editiere:

```javascript
// In remote-mcp-server-with-skills.js
app.use(cors({
  origin: 'https://deine-erlaubte-domain.com'
}));
```

## Support

Bei Problemen:

1. Prüfe Runtime Logs in DigitalOcean
2. Prüfe GitHub Issues: https://github.com/estkae/remote-mcp-server/issues
3. DigitalOcean Community: https://www.digitalocean.com/community

## Nächste Schritte

Nach erfolgreicher Installation:

1. ✅ Server ist live auf DigitalOcean
2. ✅ MCP Endpoint verfügbar
3. → Konfiguriere MCP Client (Claude Desktop, Cursor, etc.)
4. → Teste Skills
5. → Optional: Kerio Connect Integration aktivieren

---

**Installation abgeschlossen! 🚀**

Dein Remote MCP Server läuft jetzt auf DigitalOcean App Platform.
