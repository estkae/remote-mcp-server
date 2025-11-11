"""
Test-Daten für TypeDB Meeting System einfügen
Erstellt Sample-Meetings, Personen und Teilnehmer
"""

from typedb.driver import TypeDB, SessionType, TransactionType
from datetime import datetime

# Konfiguration
TYPEDB_SERVER = "138.197.190.64:1729"
DATABASE_NAME = "meeting-knowledge"

def insert_test_data():
    print("=" * 60)
    print("TypeDB Meeting System - Test-Daten einfügen")
    print("=" * 60)
    print(f"Server: {TYPEDB_SERVER}")
    print(f"Database: {DATABASE_NAME}")
    print("=" * 60)

    try:
        with TypeDB.core_driver(TYPEDB_SERVER) as driver:
            print("\n✅ Verbindung hergestellt")

            with driver.session(DATABASE_NAME, SessionType.DATA) as session:

                # 1. Personen erstellen
                print("\n📋 Erstelle Personen...")
                with session.transaction(TransactionType.WRITE) as tx:
                    persons = [
                        {
                            "id": "P-001",
                            "name": "Anna Schmidt",
                            "email": "anna.schmidt@example.com",
                            "phone": "+49 123 456789",
                            "role": "Projektleiterin",
                            "dept": "IT"
                        },
                        {
                            "id": "P-002",
                            "name": "Max Müller",
                            "email": "max.mueller@example.com",
                            "phone": "+49 123 456790",
                            "role": "Entwickler",
                            "dept": "IT"
                        },
                        {
                            "id": "P-003",
                            "name": "Lisa Weber",
                            "email": "lisa.weber@example.com",
                            "phone": "+49 123 456791",
                            "role": "Designer",
                            "dept": "Design"
                        }
                    ]

                    for p in persons:
                        query = f"""
                        insert
                        $p isa person,
                            has person-id "{p['id']}",
                            has name "{p['name']}",
                            has email "{p['email']}",
                            has phone "{p['phone']}",
                            has person-role "{p['role']}",
                            has department "{p['dept']}";
                        """
                        tx.query.insert(query)
                        print(f"   ✅ {p['name']}")

                    tx.commit()

                # 2. Meeting erstellen
                print("\n📋 Erstelle Meeting...")
                with session.transaction(TransactionType.WRITE) as tx:
                    now = datetime.now().isoformat()
                    meeting_date = "2025-11-15T14:00:00"

                    query = f"""
                    insert
                    $m isa meeting,
                        has meeting-id "MTG-2025-001",
                        has meeting-date {meeting_date},
                        has meeting-time "14:00",
                        has meeting-location "Konferenzraum A",
                        has meeting-type "Projektmeeting",
                        has status "scheduled",
                        has created-at {now},
                        has created-by "admin";
                    """
                    tx.query.insert(query)
                    tx.commit()
                    print("   ✅ Meeting MTG-2025-001")

                # 3. Teilnehmer hinzufügen
                print("\n📋 Füge Teilnehmer hinzu...")
                with session.transaction(TransactionType.WRITE) as tx:
                    now = datetime.now().isoformat()

                    participants = [
                        {"person": "P-001", "status": "confirmed", "role": "organizer"},
                        {"person": "P-002", "status": "confirmed", "role": "participant"},
                        {"person": "P-003", "status": "pending", "role": "participant"}
                    ]

                    for part in participants:
                        query = f"""
                        match
                        $m isa meeting, has meeting-id "MTG-2025-001";
                        $p isa person, has person-id "{part['person']}";
                        insert
                        $mp (meeting: $m, participant: $p) isa meeting-participation,
                            has attendance-status "{part['status']}",
                            has role-in-meeting "{part['role']}",
                            has invited-at {now};
                        """
                        tx.query.insert(query)
                        print(f"   ✅ {part['person']} ({part['status']})")

                    tx.commit()

                # 4. Agenda Items erstellen
                print("\n📋 Erstelle Agenda Items...")
                with session.transaction(TransactionType.WRITE) as tx:
                    items = [
                        {
                            "id": "AI-001",
                            "topic": "Projektstand Review",
                            "desc": "Besprechung des aktuellen Projektstands",
                            "priority": 9,
                            "duration": 30,
                            "order": 1
                        },
                        {
                            "id": "AI-002",
                            "topic": "Nächste Schritte",
                            "desc": "Planung der nächsten Entwicklungsschritte",
                            "priority": 7,
                            "duration": 20,
                            "order": 2
                        }
                    ]

                    for item in items:
                        query = f"""
                        insert
                        $ai isa agenda-item,
                            has item-id "{item['id']}",
                            has topic "{item['topic']}",
                            has description "{item['desc']}",
                            has priority {item['priority']},
                            has duration-minutes {item['duration']},
                            has order-index {item['order']},
                            has status "pending";
                        """
                        tx.query.insert(query)
                        print(f"   ✅ {item['topic']}")

                    tx.commit()

                # 5. Agenda Items mit Meeting verknüpfen
                print("\n📋 Verknüpfe Agenda Items mit Meeting...")
                with session.transaction(TransactionType.WRITE) as tx:
                    for item_id in ["AI-001", "AI-002"]:
                        query = f"""
                        match
                        $m isa meeting, has meeting-id "MTG-2025-001";
                        $ai isa agenda-item, has item-id "{item_id}";
                        insert
                        $ma (meeting: $m, item: $ai) isa meeting-agenda;
                        """
                        tx.query.insert(query)
                        print(f"   ✅ {item_id}")

                    tx.commit()

                print("\n" + "=" * 60)
                print("✅ Test-Daten erfolgreich eingefügt!")
                print("=" * 60)
                print("\nErstellt:")
                print("  • 3 Personen")
                print("  • 1 Meeting")
                print("  • 3 Teilnehmer")
                print("  • 2 Agenda Items")

    except Exception as e:
        print(f"\n❌ Fehler: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    insert_test_data()