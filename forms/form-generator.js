/**
 * Dynamic Form Generator
 *
 * Generiert Formulare basierend auf erkanntem Intent und extrahierten Entities
 */

class DynamicFormGenerator {
  constructor(typedbConnector) {
    this.typedb = typedbConnector;
  }

  /**
   * Generiert Formular-Schema basierend auf Intent
   * @param {string} intent - Erkannter Intent
   * @param {Object} extractedEntities - Extrahierte Entities aus Prompt
   * @returns {Promise<Object>} Formular-Schema
   */
  async generateFormSchema(intent, extractedEntities = {}) {
    const schemas = {
      meeting_schedule: await this.generateMeetingForm(extractedEntities),
      protocol_generate: await this.generateProtocolForm(extractedEntities),
      document_request: await this.generateDocumentRequestForm(extractedEntities)
    };

    return schemas[intent] || null;
  }

  /**
   * Generiert Meeting-Formular
   */
  async generateMeetingForm(entities) {
    // Lade Teilnehmer aus DB
    const participants = await this.loadParticipants(entities.meeting_type);

    // Lade Protokoll-Templates
    const templates = await this.loadProtocolTemplates(entities.meeting_type);

    return {
      formId: 'meeting-form',
      title: 'Sitzung organisieren',
      description: 'Vervollständigen Sie die Sitzungsinformationen',

      fields: [
        {
          name: 'meeting_type',
          type: 'select',
          label: 'Sitzungstyp',
          required: true,
          options: [
            { value: 'gemeinderat', label: 'Gemeinderatssitzung' },
            { value: 'ma_sitzung', label: 'Mitarbeiter-Sitzung' },
            { value: 'ausschuss', label: 'Ausschusssitzung' },
            { value: 'other', label: 'Andere' }
          ],
          defaultValue: entities.meeting_type || '',
          helpText: 'Wählen Sie den Typ der Sitzung'
        },

        {
          name: 'date',
          type: 'date',
          label: 'Datum',
          required: true,
          defaultValue: entities.date || '',
          min: this.getTodayDate(),
          helpText: 'Datum der Sitzung'
        },

        {
          name: 'time',
          type: 'time',
          label: 'Uhrzeit',
          required: true,
          defaultValue: entities.time || '14:00',
          helpText: 'Startzeit der Sitzung'
        },

        {
          name: 'duration',
          type: 'number',
          label: 'Dauer (Minuten)',
          required: false,
          defaultValue: 120,
          min: 15,
          max: 480,
          step: 15,
          helpText: 'Geschätzte Dauer in Minuten'
        },

        {
          name: 'location',
          type: 'text',
          label: 'Ort',
          required: true,
          defaultValue: entities.location || 'Rathaus, Sitzungszimmer 1',
          helpText: 'Ort der Sitzung',
          suggestions: [
            'Rathaus, Sitzungszimmer 1',
            'Rathaus, Sitzungszimmer 2',
            'Gemeindesaal',
            'Online (Teams/Zoom)'
          ]
        },

        {
          name: 'participants',
          type: 'multi-select',
          label: 'Teilnehmer',
          required: true,
          options: participants.map(p => ({
            value: p.id,
            label: `${p.name} (${p.email})`,
            group: p.role
          })),
          defaultValue: this.matchParticipants(entities.participants, participants),
          helpText: 'Wählen Sie die Teilnehmer aus',
          searchable: true
        },

        {
          name: 'topics',
          type: 'dynamic-list',
          label: 'Tagesordnungspunkte',
          required: true,
          minItems: 1,
          maxItems: 20,
          fields: [
            {
              name: 'topic',
              type: 'text',
              label: 'Thema',
              required: true,
              placeholder: 'z.B. Haushalt 2026'
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Beschreibung',
              required: false,
              placeholder: 'Optionale Details zum Thema',
              rows: 2
            },
            {
              name: 'priority',
              type: 'range',
              label: 'Priorität',
              required: false,
              min: 1,
              max: 10,
              defaultValue: 5,
              showValue: true
            },
            {
              name: 'duration_minutes',
              type: 'number',
              label: 'Dauer (Min.)',
              required: false,
              min: 5,
              max: 120,
              step: 5,
              placeholder: '15'
            },
            {
              name: 'documents_needed',
              type: 'checkbox',
              label: 'Dokumente benötigt',
              defaultValue: true
            }
          ],
          defaultValue: (entities.topics || []).map(topic => {
            if (typeof topic === 'string') {
              return {
                topic,
                description: '',
                priority: 5,
                duration_minutes: null,
                documents_needed: true
              };
            }
            return topic;
          }),
          helpText: 'Fügen Sie Tagesordnungspunkte hinzu',
          addButtonText: '+ Weiteren Punkt hinzufügen',
          removeButtonText: 'Entfernen'
        },

        {
          name: 'protocol_template',
          type: 'select',
          label: 'Protokoll-Vorlage',
          required: true,
          options: templates,
          defaultValue: this.getDefaultTemplate(templates, entities.meeting_type),
          helpText: 'Wählen Sie eine Vorlage für das Protokoll'
        },

        {
          name: 'send_invitations',
          type: 'checkbox',
          label: 'Einladungen sofort versenden',
          defaultValue: true,
          helpText: 'E-Mail-Einladungen an alle Teilnehmer senden'
        },

        {
          name: 'fetch_documents',
          type: 'checkbox',
          label: 'Dokumente automatisch von OneDrive holen',
          defaultValue: true,
          helpText: 'Relevante Dokumente zu den Themen automatisch suchen'
        },

        {
          name: 'notes',
          type: 'textarea',
          label: 'Notizen (optional)',
          required: false,
          rows: 3,
          placeholder: 'Weitere Informationen zur Sitzung...'
        }
      ],

      actions: [
        {
          type: 'submit',
          label: 'Sitzung erstellen',
          icon: '✓',
          endpoint: '/api/meetings/create',
          method: 'POST',
          successMessage: 'Sitzung erfolgreich erstellt!',
          loadingText: 'Erstelle Sitzung...'
        },
        {
          type: 'cancel',
          label: 'Abbrechen',
          icon: '×'
        }
      ],

      validation: {
        custom: [
          {
            field: 'date',
            rule: 'not_past',
            message: 'Das Datum darf nicht in der Vergangenheit liegen'
          },
          {
            field: 'topics',
            rule: 'min_length',
            value: 1,
            message: 'Mindestens ein Tagesordnungspunkt erforderlich'
          }
        ]
      },

      onSubmitSuccess: 'fetch_related_documents',

      styling: {
        theme: 'modern',
        layout: 'two-column',
        animations: true
      }
    };
  }

  /**
   * Generiert Protokoll-Formular
   */
  async generateProtocolForm(entities) {
    // Lade vergangene Meetings
    const recentMeetings = await this.loadRecentMeetings(30);

    return {
      formId: 'protocol-form',
      title: 'Protokoll generieren',
      description: 'Erstellen Sie ein Sitzungsprotokoll',

      fields: [
        {
          name: 'meeting_id',
          type: 'select',
          label: 'Sitzung auswählen',
          required: true,
          options: recentMeetings.map(m => ({
            value: m.id,
            label: `${m.type} - ${this.formatDate(m.date)} ${m.time}`,
            description: m.location
          })),
          defaultValue: entities.meeting_id || '',
          helpText: 'Wählen Sie die Sitzung für das Protokoll'
        },

        {
          name: 'audio_file',
          type: 'file',
          label: 'Aufnahme hochladen (optional)',
          accept: 'audio/*,video/*',
          required: false,
          maxSize: 500 * 1024 * 1024, // 500 MB
          helpText: 'Audio- oder Video-Aufnahme der Sitzung'
        },

        {
          name: 'use_transcription',
          type: 'checkbox',
          label: 'Automatische Transkription verwenden',
          defaultValue: true,
          dependsOn: 'audio_file',
          helpText: 'Aufnahme automatisch transkribieren und im Protokoll verwenden'
        },

        {
          name: 'manual_notes',
          type: 'textarea',
          label: 'Manuelle Notizen',
          required: false,
          rows: 10,
          placeholder: 'Zusätzliche Notizen zur Sitzung...',
          helpText: 'Werden mit der Transkription kombiniert'
        },

        {
          name: 'include_decisions',
          type: 'checkbox',
          label: 'Beschlüsse hervorheben',
          defaultValue: true,
          helpText: 'Beschlüsse automatisch erkennen und markieren'
        },

        {
          name: 'language',
          type: 'select',
          label: 'Sprache',
          required: true,
          options: [
            { value: 'de-DE', label: 'Deutsch' },
            { value: 'de-CH', label: 'Schweizerdeutsch' },
            { value: 'en-US', label: 'Englisch' }
          ],
          defaultValue: 'de-DE'
        }
      ],

      actions: [
        {
          type: 'submit',
          label: 'Protokoll erstellen',
          icon: '📄',
          endpoint: '/api/protocols/generate',
          method: 'POST',
          successMessage: 'Protokoll wird erstellt...',
          loadingText: 'Generiere Protokoll...'
        },
        {
          type: 'cancel',
          label: 'Abbrechen',
          icon: '×'
        }
      ]
    };
  }

  /**
   * Generiert Dokumenten-Anfrage-Formular
   */
  async generateDocumentRequestForm(entities) {
    return {
      formId: 'document-request-form',
      title: 'Dokumente suchen',
      description: 'Finden Sie relevante Dokumente auf OneDrive',

      fields: [
        {
          name: 'keywords',
          type: 'tags',
          label: 'Suchbegriffe',
          required: true,
          defaultValue: entities.keywords || entities.topics || [],
          placeholder: 'z.B. Haushalt, Bauvorhaben, etc.',
          helpText: 'Mehrere Begriffe durch Enter trennen'
        },

        {
          name: 'doc_types',
          type: 'checkbox-group',
          label: 'Dokumenttypen',
          required: false,
          options: [
            { value: 'pdf', label: 'PDF' },
            { value: 'docx', label: 'Word' },
            { value: 'xlsx', label: 'Excel' },
            { value: 'pptx', label: 'PowerPoint' }
          ],
          defaultValue: entities.doc_types || ['pdf', 'docx', 'xlsx'],
          layout: 'horizontal'
        },

        {
          name: 'date_range',
          type: 'date-range',
          label: 'Änderungsdatum',
          required: false,
          defaultValue: {
            start: entities.date_range?.start || null,
            end: entities.date_range?.end || null
          },
          helpText: 'Nur Dokumente in diesem Zeitraum'
        },

        {
          name: 'max_results',
          type: 'number',
          label: 'Maximale Anzahl Ergebnisse',
          required: false,
          defaultValue: 20,
          min: 5,
          max: 100,
          step: 5
        }
      ],

      actions: [
        {
          type: 'submit',
          label: 'Suchen',
          icon: '🔍',
          endpoint: '/api/documents/search',
          method: 'POST',
          successMessage: 'Suche abgeschlossen',
          loadingText: 'Suche läuft...'
        }
      ]
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Lädt Teilnehmer aus TypeDB
   */
  async loadParticipants(meetingType) {
    try {
      const allPersons = await this.typedb.getAllPersons();

      // Filtere basierend auf Meeting-Type falls gewünscht
      return allPersons;
    } catch (error) {
      console.error('Teilnehmer laden fehlgeschlagen:', error);
      return [];
    }
  }

  /**
   * Lädt Protokoll-Templates
   */
  async loadProtocolTemplates(meetingType) {
    // TODO: Aus TypeDB laden
    // Momentan: Statische Liste
    return [
      {
        value: 'standard_gemeinderat',
        label: 'Standard - Gemeinderat',
        isDefault: meetingType === 'gemeinderat'
      },
      {
        value: 'standard_ma_sitzung',
        label: 'Standard - MA-Sitzung',
        isDefault: meetingType === 'ma_sitzung'
      },
      {
        value: 'formal',
        label: 'Formal - Offiziell',
        isDefault: false
      },
      {
        value: 'compact',
        label: 'Kompakt - Kurzform',
        isDefault: false
      }
    ];
  }

  /**
   * Lädt vergangene Meetings
   */
  async loadRecentMeetings(days = 30) {
    try {
      const dateFrom = this.getDateDaysAgo(days);
      const meetings = await this.typedb.searchMeetings({
        date_from: dateFrom,
        status: 'completed'
      });

      return meetings;
    } catch (error) {
      console.error('Meetings laden fehlgeschlagen:', error);
      return [];
    }
  }

  /**
   * Matched Participant-Namen mit DB-Einträgen
   */
  matchParticipants(names, allParticipants) {
    if (!names || !Array.isArray(names)) return [];

    const matched = [];
    for (const name of names) {
      const found = allParticipants.find(p =>
        p.name.toLowerCase().includes(name.toLowerCase()) ||
        p.email.toLowerCase().includes(name.toLowerCase())
      );

      if (found) {
        matched.push(found.id);
      }
    }

    return matched;
  }

  /**
   * Findet Default-Template
   */
  getDefaultTemplate(templates, meetingType) {
    const defaultTemplate = templates.find(t => t.isDefault);
    return defaultTemplate ? defaultTemplate.value : templates[0]?.value || '';
  }

  /**
   * Hilfsfunktionen
   */
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}

module.exports = DynamicFormGenerator;
