"""
TypeDB Test-Daten abfragen
Testet verschiedene Queries und Functions
"""

from typedb.driver import SessionType, TransactionType
from typedb_config import get_typedb_driver, DATABASE_NAME, print_config

def query_test_data():
    print("=" * 60)
    print("TypeDB Meeting System - Daten abfragen")
    print("=" * 60)
    print_config()
    print("=" * 60)

    try:
        with get_typedb_driver() as driver:
            print("\n✅ Verbindung hergestellt")

            with driver.session(DATABASE_NAME, SessionType.DATA) as session:

                # Query 1: Alle Personen
                print("\n📋 Query 1: Alle Personen")
                with session.transaction(TransactionType.READ) as tx:
                    query = "match $p isa person, has name $n; get $p, $n;"
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} Personen")
                    for r in result:
                        print(f"   - {r}")

                # Query 2: Alle Meetings
                print("\n📋 Query 2: Alle Meetings")
                with session.transaction(TransactionType.READ) as tx:
                    query = "match $m isa meeting, has title $t, has status $s; get $m, $t, $s;"
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} Meetings")
                    for r in result:
                        print(f"   - {r}")

                # Query 3: Meeting-Teilnehmer
                print("\n📋 Query 3: Meeting-Teilnehmer")
                with session.transaction(TransactionType.READ) as tx:
                    query = '''
                        match
                        (meeting: $m, participant: $p) isa meeting-participation,
                            has attendance-status $status;
                        $m has title $title;
                        $p has name $name;
                        get $title, $name, $status;
                    '''
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} Teilnehmer")
                    for r in result:
                        print(f"   - {r}")

                # Query 4: Agenda Items
                print("\n📋 Query 4: Agenda Items")
                with session.transaction(TransactionType.READ) as tx:
                    query = '''
                        match
                        $ai isa agenda-item,
                            has title $title,
                            has priority $prio;
                        get $ai, $title, $prio;
                    '''
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} Agenda Items")
                    for r in result:
                        print(f"   - {r}")

                # Query 5: Function - Meetings ready to start
                print("\n📋 Query 5: Function - Meetings ready to start")
                with session.transaction(TransactionType.READ) as tx:
                    query = '''
                        match
                        $m in meetings_ready_for_start();
                        $m has meeting-id $id;
                        get $m, $id;
                    '''
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} Meetings ready to start")
                    for r in result:
                        print(f"   - {r}")

                # Query 6: Function - Agenda items missing documents
                print("\n📋 Query 6: Function - Agenda items missing documents")
                with session.transaction(TransactionType.READ) as tx:
                    query = '''
                        match
                        $ai in agenda_items_missing_documents();
                        $ai has agenda-item-id $id;
                        get $ai, $id;
                    '''
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} high-priority items ohne Dokumente")
                    for r in result:
                        print(f"   - {r}")

                # Query 7: Meeting mit Agenda
                print("\n📋 Query 7: Meeting mit kompletter Agenda")
                with session.transaction(TransactionType.READ) as tx:
                    query = '''
                        match
                        $m isa meeting, has title $mtitle;
                        (meeting: $m, item: $ai) isa meeting-agenda,
                            has agenda-order $order;
                        $ai has title $aititle;
                        get $mtitle, $aititle, $order;
                        sort $order asc;
                    '''
                    result = list(tx.query.get(query))
                    print(f"   Gefunden: {len(result)} Agenda-Einträge")
                    for r in result:
                        print(f"   - {r}")

        print("\n" + "=" * 60)
        print("✅ Alle Queries erfolgreich ausgeführt!")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n❌ Fehler beim Abfragen der Daten:")
        print(f"   {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = query_test_data()
    exit(0 if success else 1)
