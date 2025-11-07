/**
 * Intent Engine - Autonome Erkennung von User-Intentionen
 *
 * Analysiert User-Prompts und erkennt automatisch:
 * - meeting_schedule: Sitzung organisieren
 * - meeting_query: Nach Sitzungen fragen
 * - document_request: Dokumente anfordern
 * - protocol_generate: Protokoll erstellen
 * - protocol_query: Nach Protokollen fragen
 * - general_question: Allgemeine Frage
 */

const Anthropic = require('@anthropic-ai/sdk');

class IntentEngine {
  constructor(anthropicKey) {
    this.claude = new Anthropic({ apiKey: anthropicKey });
    this.model = 'claude-sonnet-4-5-20250929';
  }

  /**
   * Analysiert User-Prompt und erkennt Intention
   * @param {string} userPrompt - Der User-Prompt
   * @param {Array} conversationHistory - Bisherige Konversation
   * @returns {Promise<Object>} Intent-Analyse
   */
  async analyzeIntent(userPrompt, conversationHistory = []) {
    const systemPrompt = this.buildSystemPrompt();

    try {
      const response = await this.claude.messages.create({
        model: this.model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          ...conversationHistory.slice(-4), // Nur letzte 4 Nachrichten für Kontext
          { role: 'user', content: userPrompt }
        ]
      });

      const analysisText = response.content[0].text;
      const analysis = this.parseAnalysis(analysisText);

      // Validierung
      if (!analysis.intent) {
        return this.createFallbackAnalysis();
      }

      return analysis;
    } catch (error) {
      console.error('Intent-Analyse fehlgeschlagen:', error);
      return this.createFallbackAnalysis();
    }
  }

  /**
   * Baut den System-Prompt für Intent-Erkennung
   */
  buildSystemPrompt() {
    return `Du bist ein Intent-Classifier für ein Verwaltungssystem.

DEINE AUFGABE:
Analysiere User-Prompts und erkenne die Intention dahinter.

MÖGLICHE INTENTS:

1. **meeting_schedule** - User möchte eine Sitzung organisieren
   Beispiele:
   - "Ich muss eine Gemeinderatssitzung für nächsten Dienstag organisieren"
   - "Wir brauchen eine MA-Sitzung nächste Woche"
   - "Plane bitte eine Ausschusssitzung"

2. **meeting_query** - User fragt nach bestehenden Sitzungen
   Beispiele:
   - "Wann ist die nächste Gemeinderatssitzung?"
   - "Welche Sitzungen haben wir diese Woche?"
   - "Zeige mir alle Sitzungen im November"

3. **document_request** - User braucht Dokumente
   Beispiele:
   - "Ich brauche die Haushaltspläne"
   - "Gibt es Dokumente zum Thema Schulhaus-Sanierung?"
   - "Finde alle PDFs zum Bauvorhaben"

4. **protocol_generate** - User möchte ein Protokoll erstellen
   Beispiele:
   - "Erstelle das Protokoll für die heutige Sitzung"
   - "Generiere ein Protokoll aus der Aufnahme"
   - "Ich brauche das Sitzungsprotokoll"

5. **protocol_query** - User fragt nach alten Protokollen
   Beispiele:
   - "Zeige mir das Protokoll vom letzten Gemeinderat"
   - "Welche Beschlüsse wurden im Oktober gefasst?"
   - "Finde das Protokoll zur Haushaltssitzung"

6. **general_question** - Allgemeine Frage oder Konversation
   Beispiele:
   - "Wie funktioniert das System?"
   - "Was kannst du alles?"
   - "Danke für die Hilfe"

ENTITIES ZU EXTRAHIEREN:

Für **meeting_schedule**:
- date: Datum (ISO 8601 Format YYYY-MM-DD)
- time: Uhrzeit (HH:MM Format)
- participants: Liste von Namen/E-Mails
- location: Ort der Sitzung
- topics: Array von Sitzungsthemen
- meeting_type: "gemeinderat" | "ma_sitzung" | "ausschuss" | "other"

Für **meeting_query**:
- date_range: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
- meeting_type: siehe oben
- keywords: Array von Suchwörtern

Für **document_request**:
- topics: Array von Themen
- doc_types: ["pdf", "docx", "xlsx"] etc.
- keywords: Array von Suchwörtern

Für **protocol_generate**:
- meeting_id: Falls erwähnt
- meeting_date: Falls erwähnt
- has_audio: Boolean - wurde eine Aufnahme erwähnt?

Für **protocol_query**:
- date_range: siehe oben
- meeting_type: siehe oben
- keywords: Array von Suchwörtern

CONFIDENCE-LEVEL:
- 0.9-1.0: Sehr sicher
- 0.7-0.89: Ziemlich sicher
- 0.5-0.69: Möglich, aber unsicher
- < 0.5: Unklar → general_question

ACTION:
Bestimme die passende Aktion:
- "show_meeting_form": Zeige Formular für Sitzungserfassung
- "fetch_documents": Hole Dokumente von OneDrive
- "search_meetings": Suche in Sitzungs-Datenbank
- "generate_protocol": Starte Protokoll-Generierung
- "search_protocols": Suche in Protokoll-Archiv
- "answer_directly": Beantworte direkt ohne weitere Aktionen

OUTPUT FORMAT (JSON):
{
  "intent": "meeting_schedule",
  "confidence": 0.95,
  "entities": {
    "date": "2025-11-15",
    "time": "14:00",
    "meeting_type": "gemeinderat",
    "topics": ["Haushalt 2026", "Bauvorhaben Schulhaus"],
    "location": "Rathaus"
  },
  "action": "show_meeting_form",
  "reasoning": "User möchte eine Gemeinderatssitzung organisieren mit spezifischen Themen"
}

WICHTIG:
- Nutze den Konversations-Verlauf für bessere Erkennung
- Bei Unsicherheit: confidence < 0.7 und intent = "general_question"
- Extrahiere ALLE erkennbaren Entities, auch wenn teilweise
- Gib NUR das JSON zurück, keine zusätzlichen Erklärungen`;
  }

  /**
   * Parsed die Analyse-Antwort von Claude
   */
  parseAnalysis(analysisText) {
    try {
      // Versuche JSON zu extrahieren
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.warn('Kein JSON in Analyse gefunden:', analysisText);
        return this.createFallbackAnalysis();
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validierung
      const validIntents = [
        'meeting_schedule',
        'meeting_query',
        'document_request',
        'protocol_generate',
        'protocol_query',
        'general_question'
      ];

      if (!validIntents.includes(analysis.intent)) {
        console.warn('Ungültiger Intent:', analysis.intent);
        analysis.intent = 'general_question';
        analysis.confidence = 0.3;
      }

      // Defaults setzen
      analysis.entities = analysis.entities || {};
      analysis.action = analysis.action || 'answer_directly';
      analysis.reasoning = analysis.reasoning || 'Keine Begründung';

      return analysis;
    } catch (error) {
      console.error('JSON-Parsing fehlgeschlagen:', error);
      return this.createFallbackAnalysis();
    }
  }

  /**
   * Erstellt Fallback-Analyse bei Fehlern
   */
  createFallbackAnalysis() {
    return {
      intent: 'general_question',
      confidence: 0.3,
      entities: {},
      action: 'answer_directly',
      reasoning: 'Automatischer Fallback wegen Analyse-Fehler'
    };
  }

  /**
   * Verbessert Intent-Erkennung durch Kontext
   */
  enrichWithContext(analysis, userContext = {}) {
    // Füge User-spezifischen Kontext hinzu
    if (userContext.recent_meetings) {
      analysis.context = {
        ...analysis.context,
        recent_meetings: userContext.recent_meetings
      };
    }

    if (userContext.preferred_location) {
      analysis.entities.location = analysis.entities.location || userContext.preferred_location;
    }

    return analysis;
  }

  /**
   * Schnelle Intent-Prüfung ohne API-Call (für einfache Fälle)
   */
  quickIntentCheck(userPrompt) {
    const lowerPrompt = userPrompt.toLowerCase();

    // Meeting-Keywords
    if (
      lowerPrompt.includes('sitzung') ||
      lowerPrompt.includes('meeting') ||
      lowerPrompt.includes('gemeinderat') ||
      lowerPrompt.includes('organisieren')
    ) {
      return { likely: 'meeting_schedule', useApi: true };
    }

    // Dokument-Keywords
    if (
      lowerPrompt.includes('dokument') ||
      lowerPrompt.includes('pdf') ||
      lowerPrompt.includes('datei') ||
      lowerPrompt.includes('finde')
    ) {
      return { likely: 'document_request', useApi: true };
    }

    // Protokoll-Keywords
    if (
      lowerPrompt.includes('protokoll') &&
      (lowerPrompt.includes('erstell') || lowerPrompt.includes('generier'))
    ) {
      return { likely: 'protocol_generate', useApi: true };
    }

    // Allgemeine Fragen
    if (
      lowerPrompt.includes('wie') ||
      lowerPrompt.includes('was') ||
      lowerPrompt.includes('wann') ||
      lowerPrompt.includes('wo')
    ) {
      return { likely: 'general_question', useApi: false };
    }

    return { likely: 'unknown', useApi: true };
  }
}

module.exports = IntentEngine;
