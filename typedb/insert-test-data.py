"""
Test-Daten für TypeDB Meeting System einfügen
Erstellt Sample-Meetings, Personen und Teilnehmer
"""

from typedb.driver import SessionType, TransactionType
from datetime import datetime
from typedb_config import get_typedb_driver, DATABASE_NAME, print_config

def insert_test_data():
    print("=" * 60)
    print("TypeDB Meeting System - Test-Daten einfügen")
    print("=" * 60)
    print_config()
    print("=" * 60)

    try:
        with get_typedb_driver() as driver:
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
                            "role": "Designerin",
                            "dept": "UX"
                        }
                    ]

                    for p in persons:
                        query = f'''
                            insert
                            $p isa person,
                                has person-id "{p["id"]}",
                                has name "{p["name"]}",
                                has email "{p["email"]}",
                                has phone-number "{p["phone"]}",
                                has person-role "{p["role"]}",
                                has department "{p["dept"]}";
                        '''
                        tx.query.insert(query)

                    tx.commit()
                    print(f"   ✅ {len(persons)} Personen erstellt")

                # 2. Meeting erstellen
                print("\n📋 Erstelle Meeting...")
                with session.transaction(TransactionType.WRITE) as tx:
                    query = '''
                        insert
                        $m isa meeting,
                            has meeting-id "M-001",
                            has title "Sprint Planning Q1 2025",
                            has status "scheduled",
                            has start-time 2025-01-15T10:00:00,
                            has end-time 2025-01-15T12:00:00,
                            has location "Konferenzraum A";
                    '''
                    tx.query.insert(query)
                    tx.commit()
                    print("   ✅ Meeting erstellt")

                # 3. Teilnehmer hinzufügen
                print("\n📋 Füge Teilnehmer hinzu...")
                with session.transaction(TransactionType.WRITE) as tx:
                    participants = [
                        {"person": "P-001", "attendance": "confirmed"},
                        {"person": "P-002", "attendance": "confirmed"},
                        {"person": "P-003", "attendance": "tentative"}
                    ]

                    for part in participants:
                        query = f'''
                            match
                            $m isa meeting, has meeting-id "M-001";
                            $p isa person, has person-id "{part["person"]}";
                            insert
                            (meeting: $m, participant: $p) isa meeting-participation,
                                has attendance-status "{part["attendance"]}";
                        '''
                        tx.query.insert(query)

                    tx.commit()
                    print(f"   ✅ {len(participants)} Teilnehmer hinzugefügt")

                # 4. Agenda Items erstellen
                print("\n📋 Erstelle Agenda Items...")
                with session.transaction(TransactionType.WRITE) as tx:
                    agenda_items = [
                        {
                            "id": "AI-001",
                            "title": "Review letzter Sprint",
                            "description": "Rückblick auf abgeschlossene Tasks",
                            "priority": 10.0,
                            "duration": 30.0
                        },
                        {
                            "id": "AI-002",
                            "title": "Planung neuer Sprint",
                            "description": "Task-Verteilung und Schätzungen",
                            "priority": 9.0,
                            "duration": 60.0
                        }
                    ]

                    for ai in agenda_items:
                        query = f'''
                            insert
                            $ai isa agenda-item,
                                has agenda-item-id "{ai["id"]}",
                                has title "{ai["title"]}",
                                has description "{ai["description"]}",
                                has priority {ai["priority"]},
                                has estimated-duration {ai["duration"]};
                        '''
                        tx.query.insert(query)

                    tx.commit()
                    print(f"   ✅ {len(agenda_items)} Agenda Items erstellt")

                # 5. Agenda Items mit Meeting verknüpfen
                print("\n📋 Verknüpfe Agenda Items mit Meeting...")
                with session.transaction(TransactionType.WRITE) as tx:
                    query = '''
                        match
                        $m isa meeting, has meeting-id "M-001";
                        $ai1 isa agenda-item, has agenda-item-id "AI-001";
                        $ai2 isa agenda-item, has agenda-item-id "AI-002";
                        insert
                        (meeting: $m, item: $ai1) isa meeting-agenda,
                            has agenda-order 1.0;
                        (meeting: $m, item: $ai2) isa meeting-agenda,
                            has agenda-order 2.0;
                    '''
                    tx.query.insert(query)
                    tx.commit()
                    print("   ✅ Agenda Items verknüpft")

        print("\n" + "=" * 60)
        print("✅ Alle Test-Daten erfolgreich eingefügt!")
        print("=" * 60)
        print("Erstellt:")
        print("  • 3 Personen")
        print("  • 1 Meeting")
        print("  • 3 Teilnehmer")
        print("  • 2 Agenda Items")
        return True

    except Exception as e:
        print(f"\n❌ Fehler beim Einfügen der Daten:")
        print(f"   {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = insert_test_data()
    exit(0 if success else 1)
