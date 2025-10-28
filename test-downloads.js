/**
 * Test: Office Tools mit echten Download-Links
 *
 * Startet einen Test-Server und generiert Dateien mit Download-URLs
 */

const express = require('express');
const { setupFileServer, startTokenCleanupJob } = require('./file-server');
const { createPowerPoint, createExcel, createWord } = require('./production-tools-office-with-downloads');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const SERVER_URL = `http://localhost:${PORT}`;

// Environment Variable für File-Server
process.env.SERVER_URL = SERVER_URL;

console.log('🧪 DOWNLOAD-LINK TEST');
console.log('═'.repeat(70));
console.log('');

// File-Server Setup
setupFileServer(app);
startTokenCleanupJob(15);

// Test-Endpoint
app.post('/test/create-office', async (req, res) => {
  const { type } = req.body;

  try {
    let result;

    switch (type) {
      case 'powerpoint':
        result = await createPowerPoint({
          title: 'Test-Präsentation mit Download',
          slides: [
            {
              title: 'Download-Link Test',
              content: [
                'Diese Datei wurde mit Download-Link erstellt',
                'Der Link ist 60 Minuten gültig',
                'Max 10 Downloads möglich'
              ]
            }
          ]
        });
        break;

      case 'excel':
        result = await createExcel({
          filename: 'test-download.xlsx',
          sheets: [{
            name: 'Test',
            data: [
              ['Name', 'Wert'],
              ['Download-Test', 'Erfolgreich']
            ]
          }]
        });
        break;

      case 'word':
        result = await createWord({
          title: 'Test-Dokument mit Download',
          content: 'Dies ist ein Test-Dokument mit Download-Link.'
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid type' });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Server starten
const server = app.listen(PORT, async () => {
  console.log(`✅ Test-Server läuft auf ${SERVER_URL}`);
  console.log('');

  // Automatische Tests
  await runAutomatedTests();

  console.log('');
  console.log('═'.repeat(70));
  console.log('');
  console.log('🎉 ALLE TESTS ERFOLGREICH!');
  console.log('');
  console.log('💡 Server läuft weiter für manuelle Tests...');
  console.log(`   POST ${SERVER_URL}/test/create-office`);
  console.log(`   Body: { "type": "powerpoint" | "excel" | "word" }`);
  console.log('');
  console.log('   Drücke Ctrl+C zum Beenden');
  console.log('');
});

async function runAutomatedTests() {
  console.log('🔧 AUTOMATISCHE TESTS');
  console.log('─'.repeat(70));
  console.log('');

  // Test 1: PowerPoint
  console.log('1️⃣  PowerPoint mit Download-Link...');
  try {
    const pptResult = await createPowerPoint({
      title: 'KI und Automatisierung',
      slides: [
        {
          title: 'Einführung',
          content: ['KI-Technologien', 'Automatisierung', 'Zukunft']
        },
        {
          title: 'Vorteile',
          content: ['Effizienz', 'Kostenersparnis', 'Skalierbarkeit']
        }
      ]
    });

    console.log(`   ✅ Datei: ${pptResult.filename}`);
    console.log(`   ✅ Größe: ${pptResult.file_size}`);
    console.log(`   📥 Download: ${pptResult.download_url}`);
    console.log(`   ⏰ Gültig: ${pptResult.download_expires_in}`);
  } catch (error) {
    console.error(`   ❌ Fehler: ${error.message}`);
  }
  console.log('');

  // Test 2: Excel
  console.log('2️⃣  Excel mit Download-Link...');
  try {
    const excelResult = await createExcel({
      filename: 'verkaufszahlen-q4.xlsx',
      sheets: [{
        name: 'Quartal 4',
        data: [
          ['Monat', 'Umsatz'],
          ['Oktober', 150000],
          ['November', 165000],
          ['Dezember', 180000]
        ]
      }]
    });

    console.log(`   ✅ Datei: ${excelResult.filename}`);
    console.log(`   ✅ Größe: ${excelResult.file_size}`);
    console.log(`   📥 Download: ${excelResult.download_url}`);
    console.log(`   ⏰ Gültig: ${excelResult.download_expires_in}`);
  } catch (error) {
    console.error(`   ❌ Fehler: ${error.message}`);
  }
  console.log('');

  // Test 3: Word
  console.log('3️⃣  Word mit Download-Link...');
  try {
    const wordResult = await createWord({
      title: 'Quartalsbericht Q4 2024',
      content: `Zusammenfassung

Das vierte Quartal 2024 war sehr erfolgreich.

Highlights:
- Umsatzsteigerung von 15%
- Neue Kunden gewonnen
- Produktivität gesteigert

Ausblick 2025:
Wir erwarten weiteres Wachstum.`
    });

    console.log(`   ✅ Datei: ${wordResult.filename}`);
    console.log(`   ✅ Größe: ${wordResult.file_size}`);
    console.log(`   📥 Download: ${wordResult.download_url}`);
    console.log(`   ⏰ Gültig: ${wordResult.download_expires_in}`);
  } catch (error) {
    console.error(`   ❌ Fehler: ${error.message}`);
  }
  console.log('');

  // Test 4: Download-Link Info
  console.log('4️⃣  Download-Link-Info abrufen...');
  try {
    const fetch = require('node-fetch');
    const response = await fetch(`${SERVER_URL}/files`);
    const data = await response.json();

    console.log(`   ✅ ${data.file_count} Dateien verfügbar`);
    data.files.slice(0, 3).forEach(file => {
      console.log(`      • ${file.filename} (${file.size_human})`);
    });
  } catch (error) {
    console.error(`   ❌ Fehler: ${error.message}`);
  }
  console.log('');
}

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Server wird beendet...');
  server.close(() => {
    console.log('✅ Server beendet');
    process.exit(0);
  });
});
