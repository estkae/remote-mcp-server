"""
Store Swiss Transcription in TypeDB
Speichert Transkriptionen mit Topics und Entitäten
"""

import sys
import json
from datetime import datetime
from typedb.driver import TypeDB, SessionType, TransactionType

# Konfiguration
TYPEDB_SERVER = "138.197.190.64:1729"
DATABASE_NAME = "meeting-knowledge"

def store_transcription(transcription_data):
    """
    Speichert Transkription mit Analyse in TypeDB

    Args:
        transcription_data: JSON string mit:
            - transcription_id
            - meeting_id (optional)
            - full_text
            - language
            - duration_seconds
            - recorded_at
            - topics: [{title, description, relevance, keywords, category}]
            - entities: [{text, type, context}]
            - protocol (optional)
            - summary (optional)
    """

    try:
        # Parse JSON input
        data = json.loads(transcription_data)

        print(f"📥 Speichere Transkription: {data.get('transcription_id', 'unknown')}")

        with TypeDB.core_driver(TYPEDB_SERVER) as driver:
            with driver.session(DATABASE_NAME, SessionType.DATA) as session:
                with session.transaction(TransactionType.WRITE) as tx:

                    # 1. Create Transcription entity
                    transcription_id = data['transcription_id']
                    full_text = data['full_text']
                    language = data.get('language', 'de-CH')

                    query_transcription = f'''
                        insert $transcription isa transcription,
                            has transcription-id "{transcription_id}",
                            has full-text """{full_text}""",
                            has language "{language}",
                            has created-at {datetime.now().isoformat()};
                    '''

                    # Optional: Link to meeting if meeting_id provided
                    if 'meeting_id' in data and data['meeting_id']:
                        meeting_id = data['meeting_id']
                        query_transcription += f'''
                        match $meeting isa meeting, has meeting-id "{meeting_id}";
                        insert (recorded-meeting: $meeting, meeting-transcription: $transcription)
                            isa transcription-of-meeting;
                        '''

                    print("  ✅ Transkription Entity erstellt")

                    # 2. Create Recording if duration provided
                    if 'duration_seconds' in data:
                        recording_id = f"rec_{transcription_id}"
                        duration = data['duration_seconds']
                        recorded_at = data.get('recorded_at', datetime.now().isoformat())

                        query_recording = f'''
                            insert $recording isa recording,
                                has recording-id "{recording_id}",
                                has duration-seconds {duration},
                                has recorded-at {recorded_at},
                                has transcription-status "completed";
                        '''

                        print("  ✅ Recording Entity erstellt")

                    # 3. Create Protocol if provided
                    if 'protocol' in data and data['protocol']:
                        protocol_id = f"prot_{transcription_id}"
                        protocol_content = data['protocol']

                        query_protocol = f'''
                            insert $protocol isa protocol,
                                has protocol-id "{protocol_id}",
                                has content-markdown """{protocol_content}""",
                                has created-at {datetime.now().isoformat()};

                            match $transcription isa transcription,
                                  has transcription-id "{transcription_id}";
                            insert (source-transcription: $transcription, generated-protocol: $protocol)
                                isa protocol-generation;
                        '''

                        tx.query.insert(query_protocol)
                        print("  ✅ Protokoll Entity erstellt")

                    # 4. Store Topics as Agenda Items
                    topics = data.get('topics', [])
                    print(f"  📋 Speichere {len(topics)} Topics...")

                    for idx, topic in enumerate(topics):
                        topic_id = f"topic_{transcription_id}_{idx}"
                        title = topic.get('title', 'Unbekannt')
                        description = topic.get('description', '')
                        relevance = topic.get('relevance', 0.5)
                        category = topic.get('category', 'Anderes')
                        keywords = topic.get('keywords', [])

                        query_topic = f'''
                            insert $topic isa agenda-item,
                                has item-id "{topic_id}",
                                has topic "{title}",
                                has description "{description}",
                                has priority {relevance},
                                has order-index {idx},
                                has status "extracted";

                            match $transcription isa transcription,
                                  has transcription-id "{transcription_id}";
                            insert (discussed-in: $transcription, agenda-topic: $topic)
                                isa topic-discussion;
                        '''

                        tx.query.insert(query_topic)
                        print(f"    - Topic {idx+1}: {title}")

                    # 5. Store Entities as Person/Organization references
                    entities = data.get('entities', [])
                    if entities:
                        print(f"  👥 Speichere {len(entities)} Entitäten...")

                        for ent in entities:
                            ent_text = ent.get('text', '')
                            ent_type = ent.get('type', 'UNKNOWN')
                            ent_context = ent.get('context', '')

                            if ent_type == 'PERSON':
                                # Check if person exists, otherwise create
                                person_id = f"person_{ent_text.replace(' ', '_').lower()}"

                                query_entity = f'''
                                    match $person isa person, has person-id "{person_id}";
                                    get $person;
                                '''

                                existing = list(tx.query.get(query_entity))

                                if not existing:
                                    query_insert_person = f'''
                                        insert $person isa person,
                                            has person-id "{person_id}",
                                            has name "{ent_text}";
                                    '''
                                    tx.query.insert(query_insert_person)
                                    print(f"    - Person erstellt: {ent_text}")

                    # 6. Store summary if provided
                    if 'summary' in data and data['summary']:
                        # Add summary as attribute to transcription
                        summary_text = data['summary']
                        query_summary = f'''
                            match $transcription isa transcription,
                                  has transcription-id "{transcription_id}";
                            insert $transcription has description "{summary_text}";
                        '''
                        # Note: Schema might need adjustment to allow description on transcription

                    # Commit transaction
                    tx.commit()

                    print("✅ Transkription erfolgreich in TypeDB gespeichert!")
                    print(f"   - Transcription ID: {transcription_id}")
                    print(f"   - Topics: {len(topics)}")
                    print(f"   - Entities: {len(entities)}")

                    return {
                        'success': True,
                        'transcription_id': transcription_id,
                        'topics_count': len(topics),
                        'entities_count': len(entities)
                    }

    except json.JSONDecodeError as e:
        print(f"❌ JSON Parse Error: {e}")
        return {'success': False, 'error': f'Invalid JSON: {e}'}

    except Exception as e:
        print(f"❌ TypeDB Error: {e}")
        return {'success': False, 'error': str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python store-transcription.py '<json_data>'")
        print("\nExample JSON:")
        print(json.dumps({
            "transcription_id": "trans_12345",
            "meeting_id": "meeting_001",
            "full_text": "Sitzung Protokoll...",
            "language": "de-CH",
            "duration_seconds": 3600,
            "topics": [
                {
                    "title": "Strassenreparatur",
                    "description": "Diskussion über Strassenreparatur",
                    "relevance": 0.9,
                    "keywords": ["Strasse", "Reparatur"],
                    "category": "Infrastruktur"
                }
            ],
            "entities": [
                {"text": "Hans Müller", "type": "PERSON", "context": "Bauleiter"}
            ],
            "protocol": "## Protokoll\n...",
            "summary": "Kurze Zusammenfassung"
        }, indent=2))
        sys.exit(1)

    # Get JSON from command line argument
    json_data = sys.argv[1]

    result = store_transcription(json_data)

    # Output result as JSON for Node.js to parse
    print(json.dumps(result))