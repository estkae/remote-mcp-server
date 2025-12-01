# Custom Output Path Configuration

## So ändern Sie den Download-Pfad

### 1. .env Datei bearbeiten

Die Datei `.env` im remote-mcp-server Verzeichnis enthält die Konfiguration:

```bash
# Im Verzeichnis: remote-mcp-server/.env
OUTPUT_DIR=C:\Users\kae\OneDrive - AALS Software AG\locara\source\repos\remote-mcp-server\output
```

### 2. Pfad ändern

**Option A: Downloads-Ordner**
```bash
OUTPUT_DIR=C:\Users\kae\Downloads
```

**Option B: Desktop**
```bash
OUTPUT_DIR=C:\Users\kae\Desktop\Claude-Files
```

**Option C: OneDrive (empfohlen)**
```bash
OUTPUT_DIR=C:\Users\kae\OneDrive - AALS Software AG\locara\Claude-Outputs
```

**Option D: Eigener Pfad**
```bash
OUTPUT_DIR=C:\Ihr\Eigener\Pfad\Hier
```

### 3. Server neu starten

Nach Änderung der `.env` Datei muss der Server neu gestartet werden:

```bash
# 1. Aktuellen Server stoppen
# Finde PID mit: netstat -ano | findstr :8080
# Stoppe mit: taskkill /PID <PID> /F

# 2. Server neu starten
cd "C:\Users\kae\OneDrive - AALS Software AG\locara\source\repos\remote-mcp-server"
node start-with-downloads.js
```

### 4. Testen

Erstellen Sie eine PowerPoint über Claude-Webapp:

```
Erstelle mir eine PowerPoint-Präsentation über künstliche Intelligenz
```

Die Datei wird dann im konfigurierten OUTPUT_DIR gespeichert und Sie erhalten einen Download-Button im Browser.

## Wie das Download-System funktioniert

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  1. Claude fragt: "Erstelle PowerPoint über KI"              │
│                                                               │
│  2. Remote-MCP-Server:                                        │
│     • Erstellt Datei in OUTPUT_DIR                           │
│     • Generiert Download-Token (64 Zeichen Hash)             │
│     • Rückgabe: Download-URL                                 │
│                                                               │
│  3. Claude-Webapp:                                            │
│     • Empfängt Download-URL                                  │
│     • download-handler.js erkennt die URL                    │
│     • Rendert Download-Button                                │
│                                                               │
│  4. Browser:                                                  │
│     • User klickt auf Download-Button                        │
│     • Browser lädt Datei über /download/:token               │
│     • Browser speichert Datei (Standard-Download-Ordner)     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Browser-Download vs. Direkter Pfad

### Browser-Download (Standard)
- ✅ **Empfohlen** - Sicher und benutzerfreundlich
- Datei wird über Browser heruntergeladen
- Browser speichert in Standard-Download-Ordner
- User kann Speicherort beim Download wählen

### Direkter Pfad (OUTPUT_DIR)
- Datei wird direkt in OUTPUT_DIR gespeichert
- Nützlich für:
  - Automatische Backup-Prozesse
  - OneDrive-Synchronisation
  - Netzwerk-Shares
  - Batch-Verarbeitung

## Beispiel-Workflow

### 1. Für automatisches OneDrive-Backup:

```bash
# .env
OUTPUT_DIR=C:\Users\kae\OneDrive - AALS Software AG\locara\Claude-Outputs
```

→ Alle Dateien werden automatisch in OneDrive synchronisiert

### 2. Für Netzwerk-Share:

```bash
# .env
OUTPUT_DIR=\\\\network-server\\shared\\Claude-Outputs
```

→ Alle Dateien sind im Netzwerk verfügbar

### 3. Für lokalen Schnellzugriff:

```bash
# .env
OUTPUT_DIR=C:\Users\kae\Desktop\Claude-Files
```

→ Dateien direkt auf dem Desktop

## Sicherheit

- Download-Tokens sind 64 Zeichen lang (SHA-256)
- Tokens sind 60 Minuten gültig
- Max. 10 Downloads pro Token
- Tokens werden automatisch bereinigt
- Keine Verzeichnis-Traversal-Angriffe möglich

## Troubleshooting

### Problem: Dateien werden nicht erstellt

**Lösung:**
1. Überprüfen Sie, ob OUTPUT_DIR existiert:
   ```bash
   dir "C:\Ihr\Pfad"
   ```

2. Erstellen Sie den Ordner, falls nicht vorhanden:
   ```bash
   mkdir "C:\Ihr\Pfad"
   ```

3. Überprüfen Sie Schreibrechte

### Problem: Download-Button erscheint nicht

**Lösung:**
1. Browser-Console öffnen (F12)
2. Prüfen ob `download-handler.js` geladen ist:
   ```javascript
   typeof processMessageWithDownloads
   // Sollte "function" zurückgeben
   ```

3. Hard-Reload im Browser (Ctrl + Shift + R)

### Problem: Server lädt .env nicht

**Lösung:**
1. Stellen Sie sicher, dass `dotenv` installiert ist:
   ```bash
   npm list dotenv
   ```

2. Fügen Sie in `start-with-downloads.js` hinzu (falls nicht vorhanden):
   ```javascript
   require('dotenv').config();
   ```

## Status

- ✅ File-Server implementiert
- ✅ Download-Token-System aktiv
- ✅ Browser-Download funktioniert
- ✅ OUTPUT_DIR konfigurierbar
- ✅ PowerPoint, Excel, Word unterstützt
- ✅ 60 Min Gültigkeit, 10 Downloads/Token
- ✅ Automatische Token-Bereinigung

Alles ist einsatzbereit! 🎉