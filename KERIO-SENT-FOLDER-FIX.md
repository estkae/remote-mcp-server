# Kerio Mail: Gesendete Mails im "Gesendet"-Ordner speichern

## Problem

Beim Versenden von E-Mails über SMTP wurden die gesendeten Nachrichten **nicht automatisch im "Gesendet"-Ordner** gespeichert. Dies führte dazu, dass:
- Gesendete Mails nicht in der Übersicht erschienen
- Keine Historie der versendeten Nachrichten vorhanden war
- Das Sendedatum möglicherweise falsch war

## Ursache

SMTP sendet nur die E-Mail, speichert sie aber **nicht** automatisch im Postfach. Dies muss manuell über IMAP erfolgen.

## Lösung

Die `sendEmail()` Funktion wurde erweitert um:

### 1. Automatisches Speichern im Gesendet-Ordner

Nach dem SMTP-Versand wird die E-Mail automatisch per IMAP in den "Gesendet"-Ordner kopiert.

**Neue Funktion:** `saveToSentFolder()`
- Öffnet IMAP-Verbindung
- Erstellt RFC 2822 konformes E-Mail-Format
- Fügt Mail zum Sent-Ordner hinzu mit `\\Seen` Flag

### 2. Automatische Ordner-Erkennung

Falls der Standard-Ordner "Sent" nicht existiert, werden automatisch alternative Namen geprüft:
- `Sent` (Englisch, Standard)
- `Gesendet` (Deutsch)
- `Sent Items` (Outlook-Stil)
- `Sent Mail`

**Neue Funktion:** `tryAlternativeFolders()`

### 3. Korrektes Sendedatum

Das Datum wird explizit im RFC 2822 Format gesetzt:
```javascript
date: now  // Explizites Sendedatum
```

**Neue Funktion:** `buildRFC2822Message()`
- Erstellt MIME-konforme E-Mail
- Setzt korrekten Date-Header
- Unterstützt Text und HTML
- Verwendet Multipart für kombinierte Nachrichten

### 4. Neue Hilfsfunktion: Ordner auflisten

**Neue Funktion:** `listFolders()`
- Listet alle verfügbaren IMAP-Ordner auf
- Hilft bei der Diagnose von Ordner-Problemen
- Zeigt Ordnerstruktur inkl. Delimiter

## Verwendung

### Standard-Verwendung (speichert automatisch im Sent-Ordner)

```javascript
await sendEmail({
  to: "empfaenger@example.com",
  subject: "Test-Mail",
  text: "Dies ist eine Test-Nachricht"
});
```

### Mit spezifischem Ordner

```javascript
await sendEmail({
  to: "empfaenger@example.com",
  subject: "Test-Mail",
  text: "Dies ist eine Test-Nachricht",
  sentFolder: "Gesendet"  // Deutscher Ordnername
});
```

### Ohne Speichern im Sent-Ordner

```javascript
await sendEmail({
  to: "empfaenger@example.com",
  subject: "Test-Mail",
  text: "Dies ist eine Test-Nachricht",
  saveCopyToSent: false  // Kein Speichern
});
```

### Ordner auflisten (für Diagnose)

```javascript
const { folders } = await listFolders();
console.log('Verfügbare Ordner:', folders.map(f => f.name));
```

## Neue MCP-Tools

### 1. Erweitertes `kerio_send_email` Tool

**Neue Parameter:**
- `saveCopyToSent` (boolean, default: true) - Speichern im Sent-Ordner
- `sentFolder` (string, default: "Sent") - Name des Sent-Ordners

**Beispiel:**
```json
{
  "tool": "kerio_send_email",
  "parameters": {
    "to": "test@example.com",
    "subject": "Test",
    "text": "Nachricht",
    "sentFolder": "Gesendet"
  }
}
```

### 2. Neues `kerio_list_folders` Tool

Zeigt alle verfügbaren IMAP-Ordner an.

**Beispiel:**
```json
{
  "tool": "kerio_list_folders",
  "parameters": {}
}
```

**Antwort:**
```json
{
  "folders": [
    { "name": "INBOX", "delimiter": "/", "hasChildren": false },
    { "name": "Gesendet", "delimiter": "/", "hasChildren": false },
    { "name": "Entwürfe", "delimiter": "/", "hasChildren": false }
  ]
}
```

## Technische Details

### RFC 2822 Mail-Format

Die gespeicherte Mail enthält:
- **From:** Absender
- **To:** Empfänger
- **Cc:** Optional
- **Subject:** Betreff
- **Date:** Sendedatum im UTC-Format
- **MIME-Version:** 1.0
- **Content-Type:** text/plain oder multipart/alternative

### IMAP Flags

Die gespeicherte Mail wird mit dem `\\Seen` Flag markiert, damit sie als "gelesen" erscheint.

### Error Handling

- Fehler beim Speichern im Sent-Ordner werden **geloggt, aber nicht geworfen**
- Die E-Mail wird trotzdem versendet, auch wenn das Speichern fehlschlägt
- Der Rückgabewert enthält `savedToSent: true/false`

## Testing

### Test 1: Mail senden und im Gesendet-Ordner prüfen

```javascript
const result = await sendEmail({
  to: "test@example.com",
  subject: "Test Mail",
  text: "Dies ist ein Test"
});

console.log('Mail gesendet:', result.success);
console.log('Im Sent-Ordner:', result.savedToSent);

// Prüfe Gesendet-Ordner
const sentEmails = await listEmails({ folder: 'Gesendet' });
console.log('Mails im Gesendet-Ordner:', sentEmails.total);
```

### Test 2: Ordner auflisten

```javascript
const { folders } = await listFolders();
folders.forEach(f => {
  console.log(`${f.name} (${f.hasChildren ? 'Unterordner' : 'keine Unterordner'})`);
});
```

### Test 3: Mit HTML-Mail

```javascript
await sendEmail({
  to: "test@example.com",
  subject: "HTML Test",
  text: "Fallback Text",
  html: "<h1>Test</h1><p>Dies ist eine HTML-Mail</p>",
  sentFolder: "Sent"
});
```

## Deployment

### Lokales Testen

```bash
cd remote-mcp-server
npm install
node -e "const kerio = require('./kerio-connector'); kerio.listFolders().then(r => console.log(r));"
```

### DigitalOcean

Die Änderungen sind bereits in der Datei enthalten. Einfach pushen:

```bash
git add kerio-connector.js
git commit -m "Fix: Gesendete Mails werden jetzt im Gesendet-Ordner gespeichert"
git push origin main
```

## Konfiguration

Stelle sicher, dass diese Environment-Variablen gesetzt sind:

```env
KERIO_HOST=mail.example.com
KERIO_USERNAME=user@example.com
KERIO_PASSWORD=********
KERIO_IMAP_PORT=993
KERIO_SMTP_PORT=465
KERIO_USE_SSL=true
```

## Troubleshooting

### Problem: "Could not find Sent folder"

**Lösung:** Verwende `kerio_list_folders` um den korrekten Ordnernamen zu finden:

```javascript
const { folders } = await listFolders();
// Finde den Sent-Ordner
const sentFolder = folders.find(f =>
  f.name.includes('Sent') ||
  f.name.includes('Gesendet')
);
console.log('Sent-Ordner:', sentFolder.name);
```

### Problem: "IMAP connection timeout"

**Mögliche Ursachen:**
- Firewall blockiert Port 993
- Falsche Credentials
- Server ist nicht erreichbar

**Lösung:** Prüfe die Logs und teste die IMAP-Verbindung manuell.

### Problem: Mail wird versendet, aber nicht gespeichert

**Verhalten:** Dies ist gewollt! Die Mail wird immer versendet, auch wenn das Speichern fehlschlägt.

**Lösung:** Prüfe die Logs für Fehlermeldungen beim Speichern.

## Änderungen im Code

| Datei | Änderungen |
|-------|-----------|
| `kerio-connector.js` | ✅ `sendEmail()` erweitert |
| `kerio-connector.js` | ✅ `saveToSentFolder()` neu |
| `kerio-connector.js` | ✅ `tryAlternativeFolders()` neu |
| `kerio-connector.js` | ✅ `buildRFC2822Message()` neu |
| `kerio-connector.js` | ✅ `listFolders()` neu |
| `kerio-connector.js` | ✅ `KERIO_TOOLS` erweitert |

## Version

- **Version:** 2.0
- **Datum:** 2026-01-12
- **Autor:** Claude Code Agent