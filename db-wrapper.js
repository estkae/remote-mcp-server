/**
 * Universal Database Wrapper
 * Orchestrates connections to: MSSQL, MySQL, PostgreSQL, Oracle, SQL Anywhere, Banana DB, TypeDB 3.x
 *
 * Supports OneDrive config storage and integrates with remote-mcp-server
 */

const odbcManager = require('./db-odbc-manager');
const typedbManager = require('./db-typedb-manager');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class DatabaseWrapper {
    constructor() {
        this.sessionManagers = {
            odbc: ['mssql', 'sqlserver', 'mysql', 'postgresql', 'postgres', 'oracle', 'sqlanywhere', 'banana', 'bananadb'],
            typedb: ['typedb']
        };

        // OneDrive config path (will be set when Microsoft Graph is available)
        this.onedriveConfigPath = null;
        this.localConfigPath = path.join(__dirname, 'config', 'db-connections.json');
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `db_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    /**
     * Determine which manager to use based on DB type
     */
    getManager(dbType) {
        const type = dbType.toLowerCase();

        if (this.sessionManagers.typedb.includes(type)) {
            return { manager: typedbManager, managerType: 'typedb' };
        }

        if (this.sessionManagers.odbc.includes(type)) {
            return { manager: odbcManager, managerType: 'odbc' };
        }

        throw new Error(`Unsupported database type: ${dbType}`);
    }

    /**
     * Connect to database
     */
    async connect(config) {
        const { type } = config;
        const sessionId = config.sessionId || this.generateSessionId();

        try {
            const { manager, managerType } = this.getManager(type);

            let result;
            if (managerType === 'typedb') {
                result = await manager.connect(sessionId, config);
            } else {
                // Try native connection first, fall back to ODBC
                result = await manager.connectNative(sessionId, config);
            }

            return {
                ...result,
                sessionId,
                managerType
            };

        } catch (error) {
            console.error(`Connection failed:`, error.message);
            throw error;
        }
    }

    /**
     * Execute query
     */
    async executeQuery(sessionId, query, params = [], options = {}) {
        try {
            // Try ODBC manager first
            if (odbcManager.connections.has(sessionId)) {
                return await odbcManager.executeQuery(sessionId, query, params);
            }

            // Try TypeDB manager
            if (typedbManager.sessions.has(sessionId)) {
                const readOnly = options.readOnly !== false;
                return await typedbManager.executeQuery(sessionId, query, readOnly);
            }

            throw new Error(`No active connection found for session: ${sessionId}`);

        } catch (error) {
            console.error(`Query execution failed:`, error.message);
            throw error;
        }
    }

    /**
     * List tables/entities
     */
    async listTables(sessionId) {
        try {
            // Try ODBC manager
            if (odbcManager.connections.has(sessionId)) {
                return await odbcManager.listTables(sessionId);
            }

            // For TypeDB, list schema instead
            if (typedbManager.sessions.has(sessionId)) {
                return await typedbManager.getSchema(sessionId);
            }

            throw new Error(`No active connection found for session: ${sessionId}`);

        } catch (error) {
            console.error(`List tables failed:`, error.message);
            throw error;
        }
    }

    /**
     * Describe table structure
     */
    async describeTable(sessionId, tableName) {
        try {
            // Only works for ODBC databases
            if (odbcManager.connections.has(sessionId)) {
                return await odbcManager.describeTable(sessionId, tableName);
            }

            throw new Error(`Describe table not supported for this database type`);

        } catch (error) {
            console.error(`Describe table failed:`, error.message);
            throw error;
        }
    }

    /**
     * Disconnect from database
     */
    async disconnect(sessionId) {
        try {
            // Try ODBC manager
            if (odbcManager.connections.has(sessionId)) {
                return await odbcManager.disconnect(sessionId);
            }

            // Try TypeDB manager
            if (typedbManager.sessions.has(sessionId)) {
                return await typedbManager.disconnect(sessionId);
            }

            return {
                success: false,
                message: `No active connection found for session: ${sessionId}`
            };

        } catch (error) {
            console.error(`Disconnect failed:`, error.message);
            throw error;
        }
    }

    /**
     * Get all active connections
     */
    getAllConnections() {
        const odbcConnections = odbcManager.getActiveConnections();
        const typedbConnections = typedbManager.getActiveConnections();

        return {
            total: odbcConnections.length + typedbConnections.length,
            connections: [
                ...odbcConnections.map(c => ({ ...c, manager: 'odbc' })),
                ...typedbConnections.map(c => ({ ...c, manager: 'typedb' }))
            ]
        };
    }

    /**
     * Disconnect all connections
     */
    async disconnectAll() {
        const odbcResults = await odbcManager.disconnectAll();
        const typedbResults = await typedbManager.disconnectAll();

        return {
            disconnected: odbcResults.length + typedbResults.length,
            results: [...odbcResults, ...typedbResults]
        };
    }

    /**
     * Save connection config to local storage
     */
    async saveConfigLocal(configName, config) {
        try {
            // Ensure config directory exists
            const configDir = path.dirname(this.localConfigPath);
            await fs.mkdir(configDir, { recursive: true });

            // Load existing configs
            let configs = {};
            try {
                const data = await fs.readFile(this.localConfigPath, 'utf-8');
                configs = JSON.parse(data);
            } catch (error) {
                // File doesn't exist yet
            }

            // Add or update config (encrypt password)
            const configToSave = { ...config };
            if (configToSave.password) {
                configToSave.password = this.encryptPassword(configToSave.password);
                configToSave.encrypted = true;
            }

            configs[configName] = {
                ...configToSave,
                savedAt: new Date().toISOString()
            };

            // Save to file
            await fs.writeFile(this.localConfigPath, JSON.stringify(configs, null, 2));

            return {
                success: true,
                message: `Configuration '${configName}' saved locally`
            };

        } catch (error) {
            console.error(`Failed to save config:`, error.message);
            throw new Error(`Failed to save configuration: ${error.message}`);
        }
    }

    /**
     * Load connection config from local storage
     */
    async loadConfigLocal(configName) {
        try {
            const data = await fs.readFile(this.localConfigPath, 'utf-8');
            const configs = JSON.parse(data);

            if (!configs[configName]) {
                throw new Error(`Configuration '${configName}' not found`);
            }

            const config = configs[configName];

            // Decrypt password if encrypted
            if (config.encrypted && config.password) {
                config.password = this.decryptPassword(config.password);
                delete config.encrypted;
            }

            return config;

        } catch (error) {
            console.error(`Failed to load config:`, error.message);
            throw new Error(`Failed to load configuration: ${error.message}`);
        }
    }

    /**
     * List all saved configurations
     */
    async listConfigs() {
        try {
            const data = await fs.readFile(this.localConfigPath, 'utf-8');
            const configs = JSON.parse(data);

            return Object.keys(configs).map(name => ({
                name,
                type: configs[name].type,
                host: configs[name].host,
                database: configs[name].database,
                savedAt: configs[name].savedAt
            }));

        } catch (error) {
            // File doesn't exist or is empty
            return [];
        }
    }

    /**
     * Delete saved configuration
     */
    async deleteConfig(configName) {
        try {
            const data = await fs.readFile(this.localConfigPath, 'utf-8');
            const configs = JSON.parse(data);

            if (!configs[configName]) {
                throw new Error(`Configuration '${configName}' not found`);
            }

            delete configs[configName];

            await fs.writeFile(this.localConfigPath, JSON.stringify(configs, null, 2));

            return {
                success: true,
                message: `Configuration '${configName}' deleted`
            };

        } catch (error) {
            console.error(`Failed to delete config:`, error.message);
            throw new Error(`Failed to delete configuration: ${error.message}`);
        }
    }

    /**
     * Simple encryption for passwords (base64 + XOR)
     * Note: For production, use a proper encryption library
     */
    encryptPassword(password) {
        const key = 'db-wrapper-key-2025'; // In production, use env variable
        let encrypted = '';
        for (let i = 0; i < password.length; i++) {
            encrypted += String.fromCharCode(password.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return Buffer.from(encrypted).toString('base64');
    }

    /**
     * Simple decryption for passwords
     */
    decryptPassword(encrypted) {
        const key = 'db-wrapper-key-2025'; // In production, use env variable
        const decrypted = Buffer.from(encrypted, 'base64').toString();
        let password = '';
        for (let i = 0; i < decrypted.length; i++) {
            password += String.fromCharCode(decrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return password;
    }

    /**
     * Export query results to various formats
     */
    async exportResults(results, format = 'json') {
        try {
            const { rows } = results;

            switch (format.toLowerCase()) {
                case 'json':
                    return JSON.stringify(rows, null, 2);

                case 'csv':
                    if (rows.length === 0) return '';
                    const headers = Object.keys(rows[0]);
                    const csvRows = [headers.join(',')];
                    rows.forEach(row => {
                        const values = headers.map(h => {
                            const val = row[h];
                            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
                        });
                        csvRows.push(values.join(','));
                    });
                    return csvRows.join('\n');

                case 'tsv':
                    if (rows.length === 0) return '';
                    const tsvHeaders = Object.keys(rows[0]);
                    const tsvRows = [tsvHeaders.join('\t')];
                    rows.forEach(row => {
                        const values = tsvHeaders.map(h => row[h]);
                        tsvRows.push(values.join('\t'));
                    });
                    return tsvRows.join('\n');

                case 'markdown':
                    if (rows.length === 0) return '';
                    const mdHeaders = Object.keys(rows[0]);
                    const mdRows = [`| ${mdHeaders.join(' | ')} |`];
                    mdRows.push(`| ${mdHeaders.map(() => '---').join(' | ')} |`);
                    rows.forEach(row => {
                        const values = mdHeaders.map(h => row[h]);
                        mdRows.push(`| ${values.join(' | ')} |`);
                    });
                    return mdRows.join('\n');

                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

        } catch (error) {
            console.error(`Export failed:`, error.message);
            throw new Error(`Failed to export results: ${error.message}`);
        }
    }

    /**
     * Test connection without saving
     */
    async testConnection(config) {
        const sessionId = this.generateSessionId();

        try {
            const result = await this.connect({ ...config, sessionId });
            await this.disconnect(sessionId);

            return {
                success: true,
                message: `Connection test successful`,
                details: result
            };

        } catch (error) {
            return {
                success: false,
                message: `Connection test failed: ${error.message}`,
                error: error.message
            };
        }
    }
}

module.exports = new DatabaseWrapper();
