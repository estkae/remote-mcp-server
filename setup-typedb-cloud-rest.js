/**
 * TypeDB Cloud Setup via REST API
 * Umgeht Driver-Kompatibilitätsprobleme
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// TypeDB Cloud Credentials
const CLOUD_HOST = 'juj5l9-0.cluster.typedb.com';
const CLOUD_PORT = 80;
const USERNAME = 'admin';
const PASSWORD = 'KFbnADleasOLRvkR';
const DATABASE_NAME = 'meeting_system';

let authToken = null;

/**
 * HTTP Request Helper
 */
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Authentifizierung
 */
async function authenticate() {
  console.log('🔑 Authentifiziere...');

  const options = {
    hostname: CLOUD_HOST,
    port: CLOUD_PORT,
    path: '/v1/signin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const response = await makeRequest(options, {
    username: USERNAME,
    password: PASSWORD
  });

  if (response.statusCode === 200 && response.body && response.body.token) {
    authToken = response.body.token;
    console.log('✅ Authentifizierung erfolgreich!');
    console.log(`   Token: ${authToken.substring(0, 50)}...\n`);
    return authToken;
  } else {
    throw new Error(`Authentifizierung fehlgeschlagen: ${response.statusCode} - ${JSON.stringify(response.body)}`);
  }
}

/**
 * Liste alle Datenbanken
 */
async function listDatabases() {
  console.log('📊 Lade Datenbanken...');

  const options = {
    hostname: CLOUD_HOST,
    port: CLOUD_PORT,
    path: '/v1/databases',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };

  const response = await makeRequest(options);

  if (response.statusCode === 200) {
    console.log('✅ Datenbanken geladen:');
    if (response.body && response.body.databases) {
      response.body.databases.forEach(db => {
        console.log(`   - ${db.name || db}`);
      });
    } else {
      console.log('   (keine Datenbanken vorhanden)');
    }
    console.log('');
    return response.body;
  } else {
    throw new Error(`Fehler beim Laden der Datenbanken: ${response.statusCode} - ${JSON.stringify(response.body)}`);
  }
}

/**
 * Erstelle Datenbank
 */
async function createDatabase(name) {
  console.log(`🆕 Erstelle Datenbank "${name}"...`);

  const options = {
    hostname: CLOUD_HOST,
    port: CLOUD_PORT,
    path: `/v1/databases/${name}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };

  const response = await makeRequest(options);

  if (response.statusCode === 200 || response.statusCode === 201) {
    console.log('✅ Datenbank erstellt!\n');
    return true;
  } else if (response.statusCode === 409) {
    console.log('⚠️  Datenbank existiert bereits!\n');
    return false;
  } else {
    throw new Error(`Fehler beim Erstellen der Datenbank: ${response.statusCode} - ${JSON.stringify(response.body)}`);
  }
}

/**
 * Lösche Datenbank
 */
async function deleteDatabase(name) {
  console.log(`🗑️  Lösche Datenbank "${name}"...`);

  const options = {
    hostname: CLOUD_HOST,
    port: CLOUD_PORT,
    path: `/v1/databases/${name}`,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };

  const response = await makeRequest(options);

  if (response.statusCode === 200 || response.statusCode === 204) {
    console.log('✅ Datenbank gelöscht!\n');
    return true;
  } else {
    throw new Error(`Fehler beim Löschen der Datenbank: ${response.statusCode} - ${JSON.stringify(response.body)}`);
  }
}

/**
 * Führe TypeQL Query aus
 */
async function executeQuery(database, query, transactionType = 'write') {
  const options = {
    hostname: CLOUD_HOST,
    port: CLOUD_PORT,
    path: `/v1/databases/${database}/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };

  const response = await makeRequest(options, {
    query: query,
    transaction_type: transactionType
  });

  return response;
}

/**
 * Haupt-Setup-Funktion
 */
async function setupTypeDBCloud() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     TypeDB Cloud Setup - Autonomous Meeting System        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Authentifizierung
    await authenticate();

    // 2. Liste Datenbanken
    const dbList = await listDatabases();

    // 3. Prüfe ob Datenbank existiert
    let dbExists = false;
    if (dbList && dbList.databases) {
      dbExists = dbList.databases.some(db =>
        (typeof db === 'string' ? db : db.name) === DATABASE_NAME
      );
    }

    if (dbExists) {
      console.log(`⚠️  WARNUNG: Datenbank "${DATABASE_NAME}" existiert bereits!`);
      console.log('    Soll sie gelöscht und neu erstellt werden?');
      console.log('    (Drücken Sie Ctrl+C zum Abbrechen oder Enter zum Fortfahren)');

      // Warte auf Enter
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });

      await deleteDatabase(DATABASE_NAME);
    }

    // 4. Erstelle Datenbank
    await createDatabase(DATABASE_NAME);

    // 5. Lade Schema
    console.log('📄 Lade Schema-Datei...');
    const schemaPath = path.join(__dirname, 'typedb', 'schemas', 'meeting-schema.tql');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    console.log(`✅ Schema geladen (${schemaContent.length} Zeichen)\n`);

    // 6. Upload Schema
    console.log('📤 Uploade Schema...');
    console.log('   ⚠️  HINWEIS: REST API unterstützt möglicherweise kein Schema-Upload');
    console.log('   Alternative: TypeDB Console verwenden oder Python Script');
    console.log('');

    // Schema-Upload via REST API (falls unterstützt)
    try {
      const response = await executeQuery(DATABASE_NAME, schemaContent, 'schema');

      if (response.statusCode === 200) {
        console.log('✅ Schema erfolgreich hochgeladen!\n');
      } else {
        console.log(`⚠️  Schema-Upload via REST API nicht erfolgreich (Status ${response.statusCode})`);
        console.log('   Body:', response.body);
        console.log('\n📝 Manuelle Schema-Installation erforderlich:\n');
        console.log('   Option 1: TypeDB Console verwenden');
        console.log('   Option 2: Python typedb-driver verwenden');
        console.log('   Option 3: Schema-Datei manuell hochladen\n');
      }
    } catch (error) {
      console.log('⚠️  Schema-Upload via REST API fehlgeschlagen:', error.message);
      console.log('\n📝 Manuelle Schema-Installation erforderlich - siehe Dokumentation\n');
    }

    // Zusammenfassung
    console.log('═'.repeat(60));
    console.log('✅ SETUP ABGESCHLOSSEN (Datenbank erstellt)');
    console.log('═'.repeat(60));
    console.log('\n📊 Datenbank-Info:');
    console.log(`   Name: ${DATABASE_NAME}`);
    console.log(`   Cluster: ${CLOUD_HOST}:${CLOUD_PORT}`);
    console.log(`   Status: ✅ Erstellt`);
    console.log(`   Schema: ⚠️  Manuell hochladen (siehe unten)`);

    console.log('\n🔧 Environment Variables für DigitalOcean:');
    console.log('   TYPEDB_IS_CLOUD=true');
    console.log(`   TYPEDB_CLOUD_ADDRESS=${CLOUD_HOST}:${CLOUD_PORT}`);
    console.log(`   TYPEDB_USERNAME=${USERNAME}`);
    console.log(`   TYPEDB_PASSWORD=${PASSWORD}`);
    console.log(`   TYPEDB_DATABASE=${DATABASE_NAME}`);

    console.log('\n📝 Schema hochladen (Python-Methode):');
    console.log('   1. Installiere: pip install typedb-driver');
    console.log('   2. Führe aus: python upload-schema.py');
    console.log('   (Script wird automatisch erstellt...)');

    // Erstelle Python Upload-Script
    await createPythonUploadScript();

    console.log('');

  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

/**
 * Erstelle Python Upload Script (als Alternative)
 */
async function createPythonUploadScript() {
  const pythonScript = `#!/usr/bin/env python3
"""
TypeDB Cloud Schema Upload
Lädt das meeting-schema.tql in TypeDB Cloud hoch
"""

from typedb.driver import TypeDB, SessionType, TransactionType, TypeDBCredential

# Konfiguration
CLOUD_ADDRESS = "${CLOUD_HOST}:${CLOUD_PORT}"
USERNAME = "${USERNAME}"
PASSWORD = "${PASSWORD}"
DATABASE_NAME = "${DATABASE_NAME}"
SCHEMA_FILE = "typedb/schemas/meeting-schema.tql"

def upload_schema():
    print("🔌 Verbinde mit TypeDB Cloud...")

    # Erstelle Credentials
    credential = TypeDBCredential(USERNAME, PASSWORD, tls_enabled=True)

    # Verbinde mit TypeDB Cloud
    with TypeDB.cloud_driver(CLOUD_ADDRESS, credential) as driver:
        print("✅ Verbindung erfolgreich!")

        # Lade Schema-Datei
        print(f"📄 Lade Schema: {SCHEMA_FILE}")
        with open(SCHEMA_FILE, 'r', encoding='utf-8') as f:
            schema_content = f.read()

        print(f"✅ Schema geladen ({len(schema_content)} Zeichen)")

        # Öffne Schema-Session
        print("📤 Uploade Schema...")
        with driver.session(DATABASE_NAME, SessionType.SCHEMA) as session:
            with session.transaction(TransactionType.WRITE) as tx:
                tx.query.define(schema_content)
                tx.commit()

        print("✅ Schema erfolgreich hochgeladen!")
        print("")
        print("🎉 SETUP KOMPLETT!")

if __name__ == "__main__":
    upload_schema()
`;

  await fs.writeFile('upload-schema.py', pythonScript);
  console.log('   ✅ Python Script erstellt: upload-schema.py');
}

// Führe Setup aus
setupTypeDBCloud();
