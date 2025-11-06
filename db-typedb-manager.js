/**
 * TypeDB 3.x Manager
 * Handles TypeDB connections and TypeQL queries
 */

const { TypeDB } = require('typedb-client/TypeDB');
const { SessionType } = require('typedb-client/api/connection/TypeDBSession');
const { TransactionType } = require('typedb-client/api/connection/TypeDBTransaction');

class TypeDBManager {
    constructor() {
        this.clients = new Map(); // sessionId -> client
        this.sessions = new Map(); // sessionId -> session
        this.connectionConfigs = new Map(); // sessionId -> config
    }

    /**
     * Connect to TypeDB
     */
    async connect(sessionId, config) {
        const { host, port, database, username, password, cloudConnection = false, options = {} } = config;

        try {
            let client;

            if (cloudConnection) {
                // TypeDB Cloud connection
                client = await TypeDB.cloudDriver(
                    `${host}:${port || 1729}`,
                    { username: username, password: password }
                );
            } else {
                // TypeDB Core connection (local or self-hosted)
                client = await TypeDB.coreDriver(`${host}:${port || 1729}`);
            }

            // Test connection by opening a session
            const session = await client.session(database, SessionType.DATA);

            this.clients.set(sessionId, client);
            this.sessions.set(sessionId, session);
            this.connectionConfigs.set(sessionId, config);

            return {
                success: true,
                sessionId,
                message: `Connected to TypeDB database: ${database}`,
                type: cloudConnection ? 'TypeDB Cloud' : 'TypeDB Core'
            };

        } catch (error) {
            console.error(`TypeDB connection failed:`, error.message);
            throw new Error(`Failed to connect to TypeDB: ${error.message}`);
        }
    }

    /**
     * Execute TypeQL query
     */
    async executeQuery(sessionId, query, readOnly = true) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`No active TypeDB session for: ${sessionId}`);
        }

        try {
            const txType = readOnly ? TransactionType.READ : TransactionType.WRITE;
            const transaction = await session.transaction(txType);

            try {
                let results = [];

                // Detect query type
                if (query.trim().toLowerCase().startsWith('match')) {
                    // Match query - returns stream of concept maps
                    const stream = await transaction.query.match(query);
                    const conceptMaps = await stream.collect();

                    results = conceptMaps.map(conceptMap => {
                        const row = {};
                        for (const [varName, concept] of conceptMap.map()) {
                            if (concept.isEntity()) {
                                row[varName] = {
                                    type: concept.type.label.name,
                                    iid: concept.iid
                                };
                            } else if (concept.isRelation()) {
                                row[varName] = {
                                    type: concept.type.label.name,
                                    iid: concept.iid
                                };
                            } else if (concept.isAttribute()) {
                                row[varName] = {
                                    type: concept.type.label.name,
                                    value: concept.value
                                };
                            } else if (concept.isValue()) {
                                row[varName] = concept.value;
                            }
                        }
                        return row;
                    });

                } else if (query.trim().toLowerCase().startsWith('insert')) {
                    // Insert query
                    const stream = await transaction.query.insert(query);
                    const conceptMaps = await stream.collect();
                    results = conceptMaps.map(cm => ({ inserted: true, count: cm.map().size }));

                    if (!readOnly) {
                        await transaction.commit();
                    }

                } else if (query.trim().toLowerCase().startsWith('delete')) {
                    // Delete query
                    await transaction.query.delete(query);
                    results = [{ deleted: true }];

                    if (!readOnly) {
                        await transaction.commit();
                    }

                } else if (query.trim().toLowerCase().startsWith('define')) {
                    // Schema definition
                    await transaction.query.define(query);
                    results = [{ defined: true }];

                    if (!readOnly) {
                        await transaction.commit();
                    }

                } else if (query.trim().toLowerCase().startsWith('undefine')) {
                    // Schema undefinition
                    await transaction.query.undefine(query);
                    results = [{ undefined: true }];

                    if (!readOnly) {
                        await transaction.commit();
                    }

                } else {
                    throw new Error(`Unsupported TypeQL query type. Query must start with: match, insert, delete, define, or undefine`);
                }

                if (readOnly || query.trim().toLowerCase().startsWith('match')) {
                    await transaction.close();
                }

                return {
                    rows: results,
                    rowCount: results.length,
                    queryType: query.trim().split(' ')[0].toLowerCase()
                };

            } catch (error) {
                await transaction.close();
                throw error;
            }

        } catch (error) {
            console.error(`TypeQL query execution failed:`, error.message);
            throw new Error(`TypeQL query failed: ${error.message}`);
        }
    }

    /**
     * Get schema of database
     */
    async getSchema(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`No active TypeDB session for: ${sessionId}`);
        }

        try {
            const transaction = await session.transaction(TransactionType.READ);

            // Get all entity types
            const entityTypes = await transaction.concepts.getRootEntityType();
            const entities = [];
            const entityStream = await entityTypes.getSubtypes(transaction);
            for await (const entityType of entityStream) {
                entities.push({
                    type: 'entity',
                    label: entityType.label.name
                });
            }

            // Get all relation types
            const relationTypes = await transaction.concepts.getRootRelationType();
            const relations = [];
            const relationStream = await relationTypes.getSubtypes(transaction);
            for await (const relationType of relationStream) {
                relations.push({
                    type: 'relation',
                    label: relationType.label.name
                });
            }

            // Get all attribute types
            const attributeTypes = await transaction.concepts.getRootAttributeType();
            const attributes = [];
            const attributeStream = await attributeTypes.getSubtypes(transaction);
            for await (const attributeType of attributeStream) {
                attributes.push({
                    type: 'attribute',
                    label: attributeType.label.name
                });
            }

            await transaction.close();

            return {
                rows: [
                    { category: 'Entities', items: entities },
                    { category: 'Relations', items: relations },
                    { category: 'Attributes', items: attributes }
                ],
                rowCount: entities.length + relations.length + attributes.length
            };

        } catch (error) {
            console.error(`Failed to get TypeDB schema:`, error.message);
            throw new Error(`Failed to get schema: ${error.message}`);
        }
    }

    /**
     * List all databases
     */
    async listDatabases(sessionId) {
        const client = this.clients.get(sessionId);
        if (!client) {
            throw new Error(`No active TypeDB client for: ${sessionId}`);
        }

        try {
            const databases = await client.databases.all();
            const dbList = databases.map(db => ({
                name: db.name
            }));

            return {
                rows: dbList,
                rowCount: dbList.length
            };

        } catch (error) {
            console.error(`Failed to list TypeDB databases:`, error.message);
            throw new Error(`Failed to list databases: ${error.message}`);
        }
    }

    /**
     * Create new database
     */
    async createDatabase(sessionId, databaseName) {
        const client = this.clients.get(sessionId);
        if (!client) {
            throw new Error(`No active TypeDB client for: ${sessionId}`);
        }

        try {
            await client.databases.create(databaseName);
            return {
                success: true,
                message: `Database '${databaseName}' created successfully`
            };

        } catch (error) {
            console.error(`Failed to create TypeDB database:`, error.message);
            throw new Error(`Failed to create database: ${error.message}`);
        }
    }

    /**
     * Delete database
     */
    async deleteDatabase(sessionId, databaseName) {
        const client = this.clients.get(sessionId);
        if (!client) {
            throw new Error(`No active TypeDB client for: ${sessionId}`);
        }

        try {
            const db = await client.databases.get(databaseName);
            await db.delete();
            return {
                success: true,
                message: `Database '${databaseName}' deleted successfully`
            };

        } catch (error) {
            console.error(`Failed to delete TypeDB database:`, error.message);
            throw new Error(`Failed to delete database: ${error.message}`);
        }
    }

    /**
     * Disconnect from TypeDB
     */
    async disconnect(sessionId) {
        const session = this.sessions.get(sessionId);
        const client = this.clients.get(sessionId);

        if (!client && !session) {
            return { success: false, message: `No TypeDB connection found for session: ${sessionId}` };
        }

        try {
            if (session) {
                await session.close();
                this.sessions.delete(sessionId);
            }

            if (client) {
                await client.close();
                this.clients.delete(sessionId);
            }

            this.connectionConfigs.delete(sessionId);

            return {
                success: true,
                message: `Disconnected from TypeDB`
            };

        } catch (error) {
            console.error(`TypeDB disconnect failed:`, error.message);
            // Force cleanup
            this.sessions.delete(sessionId);
            this.clients.delete(sessionId);
            this.connectionConfigs.delete(sessionId);

            return {
                success: true,
                message: `Force disconnected from TypeDB (with errors)`
            };
        }
    }

    /**
     * Get active connections
     */
    getActiveConnections() {
        const connections = [];
        for (const [sessionId, session] of this.sessions.entries()) {
            const config = this.connectionConfigs.get(sessionId);
            connections.push({
                sessionId,
                type: 'typedb',
                database: session.database?.name || config?.database || 'unknown',
                host: config ? config.host : 'unknown'
            });
        }
        return connections;
    }

    /**
     * Disconnect all connections
     */
    async disconnectAll() {
        const results = [];
        for (const sessionId of this.clients.keys()) {
            const result = await this.disconnect(sessionId);
            results.push({ sessionId, ...result });
        }
        return results;
    }
}

module.exports = new TypeDBManager();
