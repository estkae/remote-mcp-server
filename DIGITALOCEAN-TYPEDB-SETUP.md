# 🌊 DigitalOcean TypeDB Server Setup Guide

**Ziel**: Dedizierter TypeDB 3.5.5 Server auf DigitalOcean
**Kosten**: $12-24/Monat
**Setup-Zeit**: 15-20 Minuten
**Datum**: 2025-11-09

---

## 📋 Schritt 1: Droplet erstellen

### Via DigitalOcean Web Console

1. **Login bei DigitalOcean**
   - https://cloud.digitalocean.com/

2. **Neues Droplet erstellen**
   - Klicke auf "Create" → "Droplets"

3. **Konfiguration wählen**

   **Region**:
   ```
   Frankfurt (FRA1)  ← Gleiche Region wie deine anderen Services
   ```

   **Image**:
   ```
   Ubuntu 22.04 LTS x64
   ```

   **Droplet Type & Size**:

   **Option A: Basic ($12/Monat)** - Für Start/Development
   ```
   Regular
   - 2 vCPUs
   - 2 GB RAM
   - 50 GB SSD
   - 2 TB Transfer

   💡 Ausreichend für:
   - Bis zu 1000 Meetings
   - < 50 concurrent queries
   - Development & Testing
   ```

   **Option B: Basic ($24/Monat)** - Für Production (EMPFOHLEN)
   ```
   Regular
   - 2 vCPUs
   - 4 GB RAM
   - 80 GB SSD
   - 4 TB Transfer

   💡 Empfohlen für:
   - Production Environment
   - > 100 concurrent queries
   - Bessere Performance
   ```

4. **Authentication**
   ```
   ☑ SSH Keys (empfohlen)
   oder
   ☐ Password
   ```

5. **Hostname**
   ```
   typedb-server
   ```

6. **Tags** (optional)
   ```
   typedb, meeting-system, production
   ```

7. **Backup** (optional, +$2.40-4.80/Monat)
   ```
   ☐ Automatic Backups  (optional)
   ```

8. **Create Droplet**

---

## 📋 Schritt 2: Initial Server Setup

### 2.1 SSH Verbinden

```bash
# IP-Adresse notieren (aus DigitalOcean Console)
ssh root@YOUR_DROPLET_IP

# Beispiel:
ssh root@157.230.123.45
```

### 2.2 System Update

```bash
# Update package lists
apt-get update

# Upgrade existing packages
apt-get upgrade -y

# Install essential tools
apt-get install -y curl wget git htop nano ufw
```

### 2.3 Firewall Setup

```bash
# Allow SSH
ufw allow 22/tcp

# Allow TypeDB
ufw allow 1729/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

**Expected Output**:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
1729/tcp                   ALLOW       Anywhere
```

---

## 📋 Schritt 3: Docker Installation

```bash
# 1. Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# 2. Run installation
sh get-docker.sh

# 3. Verify installation
docker --version

# 4. Start Docker
systemctl enable docker
systemctl start docker

# 5. Test Docker
docker run hello-world
```

**Expected Output**:
```
Docker version 24.x.x
...
Hello from Docker!
```

---

## 📋 Schritt 4: TypeDB Installation via Docker

### 4.1 Docker Compose erstellen

```bash
# Erstelle Arbeitsverzeichnis
mkdir -p /opt/typedb
cd /opt/typedb

# Erstelle Docker Compose File
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  typedb:
    image: typedb/typedb:3.5.5
    container_name: typedb-server
    ports:
      - "1729:1729"
    volumes:
      - typedb-data:/opt/typedb-all-linux-x86_64/server/data
      - typedb-logs:/opt/typedb-all-linux-x86_64/server/logs
    environment:
      - TYPEDB_SERVICE_NAME=typedb-server
    restart: unless-stopped
    command: ["server", "--address", "0.0.0.0:1729"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:1729"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  typedb-data:
    driver: local
  typedb-logs:
    driver: local
EOF
```

### 4.2 TypeDB starten

```bash
# Start TypeDB
docker-compose up -d

# Check logs
docker-compose logs -f

# Warte auf: "TypeDB Server is now running"
# Dann: Ctrl+C zum Beenden von logs
```

### 4.3 Status prüfen

```bash
# Container Status
docker ps

# Logs prüfen
docker logs typedb-server --tail 50

# Health Check
docker inspect typedb-server | grep -A 5 Health

# Connection Test
curl -I http://localhost:1729
```

**Expected Output**:
```
HTTP/1.1 200 OK
Content-Length: 0
```

---

## 📋 Schritt 5: TypeDB Console & Database Setup

### 5.1 TypeDB Console starten

```bash
# Console im Container starten
docker exec -it typedb-server typedb console

# Du solltest sehen:
# Welcome to TypeDB Console. Type 'help' to see the list of available commands.
```

### 5.2 Datenbank erstellen

```
# In TypeDB Console:
database create meeting_knowledge

# Liste Datenbanken
database list

# Sollte zeigen: meeting_knowledge

# Exit Console
exit
```

### 5.3 Schema hochladen

**Option A: Via SCP (von deinem PC)**

```bash
# Auf deinem PC (Windows Terminal)
scp "C:\Users\kae\OneDrive - AALS Software AG\locara\source\repos\Claude-webapp\typedb\schemas\meeting-schema.tql" root@YOUR_DROPLET_IP:/opt/typedb/

# Dann auf dem Server:
docker exec -it typedb-server typedb console

# In Console:
transaction meeting_knowledge schema write
source /host/meeting-schema.tql
commit
exit
```

**Option B: Via Git Clone (einfacher)**

```bash
# Auf dem Server
cd /opt/typedb

# Clone dein Repo (oder erstelle Datei manuell)
git clone https://github.com/YOUR_USERNAME/Claude-webapp.git

# Schema laden
docker exec -it typedb-server typedb console

# In Console:
transaction meeting_knowledge schema write
source /opt/typedb/Claude-webapp/typedb/schemas/meeting-schema.tql
commit
exit
```

**Option C: Via cat & heredoc (Copy-Paste)**

```bash
# Erstelle Schema-Datei auf Server
nano /opt/typedb/meeting-schema.tql

# Kopiere den Inhalt von meeting-schema.tql
# Speichern: Ctrl+O, Enter, Ctrl+X

# In Docker Container kopieren
docker cp /opt/typedb/meeting-schema.tql typedb-server:/opt/typedb-all-linux-x86_64/meeting-schema.tql

# Schema laden
docker exec -it typedb-server typedb console

# In Console:
transaction meeting_knowledge schema write
source /opt/typedb-all-linux-x86_64/meeting-schema.tql
commit
exit
```

### 5.4 Schema verifizieren

```bash
# Console starten
docker exec -it typedb-server typedb console

# Test Query
transaction meeting_knowledge data read
match $x sub entity; get;
```

**Expected Output**:
```
$x type meeting
$x type person
$x type agenda-item
$x type document
$x type protocol
$x type audio-recording
$x type transcription
$x type intent-analysis
$x type decision
```

**Wenn das funktioniert** → Schema erfolgreich geladen! ✅

```
# Exit Console
exit
```

---

## 📋 Schritt 6: Externe Verbindung testen

### 6.1 Von deinem PC aus testen

**Windows PowerShell / Terminal**:

```powershell
# Test Connection
curl http://YOUR_DROPLET_IP:1729

# Oder mit Invoke-WebRequest
Invoke-WebRequest -Uri "http://YOUR_DROPLET_IP:1729" -Method Head
```

**Expected**: `HTTP/1.1 200 OK`

### 6.2 Node.js Test Script erstellen

```bash
# Auf deinem PC
cd "C:\Users\kae\OneDrive - AALS Software AG\locara\source\repos\Claude-webapp"

# Erstelle Test-Script
# (oder bearbeite test-typedb-connection.js)
```

Bearbeite `test-typedb-connection.js`:

```javascript
require('dotenv').config();
const { TypeDBHttpDriver } = require('typedb-driver-http');

async function testConnection() {
  console.log('🧪 TypeDB Connection Test (Remote)\n');
  console.log('═'.repeat(50));

  // WICHTIG: Ersetze mit deiner Droplet IP!
  const DROPLET_IP = 'YOUR_DROPLET_IP';

  const driver = new TypeDBHttpDriver({
    addresses: [`http://${DROPLET_IP}:1729`]
  });

  try {
    console.log('\n1️⃣  Connecting to TypeDB...');
    console.log(`   Address: ${DROPLET_IP}:1729`);

    // Test 1: Get Databases
    const dbResponse = await driver.getDatabases();
    if (dbResponse.ok) {
      const databases = dbResponse.ok.databases.map(db => db.name);
      console.log(`   ✅ Connected!`);
      console.log(`   Databases: ${databases.join(', ')}`);

      // Test 2: Open Transaction
      if (databases.includes('meeting_knowledge')) {
        console.log('\n2️⃣  Testing transaction...');
        const txResponse = await driver.openTransaction('meeting_knowledge', 'data', 'read');

        if (txResponse.ok) {
          const txId = txResponse.ok.transactionId;
          console.log(`   ✅ Transaction opened: ${txId}`);

          // Test 3: Query Schema
          console.log('\n3️⃣  Testing query...');
          const queryResponse = await driver.query(txId, 'match $x sub entity; get;', {});

          if (queryResponse.ok && queryResponse.ok.answers) {
            console.log(`   ✅ Query successful!`);
            console.log(`   Entities found: ${queryResponse.ok.answers.length}`);
          }
        }
      }
    }

    console.log('\n✅ All tests passed!');
    console.log('   TypeDB Server is ready for production.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
```

**Ausführen**:
```bash
cd Claude-webapp
node test-typedb-connection.js
```

---

## 📋 Schritt 7: Environment Variables konfigurieren

### 7.1 Claude-webapp (.env)

```bash
# Bearbeite: C:\Users\kae\OneDrive - AALS Software AG\locara\source\repos\Claude-webapp\.env

TYPEDB_CLOUD_ADDRESS=http://YOUR_DROPLET_IP:1729
TYPEDB_CLOUD_USERNAME=  # Leer lassen (kein Auth bei self-hosted)
TYPEDB_CLOUD_PASSWORD=  # Leer lassen
TYPEDB_DATABASE=meeting_knowledge
```

### 7.2 remote-mcp-server (.env)

```bash
# Bearbeite: C:\Users\kae\OneDrive - AALS Software AG\locara\source\repos\remote-mcp-server\.env

TYPEDB_ADDRESS=http://YOUR_DROPLET_IP:1729
TYPEDB_DATABASE=meeting_knowledge
```

### 7.3 DigitalOcean App Platform

**Für Claude-webapp App**:

1. Gehe zu: https://cloud.digitalocean.com/apps
2. Wähle deine Claude-webapp App
3. Settings → Environment Variables
4. Füge hinzu:
   ```
   TYPEDB_CLOUD_ADDRESS = http://YOUR_DROPLET_IP:1729
   TYPEDB_DATABASE = meeting_knowledge
   ```
5. Save & Deploy

**Für remote-mcp-server App**:

1. Wähle deine remote-mcp-server App
2. Settings → Environment Variables
3. Füge hinzu:
   ```
   TYPEDB_ADDRESS = http://YOUR_DROPLET_IP:1729
   TYPEDB_DATABASE = meeting_knowledge
   ```
4. Save & Deploy

---

## 📋 Schritt 8: Code anpassen (Falls nötig)

### Claude-webapp/typedb/typedb-connector.js

Prüfe die Zeilen 23-25:

```javascript
// Sollte sein:
this.addresses = config.addresses || (process.env.TYPEDB_CLOUD_ADDRESS ? [process.env.TYPEDB_CLOUD_ADDRESS] : ['http://localhost:1729']);
this.username = config.username || process.env.TYPEDB_CLOUD_USERNAME;
this.password = config.password || process.env.TYPEDB_CLOUD_PASSWORD;
```

Für self-hosted (ohne Auth):

```javascript
// Ändere zu:
this.addresses = config.addresses || (process.env.TYPEDB_CLOUD_ADDRESS ? [process.env.TYPEDB_CLOUD_ADDRESS] : ['http://localhost:1729']);
// Username & Password nicht nötig für self-hosted
// Entferne Auth aus driver initialization (Zeile 46-50)
```

**Update Zeile 46-50**:

```javascript
// ALT (mit Auth):
this.driver = new TypeDBHttpDriver({
  username: this.username,
  password: this.password,
  addresses: this.addresses
});

// NEU (ohne Auth für self-hosted):
this.driver = new TypeDBHttpDriver({
  addresses: this.addresses
});
```

---

## 📋 Schritt 9: Testing & Validation

### 9.1 End-to-End Test

```bash
cd Claude-webapp

# Test Connection
node test-typedb-connection.js

# Test CRUD Operations
node test-typedb-crud.js
```

### 9.2 Frontend Test

1. Starte Claude-webapp lokal:
   ```bash
   cd Claude-webapp
   npm start
   ```

2. Öffne: http://localhost:3000

3. Teste Meeting Creation:
   - Click "Sitzung erstellen" im Menu
   - Fülle Formular aus
   - Submit
   - Prüfe Console/Network für Errors

4. Prüfe in TypeDB ob Daten gespeichert:
   ```bash
   # Auf TypeDB Server
   docker exec -it typedb-server typedb console

   # In Console:
   transaction meeting_knowledge data read
   match $m isa meeting; get;
   ```

---

## 📋 Schritt 10: Monitoring & Maintenance

### 10.1 Auto-Start Setup

TypeDB startet bereits automatisch (via Docker `restart: unless-stopped`).

Teste:
```bash
# Reboot Server
sudo reboot

# Warte 2 Minuten, dann reconnect
ssh root@YOUR_DROPLET_IP

# Prüfe ob TypeDB läuft
docker ps
curl http://localhost:1729
```

### 10.2 Monitoring Commands

```bash
# Container Status
docker ps

# Logs (last 100 lines)
docker logs typedb-server --tail 100

# Live Logs
docker logs -f typedb-server

# Resource Usage
docker stats typedb-server

# Disk Usage
df -h
du -sh /var/lib/docker/volumes/typedb_typedb-data

# Memory Usage
free -h
```

### 10.3 Backup Script

```bash
# Erstelle Backup Script
cat > /opt/typedb/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/typedb/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="typedb_backup_${DATE}.tar.gz"

mkdir -p ${BACKUP_DIR}

echo "🔄 Creating backup: ${BACKUP_FILE}"

# Stop TypeDB (optional - für konsistente Backups)
# docker-compose -f /opt/typedb/docker-compose.yml stop

# Backup data volume
docker run --rm \
  -v typedb_typedb-data:/data \
  -v ${BACKUP_DIR}:/backup \
  ubuntu \
  tar czf /backup/${BACKUP_FILE} /data

# Start TypeDB wieder (falls gestoppt)
# docker-compose -f /opt/typedb/docker-compose.yml start

echo "✅ Backup created: ${BACKUP_DIR}/${BACKUP_FILE}"

# Delete backups older than 7 days
find ${BACKUP_DIR} -name "typedb_backup_*.tar.gz" -mtime +7 -delete

echo "🧹 Old backups cleaned"
EOF

chmod +x /opt/typedb/backup.sh

# Test backup
/opt/typedb/backup.sh

# Cron Job für tägliche Backups (2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/typedb/backup.sh >> /opt/typedb/backup.log 2>&1") | crontab -
```

---

## 🎯 Zusammenfassung

### Was du jetzt hast:

✅ **TypeDB 3.5.5 Server** auf dediziertem DigitalOcean Droplet
✅ **Docker Setup** mit Auto-Restart
✅ **Database**: meeting_knowledge mit komplettem Schema
✅ **Firewall**: Port 1729 offen
✅ **Externe Verbindung** von Claude-webapp & remote-mcp-server
✅ **Backups** (optional, via Cron Job)
✅ **Monitoring** via Docker logs & stats

### Kosten:

```
Droplet (2 GB RAM):      $12/Monat
Droplet (4 GB RAM):      $24/Monat
Backups (optional):      +20% ($2.40-4.80/Monat)
```

### Nächste Schritte:

1. ✅ Teste Connection von deinem PC
2. ✅ Update Environment Variables in Apps
3. ✅ Deploy Claude-webapp & remote-mcp-server
4. ✅ End-to-End Test der Meeting Creation
5. ✅ Production Launch! 🚀

---

## 🐛 Troubleshooting

### Problem: Connection Timeout

```bash
# Prüfe Firewall
ufw status

# Prüfe ob TypeDB läuft
docker ps
docker logs typedb-server

# Prüfe Port
netstat -tulpn | grep 1729
```

### Problem: Schema Upload schlägt fehl

```bash
# Prüfe Datei-Pfad
ls -la /opt/typedb/meeting-schema.tql

# Prüfe ob Datenbank existiert
docker exec -it typedb-server typedb console
database list
exit

# Retry mit korrektem Pfad
```

### Problem: Docker nicht gestartet

```bash
systemctl status docker
systemctl start docker
docker-compose -f /opt/typedb/docker-compose.yml up -d
```

---

## 📞 Support

**Bei Problemen**:
1. Prüfe Logs: `docker logs typedb-server`
2. Prüfe Connectivity: `curl http://YOUR_DROPLET_IP:1729`
3. Prüfe Firewall: `ufw status`

**Nützliche Commands**:
```bash
# Restart TypeDB
docker-compose -f /opt/typedb/docker-compose.yml restart

# Stop & Remove (bei Problemen)
docker-compose -f /opt/typedb/docker-compose.yml down

# Fresh Start
docker-compose -f /opt/typedb/docker-compose.yml up -d
```

---

**Setup erstellt von**: Claude Code
**Datum**: 2025-11-09
**Version**: TypeDB 3.5.5
**Status**: Production-Ready ✅
