"""
TypeDB Connection Test mit Authentifizierung
Testet Verbindung zu 138.197.190.64:1729 mit admin:Password
"""

from typedb.driver import TypeDB, TypeDBCredential
import os

# Konfiguration
TYPEDB_SERVER = "138.197.190.64:1729"
TYPEDB_USERNAME = "admin"
TYPEDB_PASSWORD = "Password"
DATABASE_NAME = "meeting-knowledge"

def test_connection():
    print("=" * 60)
    print("TypeDB Connection Test mit Authentifizierung")
    print("=" * 60)
    print(f"Server: {TYPEDB_SERVER}")
    print(f"Username: {TYPEDB_USERNAME}")
    print(f"Database: {DATABASE_NAME}")
    print("=" * 60)

    try:
        # Verbindung mit Credentials
        print("\n🔌 Verbinde zu TypeDB Server mit Authentifizierung...")

        credential = TypeDBCredential(
            username=TYPEDB_USERNAME,
            password=TYPEDB_PASSWORD,
            tls_enabled=False  # HTTP ohne TLS
        )

        with TypeDB.core_driver(
            address=TYPEDB_SERVER,
            credential=credential
        ) as driver:
            print("✅ Verbindung erfolgreich hergestellt!")

            # Prüfe ob Database existiert
            print(f"\n📊 Prüfe Database '{DATABASE_NAME}'...")
            if driver.databases.contains(DATABASE_NAME):
                print(f"✅ Database '{DATABASE_NAME}' existiert!")

                # Liste alle Databases
                print("\n📋 Verfügbare Databases:")
                for db in driver.databases.all():
                    print(f"   - {db.name}")

                return True
            else:
                print(f"❌ Database '{DATABASE_NAME}' nicht gefunden!")
                print("\n📋 Verfügbare Databases:")
                for db in driver.databases.all():
                    print(f"   - {db.name}")
                return False

    except Exception as e:
        print(f"\n❌ Verbindungsfehler:")
        print(f"   {str(e)}")
        print(f"\nMögliche Ursachen:")
        print(f"  • Falsche Credentials (Username/Password)")
        print(f"  • Server nicht erreichbar")
        print(f"  • Authentifizierung nicht aktiviert")
        print(f"  • Port 1729 blockiert")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_connection()

    if success:
        print("\n" + "=" * 60)
        print("✅ Connection Test erfolgreich!")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ Connection Test fehlgeschlagen!")
        print("=" * 60)
