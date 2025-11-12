"""
TypeDB Configuration Helper
Lädt Credentials aus .env und erstellt TypeDB Connection
"""

import os
from dotenv import load_dotenv
from typedb.driver import TypeDB, TypeDBCredential

# Load environment variables
load_dotenv()

# Configuration
TYPEDB_SERVER = os.getenv("TYPEDB_SERVER", "138.197.190.64:1729")
DATABASE_NAME = os.getenv("TYPEDB_DATABASE", "meeting-knowledge")
TYPEDB_USERNAME = os.getenv("TYPEDB_USERNAME")
TYPEDB_PASSWORD = os.getenv("TYPEDB_PASSWORD")

def get_typedb_driver():
    """
    Erstellt TypeDB Driver mit oder ohne Authentifizierung
    """
    if TYPEDB_USERNAME and TYPEDB_PASSWORD:
        # Mit Authentifizierung
        credential = TypeDBCredential(
            username=TYPEDB_USERNAME,
            password=TYPEDB_PASSWORD,
            tls_enabled=False
        )
        return TypeDB.core_driver(address=TYPEDB_SERVER, credential=credential)
    else:
        # Ohne Authentifizierung (Fallback)
        return TypeDB.core_driver(TYPEDB_SERVER)

def print_config():
    """Gibt aktuelle Konfiguration aus"""
    print(f"Server: {TYPEDB_SERVER}")
    print(f"Database: {DATABASE_NAME}")
    if TYPEDB_USERNAME:
        print(f"Username: {TYPEDB_USERNAME}")
        print(f"Auth: Enabled")
    else:
        print(f"Auth: Disabled")
