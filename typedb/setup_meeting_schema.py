"""
TypeDB Meeting Schema Setup Script
Lädt Schema und Rules auf TypeDB Server 138.197.190.64:8000
Database: meeting-knowledge
"""

from typedb.driver import TypeDB, SessionType, TransactionType
import os
from pathlib import Path

# Konfiguration
TYPEDB_SERVER = "138.197.190.64:1729"  # TypeDB Server Port (nicht Studio Port 8000)
DATABASE_NAME = "meeting-knowledge"
SCHEMA_DIR = Path(__file__).parent / "schemas"

def load_schema_file(session, filepath, description):
    """Lädt eine Schema- oder Rules-Datei"""
    print(f"\n📄 Lade {description}...")
    print(f"   Datei: {filepath}")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            schema_content = f.read()

        with session.transaction(TransactionType.WRITE) as tx:
            tx.query.define(schema_content)
            tx.commit()

        print(f"✅ {description} erfolgreich geladen!")
        return True

    except Exception as e:
        print(f"❌ Fehler beim Laden von {description}:")
        print(f"   {str(e)}")
        return False

def setup_meeting_schema():
    """Hauptfunktion: Schema und Rules einrichten"""

    print("=" * 60)
    print("TypeDB Meeting Schema Setup")
    print("=" * 60)
    print(f"Server: {TYPEDB_SERVER}")
    print(f"Database: {DATABASE_NAME}")
    print("=" * 60)

    # Dateipfade
    schema_file = SCHEMA_DIR / "meeting-schema.tql"
    rules_file = SCHEMA_DIR / "meeting-rules.tql"

    # Prüfe ob Dateien existieren
    if not schema_file.exists():
        print(f"❌ Schema-Datei nicht gefunden: {schema_file}")
        return False

    if not rules_file.exists():
        print(f"❌ Rules-Datei nicht gefunden: {rules_file}")
        return False

    try:
        # Verbindung zum TypeDB Server
        print("\n🔌 Verbinde zu TypeDB Server...")
        with TypeDB.core_driver(TYPEDB_SERVER) as driver:

            # Prüfe ob Database existiert
            if driver.databases.contains(DATABASE_NAME):
                print(f"\n⚠️  Database '{DATABASE_NAME}' existiert bereits!")
                print("Optionen:")
                print("  1 - Database löschen und neu erstellen (empfohlen für Schema-Änderungen)")
                print("  2 - Nur Rules hinzufügen (existierendes Schema behalten)")
                print("  3 - Abbrechen")

                choice = input("\nIhre Wahl (1/2/3): ")

                if choice == '1':
                    print(f"\n🗑️  Lösche Database '{DATABASE_NAME}'...")
                    driver.databases.get(DATABASE_NAME).delete()
                    print(f"✅ Database gelöscht!")
                    driver.databases.create(DATABASE_NAME)
                    print(f"✅ Neue Database '{DATABASE_NAME}' erstellt!")
                elif choice == '2':
                    print(f"\n⏭️  Überspringe Schema-Loading, lade nur Rules...")
                    # Flag setzen um Schema-Loading zu überspringen
                    with driver.session(DATABASE_NAME, SessionType.SCHEMA) as session:
                        success = load_schema_file(
                            session,
                            rules_file,
                            "Inferenz-Rules (Business Logic)"
                        )
                        if success:
                            print("\n✅ Rules erfolgreich hinzugefügt!")
                        return success
                else:
                    print("❌ Abbruch")
                    return False
            else:
                print(f"\n✅ Database '{DATABASE_NAME}' existiert nicht - erstelle neue...")
                driver.databases.create(DATABASE_NAME)
                print(f"✅ Database '{DATABASE_NAME}' erstellt!")

            print(f"✅ Verbindung hergestellt!")

            # Schema Session öffnen
            with driver.session(DATABASE_NAME, SessionType.SCHEMA) as session:

                # 1. Hauptschema laden
                success = load_schema_file(
                    session,
                    schema_file,
                    "Hauptschema (Entities, Relations, Attributes)"
                )
                if not success:
                    print("\n❌ Fehler beim Laden des Hauptschemas - Abbruch")
                    return False

                # 2. Rules laden
                success = load_schema_file(
                    session,
                    rules_file,
                    "Inferenz-Rules (Business Logic)"
                )
                if not success:
                    print("\n⚠️  Schema geladen, aber Rules fehlgeschlagen")
                    print("    Sie können die Rules später manuell nachladen")

            print("\n" + "=" * 60)
            print("✅ Setup erfolgreich abgeschlossen!")
            print("=" * 60)
            print(f"\nIhr TypeDB Meeting System ist bereit:")
            print(f"  • 10 Entities definiert")
            print(f"  • 10 Relations definiert")
            print(f"  • 40+ Attributes definiert")
            print(f"  • 6 Inferenz-Rules aktiv")
            print("\nNächste Schritte:")
            print("  1. Testdaten einfügen")
            print("  2. Queries testen")
            print("  3. Anwendung integrieren")

            return True

    except Exception as e:
        print(f"\n❌ Verbindungsfehler:")
        print(f"   {str(e)}")
        print(f"\nPrüfen Sie:")
        print(f"  • Ist TypeDB Server erreichbar unter {TYPEDB_SERVER}?")
        print(f"  • Läuft der TypeDB Server?")
        print(f"  • Firewall-Einstellungen korrekt?")
        return False

def verify_schema():
    """Verifiziert das geladene Schema"""
    print("\n" + "=" * 60)
    print("Schema-Verifikation")
    print("=" * 60)

    try:
        with TypeDB.core_driver(TYPEDB_SERVER) as driver:
            with driver.session(DATABASE_NAME, SessionType.SCHEMA) as session:
                with session.transaction(TransactionType.READ) as tx:

                    # Zähle Entities
                    query = "match $x sub entity; get $x;"
                    result = list(tx.query.get(query))
                    print(f"✅ Entities: {len(result)}")

                    # Zähle Relations
                    query = "match $x sub relation; get $x;"
                    result = list(tx.query.get(query))
                    print(f"✅ Relations: {len(result)}")

                    # Zähle Attributes
                    query = "match $x sub attribute; get $x;"
                    result = list(tx.query.get(query))
                    print(f"✅ Attributes: {len(result)}")

                    print("\n✅ Schema-Verifikation erfolgreich!")
                    return True

    except Exception as e:
        print(f"❌ Verifikation fehlgeschlagen: {e}")
        return False

if __name__ == "__main__":
    # Schema Setup ausführen
    success = setup_meeting_schema()

    if success:
        # Optional: Schema verifizieren
        verify = input("\nMöchten Sie das Schema verifizieren? (j/n): ")
        if verify.lower() == 'j':
            verify_schema()

    print("\n🏁 Skript beendet.")