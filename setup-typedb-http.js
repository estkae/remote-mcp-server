/**
 * TypeDB Cloud Setup Script (HTTP Driver 3.x)
 * Erstellt die Datenbank und lädt das Schema hoch
 */

const { TypeDBHttpDriver } = require('typedb-driver-http');
const fs = require('fs').promises;
const path = require('path');

// TypeDB Cloud Credentials
const CLOUD_URL = 'https://juj5l9-0.cluster.typedb.com';
const USERNAME = 'admin';
const PASSWORD = 'KFbnADleasOLRvkR';
const DATABASE_NAME = 'meeting_system';

async function setupTypeDBCloud() {
  let driver;

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     TypeDB Cloud Setup - HTTP Driver 3.5.5                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('🔌 Verbinde mit TypeDB Cloud...');
    console.log(`   URL: ${CLOUD_URL}`);
    console.log(`   Username: ${USERNAME}`);

    // Erstelle TypeDB HTTP Driver
    driver = await TypeDBHttpDriver.create({
      url: CLOUD_URL,
      username: USERNAME,
      password: PASSWORD
    });

    console.log('✅ Verbindung erfolgreich!\n');

    // Liste existierende Datenbanken
    console.log('📊 Vorhandene Datenbanken:');
    const databases = await driver.databases.list();

    if (databases && databases.length > 0) {
      databases.forEach(db => {
        console.log(`   - ${db}`);
      });
    } else {
      console.log('   (keine Datenbanken vorhanden)');
    }
    console.log('');

    // Prüfe ob Datenbank existiert
    const dbExists = databases && databases.includes(DATABASE_NAME);

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
        await driver.databases.delete(DATABASE_NAME);
        console.log('✅ Alte Datenbank gelöscht\n');
      } else {
        console.log('❌ Setup abgebrochen.');
        await driver.close();
        return;
      }
    }

    // Erstelle neue Datenbank
    console.log(`🆕 Erstelle Datenbank "${DATABASE_NAME}"...`);
    await driver.databases.create(DATABASE_NAME);
    console.log('✅ Datenbank erstellt!\n');

    // Lade Schema
    console.log('📄 Lade Schema-Datei...');
    const schemaPath = path.join(__dirname, 'typedb', 'schemas', 'meeting-schema.tql');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    console.log(`✅ Schema geladen (${schemaContent.length} Zeichen)\n`);

    // Öffne Schema Session und uploade Schema
    console.log('📤 Uploade Schema zu TypeDB Cloud...');

    try {
      const session = await driver.session(DATABASE_NAME, 'schema');

      try {
        const transaction = await session.transaction('write');

        try {
          await transaction.query.define(schemaContent);
          await transaction.commit();
          console.log('✅ Schema erfolgreich hochgeladen!\n');
        } catch (error) {
          console.error('❌ Fehler beim Schema-Upload:', error.message);
          await transaction.close();
          throw error;
        }
      } finally {
        await session.close();
      }
    } catch (error) {
      console.error('❌ Fehler bei Schema-Session:', error.message);
      throw error;
    }

    // Verifiziere Schema
    console.log('🔍 Verifiziere Schema...');

    try {
      const verifySession = await driver.session(DATABASE_NAME, 'data');

      try {
        const verifyTx = await verifySession.transaction('read');

        try {
          // Teste ob Entities definiert sind
          const entities = ['meeting', 'person', 'agenda-item', 'document', 'protocol'];
          console.log('\n📋 Definierte Entities:');

          for (const entity of entities) {
            try {
              const query = `match $x sub ${entity}; get;`;
              const result = await verifyTx.query.get(query);

              // Collect results
              const concepts = [];
              for await (const item of result) {
                concepts.push(item);
              }

              if (concepts.length > 0) {
                console.log(`   ✅ ${entity} (${concepts.length} gefunden)`);
              } else {
                console.log(`   ⚠️  ${entity} (keine Instanzen)`);
              }
            } catch (err) {
              console.log(`   ❌ ${entity} - Fehler: ${err.message}`);
            }
          }

          console.log('\n✅ Schema-Verifikation abgeschlossen!');
        } finally {
          await verifyTx.close();
        }
      } finally {
        await verifySession.close();
      }
    } catch (error) {
      console.log('⚠️  Verifikation übersprungen:', error.message);
    }

    // Zusammenfassung
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 SETUP ERFOLGREICH ABGESCHLOSSEN!');
    console.log('═'.repeat(60));
    console.log('\n📊 Datenbank-Info:');
    console.log(`   Name: ${DATABASE_NAME}`);
    console.log(`   URL: ${CLOUD_URL}`);
    console.log(`   Driver: typedb-driver-http v3.5.5`);
    console.log(`   Status: ✅ Aktiv mit Schema`);

    console.log('\n🔧 Environment Variables für DigitalOcean:');
    console.log('');
    console.log('   TYPEDB_IS_CLOUD=true');
    console.log(`   TYPEDB_CLOUD_URL=${CLOUD_URL}`);
    console.log(`   TYPEDB_USERNAME=${USERNAME}`);
    console.log(`   TYPEDB_PASSWORD=${PASSWORD}`);
    console.log(`   TYPEDB_DATABASE=${DATABASE_NAME}`);
    console.log('');

    console.log('📝 Nächste Schritte:');
    console.log('   1. ✅ Datenbank erstellt');
    console.log('   2. ✅ Schema hochgeladen');
    console.log('   3. ⏭️  Environment Variables in DigitalOcean setzen');
    console.log('   4. ⏭️  Remote-MCP-Server neu deployen');
    console.log('   5. ⏭️  TypeDB Connector im Code aktualisieren');
    console.log('   6. ⏭️  MCP Server Integration aktivieren');
    console.log('   7. ⏭️  End-to-End Test durchführen');
    console.log('');

  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    console.error('\nStack Trace:', error.stack);

    if (error.response) {
      console.error('\nAPI Response:', error.response.data);
    }

    process.exit(1);
  } finally {
    if (driver) {
      await driver.close();
      console.log('👋 Verbindung geschlossen.');
    }
  }
}

// Führe Setup aus
setupTypeDBCloud().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
