/**
 * TypeDB Cloud Connection Test
 *
 * Testet die Verbindung zu TypeDB Cloud
 */

require('dotenv').config();
const TypeDBCloudConnector = require('./typedb/typedb-cloud-connector');

async function testTypeDBCloud() {
  console.log('🚀 Testing TypeDB Cloud Connection...\n');

  try {
    // Config aus ENV
    const config = {
      isCloud: process.env.TYPEDB_IS_CLOUD === 'true',
      address: process.env.TYPEDB_CLOUD_ADDRESS,
      username: process.env.TYPEDB_USERNAME,
      password: process.env.TYPEDB_PASSWORD
    };

    console.log('📋 Configuration:');
    console.log(`   Type: ${config.isCloud ? 'Cloud' : 'Core'}`);
    console.log(`   Address: ${config.address}`);
    console.log(`   Username: ${config.username ? '***' : 'not set'}`);
    console.log(`   Password: ${config.password ? '***' : 'not set'}\n`);

    // Connector erstellen
    const typedb = new TypeDBCloudConnector(config);

    // Initialisieren
    console.log('🔌 Initializing connection...');
    await typedb.initialize();

    // Health Check
    console.log('\n💚 Health Check...');
    const health = await typedb.healthCheck();
    console.log('   Status:', health.status);
    console.log('   Type:', health.type);
    console.log('   Address:', health.address);
    console.log('   Database:', health.database);
    console.log('   DB Exists:', health.databaseExists);

    // Test: Person hinzufügen
    console.log('\n👤 Test: Add Person...');
    const personResult = await typedb.upsertPerson({
      name: 'Test User',
      email: 'test@example.com',
      role: 'gemeinderat'
    });

    if (personResult.success) {
      console.log(`   ✅ Person created: ${personResult.personId}`);
    } else {
      console.log(`   ❌ Person creation failed: ${personResult.error}`);
    }

    // Test: Alle Personen abrufen
    console.log('\n📋 Test: Get All Persons...');
    const persons = await typedb.getAllPersons();
    console.log(`   Found ${persons.length} person(s):`);
    persons.forEach(p => {
      console.log(`   - ${p.name} (${p.email}) [${p.role}]`);
    });

    // Test: Meeting erstellen
    console.log('\n📅 Test: Create Meeting...');
    const meetingResult = await typedb.createMeeting({
      date: '2025-11-15',
      time: '14:00',
      location: 'Rathaus, Sitzungszimmer 1',
      meeting_type: 'gemeinderat',
      topics: [
        {
          topic: 'Haushalt 2026',
          description: 'Diskussion des Haushaltsplans für 2026',
          priority: 8
        },
        {
          topic: 'Schulhaus-Sanierung',
          description: 'Update zum Baufortschritt',
          priority: 6
        }
      ],
      participants: [],
      created_by: 'test-script'
    });

    if (meetingResult.success) {
      console.log(`   ✅ Meeting created: ${meetingResult.meetingId}`);

      // Test: Meeting abrufen
      console.log('\n📖 Test: Get Meeting Details...');
      const meeting = await typedb.getMeetingDetails(meetingResult.meetingId);

      if (meeting) {
        console.log(`   ✅ Meeting retrieved:`);
        console.log(`      ID: ${meeting.id}`);
        console.log(`      Date: ${meeting.date}`);
        console.log(`      Time: ${meeting.time}`);
        console.log(`      Location: ${meeting.location}`);
        console.log(`      Type: ${meeting.type}`);
        console.log(`      Status: ${meeting.status}`);
        console.log(`      Agenda Items: ${meeting.agenda.length}`);
        meeting.agenda.forEach((item, idx) => {
          console.log(`         ${idx + 1}. ${item.topic} (Priority: ${item.priority})`);
        });
      } else {
        console.log(`   ❌ Meeting not found`);
      }

      // Test: Meetings suchen
      console.log('\n🔍 Test: Search Meetings...');
      const meetings = await typedb.searchMeetings({
        meeting_type: 'gemeinderat',
        status: 'scheduled'
      });
      console.log(`   Found ${meetings.length} meeting(s)`);
    } else {
      console.log(`   ❌ Meeting creation failed: ${meetingResult.error}`);
    }

    // Test: Intent-Analyse speichern
    console.log('\n🧠 Test: Store Intent Analysis...');
    const intentResult = await typedb.storeIntentAnalysis(
      'Ich brauche eine Sitzung nächste Woche',
      {
        intent: 'meeting_schedule',
        confidence: 0.92,
        entities: {
          date: '2025-11-12',
          meeting_type: 'gemeinderat'
        }
      }
    );

    if (intentResult.success) {
      console.log(`   ✅ Intent analysis stored: ${intentResult.analysisId}`);
    } else {
      console.log(`   ❌ Intent storage failed: ${intentResult.error}`);
    }

    // Close connection
    console.log('\n🔌 Closing connection...');
    await typedb.close();

    console.log('\n✅ All tests completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
testTypeDBCloud();
