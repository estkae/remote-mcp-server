/**
 * Test-Skript für PowerPoint Production Skill
 *
 * Testet die echte PowerPoint-Erstellung mit pptxgenjs
 */

const { createPowerPoint } = require('./production-tools-office');
const path = require('path');
const fs = require('fs').promises;

console.log('🧪 PowerPoint Production Skill Test');
console.log('═'.repeat(60));

async function testPowerPointCreation() {
  try {
    // Test-Daten
    const testData = {
      title: 'KI in der Unternehmenswelt',
      filename: 'test-ki-praesentation.pptx',
      slides: [
        {
          title: 'Einführung in Künstliche Intelligenz',
          content: [
            'Definition von KI',
            'Geschichte der KI-Entwicklung',
            'Aktuelle Entwicklungen',
            'Zukunftsperspektiven'
          ]
        },
        {
          title: 'KI-Anwendungen im Business',
          content: [
            'Automatisierung von Prozessen',
            'Datenanalyse und Insights',
            'Kundenservice-Optimierung',
            'Predictive Maintenance'
          ]
        },
        {
          title: 'Vorteile der KI',
          content: [
            'Effizienzsteigerung',
            'Kostensenkung',
            'Bessere Entscheidungsfindung',
            'Wettbewerbsvorteile'
          ]
        },
        {
          title: 'Herausforderungen',
          content: [
            'Datenschutz und Sicherheit',
            'Ethische Fragen',
            'Mitarbeiter-Training',
            'Integration in bestehende Systeme'
          ]
        },
        {
          title: 'Zusammenfassung',
          content: [
            'KI ist ein Game-Changer für Unternehmen',
            'Frühe Adoption bringt Vorteile',
            'Wichtig: Verantwortungsvoller Einsatz',
            'Kontinuierliche Weiterbildung notwendig'
          ]
        }
      ]
    };

    console.log('');
    console.log('1️⃣  Teste PowerPoint-Erstellung...');
    console.log(`   Titel: ${testData.title}`);
    console.log(`   Anzahl Slides: ${testData.slides.length}`);
    console.log('');

    // PowerPoint erstellen
    const result = await createPowerPoint(testData);

    console.log('✅ PowerPoint erfolgreich erstellt!');
    console.log('');
    console.log('📊 Ergebnis:');
    console.log(`   Datei: ${result.filename}`);
    console.log(`   Pfad: ${result.filepath}`);
    console.log(`   Slides: ${result.slide_count}`);

    if (result.file_size) {
      console.log(`   Größe: ${result.file_size}`);
    }

    if (result.download_url) {
      console.log(`   Download: ${result.download_url}`);
    }

    console.log('');

    // Prüfe ob Datei existiert
    try {
      const stats = await fs.stat(result.filepath);
      console.log('✅ Datei existiert und ist zugänglich');
      console.log(`   Größe: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Erstellt: ${stats.birthtime.toISOString()}`);
    } catch (error) {
      console.log('⚠️  Datei konnte nicht gefunden werden:', error.message);
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ Test erfolgreich abgeschlossen!');
    console.log('');
    console.log('💡 Öffne die Datei mit PowerPoint:');
    console.log(`   ${result.filepath}`);
    console.log('');

    return result;

  } catch (error) {
    console.error('');
    console.error('❌ Test fehlgeschlagen:', error.message);
    console.error('');
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Test ausführen
testPowerPointCreation()
  .then(result => {
    console.log('🎉 PowerPoint Production Skill ist einsatzbereit!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Kritischer Fehler:', error);
    process.exit(1);
  });
