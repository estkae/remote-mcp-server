/**
 * Meeting Management Skill
 *
 * Stellt Tools für das Meeting-Management bereit:
 * - Intent-Analyse für Meeting-Requests
 * - Meeting erstellen
 * - Meeting abrufen
 * - Meeting suchen
 */

const IntentEngine = require('../intent-engine/intent-engine');
const DynamicFormGenerator = require('../forms/form-generator');
const TypeDBConnector = require('../typedb/typedb-connector');

class MeetingManagementSkill {
  constructor() {
    this.name = 'Meeting Management';
    this.description = 'Autonomes Meeting-System mit Intent-Erkennung';

    // Initialisierung erfolgt lazy
    this.intentEngine = null;
    this.formGenerator = null;
    this.typedb = null;
  }

  /**
   * Initialisiert die Komponenten
   */
  async initialize() {
    try {
      // Intent Engine
      this.intentEngine = new IntentEngine(process.env.ANTHROPIC_API_KEY);

      // TypeDB Connector
      const typedbHost = process.env.TYPEDB_HOST || 'localhost:1729';
      this.typedb = new TypeDBConnector(typedbHost);
      await this.typedb.initialize();

      // Form Generator
      this.formGenerator = new DynamicFormGenerator(this.typedb);

      console.log('✅ Meeting Management Skill initialisiert');
      return true;
    } catch (error) {
      console.error('❌ Meeting Management Skill Initialisierung fehlgeschlagen:', error);
      return false;
    }
  }

  /**
   * Gibt die verfügbaren Tools zurück
   */
  getTools() {
    return [
      {
        name: 'analyze_meeting_intent',
        description: 'Analysiert User-Prompt und erkennt Meeting-bezogene Intentionen automatisch. Gibt zurück: Intent (meeting_schedule, meeting_query, etc.), extrahierte Entities (Datum, Zeit, Teilnehmer, Themen), und empfohlene Action.',
        input_schema: {
          type: 'object',
          properties: {
            user_prompt: {
              type: 'string',
              description: 'Der User-Prompt zur Analyse'
            },
            conversation_history: {
              type: 'array',
              description: 'Optional: Bisherige Konversation für Kontext',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant'] },
                  content: { type: 'string' }
                }
              }
            }
          },
          required: ['user_prompt']
        }
      },

      {
        name: 'generate_meeting_form',
        description: 'Generiert ein dynamisches Formular für Meeting-Erstellung basierend auf erkanntem Intent und extrahierten Entities. Gibt JSON-Schema zurück das im Frontend gerendert werden kann.',
        input_schema: {
          type: 'object',
          properties: {
            intent: {
              type: 'string',
              description: 'Der erkannte Intent (z.B. meeting_schedule)'
            },
            entities: {
              type: 'object',
              description: 'Extrahierte Entities aus dem Prompt'
            }
          },
          required: ['intent']
        }
      },

      {
        name: 'create_meeting',
        description: 'Erstellt ein neues Meeting in der Datenbank mit allen Details (Datum, Zeit, Ort, Teilnehmer, Agenda). Speichert in TypeDB und gibt Meeting-ID zurück.',
        input_schema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Datum im Format YYYY-MM-DD'
            },
            time: {
              type: 'string',
              description: 'Uhrzeit im Format HH:MM'
            },
            location: {
              type: 'string',
              description: 'Ort der Sitzung'
            },
            meeting_type: {
              type: 'string',
              description: 'Typ: gemeinderat, ma_sitzung, ausschuss, other',
              enum: ['gemeinderat', 'ma_sitzung', 'ausschuss', 'other']
            },
            participants: {
              type: 'array',
              description: 'Array von Teilnehmer-IDs',
              items: { type: 'string' }
            },
            topics: {
              type: 'array',
              description: 'Array von Tagesordnungspunkten',
              items: {
                type: 'object',
                properties: {
                  topic: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'number' }
                }
              }
            },
            created_by: {
              type: 'string',
              description: 'User-ID des Erstellers'
            }
          },
          required: ['date', 'time', 'location', 'meeting_type', 'topics']
        }
      },

      {
        name: 'get_meeting_details',
        description: 'Ruft alle Details zu einem Meeting ab (Teilnehmer, Agenda, Dokumente, Status)',
        input_schema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Die Meeting-ID'
            }
          },
          required: ['meeting_id']
        }
      },

      {
        name: 'search_meetings',
        description: 'Sucht Meetings nach verschiedenen Kriterien (Typ, Datum, Status)',
        input_schema: {
          type: 'object',
          properties: {
            meeting_type: {
              type: 'string',
              description: 'Optional: Filter nach Meeting-Typ'
            },
            status: {
              type: 'string',
              description: 'Optional: Filter nach Status (scheduled, ready, in-progress, completed)'
            },
            date_from: {
              type: 'string',
              description: 'Optional: Von-Datum (YYYY-MM-DD)'
            },
            date_to: {
              type: 'string',
              description: 'Optional: Bis-Datum (YYYY-MM-DD)'
            }
          }
        }
      },

      {
        name: 'add_person',
        description: 'Fügt eine Person zur Datenbank hinzu oder aktualisiert sie (für Teilnehmer-Verwaltung)',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name der Person' },
            email: { type: 'string', description: 'E-Mail-Adresse' },
            phone: { type: 'string', description: 'Telefonnummer (optional)' },
            role: { type: 'string', description: 'Rolle (z.B. gemeinderat, mitarbeiter)' },
            department: { type: 'string', description: 'Abteilung (optional)' }
          },
          required: ['name', 'email']
        }
      },

      {
        name: 'get_all_persons',
        description: 'Ruft alle Personen aus der Datenbank ab (für Teilnehmer-Auswahl)',
        input_schema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  /**
   * Führt ein Tool aus
   */
  async executeTool(toolName, input) {
    // Lazy init
    if (!this.intentEngine) {
      await this.initialize();
    }

    switch (toolName) {
      case 'analyze_meeting_intent':
        return await this.analyzeMeetingIntent(input);

      case 'generate_meeting_form':
        return await this.generateMeetingForm(input);

      case 'create_meeting':
        return await this.createMeeting(input);

      case 'get_meeting_details':
        return await this.getMeetingDetails(input);

      case 'search_meetings':
        return await this.searchMeetings(input);

      case 'add_person':
        return await this.addPerson(input);

      case 'get_all_persons':
        return await this.getAllPersons(input);

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  // ==================== TOOL IMPLEMENTATIONS ====================

  async analyzeMeetingIntent(input) {
    try {
      const analysis = await this.intentEngine.analyzeIntent(
        input.user_prompt,
        input.conversation_history || []
      );

      // Speichere Analyse für Self-Learning
      await this.typedb.storeIntentAnalysis(input.user_prompt, analysis);

      return {
        success: true,
        analysis
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateMeetingForm(input) {
    try {
      const formSchema = await this.formGenerator.generateFormSchema(
        input.intent,
        input.entities || {}
      );

      return {
        success: true,
        formSchema
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createMeeting(input) {
    try {
      const result = await this.typedb.createMeeting(input);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getMeetingDetails(input) {
    try {
      const meeting = await this.typedb.getMeetingDetails(input.meeting_id);

      if (!meeting) {
        return {
          success: false,
          error: 'Meeting nicht gefunden'
        };
      }

      return {
        success: true,
        meeting
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async searchMeetings(input) {
    try {
      const meetings = await this.typedb.searchMeetings(input);

      return {
        success: true,
        meetings,
        count: meetings.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async addPerson(input) {
    try {
      const result = await this.typedb.upsertPerson(input);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAllPersons() {
    try {
      const persons = await this.typedb.getAllPersons();

      return {
        success: true,
        persons,
        count: persons.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health Check
   */
  async healthCheck() {
    try {
      const typedbHealth = await this.typedb.healthCheck();

      return {
        skill: 'Meeting Management',
        status: typedbHealth.status === 'connected' ? 'healthy' : 'unhealthy',
        typedb: typedbHealth
      };
    } catch (error) {
      return {
        skill: 'Meeting Management',
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = MeetingManagementSkill;
