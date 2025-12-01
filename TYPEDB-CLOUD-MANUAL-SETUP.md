# TypeDB Cloud - Manuelle Setup-Anleitung

## ✅ Erfolgreich Getestet
- Authentifizierung funktioniert
- REST API `/v1/signin` → Token erhalten
- REST API `/v1/databases` → Datenbanken auflisten funktioniert
- Existierende Datenbank: `cti`

## 🔐 Zugangsdaten

```
Cluster URL: juj5l9-0.cluster.typedb.com:80
Username: admin
Password: KFbnADleasOLRvkR
```

## 🚀 Setup-Optionen

### Option 1: TypeDB Cloud Console (Web UI) - EMPFOHLEN

1. **Öffne TypeDB Cloud Console:**
   ```
   https://cloud.typedb.com/
   ```

2. **Login mit Zugangsdaten:**
   - Username: `admin`
   - Password: `KFbnADleasOLRvkR`

3. **Erstelle Datenbank:**
   - Klicke auf "+ New Database"
   - Name: `meeting_system`
   - Klicke "Create"

4. **Upload Schema:**
   - Wähle Datenbank `meeting_system`
   - Öffne "Schema" Tab
   - Klicke "Upload Schema"
   - Wähle Datei: `typedb/schemas/meeting-schema.tql`
   - Klicke "Apply"

5. **Verifiziere:**
   - Gehe zu "Query" Tab
   - Führe aus: `match $x sub entity; get;`
   - Sollte entities wie `meeting`, `person`, `agenda-item` zeigen

---

### Option 2: TypeDB Studio (Desktop App)

1. **Download TypeDB Studio:**
   ```
   https://typedb.com/download#typedb-studio
   ```

2. **Installiere und Starte**

3. **Verbinde mit Cloud:**
   - Klicke "+ Connect"
   - Type: "Cloud"
   - Address: `juj5l9-0.cluster.typedb.com:80`
   - Username: `admin`
   - Password: `KFbnADleasOLRvkR`
   - Enable TLS: **No** (Port 80)

4. **Erstelle Datenbank:**
   - Right-click auf Connection
   - "New Database"
   - Name: `meeting_system`

5. **Upload Schema:**
   - Öffne `typedb/schemas/meeting-schema.tql` in Studio
   - Select Session Type: **Schema**
   - Select Database: `meeting_system`
   - Klicke "Run"

---

### Option 3: Python Script (Wenn typedb-driver kompatibel)

#### Installiere Python TypeDB Driver:
```bash
pip install typedb-driver
```

#### Führe Upload-Script aus:
```bash
python upload-schema.py
```

Das Script `upload-schema.py` wurde automatisch erstellt und enthält:
- Verbindung zu TypeDB Cloud
- Schema-Upload
- Verifikation

---

### Option 4: TypeDB Console CLI

1. **Download TypeDB Console:**
   ```
   https://typedb.com/download#typedb-console
   ```

2. **Starte Console:**
   ```bash
   typedb console --cloud=juj5l9-0.cluster.typedb.com:80 \\
     --username=admin \\
     --password=KFbnADleasOLRvkR
   ```

3. **Erstelle Datenbank:**
   ```
   database create meeting_system
   ```

4. **Lade Schema:**
   ```
   transaction meeting_system schema write
   source typedb/schemas/meeting-schema.tql
   commit
   exit
   ```

---

## 🔍 Verifikation

Nach dem Setup, teste die Verbindung:

### Via REST API (curl):
```bash
# 1. Login
curl https://juj5l9-0.cluster.typedb.com:80/v1/signin \\
  --request POST \\
  --header "Content-Type: application/json" \\
  --data '{"username": "admin", "password": "KFbnADleasOLRvkR"}'

# Output: {"token": "eyJ0eXAi..."}

# 2. Liste Datenbanken
curl https://juj5l9-0.cluster.typedb.com:80/v1/databases \\
  --header "Authorization: Bearer <TOKEN>"

# Sollte "meeting_system" enthalten
```

### Via Node.js (nach Driver-Fix):
```javascript
const { TypeDB, TypeDBCredential } = require('typedb-driver');

const credential = new TypeDBCredential('admin', 'KFbnADleasOLRvkR');
const driver = await TypeDB.cloudDriver('juj5l9-0.cluster.typedb.com:80', credential);

const databases = await driver.databases.all();
console.log('Databases:', databases.map(db => db.name));

await driver.close();
```

---

## 🔧 Nach erfolgreichem Setup

### Environment Variables für DigitalOcean setzen:

```bash
TYPEDB_IS_CLOUD=true
TYPEDB_CLOUD_ADDRESS=juj5l9-0.cluster.typedb.com:80
TYPEDB_USERNAME=admin
TYPEDB_PASSWORD=KFbnADleasOLRvkR
TYPEDB_DATABASE=meeting_system
```

### In DigitalOcean App Platform:

1. Gehe zu App Settings
2. Environment Variables
3. Füge alle 5 Variables hinzu
4. Deploy neu

---

## 📚 Schema-Inhalt

Das `meeting-schema.tql` definiert:

### Entities (9):
- `meeting` - Sitzungen
- `person` - Teilnehmer
- `agenda-item` - Tagesordnungspunkte
- `document` - OneDrive Dokumente
- `protocol` - Protokolle
- `protocol-template` - Protokoll-Vorlagen
- `audio-recording` - Aufnahmen
- `transcription` - Transkriptionen
- `intent-analysis` - Intent-Analysen (für Lernen)

### Relations (8):
- `meeting-participation` - Wer nimmt teil
- `meeting-agenda` - Tagesordnung
- `agenda-document-link` - Dokumente zu TOP
- `document-link` - Dokumente zur Sitzung
- `meeting-protocol` - Protokoll der Sitzung
- `recording-link` - Aufnahmen & Transkriptionen
- `document-version` - Versionierung
- `discussion` - Diskussionen (aus Transkription)

### Inference Rules (4):
1. **meeting-ready-when-all-confirmed** - Sitzung "ready" wenn alle bestätigt
2. **high-priority-requires-documents** - Priorität >8 erfordert Dokumente
3. **protocol-needs-approval** - Protokoll muss genehmigt werden
4. **meeting-completed-when-protocol-approved** - Meeting "completed" bei genehmigtem Protokoll

---

## ✅ Status

- ✅ Authentifizierung funktioniert
- ✅ REST API teilweise verfügbar
- ⚠️  Node.js Driver Version veraltet (v2.29.2 vs. Server v3.x)
- 📝 Manuelles Schema-Upload erforderlich

**Empfehlung:** Option 1 (Web Console) oder Option 2 (TypeDB Studio) verwenden!

---

## 🐛 Bekannte Probleme

1. **Node.js Driver Kompatibilität:**
   - Installierter Driver: v2.29.2 (Protokoll v3)
   - Server erfordert: Protokoll v7
   - Lösung: Warten auf neueren Driver oder Python verwenden

2. **REST API Limitierungen:**
   - `/v1/signin` ✅ funktioniert
   - `/v1/databases` (GET) ✅ funktioniert
   - `/v1/databases/{name}` (PUT) ❌ 405 Method Not Allowed
   - `/v1/databases/{name}/query` (POST) ❓ Ungetestet

3. **TLS/SSL auf Windows:**
   - Zertifikat-Verifikation schlägt fehl
   - Workaround: `curl -k` (unsicher, nur für Testing)

---

**Nächster Schritt:** Verwenden Sie Option 1 (Web Console) um die Datenbank und das Schema einzurichten! 🚀
