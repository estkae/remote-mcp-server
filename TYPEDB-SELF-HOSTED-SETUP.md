# 🖥️ TypeDB 3.5.5 Self-Hosted Setup Guide

**Version**: TypeDB 3.5.5 (Latest)
**Quelle**: Vaticle / GitHub
**Datum**: 2025-11-09

---

## 📥 Offizielle Download-Quellen

### Vaticle Repository
- **Cloudsmith**: https://cloudsmith.io/~typedb/repos/public-release/packages/
- **GitHub Releases**: https://github.com/typedb/typedb/releases/tag/3.5.5
- **Docker Hub**: https://hub.docker.com/r/typedb/typedb

---

## 🐳 Option 1: Docker (EMPFOHLEN - 5 Minuten)

### Vorteile
- ✅ Einfachste Installation
- ✅ Keine Dependencies
- ✅ Isoliert vom System
- ✅ Einfaches Update
- ✅ Portabel

### Installation

```bash
# 1. Docker Compose erstellen
cat > docker-compose-typedb.yml << 'EOF'
version: '3'
services:
  typedb:
    image: typedb/typedb:3.5.5
    container_name: typedb-server
    ports:
      - "1729:1729"
    volumes:
      - typedb-data:/opt/typedb-all-linux-x86_64/server/data
      - typedb-logs:/opt/typedb-all-linux-x86_64/server/logs
    restart: unless-stopped
    command: ["server", "--address", "0.0.0.0:1729"]

volumes:
  typedb-data:
  typedb-logs:
EOF

# 2. Starten
docker-compose -f docker-compose-typedb.yml up -d

# 3. Logs prüfen
docker logs -f typedb-server

# 4. Status prüfen
docker ps | grep typedb

# 5. Testen
curl http://localhost:1729
```

### Verbindung von Node.js

```javascript
const { TypeDBHttpDriver } = require('typedb-driver-http');

const driver = new TypeDBHttpDriver({
  addresses: ['http://localhost:1729']
});

// ✅ Funktioniert!
```

---

## 🐧 Option 2: Linux (Ubuntu/Debian) - Native Installation

### Via Cloudsmith Repository (Empfohlen)

```bash
# 1. Repository einrichten
curl -1sLf 'https://dl.cloudsmith.io/public/typedb/public-release/setup.deb.sh' | sudo -E bash

# 2. Installieren
sudo apt-get update
sudo apt-get install typedb-all

# 3. Starten
typedb server

# 4. Als Systemd Service
sudo systemctl enable typedb
sudo systemctl start typedb
sudo systemctl status typedb

# 5. Firewall
sudo ufw allow 1729/tcp
```

### Via Download-Script

```bash
# 1. Download Installation Script
wget https://github.com/typedb/typedb/releases/download/3.5.5/typedb-all-linux-x86_64-3.5.5.tar.gz

# 2. Extrahieren
tar -xzf typedb-all-linux-x86_64-3.5.5.tar.gz

# 3. Nach /opt verschieben (optional)
sudo mv typedb-all-linux-x86_64-3.5.5 /opt/typedb

# 4. Starten
/opt/typedb/typedb server
```

### Oder mit dem mitgelieferten Script:

```bash
# Script ausführbar machen
chmod +x install-typedb-3.5.5.sh

# Installieren
./install-typedb-3.5.5.sh
```

---

## 🍎 Option 3: macOS

### Via Homebrew (Empfohlen)

```bash
# 1. Tap hinzufügen
brew tap vaticle/tap

# 2. Installieren
brew install typedb

# 3. Starten
typedb server

# 4. Als Service (optional)
brew services start typedb
```

### Manuelle Installation

```bash
# Intel Mac
wget https://github.com/typedb/typedb/releases/download/3.5.5/typedb-all-mac-x86_64-3.5.5.zip
unzip typedb-all-mac-x86_64-3.5.5.zip
cd typedb-all-mac-x86_64-3.5.5
./typedb server

# Apple Silicon (M1/M2/M3)
wget https://github.com/typedb/typedb/releases/download/3.5.5/typedb-all-mac-arm64-3.5.5.zip
unzip typedb-all-mac-arm64-3.5.5.zip
cd typedb-all-mac-arm64-3.5.5
./typedb server
```

---

## 🪟 Option 4: Windows

### Via Chocolatey (Empfohlen)

```powershell
# Als Administrator
choco install typedb

# Starten
typedb server
```

### Manuelle Installation

```powershell
# 1. Download von GitHub
# URL: https://github.com/typedb/typedb/releases/download/3.5.5/typedb-all-windows-x86_64-3.5.5.zip

# 2. Mit Browser herunterladen oder via PowerShell:
Invoke-WebRequest -Uri "https://github.com/typedb/typedb/releases/download/3.5.5/typedb-all-windows-x86_64-3.5.5.zip" -OutFile "typedb-3.5.5.zip"

# 3. Entpacken
Expand-Archive -Path typedb-3.5.5.zip -DestinationPath C:\typedb

# 4. Starten
cd C:\typedb\typedb-all-windows-x86_64-3.5.5
.\typedb.bat server

# 5. Firewall Regel (als Admin)
New-NetFirewallRule -DisplayName "TypeDB" -Direction Inbound -LocalPort 1729 -Protocol TCP -Action Allow
```

---

## ☁️ DigitalOcean Droplet Setup

### Neuer Droplet erstellen

```bash
# Via doctl CLI
doctl compute droplet create typedb-server \
  --size s-2vcpu-2gb \
  --image ubuntu-22-04-x64 \
  --region fra1 \
  --ssh-keys YOUR_SSH_KEY_ID

# Oder über Web Console:
# - Droplet Name: typedb-server
# - Size: Basic $12/mo (2 vCPU, 2 GB RAM)
# - Image: Ubuntu 22.04 LTS
# - Region: Frankfurt (gleich wie andere Services)
```

### Auf existierendem Droplet

```bash
# 1. SSH verbinden
ssh root@your-droplet-ip

# 2. Docker installieren (falls noch nicht)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. TypeDB via Docker starten
docker run -d \
  --name typedb \
  -p 1729:1729 \
  -v typedb-data:/opt/typedb-all-linux-x86_64/server/data \
  --restart unless-stopped \
  typedb/typedb:3.5.5 server

# 4. Firewall
sudo ufw allow 1729/tcp

# 5. Prüfen
docker logs -f typedb
curl http://localhost:1729
```

---

## 📋 Nach der Installation

### 1. Datenbank erstellen

```bash
# Via TypeDB Console (mitgeliefert)
typedb console

# In der Console:
database create meeting_knowledge
exit
```

### 2. Schema laden

```bash
# Via Console
typedb console

# In der Console:
transaction meeting_knowledge schema write
source /path/to/meeting-schema.tql
commit
exit
```

### 3. Testen von Node.js

```javascript
const { TypeDBHttpDriver } = require('typedb-driver-http');

async function test() {
  const driver = new TypeDBHttpDriver({
    addresses: ['http://localhost:1729']
  });

  // Get databases
  const dbResponse = await driver.getDatabases();
  console.log('Databases:', dbResponse.ok.databases.map(db => db.name));

  // Open transaction
  const txId = await driver.openTransaction('meeting_knowledge', 'data', 'read');

  // Query
  const result = await driver.query(txId.ok.transactionId, 'match $x sub entity; get;', {});
  console.log('Entities:', result.ok.answers);

  await driver.close();
}

test();
```

---

## 🔧 Konfiguration

### Netzwerk-Zugriff für remote Zugriff

```bash
# TypeDB Config bearbeiten
nano /opt/typedb/server/conf/config.yml

# Ändere:
server:
  address: 0.0.0.0:1729  # Erlaubt externe Verbindungen

# Restart
systemctl restart typedb
```

### Performance Tuning

```yaml
# config.yml
storage:
  data: data/
  logs: logs/

server:
  address: 0.0.0.0:1729

# JVM Options für 4 GB RAM Server
jvm:
  xms: 1g
  xmx: 3g
```

---

## 📊 System Requirements Check

```bash
# Prüfe freie Ressourcen
free -h    # RAM verfügbar?
df -h      # Disk Space?
nproc      # CPU Cores?

# Für Production empfohlen:
# RAM: 4 GB (minimum 2 GB)
# Disk: 20 GB (minimum 10 GB)
# CPU: 2 Cores (minimum 1 Core)
```

---

## 🔐 Security Best Practices

### 1. Firewall Setup

```bash
# Nur von spezifischen IPs erlauben
sudo ufw allow from YOUR_IP to any port 1729

# Oder: Nur von lokalem Netzwerk
sudo ufw allow from 10.0.0.0/8 to any port 1729
```

### 2. Reverse Proxy (Optional - für HTTPS)

```nginx
# Nginx Config
upstream typedb {
    server localhost:1729;
}

server {
    listen 443 ssl;
    server_name typedb.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://typedb;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🧪 Testing

### Connection Test

```bash
# Test ob Server läuft
curl -I http://localhost:1729

# Response sollte sein:
# HTTP/1.1 200 OK
```

### Node.js Test Script

```bash
cd Claude-webapp
node test-typedb-connection.js
```

Expected Output:
```
✅ TypeDB Connection Test
   Status: connected
   Database exists: true
```

---

## 🔄 Update auf neuere Version

### Docker

```bash
# 1. Stop
docker-compose down

# 2. Update Image
docker pull typedb/typedb:latest

# 3. Restart
docker-compose up -d
```

### Native

```bash
# Via Package Manager
sudo apt-get update
sudo apt-get upgrade typedb-all

# Oder manuell neue Version installieren
```

---

## 🐛 Troubleshooting

### Port bereits in Verwendung

```bash
# Prüfe welcher Prozess Port 1729 nutzt
sudo lsof -i :1729

# Oder
sudo netstat -tulpn | grep 1729
```

### TypeDB startet nicht

```bash
# Prüfe Logs
docker logs typedb-server

# Oder bei nativer Installation
tail -f /opt/typedb/server/logs/typedb.log
```

### Verbindung von Remote schlägt fehl

```bash
# Prüfe Firewall
sudo ufw status

# Prüfe TypeDB Config
cat /opt/typedb/server/conf/config.yml | grep address

# Sollte sein: 0.0.0.0:1729 (nicht 127.0.0.1)
```

---

## 📚 Ressourcen

- **Offizielle Docs**: https://typedb.com/docs
- **GitHub**: https://github.com/typedb/typedb
- **Docker Hub**: https://hub.docker.com/r/typedb/typedb
- **Community**: https://forum.typedb.com/

---

## ✅ Quick Setup Cheat Sheet

```bash
# Docker (5 Minuten)
docker run -d --name typedb -p 1729:1729 typedb/typedb:3.5.5 server

# Linux (10 Minuten)
curl -1sLf 'https://dl.cloudsmith.io/public/typedb/public-release/setup.deb.sh' | sudo bash
sudo apt-get install typedb-all
typedb server

# macOS (5 Minuten)
brew tap vaticle/tap
brew install typedb
typedb server

# Windows (10 Minuten)
choco install typedb
typedb server
```

---

**Empfehlung für dein Projekt**: Docker auf DigitalOcean (5 Minuten Setup, $12/Monat wenn neuer Droplet)

Dein bereits installierter `typedb-driver-http` v3.5.5 funktioniert dann **sofort ohne Änderungen**! ✅
