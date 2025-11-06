# Database Wrapper - Multi-Database Connector

Universal Database Wrapper für Claude MCP Server mit Unterstützung für:
- **Microsoft SQL Server** (MSSQL)
- **MySQL**
- **PostgreSQL**
- **Oracle**
- **SQL Anywhere**
- **Banana DB** (Accounting - basiert auf SQL Anywhere)
- **TypeDB 3.x** (Graph Database)

## 🚀 Features

- ✅ **ODBC & Native Drivers**: Automatischer Fallback zwischen nativen Treibern und ODBC
- ✅ **Connection Pooling**: Effiziente Verwaltung von Datenbankverbindungen
- ✅ **MCP Integration**: 12+ Tools für Claude AI Integration
- ✅ **Config Management**: Speichern und Laden von Verbindungskonfigurationen
- ✅ **OneDrive Ready**: Vorbereitet für OneDrive-Speicherung
- ✅ **Web UI**: Interaktive Benutzeroberfläche in Claude-webapp
- ✅ **Query Export**: Export nach JSON, CSV, TSV, Markdown

## 📦 Installation

Die erforderlichen Pakete sind bereits installiert:

```bash
cd remote-mcp-server
npm install  # Already includes: odbc, typedb-client, oracledb, mssql, mysql2, pg
```

### ODBC-Treiber Installation (Windows)

Für optimale Kompatibilität installieren Sie die ODBC-Treiber:

1. **SQL Server**: [ODBC Driver 17 for SQL Server](https://docs.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server)
2. **MySQL**: [MySQL ODBC 8.0 Driver](https://dev.mysql.com/downloads/connector/odbc/)
3. **PostgreSQL**: [PostgreSQL ODBC Driver](https://www.postgresql.org/ftp/odbc/versions/msi/)
4. **Oracle**: [Oracle Instant Client](https://www.oracle.com/database/technologies/instant-client.html)
5. **SQL Anywhere**: [SQL Anywhere 17 Driver](https://www.sap.com/products/technology-platform/sql-anywhere.html)

## 🏗️ Architektur

```
remote-mcp-server/
├── db-wrapper.js              # Haupt-Orchestrator
├── db-odbc-manager.js         # ODBC/Native Connection Manager
├── db-typedb-manager.js       # TypeDB 3.x Manager
├── db-tools.js                # MCP Tools Definitionen
└── config/
    └── db-connections.json    # Gespeicherte Konfigurationen

Claude-webapp/
└── public/
    └── db-connections.html    # Web UI
```

## 🔧 Verwendung

### 1. Server starten

```bash
cd remote-mcp-server
npm start
```

Der Server läuft auf Port 8080 und exponiert die Database Tools über MCP.

### 2. Web UI öffnen

Öffnen Sie im Browser:
```
http://localhost:3000/db-connections.html
```

### 3. Verbindung herstellen

#### Via Web UI:
1. Datenbanktyp auswählen
2. Verbindungsdaten eingeben
3. "Test Connection" klicken
4. "Connect" klicken
5. Queries ausführen

#### Via Claude AI:

```
Ich möchte mich mit einer MySQL-Datenbank verbinden:
- Host: localhost
- Port: 3306
- Database: customers
- Username: admin
- Password: secret123

Dann möchte ich alle Tabellen auflisten.
```

Claude wird automatisch die MCP Tools verwenden:
1. `connect_database` - Verbindung herstellen
2. `list_tables` - Tabellen auflisten
3. `execute_query` - Queries ausführen

## 🛠️ MCP Tools

### Connection Management

#### connect_database
Verbindung zu einer Datenbank herstellen.

```json
{
  "type": "mssql",
  "host": "localhost",
  "port": 1433,
  "database": "mydb",
  "username": "admin",
  "password": "secret"
}
```

#### disconnect_database
Verbindung trennen.

```json
{
  "sessionId": "db_1234567890_abc123"
}
```

#### test_database_connection
Verbindung testen ohne Session zu speichern.

```json
{
  "type": "postgresql",
  "host": "localhost",
  "database": "testdb",
  "username": "user",
  "password": "pass"
}
```

#### list_active_connections
Alle aktiven Verbindungen auflisten.

```json
{}
```

#### disconnect_all_databases
Alle Verbindungen trennen.

```json
{}
```

### Query Execution

#### execute_query
SQL oder TypeQL Query ausführen.

```json
{
  "sessionId": "db_1234567890_abc123",
  "query": "SELECT * FROM users WHERE active = 1",
  "params": [],
  "readOnly": true
}
```

#### list_tables
Alle Tabellen/Entities auflisten.

```json
{
  "sessionId": "db_1234567890_abc123"
}
```

#### describe_table
Tabellenstruktur anzeigen (nur SQL-DBs).

```json
{
  "sessionId": "db_1234567890_abc123",
  "tableName": "users"
}
```

#### export_query_results
Query-Ergebnisse exportieren.

```json
{
  "sessionId": "db_1234567890_abc123",
  "query": "SELECT * FROM products",
  "format": "csv"
}
```

**Unterstützte Formate**: json, csv, tsv, markdown

### Configuration Management

#### save_connection_config
Verbindungskonfiguration speichern.

```json
{
  "configName": "production_db",
  "config": {
    "type": "mssql",
    "host": "prod.example.com",
    "database": "maindb",
    "username": "admin",
    "password": "encrypted_password"
  }
}
```

#### load_connection_config
Gespeicherte Konfiguration laden.

```json
{
  "configName": "production_db"
}
```

#### list_connection_configs
Alle gespeicherten Konfigurationen auflisten.

```json
{}
```

#### delete_connection_config
Konfiguration löschen.

```json
{
  "configName": "old_config"
}
```

## 🗄️ Datenbankspezifische Details

### Microsoft SQL Server (MSSQL)

**Standard-Port**: 1433
**Native Driver**: `mssql` (bevorzugt)
**ODBC Driver**: ODBC Driver 17 for SQL Server

```javascript
{
  type: 'mssql',
  host: 'localhost',
  port: 1433,
  database: 'mydb',
  username: 'sa',
  password: 'YourPassword123',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
}
```

### MySQL

**Standard-Port**: 3306
**Native Driver**: `mysql2` (bevorzugt)
**ODBC Driver**: MySQL ODBC 8.0 Driver

```javascript
{
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'mydb',
  username: 'root',
  password: 'password'
}
```

### PostgreSQL

**Standard-Port**: 5432
**Native Driver**: `pg` (bevorzugt)
**ODBC Driver**: PostgreSQL Unicode

```javascript
{
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  username: 'postgres',
  password: 'password'
}
```

### Oracle

**Standard-Port**: 1521
**Native Driver**: `oracledb` (bevorzugt)
**ODBC Driver**: Oracle ODBC

```javascript
{
  type: 'oracle',
  host: 'localhost',
  port: 1521,
  database: 'ORCL',
  username: 'system',
  password: 'oracle'
}
```

### SQL Anywhere

**Standard-Port**: 2638
**Native Driver**: ODBC only
**ODBC Driver**: SQL Anywhere 17

```javascript
{
  type: 'sqlanywhere',
  host: 'localhost',
  port: 2638,
  database: 'demo',
  username: 'dba',
  password: 'sql'
}
```

### Banana DB (Accounting)

**Standard-Port**: 2638 (basiert auf SQL Anywhere)
**Native Driver**: ODBC only
**ODBC Driver**: SQL Anywhere 17

```javascript
{
  type: 'banana',
  host: 'localhost',
  port: 2638,
  database: 'accounting',
  username: 'banana_user',
  password: 'password'
}
```

### TypeDB 3.x

**Standard-Port**: 1729
**Native Driver**: `typedb-client`
**Query Language**: TypeQL

```javascript
{
  type: 'typedb',
  host: 'localhost',
  port: 1729,
  database: 'my_knowledge_graph',
  username: 'admin',
  password: 'password',
  cloudConnection: false  // true für TypeDB Cloud
}
```

**TypeQL Beispiel**:
```typeql
match $p isa person, has name "John";
$c isa company, has name "TechCorp";
(employee: $p, employer: $c) isa employment;
get;
```

## 🔐 Sicherheit

### Passwort-Verschlüsselung

Passwörter werden bei lokaler Speicherung automatisch verschlüsselt:

```javascript
// Automatisch verschlüsselt beim Speichern
await saveConfigLocal('my_config', {
  type: 'mysql',
  password: 'plain_text_password'  // Wird verschlüsselt gespeichert
});

// Automatisch entschlüsselt beim Laden
const config = await loadConfigLocal('my_config');
// config.password ist wieder im Klartext verfügbar
```

**Wichtig**: Die Verschlüsselung ist einfach (XOR + Base64). Für Produktionsumgebungen:
1. Verwenden Sie Umgebungsvariablen
2. Verwenden Sie einen Secrets Manager (Azure Key Vault, AWS Secrets Manager)
3. Implementieren Sie stärkere Verschlüsselung (AES-256)

### Best Practices

1. **Niemals Credentials in Git committen**
2. **Verwenden Sie Read-Only User** für Queries
3. **Limitieren Sie Netzwerkzugriff** (Firewall, VPN)
4. **Rotieren Sie Passwörter regelmäßig**
5. **Verwenden Sie SSL/TLS** für Verbindungen

## 📊 OneDrive Integration

### Vorbereitet für OneDrive-Speicherung

Die Architektur ist bereits vorbereitet für OneDrive-Integration:

```javascript
// In db-wrapper.js
this.onedriveConfigPath = null; // Kann gesetzt werden

// Zukünftige Implementierung:
async saveConfigOneDrive(configName, config) {
  // Speichert Config auf OneDrive via Microsoft Graph API
  // Verwendet: c:\Users\kae\OneDrive - AALS Software AG\...
}
```

### Integration mit Microsoft Graph

Um OneDrive-Speicherung zu aktivieren:

1. Microsoft Graph Client ist bereits in `remote-mcp-server` verfügbar
2. OneDrive-Pfad kann konfiguriert werden
3. Configs werden als JSON-Dateien in OneDrive gespeichert
4. Automatische Synchronisation über alle Geräte

## 🧪 Testing

### Lokaler Test

```bash
# 1. Server starten
cd remote-mcp-server
npm start

# 2. Test mit curl
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "test_database_connection",
    "parameters": {
      "type": "mysql",
      "host": "localhost",
      "database": "test",
      "username": "root",
      "password": "password"
    }
  }'
```

### Web UI Test

1. Öffnen Sie `http://localhost:3000/db-connections.html`
2. Wählen Sie einen Datenbanktyp
3. Geben Sie Testverbindungsdaten ein
4. Klicken Sie "Test Connection"
5. Bei Erfolg: "Connect" klicken
6. Query ausführen: `SELECT 1`

## 🐛 Troubleshooting

### "ODBC Driver not found"

**Lösung**: Installieren Sie den entsprechenden ODBC-Treiber für Windows.

```bash
# Check installierte ODBC-Treiber
odbcad32.exe
```

### "Connection timeout"

**Mögliche Ursachen**:
1. Firewall blockiert Port
2. Datenbank-Server läuft nicht
3. Falsche Host/Port-Konfiguration

**Lösung**:
```bash
# Test Port Connectivity
telnet <host> <port>
```

### "Authentication failed"

**Prüfen Sie**:
1. Username/Password korrekt
2. User hat Zugriffsrechte
3. Für SQL Server: SQL Server Authentication aktiviert

### TypeDB Connection Issues

**Für TypeDB Core**:
```bash
# Check ob TypeDB läuft
typedb server status
```

**Für TypeDB Cloud**:
- Stellen Sie sicher, dass `cloudConnection: true` gesetzt ist
- Verwenden Sie Cloud-Credentials

## 📈 Performance

### Connection Pooling

Native Treiber nutzen automatisch Connection Pooling:
- **PostgreSQL**: `pg.Pool` mit automatischer Pool-Verwaltung
- **MSSQL**: Integriertes Connection Pooling
- **MySQL**: Connection Pool über `mysql2/promise`

### Best Practices

1. **Wiederverwendung**: Nutzen Sie SessionIds für mehrere Queries
2. **Batch Queries**: Kombinieren Sie mehrere Operationen
3. **Disconnect**: Trennen Sie ungenutzte Verbindungen
4. **Indexing**: Stellen Sie sicher, dass DB-Indices existieren

## 🚦 Next Steps

### Geplante Features

- [ ] OneDrive-Speicherung implementieren
- [ ] Query-History
- [ ] Query-Builder UI
- [ ] Batch-Import/-Export
- [ ] Stored Procedures Support
- [ ] Transaction Management
- [ ] Real-time Query Monitoring
- [ ] Database Migration Tools

### Integration in Claude-webapp

Der Database Wrapper ist vollständig in `remote-mcp-server` integriert und über MCP verfügbar. Claude AI kann automatisch:

1. Verbindungen herstellen
2. Queries generieren und ausführen
3. Daten analysieren
4. Reports erstellen
5. Daten exportieren

## 📞 Support

Bei Fragen oder Problemen:
1. Prüfen Sie die Logs: `console.log` Output vom Server
2. Testen Sie die Verbindung mit nativen Tools (SSMS, MySQL Workbench, etc.)
3. Überprüfen Sie die ODBC-Treiber-Installation

## 📄 Lizenz

MIT License - AALS Software AG

---

**Version**: 1.0.0
**Erstellt**: 2025-11-06
**Autor**: AALS Software AG
