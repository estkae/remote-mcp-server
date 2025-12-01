/**
 * TypeDB Cloud Setup Script
 * Erstellt die Datenbank und lädt das Schema hoch
 */

const { TypeDB, TypeDBCredential } = require('typedb-driver');
const fs = require('fs').promises;
const path = require('path');

// TypeDB Cloud Credentials
const CLOUD_ADDRESS = 'juj5l9-0.cluster.typedb.com:80';
const USERNAME = 'admin';
const PASSWORD = 'KFbnADleasOLRvkR';
const DATABASE_NAME = 'meeting_system';

async function setupTypeDBCloud() {
  let client;

  try {
    console.log('🔌 Verbinde mit TypeDB Cloud...');
    console.log(`   Cluster: ${CLOUD_ADDRESS}`);
    console.log(`   Username: ${USERNAME}`);

    // Erstelle TypeDB Cloud Client
    const credential = new TypeDBCredential(USERNAME, PASSWORD);
    client = await TypeDB.cloudDriver(CLOUD_ADDRESS, credential);

    console.log('✅ Verbindung erfolgreich!\n');

    // Liste existierende Datenbanken
    console.log('📊 Vorhandene Datenbanken:');
    const databases = await client.databases.all();
    for (const db of databases) {
      console.log(`   - ${db.name}`);
    }
    console.log('');

    // Prüfe ob Datenbank existiert
    const dbExists = databases.some(db => db.name === DATABASE_NAME);

    if (dbExists) {
      console.log(`⚠️  Datenbank "${DATABASE_NAME}" existiert bereits.`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Soll sie gelöscht und neu erstellt werden? (ja/nein): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() === 'ja' || answer.toLowerCase() === 'j') {
        console.log('🗑️  Lösche alte Datenbank...');
        const dbToDelete = databases.find(db => db.name === DATABASE_NAME);
        await dbToDelete.delete();
        console.log('✅ Alte Datenbank gelöscht\n');
      } else {
        console.log('❌ Setup abgebrochen.');
        return;
      }
    }

    // Erstelle neue Datenbank
    console.log(`🆕 Erstelle Datenbank "${DATABASE_NAME}"...`);
    await client.databases.create(DATABASE_NAME);
    console.log('✅ Datenbank erstellt!\n');

    // Lade Schema
    console.log('📄 Lade Schema-Datei...');
    const schemaPath = path.join(__dirname, 'typedb', 'schemas', 'meeting-schema.tql');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    console.log(`✅ Schema geladen (${schemaContent.length} Zeichen)\n`);

    // Öffne Session und definiere Schema
    console.log('📤 Uploade Schema zu TypeDB Cloud...');
    const session = await client.session(DATABASE_NAME, TypeDB.SessionType.SCHEMA);

    try {
      const transaction = await session.transaction(TypeDB.TransactionType.WRITE);

      try {
        await transaction.query.define(schemaContent);
        await transaction.commit();
        console.log('✅ Schema erfolgreich hochgeladen!\n');
      } catch (error) {
        console.error('❌ Fehler beim Schema-Upload:', error.message);
        throw error;
      } finally {
        if (transaction.isOpen()) {
          await transaction.close();
        }
      }
    } finally {
      await session.close();
    }

    // Verifiziere Schema
    console.log('🔍 Verifiziere Schema...');
    const verifySession = await client.session(DATABASE_NAME, TypeDB.SessionType.SCHEMA);

    try {
      const verifyTx = await verifySession.transaction(TypeDB.TransactionType.READ);

      try {
        // Teste ob Entities definiert sind
        const entities = ['meeting', 'person', 'agenda-item', 'document', 'protocol'];
        console.log('\n📋 Definierte Entities:');

        for (const entity of entities) {
          const query = `match $x sub ${entity}; get;`;
          const result = await verifyTx.query.get(query);
          const concepts = await result.collect();

          if (concepts.length > 0) {
            console.log(`   ✅ ${entity}`);
          } else {
            console.log(`   ❌ ${entity} nicht gefunden!`);
          }
        }

        console.log('\n✅ Schema-Verifikation abgeschlossen!');
      } finally {
        await verifyTx.close();
      }
    } finally {
      await verifySession.close();
    }

    // Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SETUP ERFOLGREICH ABGESCHLOSSEN!');
    console.log('='.repeat(60));
    console.log('\n📊 Datenbank-Info:');
    console.log(`   Name: ${DATABASE_NAME}`);
    console.log(`   Cluster: ${CLOUD_ADDRESS}`);
    console.log(`   Status: ✅ Aktiv`);
    console.log('\n🔧 Environment Variables für DigitalOcean:');
    console.log('   TYPEDB_IS_CLOUD=true');
    console.log(`   TYPEDB_CLOUD_ADDRESS=${CLOUD_ADDRESS}`);
    console.log(`   TYPEDB_USERNAME=${USERNAME}`);
    console.log(`   TYPEDB_PASSWORD=${PASSWORD}`);
    console.log(`   TYPEDB_DATABASE=${DATABASE_NAME}`);
    console.log('\n📝 Nächste Schritte:');
    console.log('   1. Environment Variables in DigitalOcean setzen');
    console.log('   2. Remote-MCP-Server neu deployen');
    console.log('   3. MCP Server Integration aktivieren');
    console.log('   4. End-to-End Test durchführen');
    console.log('');

  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    console.error('\nStack Trace:', error.stack);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('👋 Verbindung geschlossen.');
    }
  }
}

// Führe Setup aus
setupTypeDBCloud().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
