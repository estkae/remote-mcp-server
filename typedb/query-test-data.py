"""
Test-Daten abfragen und Functions testen
"""

from typedb.driver import TypeDB, SessionType, TransactionType

# Konfiguration
TYPEDB_SERVER = "138.197.190.64:1729"
DATABASE_NAME = "meeting-knowledge"

def query_test_data():
    print("=" * 60)
    print("TypeDB Meeting System - Daten abfragen")
    print("=" * 60)

    try:
        with TypeDB.core_driver(TYPEDB_SERVER) as driver:
            print("\n✅ Verbindung hergestellt")

            with driver.session(DATABASE_NAME, SessionType.DATA) as session:

                # 1. Alle Meetings
                print("\n📋 Query 1: Alle Meetings")
                with session.transaction(TransactionType.READ) as tx:
                    query = """
                    match
                    $m isa meeting,
                        has meeting-id $id,
                        has meeting-date $date,
                        has status $status;
                    get $m, $id, $date, $status;
                    """
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} Meetings")
                    for r in result:
                        mid = r.get('id').get_value() if r.get('id') else 'N/A'
                        status = r.get('status').get_value() if r.get('status') else 'N/A'
                        print(f"   - {mid}: {status}")

                # 2. Alle Personen
                print("\n📋 Query 2: Alle Personen")
                with session.transaction(TransactionType.READ) as tx:
                    query = """
                    match
                    $p isa person,
                        has person-id $id,
                        has name $name;
                    get $p, $id, $name;
                    """
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} Personen")
                    for r in result:
                        pid = r.get('id').get_value() if r.get('id') else 'N/A'
                        name = r.get('name').get_value() if r.get('name') else 'N/A'
                        print(f"   - {pid}: {name}")

                # 3. Meeting mit Teilnehmern
                print("\n📋 Query 3: Meeting mit Teilnehmern")
                with session.transaction(TransactionType.READ) as tx:
                    query = """
                    match
                    $m isa meeting, has meeting-id "MTG-2025-001";
                    (meeting: $m, participant: $p) isa meeting-participation,
                        has attendance-status $status;
                    $p has name $name;
                    get $name, $status;
                    """
                    result = list(tx.query.get(query))
                    print(f"   Teilnehmer: {len(result)}")
                    for r in result:
                        name = r.get('name').get_value() if r.get('name') else 'N/A'
                        status = r.get('status').get_value() if r.get('status') else 'N/A'
                        print(f"   - {name}: {status}")

                # 4. Agenda Items für Meeting
                print("\n📋 Query 4: Agenda Items für Meeting")
                with session.transaction(TransactionType.READ) as tx:
                    query = """
                    match
                    $m isa meeting, has meeting-id "MTG-2025-001";
                    (meeting: $m, item: $ai) isa meeting-agenda;
                    $ai has topic $topic, has priority $priority;
                    get $topic, $priority;
                    """
                    result = list(tx.query.get(query))
                    print(f"   Agenda Items: {len(result)}")
                    for r in result:
                        topic = r.get('topic').get_value() if r.get('topic') else 'N/A'
                        priority = r.get('priority').get_value() if r.get('priority') else 'N/A'
                        print(f"   - {topic} (Priorität: {priority})")

                # 5. Function: Meetings bereit zum Start
                print("\n📋 Query 5: Function - Meetings bereit")
                with session.transaction(TransactionType.READ) as tx:
                    query = """
                    match
                    $m in meetings_ready_for_start();
                    $m has meeting-id $id;
                    get $m, $id;
                    """
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} Meetings bereit")
                    for r in result:
                        mid = r.get('id').get_value() if r.get('id') else 'N/A'
                        print(f"   - {mid}")

                # 6. Function: Agenda Items ohne Dokumente
                print("\n📋 Query 6: Function - Items ohne Dokumente")
                with session.transaction(TransactionType.READ) as tx:
                    query = """
                    match
                    $ai in agenda_items_missing_documents();
                    $ai has item-id $id, has topic $topic;
                    get $id, $topic;
                    """
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} Items ohne Dokumente")
                    for r in result:
                        aid = r.get('id').get_value() if r.get('id') else 'N/A'
                        topic = r.get('topic').get_value() if r.get('topic') else 'N/A'
                        print(f"   - {aid}: {topic}")

                # 7. Function: Meetings ohne Agenda
                print("\n📋 Query 7: Function - Meetings ohne Agenda")
                with session.transaction(TransactionType.READ) as tx:
                    query = """
                    match
                    $m in meetings_without_agenda();
                    $m has meeting-id $id;
                    get $id;
                    """
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} Meetings ohne Agenda")
                    for r in result:
                        mid = r.get('id').get_value() if r.get('id') else 'N/A'
                        print(f"   - {mid}")

                print("\n" + "=" * 60)
                print("✅ Alle Queries erfolgreich ausgeführt!")
                print("=" * 60)

    except Exception as e:
        print(f"\n❌ Fehler: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    query_test_data()