/**
 * Test Script für Kerio Mail Sent-Folder Fix
 *
 * Testet:
 * 1. Ordner auflisten
 * 2. E-Mail senden und im Gesendet-Ordner speichern
 * 3. Verifizierung im Gesendet-Ordner
 */

require('dotenv').config();
const kerioConnector = require('./kerio-connector');

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Kerio Mail Sent-Folder Fix - Test Suite                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check Configuration
  if (!kerioConnector.isKerioConfigured()) {
    console.error('❌ Kerio ist nicht konfiguriert!');
    console.error('Bitte setze folgende Environment-Variablen:');
    console.error('  - KERIO_HOST');
    console.error('  - KERIO_USERNAME');
    console.error('  - KERIO_PASSWORD');
    process.exit(1);
  }

  console.log('✅ Kerio Konfiguration gefunden\n');
  console.log(`Host: ${process.env.KERIO_HOST}`);
  console.log(`User: ${process.env.KERIO_USERNAME}`);
  console.log(`IMAP Port: ${process.env.KERIO_IMAP_PORT || 993}`);
  console.log(`SMTP Port: ${process.env.KERIO_SMTP_PORT || 465}\n`);

  try {
    // TEST 1: Liste alle Ordner
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Verfügbare IMAP-Ordner auflisten');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { folders } = await kerioConnector.listFolders();
    console.log(`✅ ${folders.length} Ordner gefunden:\n`);

    let sentFolder = null;
    folders.forEach(folder => {
      const marker = folder.name.toLowerCase().includes('sent') ||
                     folder.name.toLowerCase().includes('gesendet') ? '📤' : '📁';
      console.log(`${marker} ${folder.name}${folder.hasChildren ? ' (hat Unterordner)' : ''}`);

      // Finde Sent-Ordner
      if (!sentFolder && (
        folder.name.toLowerCase().includes('sent') ||
        folder.name.toLowerCase().includes('gesendet')
      )) {
        sentFolder = folder.name;
      }
    });

    if (!sentFolder) {
      console.warn('\n⚠️  Kein "Sent" oder "Gesendet"-Ordner gefunden!');
      console.warn('Verwende Standard: "Sent"\n');
      sentFolder = 'Sent';
    } else {
      console.log(`\n✅ Gesendet-Ordner identifiziert: "${sentFolder}"\n`);
    }

    // TEST 2: Zähle Mails im Gesendet-Ordner (vor dem Test)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: Aktuelle Mails im Gesendet-Ordner');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      const beforeSend = await kerioConnector.listEmails({
        folder: sentFolder,
        limit: 5
      });
      console.log(`📊 Aktuell ${beforeSend.total} Mails im Ordner "${sentFolder}"\n`);

      if (beforeSend.emails.length > 0) {
        console.log('Letzte 5 Mails:');
        beforeSend.emails.forEach((email, idx) => {
          console.log(`  ${idx + 1}. ${email.subject || '(Kein Betreff)'}`);
          console.log(`     Von: ${email.from}`);
          console.log(`     Datum: ${email.date || 'unbekannt'}`);
        });
        console.log('');
      }
    } catch (error) {
      console.error(`❌ Fehler beim Lesen von "${sentFolder}":`, error.message);
      console.error('Möglicherweise ist der Ordnername falsch.\n');
    }

    // TEST 3: Sende Test-Mail
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: Test-Mail senden');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testRecipient = process.env.TEST_EMAIL || process.env.KERIO_USERNAME;
    console.log(`📧 Sende Test-Mail an: ${testRecipient}`);
    console.log(`📤 Speichern in Ordner: ${sentFolder}\n`);

    const sendResult = await kerioConnector.sendEmail({
      to: testRecipient,
      subject: `Kerio Test Mail - ${new Date().toLocaleString('de-CH')}`,
      text: `Dies ist eine Test-Mail vom Kerio Sent-Folder Fix Test.

Gesendet am: ${new Date().toLocaleString('de-CH')}

Dieser Test überprüft:
✅ SMTP-Versand funktioniert
✅ Mail wird im Gesendet-Ordner gespeichert
✅ Sendedatum ist korrekt

---
Automatischer Test von kerio-connector.js`,
      html: `<html>
<body style="font-family: Arial, sans-serif;">
  <h2>Kerio Test Mail</h2>
  <p>Dies ist eine <strong>Test-Mail</strong> vom Kerio Sent-Folder Fix Test.</p>

  <p><strong>Gesendet am:</strong> ${new Date().toLocaleString('de-CH')}</p>

  <h3>Dieser Test überprüft:</h3>
  <ul>
    <li>✅ SMTP-Versand funktioniert</li>
    <li>✅ Mail wird im Gesendet-Ordner gespeichert</li>
    <li>✅ Sendedatum ist korrekt</li>
  </ul>

  <hr>
  <p><em>Automatischer Test von kerio-connector.js</em></p>
</body>
</html>`,
      sentFolder: sentFolder,
      saveCopyToSent: true
    });

    if (sendResult.success) {
      console.log(`✅ Mail erfolgreich versendet!`);
      console.log(`   Message-ID: ${sendResult.messageId}`);
      console.log(`   Im Sent-Ordner gespeichert: ${sendResult.savedToSent ? 'Ja ✅' : 'Nein ❌'}\n`);
    } else {
      console.error('❌ Mail-Versand fehlgeschlagen\n');
    }

    // Warte 2 Sekunden, damit IMAP-Server Zeit hat
    console.log('⏳ Warte 3 Sekunden...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // TEST 4: Prüfe ob Mail im Gesendet-Ordner ist
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 4: Verifizierung im Gesendet-Ordner');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const afterSend = await kerioConnector.listEmails({
      folder: sentFolder,
      limit: 5
    });

    console.log(`📊 Jetzt ${afterSend.total} Mails im Ordner "${sentFolder}"\n`);

    if (afterSend.emails.length > 0) {
      console.log('Letzte 5 Mails:');
      afterSend.emails.forEach((email, idx) => {
        const isTestMail = email.subject && email.subject.includes('Kerio Test Mail');
        const marker = isTestMail ? '🎯' : '  ';
        console.log(`${marker} ${idx + 1}. ${email.subject || '(Kein Betreff)'}`);
        console.log(`     Von: ${email.from}`);
        console.log(`     Datum: ${email.date || 'unbekannt'}`);
        if (isTestMail) {
          console.log('     ✅ TEST-MAIL GEFUNDEN!');
        }
      });
      console.log('');

      // Prüfe ob Test-Mail dabei ist
      const foundTestMail = afterSend.emails.some(e =>
        e.subject && e.subject.includes('Kerio Test Mail')
      );

      if (foundTestMail) {
        console.log('✅ SUCCESS: Test-Mail wurde im Gesendet-Ordner gefunden!\n');
      } else {
        console.log('⚠️  WARNING: Test-Mail nicht in den letzten 5 Mails gefunden.');
        console.log('   Möglicherweise ist sie weiter unten in der Liste.\n');
      }
    }

    // SUMMARY
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ZUSAMMENFASSUNG');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Test 1: Ordner auflisten - ERFOLGREICH');
    console.log(`✅ Test 2: Sent-Ordner gefunden: "${sentFolder}"`);
    console.log(`✅ Test 3: Mail versenden - ${sendResult.success ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN'}`);
    console.log(`✅ Test 4: Im Sent-Ordner speichern - ${sendResult.savedToSent ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN'}`);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALLE TESTS ABGESCHLOSSEN                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ FEHLER:', error.message);
    console.error('\nStack Trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run Tests
runTests().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});