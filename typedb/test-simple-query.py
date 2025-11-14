"""
Einfacher TypeDB Test - Verbindung und Entity Count
"""
from typedb.driver import SessionType, TransactionType
from typedb_config import get_typedb_driver, DATABASE_NAME, print_config
import sys

print("=" * 70)
print("TYPEDB SIMPLE TEST")
print("=" * 70)
print_config()
print("=" * 70)

try:
    print("\n1️⃣ Verbinde zu TypeDB...")
    with get_typedb_driver() as driver:
        print("✅ Driver erstellt")
        
        print("\n2️⃣ Prüfe Database...")
        if driver.databases.contains(DATABASE_NAME):
            print(f"✅ Database '{DATABASE_NAME}' existiert")
        else:
            print(f"❌ Database '{DATABASE_NAME}' existiert NICHT!")
            sys.exit(1)
        
        print("\n3️⃣ Öffne Session...")
        with driver.session(DATABASE_NAME, SessionType.DATA) as session:
            print("✅ Session geöffnet")
            
            print("\n4️⃣ Query: Zähle alle Entities...")
            with session.transaction(TransactionType.READ) as tx:
                
                # Query 1: Alle Personen
                print("\n   📋 Personen:")
                query = "match $p isa person; get $p; count;"
                result = list(tx.query.get_aggregate(query))
                print(f"   Anzahl: {result[0].as_value().as_long() if result else 0}")
                
                # Query 2: Alle Meetings
                print("\n   📋 Meetings:")
                query = "match $m isa meeting; get $m; count;"
                result = list(tx.query.get_aggregate(query))
                print(f"   Anzahl: {result[0].as_value().as_long() if result else 0}")
                
                # Query 3: Alle Agenda Items
                print("\n   📋 Agenda Items:")
                query = "match $a isa agenda-item; get $a; count;"
                result = list(tx.query.get_aggregate(query))
                print(f"   Anzahl: {result[0].as_value().as_long() if result else 0}")
                
    print("\n" + "=" * 70)
    print("✅ TEST ERFOLGREICH!")
    print("=" * 70)
    
except Exception as e:
    print("\n" + "=" * 70)
    print("❌ FEHLER!")
    print("=" * 70)
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
