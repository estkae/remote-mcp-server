/**
 * TypeDB Client für Meeting Knowledge System
 * TypeDB 3.5.6 | Server: 138.197.190.64:1729
 */

import { TypeDB, SessionType, TransactionType, TypeDBCredential } from 'typedb-driver';
import type { TypeDBDriver, TypeDBSession, TypeDBTransaction } from 'typedb-driver';

// Konfiguration
const CONFIG = {
  server: '138.197.190.64:1729',
  database: 'meeting-knowledge',
  // Für TypeDB Cloud mit Authentifizierung:
  // username: 'your-username',
  // password: 'your-password',
  // tlsEnabled: true
};

/**
 * TypeDB Connection Manager
 */
export class MeetingKnowledgeDB {
  private driver: TypeDBDriver | null = null;

  /**
   * Verbindung zum TypeDB Server herstellen
   */
  async connect(): Promise<void> {
    try {
      console.log(`🔌 Verbinde zu TypeDB: ${CONFIG.server}`);

      // TypeDB Core (Self-Hosted)
      this.driver = await TypeDB.coreDriver(CONFIG.server);

      // Für TypeDB Cloud:
      // const credential = new TypeDBCredential(CONFIG.username, CONFIG.password, CONFIG.tlsEnabled);
      // this.driver = await TypeDB.cloudDriver(CONFIG.server, credential);

      // Prüfe ob Database existiert
      const databases = await this.driver.databases.all();
      const dbExists = databases.some(db => db.name === CONFIG.database);

      if (!dbExists) {
        throw new Error(`Database '${CONFIG.database}' existiert nicht!`);
      }

      console.log(`✅ Verbindung hergestellt zu Database: ${CONFIG.database}`);
    } catch (error) {
      console.error('❌ Verbindungsfehler:', error);
      throw error;
    }
  }

  /**
   * Verbindung schließen
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      console.log('🔌 Verbindung geschlossen');
    }
  }

  /**
   * Session öffnen
   */
  async openSession(type: SessionType = SessionType.DATA): Promise<TypeDBSession> {
    if (!this.driver) {
      throw new Error('Keine aktive Verbindung. Bitte zuerst connect() aufrufen.');
    }
    return await this.driver.session(CONFIG.database, type);
  }

  /**
   * Write Transaction ausführen
   */
  async executeWrite<T>(
    callback: (tx: TypeDBTransaction) => Promise<T>
  ): Promise<T> {
    const session = await this.openSession(SessionType.DATA);
    try {
      const tx = await session.transaction(TransactionType.WRITE);
      try {
        const result = await callback(tx);
        await tx.commit();
        return result;
      } catch (error) {
        await tx.close();
        throw error;
      }
    } finally {
      await session.close();
    }
  }

  /**
   * Read Transaction ausführen
   */
  async executeRead<T>(
    callback: (tx: TypeDBTransaction) => Promise<T>
  ): Promise<T> {
    const session = await this.openSession(SessionType.DATA);
    try {
      const tx = await session.transaction(TransactionType.READ);
      try {
        const result = await callback(tx);
        return result;
      } finally {
        await tx.close();
      }
    } finally {
      await session.close();
    }
  }

  // ============================================
  // Meeting Operations
  // ============================================

  /**
   * Neues Meeting erstellen
   */
  async createMeeting(data: {
    meetingId: string;
    date: Date;
    time: string;
    location: string;
    type: string;
    status: string;
    createdBy: string;
  }): Promise<void> {
    await this.executeWrite(async (tx) => {
      const query = `
        insert
        $m isa meeting,
          has meeting-id "${data.meetingId}",
          has meeting-date ${data.date.toISOString()},
          has meeting-time "${data.time}",
          has meeting-location "${data.location}",
          has meeting-type "${data.type}",
          has status "${data.status}",
          has created-at ${new Date().toISOString()},
          has created-by "${data.createdBy}";
      `;
      await tx.query.insert(query);
      console.log(`✅ Meeting erstellt: ${data.meetingId}`);
    });
  }

  /**
   * Person erstellen
   */
  async createPerson(data: {
    personId: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    department?: string;
  }): Promise<void> {
    await this.executeWrite(async (tx) => {
      let query = `
        insert
        $p isa person,
          has person-id "${data.personId}",
          has name "${data.name}",
          has email "${data.email}"`;

      if (data.phone) query += `,\n          has phone "${data.phone}"`;
      if (data.role) query += `,\n          has person-role "${data.role}"`;
      if (data.department) query += `,\n          has department "${data.department}"`;

      query += ';';

      await tx.query.insert(query);
      console.log(`✅ Person erstellt: ${data.name}`);
    });
  }

  /**
   * Teilnehmer zu Meeting hinzufügen
   */
  async addParticipant(
    meetingId: string,
    personId: string,
    attendanceStatus: string = 'invited',
    roleInMeeting?: string
  ): Promise<void> {
    await this.executeWrite(async (tx) => {
      let query = `
        match
        $m isa meeting, has meeting-id "${meetingId}";
        $p isa person, has person-id "${personId}";
        insert
        $mp (meeting: $m, participant: $p) isa meeting-participation,
          has attendance-status "${attendanceStatus}",
          has invited-at ${new Date().toISOString()}`;

      if (roleInMeeting) {
        query += `,\n          has role-in-meeting "${roleInMeeting}"`;
      }

      query += ';';

      await tx.query.insert(query);
      console.log(`✅ Teilnehmer hinzugefügt: ${personId} → ${meetingId}`);
    });
  }

  /**
   * Alle Meetings abrufen
   */
  async getAllMeetings(): Promise<any[]> {
    return await this.executeRead(async (tx) => {
      const query = `
        match
        $m isa meeting,
          has meeting-id $id,
          has meeting-date $date,
          has status $status;
        get $m, $id, $date, $status;
      `;

      const iterator = tx.query.get(query);
      const results = [];

      for await (const result of iterator) {
        results.push({
          meetingId: result.get('id')?.value,
          date: result.get('date')?.value,
          status: result.get('status')?.value,
        });
      }

      return results;
    });
  }

  /**
   * Meeting mit allen Details abrufen
   */
  async getMeetingDetails(meetingId: string): Promise<any> {
    return await this.executeRead(async (tx) => {
      // Meeting Grunddaten
      const meetingQuery = `
        match
        $m isa meeting, has meeting-id "${meetingId}";
        get $m;
      `;

      const meetingIterator = tx.query.get(meetingQuery);
      const meetings = [];
      for await (const result of meetingIterator) {
        meetings.push(result.get('m'));
      }

      if (meetings.length === 0) {
        throw new Error(`Meeting ${meetingId} nicht gefunden`);
      }

      // Teilnehmer abrufen
      const participantsQuery = `
        match
        $m isa meeting, has meeting-id "${meetingId}";
        (meeting: $m, participant: $p) isa meeting-participation,
          has attendance-status $status;
        $p has name $name;
        get $p, $name, $status;
      `;

      const participantsIterator = tx.query.get(participantsQuery);
      const participants = [];
      for await (const result of participantsIterator) {
        participants.push({
          name: result.get('name')?.value,
          status: result.get('status')?.value,
        });
      }

      return {
        meeting: meetings[0],
        participants,
      };
    });
  }

  /**
   * TypeDB Functions aufrufen
   */
  async getMeetingsReadyToStart(): Promise<any[]> {
    return await this.executeRead(async (tx) => {
      const query = `
        match
        $m in meetings_ready_for_start();
        $m has meeting-id $id;
        get $m, $id;
      `;

      const iterator = tx.query.get(query);
      const results = [];

      for await (const result of iterator) {
        results.push({
          meetingId: result.get('id')?.value,
        });
      }

      return results;
    });
  }

  async getAgendaItemsMissingDocuments(): Promise<any[]> {
    return await this.executeRead(async (tx) => {
      const query = `
        match
        $ai in agenda_items_missing_documents();
        $ai has item-id $id, has topic $topic;
        get $ai, $id, $topic;
      `;

      const iterator = tx.query.get(query);
      const results = [];

      for await (const result of iterator) {
        results.push({
          itemId: result.get('id')?.value,
          topic: result.get('topic')?.value,
        });
      }

      return results;
    });
  }
}

/**
 * Singleton Instance
 */
export const meetingDB = new MeetingKnowledgeDB();

/**
 * Beispiel Verwendung
 */
export async function example() {
  try {
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
      createdBy: 'admin',
    });

    // Person erstellen
    await meetingDB.createPerson({
      personId: 'P-001',
      name: 'Max Mustermann',
      email: 'max@example.com',
      role: 'Projektleiter',
      department: 'IT',
    });

    // Teilnehmer hinzufügen
    await meetingDB.addParticipant(
      'MTG-2025-001',
      'P-001',
      'confirmed',
      'organizer'
    );

    // Meetings abrufen
    const meetings = await meetingDB.getAllMeetings();
    console.log('Alle Meetings:', meetings);

    // Functions verwenden
    const readyMeetings = await meetingDB.getMeetingsReadyToStart();
    console.log('Meetings bereit:', readyMeetings);

  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await meetingDB.close();
  }
}