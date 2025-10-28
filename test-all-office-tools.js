/**
 * Kompletter Test für alle Office Production Tools
 *
 * Testet: PowerPoint, Excel, Word
 */

const { executeOfficeTool, createPowerPoint, createExcel, createWord } = require('./production-tools-office');
const path = require('path');
const fs = require('fs').promises;

console.log('🧪 OFFICE PRODUCTION TOOLS - VOLLSTÄNDIGER TEST');
console.log('═'.repeat(70));
console.log('');

async function testAllOfficeTools() {
  const results = {
    powerpoint: null,
    excel: null,
    word: null,
    success: 0,
    failed: 0
  };

  try {
    // ===== TEST 1: PowerPoint =====
    console.log('1️⃣  TEST: PowerPoint-Erstellung');
    console.log('─'.repeat(70));

    try {
      const pptResult = await createPowerPoint({
        title: 'Digitale Transformation 2025',
        filename: 'digitale-transformation.pptx',
        slides: [
          {
            title: 'Was ist Digitale Transformation?',
            content: [
              'Definition und Bedeutung',
              'Historische Entwicklung',
              'Aktuelle Trends',
              'Zukunftsperspektiven'
            ]
          },
          {
            title: 'Technologische Enabler',
            content: [
              'Cloud Computing',
              'Künstliche Intelligenz',
              'Internet of Things (IoT)',
              'Big Data & Analytics'
            ]
          },
          {
            title: 'Geschäftsprozesse',
            content: [
              'Automatisierung',
              'Digitalisierung von Workflows',
              'Customer Journey Mapping',
              'Agile Methoden'
            ]
          }
        ]
      });

      results.powerpoint = pptResult;
      results.success++;

      console.log(`✅ PowerPoint erfolgreich erstellt`);
      console.log(`   Datei: ${pptResult.filename}`);
      console.log(`   Größe: ${pptResult.file_size}`);
      console.log(`   Slides: ${pptResult.slide_count}`);
    } catch (error) {
      results.failed++;
      console.error(`❌ PowerPoint fehlgeschlagen: ${error.message}`);
    }

    console.log('');

    // ===== TEST 2: Excel =====
    console.log('2️⃣  TEST: Excel-Erstellung');
    console.log('─'.repeat(70));

    try {
      const excelResult = await createExcel({
        filename: 'quartalsbericht-q4-2024.xlsx',
        sheets: [
          {
            name: 'Umsatzdaten',
            data: [
              ['Monat', 'Umsatz (EUR)', 'Kosten (EUR)', 'Gewinn (EUR)', 'Marge (%)'],
              ['Oktober', 125000, 75000, 50000, 40],
              ['November', 135000, 80000, 55000, 41],
              ['Dezember', 150000, 85000, 65000, 43],
              ['SUMME Q4', 410000, 240000, 170000, 41.5]
            ]
          },
          {
            name: 'Kundendaten',
            data: [
              ['Kunde', 'Region', 'Umsatz (EUR)', 'Vertrag', 'Status'],
              ['AALS Software AG', 'DACH', 85000, 'Enterprise', 'Aktiv'],
              ['TechCorp GmbH', 'DACH', 120000, 'Premium', 'Aktiv'],
              ['InnovateCo', 'EU', 95000, 'Standard', 'Aktiv'],
              ['GlobalTech', 'International', 110000, 'Enterprise', 'Verhandlung']
            ]
          },
          {
            name: 'KPIs',
            data: [
              ['KPI', 'Zielwert', 'Ist-Wert', 'Abweichung', 'Status'],
              ['Umsatzwachstum (%)', 15, 18, '+3%', '✓'],
              ['Kundenzufriedenheit', 4.5, 4.7, '+0.2', '✓'],
              ['Mitarbeiterzufriedenheit', 4.0, 4.2, '+0.2', '✓'],
              ['Projektabschlussrate (%)', 95, 97, '+2%', '✓']
            ]
          }
        ]
      });

      results.excel = excelResult;
      results.success++;

      console.log(`✅ Excel erfolgreich erstellt`);
      console.log(`   Datei: ${excelResult.filename}`);
      console.log(`   Größe: ${excelResult.file_size}`);
      console.log(`   Sheets: ${excelResult.sheet_count}`);
    } catch (error) {
      results.failed++;
      console.error(`❌ Excel fehlgeschlagen: ${error.message}`);
    }

    console.log('');

    // ===== TEST 3: Word =====
    console.log('3️⃣  TEST: Word-Dokument-Erstellung');
    console.log('─'.repeat(70));

    try {
      const wordResult = await createWord({
        title: 'Projektbericht: Digitale Transformation',
        filename: 'projektbericht-digital.docx',
        content: `Zusammenfassung

Das Projekt "Digitale Transformation 2025" wurde erfolgreich abgeschlossen. Alle Meilensteine wurden termingerecht erreicht.

Projektziele

1. Implementierung einer Cloud-basierten Infrastruktur
2. Einführung von KI-gestützten Prozessen
3. Schulung aller Mitarbeiter
4. Migration bestehender Systeme

Ergebnisse

Die Projektziele wurden zu 100% erreicht. Die neue Infrastruktur läuft stabil und hat die Effizienz um 35% gesteigert.

Die Mitarbeiterschulungen wurden mit einer Zufriedenheitsrate von 4.7/5.0 abgeschlossen.

Nächste Schritte

1. Monitoring und Optimierung der neuen Systeme
2. Erweiterung auf weitere Geschäftsbereiche
3. Kontinuierliche Weiterbildung der Mitarbeiter
4. Evaluation nach 6 Monaten

Fazit

Das Projekt war ein voller Erfolg und hat die Grundlage für die digitale Zukunft des Unternehmens gelegt.`
      });

      results.word = wordResult;
      results.success++;

      console.log(`✅ Word erfolgreich erstellt`);
      console.log(`   Datei: ${wordResult.filename}`);
      console.log(`   Größe: ${wordResult.file_size}`);
      console.log(`   Titel: ${wordResult.title}`);
    } catch (error) {
      results.failed++;
      console.error(`❌ Word fehlgeschlagen: ${error.message}`);
    }

    console.log('');
    console.log('═'.repeat(70));
    console.log('');

    // ===== ZUSAMMENFASSUNG =====
    console.log('📊 TEST-ZUSAMMENFASSUNG:');
    console.log('');
    console.log(`   ✅ Erfolgreich: ${results.success}/3`);
    console.log(`   ❌ Fehlgeschlagen: ${results.failed}/3`);
    console.log('');

    if (results.success === 3) {
      console.log('🎉 ALLE OFFICE PRODUCTION TOOLS FUNKTIONIEREN!');
      console.log('');
      console.log('📁 Generierte Dateien:');
      if (results.powerpoint) console.log(`   • PowerPoint: ${results.powerpoint.filepath}`);
      if (results.excel) console.log(`   • Excel: ${results.excel.filepath}`);
      if (results.word) console.log(`   • Word: ${results.word.filepath}`);
      console.log('');
      console.log('✅ Remote-MCP-Server ist PRODUCTION-READY für Office-Dokumente!');
      return 0;
    } else {
      console.log('⚠️  Einige Tests sind fehlgeschlagen. Bitte Fehler überprüfen.');
      return 1;
    }

  } catch (error) {
    console.error('');
    console.error('💥 KRITISCHER FEHLER:', error.message);
    console.error('Stack:', error.stack);
    return 1;
  }
}

// Tests ausführen
testAllOfficeTools()
  .then(exitCode => {
    console.log('');
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('💥 Unerwarteter Fehler:', error);
    process.exit(1);
  });
