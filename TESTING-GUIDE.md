# Testing Guide: Kerio Mail Sent-Folder Fix

## Voraussetzungen

1. **Node.js** installiert (v14 oder höher)
2. **Kerio Connect** Zugangsdaten
3. **Environment Variables** konfiguriert

## Environment Variables

Erstelle oder aktualisiere die `.env` Datei:

```env
# Kerio Connect Konfiguration
KERIO_HOST=mail.example.com
KERIO_USERNAME=user@example.com
KERIO_PASSWORD=your-password-here
KERIO_IMAP_PORT=993
KERIO_SMTP_PORT=465
KERIO_USE_SSL=true

# Optional: Test-Email (Standard: KERIO_USERNAME)
TEST_EMAIL=test@example.com
```

## Installation

```bash
cd remote-mcp-server
npm install
```

## Test ausführen

### Automatischer Test (Empfohlen)

```bash
node test-kerio-sent-folder.js
```

**Was wird getestet:**
1. ✅ Verbindung zu Kerio Connect
2. ✅ Auflisten aller IMAP-Ordner
3. ✅ Identifizierung des "Gesendet"-Ordners
4. ✅ Versenden einer Test-Mail
5. ✅ Speichern im Gesendet-Ordner
6. ✅ Verifizierung der gespeicherten Mail

### Erwartete Ausgabe

```
╔════════════════════════════════════════════════════════════╗
║  Kerio Mail Sent-Folder Fix - Test Suite                  ║
╚════════════════════════════════════════════════════════════╝

✅ Kerio Konfiguration gefunden

Host: mail.example.com
User: user@example.com
IMAP Port: 993
SMTP Port: 465

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 1: Verfügbare IMAP-Ordner auflisten
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 8 Ordner gefunden:

📁 INBOX
📤 Gesendet
📁 Entwürfe
📁 Papierkorb
📁 Junk
📁 Archiv

✅ Gesendet-Ordner identifiziert: "Gesendet"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 2: Aktuelle Mails im Gesendet-Ordner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Aktuell 23 Mails im Ordner "Gesendet"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 3: Test-Mail senden
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 Sende Test-Mail an: user@example.com
📤 Speichern in Ordner: Gesendet

✅ Mail erfolgreich versendet!
   Message-ID: <abc123@mail.example.com>
   Im Sent-Ordner gespeichert: Ja ✅

⏳ Warte 3 Sekunden...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 4: Verifizierung im Gesendet-Ordner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Jetzt 24 Mails im Ordner "Gesendet"

Letzte 5 Mails:
🎯 1. Kerio Test Mail - 12.01.2026, 19:30:15
     Von: user@example.com
     Datum: 2026-01-12T18:30:15.000Z
     ✅ TEST-MAIL GEFUNDEN!

✅ SUCCESS: Test-Mail wurde im Gesendet-Ordner gefunden!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ZUSAMMENFASSUNG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Test 1: Ordner auflisten - ERFOLGREICH
✅ Test 2: Sent-Ordner gefunden: "Gesendet"
✅ Test 3: Mail versenden - ERFOLGREICH
✅ Test 4: Im Sent-Ordner speichern - ERFOLGREICH

╔════════════════════════════════════════════════════════════╗
║  ✅ ALLE TESTS ABGESCHLOSSEN                               ║
╚════════════════════════════════════════════════════════════╝
```

## Manuelle Tests

### Test 1: Ordner auflisten

```bash
node -e "require('./kerio-connector').listFolders().then(r => console.log(JSON.stringify(r, null, 2)))"
```

### Test 2: Mail senden (Standard)

```javascript
const kerio = require('./kerio-connector');

kerio.sendEmail({
  to: 'test@example.com',
  subject: 'Test Mail',
  text: 'Dies ist ein Test'
}).then(result => {
  console.log('Erfolg:', result);
}).catch(err => {
  console.error('Fehler:', err.message);
});
```

### Test 3: Mail senden (mit spezifischem Ordner)

```javascript
const kerio = require('./kerio-connector');

kerio.sendEmail({
  to: 'test@example.com',
  subject: 'Test Mail',
  text: 'Dies ist ein Test',
  sentFolder: 'Gesendet'  // Deutscher Ordnername
}).then(result => {
  console.log('Erfolg:', result);
}).catch(err => {
  console.error('Fehler:', err.message);
});
```

### Test 4: Gesendet-Ordner prüfen

```javascript
const kerio = require('./kerio-connector');

kerio.listEmails({
  folder: 'Gesendet',
  limit: 10
}).then(result => {
  console.log(`${result.total} Mails gefunden`);
  result.emails.forEach(email => {
    console.log(`- ${email.subject} (${email.date})`);
  });
}).catch(err => {
  console.error('Fehler:', err.message);
});
```

## Troubleshooting

### Problem: "Kerio Connect not configured"

**Lösung:** Prüfe `.env` Datei:
```bash
cat .env | grep KERIO
```

Stelle sicher, dass alle erforderlichen Variablen gesetzt sind.

### Problem: "IMAP connection timeout"

**Mögliche Ursachen:**
- Firewall blockiert Port 993
- Falscher Hostname
- Server nicht erreichbar

**Diagnose:**
```bash
# Test IMAP-Verbindung
telnet mail.example.com 993

# Prüfe DNS
nslookup mail.example.com
```

### Problem: "Could not find Sent folder"

**Lösung:** Finde korrekten Ordnernamen:
```bash
node -e "require('./kerio-connector').listFolders().then(r => r.folders.forEach(f => console.log(f.name)))"
```

Verwende dann den korrekten Namen:
```javascript
sentFolder: 'Gesendet'  // oder 'Sent', 'Sent Items', etc.
```

### Problem: "Authentication failed"

**Mögliche Ursachen:**
- Falsches Passwort
- Username muss evtl. vollständige E-Mail-Adresse sein
- Account gesperrt/deaktiviert

**Lösung:** Prüfe Credentials manuell mit E-Mail-Client.

### Problem: Mail wird versendet, aber nicht gespeichert

**Diagnose:**
```bash
# Prüfe Logs
node test-kerio-sent-folder.js 2>&1 | grep "Failed to save"
```

**Mögliche Ursachen:**
- Keine Schreibrechte auf Sent-Ordner
- Ordner existiert nicht
- IMAP-Quota überschritten

## Integration in remote-mcp-server

Der Fix ist bereits im `remote-mcp-server-with-skills.js` integriert.

### Deployment auf DigitalOcean

```bash
# 1. Änderungen committen
git add kerio-connector.js
git commit -m "Fix: Gesendete Mails im Sent-Ordner speichern"

# 2. Pushen
git push origin main

# 3. DigitalOcean deployt automatisch

# 4. Environment Variables prüfen
# In DigitalOcean App Platform → Settings → Environment Variables
```

### Testen auf DigitalOcean

```bash
# MCP Tool verwenden
curl https://your-app.ondigitalocean.app/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "kerio_send_email",
    "parameters": {
      "to": "test@example.com",
      "subject": "Test von DigitalOcean",
      "text": "Dies ist ein Test"
    }
  }'
```

## Performance

- **SMTP-Versand:** ~1-2 Sekunden
- **IMAP-Speichern:** ~1-2 Sekunden
- **Gesamt:** ~2-4 Sekunden pro Mail

## Best Practices

1. **Verwende `listFolders()`** einmal beim Start, um Ordnernamen zu cachen
2. **Error Handling:** Mail wird immer versendet, auch wenn Speichern fehlschlägt
3. **Timeout:** IMAP hat 30 Sekunden Timeout
4. **Logging:** Alle Operationen werden geloggt für Debugging

## Weitere Tests

### Load Test (10 Mails)

```bash
for i in {1..10}; do
  node -e "require('./kerio-connector').sendEmail({
    to: 'test@example.com',
    subject: 'Load Test $i',
    text: 'Test Nachricht $i'
  }).then(r => console.log('Mail $i:', r.success))"
done
```

### HTML Mail Test

```bash
node -e "require('./kerio-connector').sendEmail({
  to: 'test@example.com',
  subject: 'HTML Test',
  text: 'Fallback Text',
  html: '<h1>Test</h1><p>Dies ist <strong>HTML</strong></p>'
}).then(r => console.log(r))"
```

## Support

Bei Problemen:
1. Prüfe Logs: Console-Output analysieren
2. Teste IMAP/SMTP manuell mit E-Mail-Client
3. Prüfe Firewall-Regeln
4. Kontaktiere Kerio-Support bei Server-Problemen