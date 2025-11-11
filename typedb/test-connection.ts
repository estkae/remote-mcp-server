/**
 * Test Script für TypeDB Connection
 * Testet Verbindung und grundlegende Operationen
 */

import { meetingDB } from './typedb-client';

async function testConnection() {
  console.log('='.repeat(60));
  console.log('TypeDB Meeting System - Connection Test');
  console.log('='.repeat(60));

  try {
    // 1. Verbindung testen
    console.log('\n📋 Test 1: Verbindung herstellen');
    await meetingDB.connect();

    // 2. Meetings abrufen
    console.log('\n📋 Test 2: Alle Meetings abrufen');
    const meetings = await meetingDB.getAllMeetings();
    console.log(`   Gefunden: ${meetings.length} Meetings`);
    if (meetings.length > 0) {
      console.log('   Erste 3:', meetings.slice(0, 3));
    }

    // 3. Functions testen
    console.log('\n📋 Test 3: Functions testen');

    console.log('   → Meetings bereit zum Start:');
    const readyMeetings = await meetingDB.getMeetingsReadyToStart();
    console.log(`     ${readyMeetings.length} gefunden`);

    console.log('   → Agenda Items ohne Dokumente:');
    const missingDocs = await meetingDB.getAgendaItemsMissingDocuments();
    console.log(`     ${missingDocs.length} gefunden`);

    console.log('\n✅ Alle Tests erfolgreich!');

  } catch (error: any) {
    console.error('\n❌ Test fehlgeschlagen:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await meetingDB.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test abgeschlossen');
  console.log('='.repeat(60));
}

// Test ausführen
testConnection();