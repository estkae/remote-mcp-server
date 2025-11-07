# TypeDB Cloud Setup - Free Tier

TypeDB Cloud bietet einen **kostenlosen Free Tier** - perfekt für unser autonomes Meeting-System!

## Vorteile TypeDB Cloud:
- ✅ Kostenlos (Free Tier)
- ✅ Keine Server-Verwaltung
- ✅ Automatische Backups
- ✅ TLS/SSL verschlüsselt
- ✅ Cloud API Access

---

## 1. TypeDB Cloud Account erstellen

### Schritt 1: Account registrieren

```
1. Öffne: https://cloud.typedb.com
2. Klicke "Sign Up" oder "Get Started"
3. Registriere mit Email
4. Bestätige Email
5. Login
```

### Schritt 2: Deployment erstellen

```
Dashboard → "Create Deployment"

Name: meeting-knowledge-db
Region: Europe (Frankfurt oder Amsterdam - näher zu DigitalOcean FRA)
Tier: Free (1 Database, 10 GB Storage)

→ Create
```

### Schritt 3: Database erstellen

```
Deployment Details → Databases → "Create Database"

Database Name: meeting_knowledge
Schema Type: Strong (empfohlen)

→ Create
```

### Schritt 4: Connection Credentials

```
Deployment Details → Connection

Du erhältst:
- Cloud Address: cloud.typedb.com:1729
- Deployment ID: xxxx-xxxx-xxxx
- Username: dein-username
- Password: [generiert oder selbst setzen]

WICHTIG: Notiere diese Credentials!
```

---

## 2. TypeDB Cloud Connection testen

### Mit TypeDB Console (lokal für Setup)

```bash
# TypeDB Console installieren (nur für Setup/Testing)
# Mac:
brew install typedb-console

# Windows:
# Download von https://typedb.com/download
# Extrahieren und PATH hinzufügen

# Verbinden
typedb console --cloud=cloud.typedb.com:1729 \
  --username=YOUR_USERNAME \
  --password=YOUR_PASSWORD

# Im Console:
> database list
# Sollte "meeting_knowledge" zeigen

> exit
```

### Mit Node.js Test-Script

Erstelle: `remote-mcp-server/test-typedb-cloud.js`

```javascript
const { TypeDB } = require('typedb-client');

async function testTypeDBCloud() {
  try {
    console.log('🔌 Connecting to TypeDB Cloud...');

    // TypeDB Cloud Client
    const client = TypeDB.cloudClient(
      'cloud.typedb.com:1729',
      new TypeDB.TypeDBCredential(
        process.env.TYPEDB_USERNAME,
        process.env.TYPEDB_PASSWORD
      )
    );

    console.log('✅ Connected!');

    // Liste Databases
    const databases = await client.databases.all();
    console.log('📚 Databases:', databases.map(db => db.name));

    // Prüfe ob meeting_knowledge existiert
    const dbExists = databases.some(db => db.name === 'meeting_knowledge');
    console.log(`📊 meeting_knowledge exists: ${dbExists}`);

    await client.close();
    console.log('✅ Test erfolgreich!');

    return true;
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    return false;
  }
}

testTypeDBCloud();
```

Test ausführen:

```bash
cd remote-mcp-server

# Environment setzen
export TYPEDB_USERNAME=your-username
export TYPEDB_PASSWORD=your-password

# Test
node test-typedb-cloud.js
```

---

## 3. TypeDB Connector für Cloud anpassen

Datei: `remote-mcp-server/typedb/typedb-connector.js`

Update die `constructor` und `initialize` Methoden:

```javascript
class TypeDBConnector {
  constructor(cloudAddress = 'cloud.typedb.com:1729', username = null, password = null) {
    this.cloudAddress = cloudAddress;
    this.username = username || process.env.TYPEDB_USERNAME;
    this.password = password || process.env.TYPEDB_PASSWORD;
    this.isCloud = true;
    this.client = null;
    this.database = 'meeting_knowledge';
  }

  async initialize() {
    try {
      if (this.isCloud) {
        // TypeDB Cloud Client
        console.log(`🔌 Connecting to TypeDB Cloud: ${this.cloudAddress}`);

        const credentials = new TypeDB.TypeDBCredential(
          this.username,
          this.password
        );

        this.client = TypeDB.cloudClient(this.cloudAddress, credentials);
      } else {
        // Core Client (für lokale Tests)
        this.client = TypeDB.coreClient(this.cloudAddress);
      }

      console.log(`✅ TypeDB Client connected`);

      // Prüfe ob Datenbank existiert
      const databases = await this.client.databases.all();
      const exists = databases.some(db => db.name === this.database);

      if (!exists) {
        console.log(`📦 Creating database '${this.database}'...`);
        await this.client.databases.create(this.database);
        await this.loadSchema();
      } else {
        console.log(`✅ Database '${this.database}' exists`);
      }

      return true;
    } catch (error) {
      console.error('❌ TypeDB initialization failed:', error.message);
      throw error;
    }
  }

  // Rest bleibt gleich...
}
```

---

## 4. Environment Variables aktualisieren

### Lokale .env (für Entwicklung)

Datei: `remote-mcp-server/.env`

```bash
# TypeDB Cloud
TYPEDB_CLOUD_ADDRESS=cloud.typedb.com:1729
TYPEDB_USERNAME=your-username
TYPEDB_PASSWORD=your-password
TYPEDB_IS_CLOUD=true

# Oder für lokale TypeDB (Testing):
# TYPEDB_HOST=localhost:1729
# TYPEDB_IS_CLOUD=false
```

### DigitalOcean App Platform

```
Dashboard → Your App → Settings → Environment Variables

Neu hinzufügen:
┌──────────────────────┬───────────────────────────┐
│ Key                  │ Value                     │
├──────────────────────┼───────────────────────────┤
│ TYPEDB_CLOUD_ADDRESS │ cloud.typedb.com:1729     │
│ TYPEDB_USERNAME      │ your-username             │
│ TYPEDB_PASSWORD      │ your-password             │
│ TYPEDB_IS_CLOUD      │ true                      │
└──────────────────────┴───────────────────────────┘

→ Save
→ Redeploy App
```

---

## 5. Schema in TypeDB Cloud laden

### Option A: Via TypeDB Console

```bash
# Connect
typedb console --cloud=cloud.typedb.com:1729 \
  --username=YOUR_USERNAME \
  --password=YOUR_PASSWORD

# Schema laden
> database create meeting_knowledge
> transaction meeting_knowledge schema write
> source typedb/schemas/meeting-schema.tql
> commit
> exit
```

### Option B: Via Node.js Script (automatisch beim Start)

Der TypeDBConnector lädt das Schema automatisch beim ersten Start wenn die DB leer ist.

### Option C: Via Upload-Script

Erstelle: `remote-mcp-server/upload-schema.js`

```javascript
const { TypeDB } = require('typedb-client');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function uploadSchema() {
  try {
    console.log('📤 Uploading schema to TypeDB Cloud...');

    const credentials = new TypeDB.TypeDBCredential(
      process.env.TYPEDB_USERNAME,
      process.env.TYPEDB_PASSWORD
    );

    const client = TypeDB.cloudClient(
      process.env.TYPEDB_CLOUD_ADDRESS,
      credentials
    );

    const session = await client.session('meeting_knowledge', 'schema');
    const transaction = await session.transaction('write');

    const schemaPath = path.join(__dirname, 'typedb', 'schemas', 'meeting-schema.tql');
    const schema = await fs.readFile(schemaPath, 'utf-8');

    console.log('📋 Loading schema...');
    await transaction.query.define(schema);
    await transaction.commit();

    await transaction.close();
    await session.close();
    await client.close();

    console.log('✅ Schema successfully uploaded!');
  } catch (error) {
    console.error('❌ Schema upload failed:', error);
    process.exit(1);
  }
}

uploadSchema();
```

Ausführen:

```bash
cd remote-mcp-server
node upload-schema.js
```

---

## 6. Meeting Management Skill anpassen

Datei: `remote-mcp-server/skills/meeting-management-skill.js`

Update die Initialisierung:

```javascript
async initialize() {
  try {
    // Intent Engine
    this.intentEngine = new IntentEngine(process.env.ANTHROPIC_API_KEY);

    // TypeDB Connector für Cloud
    const isCloud = process.env.TYPEDB_IS_CLOUD === 'true';

    if (isCloud) {
      this.typedb = new TypeDBConnector(
        process.env.TYPEDB_CLOUD_ADDRESS,
        process.env.TYPEDB_USERNAME,
        process.env.TYPEDB_PASSWORD
      );
    } else {
      // Fallback für lokale TypeDB
      this.typedb = new TypeDBConnector(
        process.env.TYPEDB_HOST || 'localhost:1729'
      );
    }

    await this.typedb.initialize();

    // Form Generator
    this.formGenerator = new DynamicFormGenerator(this.typedb);

    console.log('✅ Meeting Management Skill initialized (TypeDB Cloud)');
    return true;
  } catch (error) {
    console.error('❌ Meeting Management Skill initialization failed:', error);
    return false;
  }
}
```

---

## 7. Dependencies installieren

```bash
cd remote-mcp-server

# TypeDB Client und andere Dependencies
npm install typedb-client@latest uuid handlebars

# Prüfen
npm list typedb-client
```

**WICHTIG:** typedb-client Version muss >= 2.18.0 sein für Cloud Support!

---

## 8. Deployment auf DigitalOcean

```bash
# 1. Commit alle Änderungen
git add .
git commit -m "feat: TypeDB Cloud integration with free tier"
git push origin main

# 2. DigitalOcean deployt automatisch
# Oder manuell triggern:
doctl apps create-deployment YOUR_APP_ID

# 3. Logs prüfen
doctl apps logs YOUR_APP_ID --follow
```

---

## 9. Testing

### Test 1: Health Check

```bash
curl https://remote-mcp-server-xxxxx.ondigitalocean.app/health
```

### Test 2: Person hinzufügen

```bash
curl -X POST https://remote-mcp-server-xxxxx.ondigitalocean.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "add_person",
      "arguments": {
        "name": "Max Mustermann",
        "email": "max@example.com",
        "role": "gemeinderat"
      }
    }
  }'
```

### Test 3: Meeting erstellen

```bash
curl -X POST https://remote-mcp-server-xxxxx.ondigitalocean.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "create_meeting",
      "arguments": {
        "date": "2025-11-15",
        "time": "14:00",
        "location": "Rathaus",
        "meeting_type": "gemeinderat",
        "topics": [
          {
            "topic": "Haushalt 2026",
            "description": "Diskussion des Haushaltsplans",
            "priority": 8
          }
        ],
        "participants": []
      }
    }
  }'
```

### Test 4: Intent-Analyse

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
        "user_prompt": "Ich brauche eine Gemeinderatssitzung nächste Woche Dienstag um 18 Uhr zum Thema Haushalt"
      }
    }
  }'
```

---

## 10. TypeDB Cloud Dashboard

### Monitoring

```
cloud.typedb.com → Dashboard

- Database Size: aktuelle Größe
- Query Performance: Laufzeit-Statistiken
- Connection Count: Anzahl aktiver Verbindungen
- Storage Usage: Speicher-Nutzung
```

### Backups

TypeDB Cloud macht automatische Backups (tägliche Snapshots im Free Tier).

### Logs

```
Dashboard → Your Deployment → Logs

Zeigt:
- Connection Events
- Query Logs
- Errors
```

---

## 11. Kosten & Limits

### Free Tier:
- ✅ 1 Deployment
- ✅ 1 Database
- ✅ 10 GB Storage
- ✅ Unbegrenzte Queries
- ✅ SSL/TLS verschlüsselt
- ✅ Tägliche Backups

### Upgrade-Optionen (falls nötig):
- **Starter:** $29/Monat (5 Databases, 50 GB)
- **Professional:** $99/Monat (20 Databases, 200 GB)
- **Enterprise:** Custom Pricing

Für unser Meeting-System reicht der **Free Tier** völlig aus!

---

## 12. Troubleshooting

### Connection Failed

```bash
# Prüfe Credentials
echo $TYPEDB_USERNAME
echo $TYPEDB_PASSWORD

# Test Connection
node test-typedb-cloud.js
```

### Schema Errors

```bash
# Schema manuell laden (siehe Schritt 5)
typedb console --cloud=cloud.typedb.com:1729 \
  --username=YOUR_USERNAME \
  --password=YOUR_PASSWORD
```

### Performance Issues

TypeDB Cloud Free Tier hat Limits:
- Überwache im Dashboard
- Bei Überschreitung: Upgrade erwägen

---

## 13. Zusammenfassung

### Was haben wir?

✅ TypeDB Cloud Free Tier (kostenlos!)
✅ Automatische Backups
✅ SSL verschlüsselt
✅ Keine Server-Verwaltung
✅ Remote-MCP-Server Integration
✅ Meeting Management Skill funktionsfähig

### Gesamtkosten:

```
TypeDB Cloud: $0/Monat (Free Tier)
DigitalOcean:
  - Remote-MCP-Server: $5/Monat
  - Claude-Webapp: $5/Monat
────────────────────────────────
TOTAL: $10/Monat 🎉
```

### Nächste Schritte:

1. ✅ TypeDB Cloud Account erstellen
2. ✅ Database erstellen
3. ✅ Schema hochladen
4. ✅ ENV Variables setzen
5. ✅ Deployen
6. ✅ Testen!

---

**Ready to deploy! 🚀**
