"""
TypeDB Initial-Daten Loader - Gemeindeverwaltung Meeting System
"""
from typedb.driver import SessionType, TransactionType
from typedb_config import get_typedb_driver, DATABASE_NAME, print_config

def load_initial_data():
    print("=" * 70)
    print("TypeDB Meeting System - Initial-Daten laden")
    print("=" * 70)
    print_config()
    print("=" * 70)

    try:
        with get_typedb_driver() as driver:
            print("\n✅ Verbindung hergestellt")
            with driver.session(DATABASE_NAME, SessionType.DATA) as session:

                # 1. Personen
                print("\n📋 Personen...")
                with session.transaction(TransactionType.WRITE) as tx:
                    persons = [
                        {"id": "P-001", "name": "Anna Schmidt", "email": "anna.schmidt@gemeinde.ch", "phone": "+41 31 123 4501", "role": "Gemeindepraesidentin", "dept": "Verwaltung"},
                        {"id": "P-002", "name": "Peter Mueller", "email": "peter.mueller@gemeinde.ch", "phone": "+41 31 123 4502", "role": "Gemeinderat", "dept": "Finanzen"},
                        {"id": "P-003", "name": "Maria Weber", "email": "maria.weber@gemeinde.ch", "phone": "+41 31 123 4503", "role": "Gemeinderaet in", "dept": "Bildung"},
                        {"id": "P-004", "name": "Thomas Meier", "email": "thomas.meier@gemeinde.ch", "phone": "+41 31 123 4504", "role": "Gemeinderat", "dept": "Bau"},
                        {"id": "P-005", "name": "Lisa Keller", "email": "lisa.keller@gemeinde.ch", "phone": "+41 31 123 4505", "role": "Gemeinderaetin", "dept": "Soziales"},
                        {"id": "P-006", "name": "Hans Fischer", "email": "hans.fischer@gemeinde.ch", "phone": "+41 31 123 4506", "role": "Gemeindeschreiber", "dept": "Verwaltung"},
                        {"id": "P-007", "name": "Sarah Steiner", "email": "sarah.steiner@gemeinde.ch", "phone": "+41 31 123 4507", "role": "Protokollfuehrerin", "dept": "Verwaltung"}
                    ]
                    for p in persons:
                        query = f'insert $p isa person, has person-id "{p["id"]}", has name "{p["name"]}", has email "{p["email"]}", has phone-number "{p["phone"]}", has person-role "{p["role"]}", has department "{p["dept"]}";'
                        tx.query.insert(query)
                    tx.commit()
                    print(f"   ✅ {len(persons)} Personen")

                # 2. Meetings
                print("\n📋 Meetings...")
                with session.transaction(TransactionType.WRITE) as tx:
                    meetings = [
                        {"id": "M-2025-001", "title": "Gemeinderatssitzung November 2025", "status": "completed", "start": "2025-11-12T14:00:00", "end": "2025-11-12T17:30:00", "location": "Rathaus Sitzungszimmer 1"},
                        {"id": "M-2025-002", "title": "Budgetsitzung 2026", "status": "scheduled", "start": "2025-12-05T09:00:00", "end": "2025-12-05T12:00:00", "location": "Rathaus Sitzungszimmer 1"},
                        {"id": "M-2025-003", "title": "Ausschusssitzung Bau", "status": "scheduled", "start": "2025-11-25T10:00:00", "end": "2025-11-25T11:30:00", "location": "Bauamt"}
                    ]
                    for m in meetings:
                        query = f'insert $m isa meeting, has meeting-id "{m["id"]}", has title "{m["title"]}", has status "{m["status"]}", has start-time {m["start"]}, has end-time {m["end"]}, has location "{m["location"]}";'
                        tx.query.insert(query)
                    tx.commit()
                    print(f"   ✅ {len(meetings)} Meetings")

                # 3. Teilnehmer
                print("\n📋 Teilnehmer...")
                with session.transaction(TransactionType.WRITE) as tx:
                    for pid in ["P-001", "P-002", "P-003", "P-004", "P-005", "P-006", "P-007"]:
                        query = f'match $m isa meeting, has meeting-id "M-2025-001"; $p isa person, has person-id "{pid}"; insert (meeting: $m, participant: $p) isa meeting-participation, has attendance-status "confirmed";'
                        tx.query.insert(query)
                    tx.commit()
                    print("   ✅ 7 Teilnehmer")

                # 4. Agenda
                print("\n📋 Agenda Items...")
                with session.transaction(TransactionType.WRITE) as tx:
                    agenda = [
                        {"id": "AI-001", "title": "Begruess ung", "desc": "Eroeffnung", "prio": 10.0, "dur": 5.0},
                        {"id": "AI-002", "title": "Protokoll Genehmigung", "desc": "Protokoll 15.10.2025", "prio": 9.0, "dur": 10.0},
                        {"id": "AI-003", "title": "Baugesuch Hauptstrasse 45", "desc": "Neubau 6 Wohnungen", "prio": 8.0, "dur": 30.0},
                        {"id": "AI-004", "title": "Budget 2026", "desc": "Erste Lesung", "prio": 10.0, "dur": 60.0}
                    ]
                    for ai in agenda:
                        query = f'insert $ai isa agenda-item, has agenda-item-id "{ai["id"]}", has title "{ai["title"]}", has description "{ai["desc"]}", has priority {ai["prio"]}, has estimated-duration {ai["dur"]};'
                        tx.query.insert(query)
                    tx.commit()
                    print(f"   ✅ {len(agenda)} Agenda Items")

                # 5. Verknüpfe
                print("\n📋 Verknuepfe Agenda...")
                with session.transaction(TransactionType.WRITE) as tx:
                    for i, aid in enumerate(["AI-001", "AI-002", "AI-003", "AI-004"], 1):
                        query = f'match $m isa meeting, has meeting-id "M-2025-001"; $ai isa agenda-item, has agenda-item-id "{aid}"; insert (meeting: $m, item: $ai) isa meeting-agenda, has agenda-order {float(i)};'
                        tx.query.insert(query)
                    tx.commit()
                    print("   ✅ Verknuepft")

        print("\n" + "=" * 70)
        print("✅ Initial-Daten geladen!")
        print("=" * 70)
        print("📊 7 Personen, 3 Meetings, 7 Teilnehmer, 4 Agenda Items")
        print('🔍 Test: "Gib mir alle Personen der letzten Sitzung vom 12.11.2025"')
        print("=" * 70)
        return True
    except Exception as e:
        print(f"\n❌ Fehler: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = load_initial_data()
    exit(0 if success else 1)
