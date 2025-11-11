# TypeDB Meeting Knowledge System

TypeDB Client für Autonomes Meeting System mit TypeDB 3.5.6

## Setup

```bash
# Dependencies installieren
npm install

# Test Connection
npm test
```

## Konfiguration

**Server:** `138.197.190.64:1729`
**Database:** `meeting-knowledge`

## Verwendung

### TypeScript/JavaScript

```typescript
import { meetingDB } from './typedb-client';

// Verbinden
await meetingDB.connect();

// Meeting erstellen
await meetingDB.createMeeting({
  meetingId: 'MTG-2025-001',
  date: new Date('2025-11-15'),
  time: '14:00',
  location: 'Konferenzraum A',
  type: 'Projektmeeting',
  status: 'scheduled',
  createdBy: 'admin'
});

// Person erstellen
await meetingDB.createPerson({
  personId: 'P-001',
  name: 'Max Mustermann',
  email: 'max@example.com',
  role: 'Projektleiter',
  department: 'IT'
});

// Teilnehmer hinzufügen
await meetingDB.addParticipant(
  'MTG-2025-001',
  'P-001',
  'confirmed',
  'organizer'
});

// Alle Meetings abrufen
const meetings = await meetingDB.getAllMeetings();

// Functions verwenden
const readyMeetings = await meetingDB.getMeetingsReadyToStart();
const missingDocs = await meetingDB.getAgendaItemsMissingDocuments();

// Schließen
await meetingDB.close();
```

## Verfügbare Functions

1. `meetings_ready_for_start()` - Meetings die bereit sind
2. `meetings_completed()` - Abgeschlossene Meetings
3. `agenda_items_missing_documents()` - Items ohne Dokumente
4. `protocols_awaiting_approval()` - Protokolle zur Freigabe
5. `meetings_without_agenda()` - Meetings ohne Agenda
6. `agenda_items_with_decisions()` - Items mit Beschlüssen

## Schema

- **10 Entities**: meeting, person, agenda-item, document, protocol, etc.
- **10 Relations**: meeting-participation, meeting-agenda, etc.
- **40+ Attributes**: Alle Meeting-relevanten Daten

## Files

- `typedb-client.ts` - Haupt-Client mit allen Operationen
- `test-connection.ts` - Connection Test Script
- `setup_meeting_schema.py` - Python Setup Script
- `schemas/meeting-schema.tql` - TypeDB Schema
- `schemas/meeting-rules.tql` - TypeDB Functions

## Testing

```bash
# Connection testen
npm test

# Beispiel ausführen
npm run example
```