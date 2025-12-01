/**
 * TypeDB Cloud Setup Script - Official HTTP Driver v3.5.5
 * Erstellt die Datenbank und lädt das Schema hoch
 */

const { TypeDBHttpDriver, isApiErrorResponse } = require('typedb-driver-http');
const fs = require('fs').promises;
const path = require('path');

// TypeDB Cloud Credentials
const USERNAME = 'admin';
const PASSWORD = 'KFbnADleasOLRvkR';
const ADDRESSES = ['http://juj5l9-0.cluster.typedb.com:80']; // TypeDB Cloud port
const DATABASE_NAME = 'meeting_system';

async function setupTypeDBCloud() {
  let driver;

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   TypeDB Cloud Setup - HTTP Driver v3.5.5 (Official)     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('🔌 Verbinde mit TypeDB Cloud...');
    console.log(`   Addresses: ${ADDRESSES.join(', ')}`);
    console.log(`   Username: ${USERNAME}`);

    // Erstelle TypeDB HTTP Driver
    driver = new TypeDBHttpDriver({
      username: USERNAME,
      password: PASSWORD,
      addresses: ADDRESSES
    });

    console.log('✅ Driver initialisiert!\n');

    // Liste existierende Datenbanken
    console.log('📊 Lade Datenbanken...');
    const dbResponse = await driver.getDatabases();

    if (isApiErrorResponse(dbResponse)) {
      throw new Error(`API Error: ${JSON.stringify(dbResponse.err)}`);
    }

    const databases = dbResponse.ok;
    console.log('✅ Vorhandene Datenbanken:');
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
        const deleteResponse = await driver.deleteDatabase(DATABASE_NAME);

        if (isApiErrorResponse(deleteResponse)) {
          throw new Error(`Fehler beim Löschen: ${JSON.stringify(deleteResponse.err)}`);
        }

        console.log('✅ Alte Datenbank gelöscht\n');
      } else {
        console.log('❌ Setup abgebrochen.');
        return;
      }
    }

    // Erstelle neue Datenbank
    console.log(`🆕 Erstelle Datenbank "${DATABASE_NAME}"...`);
    const createResponse = await driver.createDatabase(DATABASE_NAME);

    if (isApiErrorResponse(createResponse)) {
      throw new Error(`Fehler beim Erstellen: ${JSON.stringify(createResponse.err)}`);
    }

    console.log('✅ Datenbank erstellt!\n');

    // Lade Schema
    console.log('📄 Lade Schema-Datei...');
    const schemaPath = path.join(__dirname, 'typedb', 'schemas', 'meeting-schema.tql');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    console.log(`✅ Schema geladen (${schemaContent.length} Zeichen)\n`);

    // Öffne Schema Transaction und uploade Schema
    console.log('📤 Uploade Schema zu TypeDB Cloud...');

    // Öffne Write Transaction für Schema
    const txResponse = await driver.openTransaction(DATABASE_NAME, 'schema', 'write');

    if (isApiErrorResponse(txResponse)) {
      throw new Error(`Fehler beim Öffnen der Transaction: ${JSON.stringify(txResponse.err)}`);
    }

    const transactionId = txResponse.ok.transactionId;
    console.log(`   Transaction ID: ${transactionId.substring(0, 20)}...`);

    try {
      // Führe Schema-Definition aus
      const queryResponse = await driver.query(transactionId, schemaContent);

      if (isApiErrorResponse(queryResponse)) {
        console.error('❌ Fehler beim Schema-Upload:', queryResponse.err);
        await driver.rollbackTransaction(transactionId);
        throw new Error(`Schema-Upload fehlgeschlagen: ${JSON.stringify(queryResponse.err)}`);
      }

      // Commit Transaction
      const commitResponse = await driver.commitTransaction(transactionId);

      if (isApiErrorResponse(commitResponse)) {
        throw new Error(`Commit fehlgeschlagen: ${JSON.stringify(commitResponse.err)}`);
      }

      console.log('✅ Schema erfolgreich hochgeladen und committed!\n');

    } catch (error) {
      console.error('❌ Fehler während Schema-Upload:', error.message);
      await driver.rollbackTransaction(transactionId);
      throw error;
    }

    // Verifiziere Schema
    console.log('🔍 Verifiziere Schema...');

    const verifyTxResponse = await driver.openTransaction(DATABASE_NAME, 'data', 'read');

    if (isApiErrorResponse(verifyTxResponse)) {
      console.log('⚠️  Verifikation übersprungen (Transaction-Fehler)');
    } else {
      const verifyTxId = verifyTxResponse.ok.transactionId;

      try {
        // Teste ob Entities definiert sind
        const entities = ['meeting', 'person', 'agenda-item', 'document', 'protocol'];
        console.log('\n📋 Definierte Entities:');

        for (const entity of entities) {
          const query = `match $x sub ${entity}; get;`;
          const result = await driver.query(verifyTxId, query);

          if (isApiErrorResponse(result)) {
            console.log(`   ❌ ${entity} - Fehler: ${JSON.stringify(result.err)}`);
          } else {
            const answer = result.ok;
            if (answer.answerType === 'conceptRows' && answer.answers) {
              console.log(`   ✅ ${entity} (${answer.answers.length} Konzepte gefunden)`);
            } else {
              console.log(`   ⚠️  ${entity} (keine Konzepte gefunden)`);
            }
          }
        }

        console.log('\n✅ Schema-Verifikation abgeschlossen!');

      } finally {
        await driver.closeTransaction(verifyTxId);
      }
    }

    // Zusammenfassung
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 SETUP ERFOLGREICH ABGESCHLOSSEN!');
    console.log('═'.repeat(60));
    console.log('\n📊 Datenbank-Info:');
    console.log(`   Name: ${DATABASE_NAME}`);
    console.log(`   Addresses: ${ADDRESSES.join(', ')}`);
    console.log(`   Driver: typedb-driver-http v3.5.5`);
    console.log(`   Status: ✅ Aktiv mit Schema`);

    console.log('\n🔧 Environment Variables für DigitalOcean:');
    console.log('');
    console.log('   TYPEDB_IS_CLOUD=true');
    console.log(`   TYPEDB_CLOUD_ADDRESSES=${ADDRESSES.join(',')}`);
    console.log(`   TYPEDB_USERNAME=${USERNAME}`);
    console.log(`   TYPEDB_PASSWORD=${PASSWORD}`);
    console.log(`   TYPEDB_DATABASE=${DATABASE_NAME}`);
    console.log('');

    console.log('📝 Nächste Schritte:');
    console.log('   1. ✅ TypeDB HTTP Driver v3.5.5 installiert');
    console.log('   2. ✅ Datenbank erstellt');
    console.log('   3. ✅ Schema hochgeladen');
    console.log('   4. ⏭️  Environment Variables in DigitalOcean setzen');
    console.log('   5. ⏭️  TypeDB Connector im Code aktualisieren');
    console.log('   6. ⏭️  Remote-MCP-Server neu deployen');
    console.log('   7. ⏭️  MCP Server Integration aktivieren');
    console.log('   8. ⏭️  End-to-End Test durchführen');
    console.log('');

  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    console.error('\nStack Trace:', error.stack);

    if (error.response) {
      console.error('\nAPI Response:', error.response.data);
    }

    process.exit(1);
  }
}

// Führe Setup aus
setupTypeDBCloud().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
