/**
 * ODBC Database Manager
 * Handles ODBC connections for: MSSQL, MySQL, PostgreSQL, SQL Anywhere, Oracle, Banana DB
 */

const odbc = require('odbc');
const sql = require('mssql');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const oracledb = require('oracledb');

class ODBCManager {
    constructor() {
        this.connections = new Map(); // sessionId -> connection
        this.pools = new Map(); // connectionString -> pool
        this.connectionConfigs = new Map(); // sessionId -> config
    }

    /**
     * Build ODBC connection string based on DB type
     */
    buildConnectionString(config) {
        const { type, host, port, database, username, password, options = {} } = config;

        switch (type.toLowerCase()) {
            case 'mssql':
            case 'sqlserver':
                return `DRIVER={ODBC Driver 17 for SQL Server};SERVER=${host}${port ? ',' + port : ''};DATABASE=${database};UID=${username};PWD=${password};${options.extra || ''}`;

            case 'mysql':
                return `DRIVER={MySQL ODBC 8.0 Driver};SERVER=${host};PORT=${port || 3306};DATABASE=${database};UID=${username};PWD=${password};${options.extra || ''}`;

            case 'postgresql':
            case 'postgres':
                return `DRIVER={PostgreSQL Unicode};SERVER=${host};PORT=${port || 5432};DATABASE=${database};UID=${username};PWD=${password};${options.extra || ''}`;

            case 'sqlanywhere':
            case 'sql anywhere':
                return `DRIVER={SQL Anywhere 17};HOST=${host}:${port || 2638};DBN=${database};UID=${username};PWD=${password};${options.extra || ''}`;

            case 'oracle':
                return `DRIVER={Oracle in OraClient12Home1};DBQ=${host}:${port || 1521}/${database};UID=${username};PWD=${password};${options.extra || ''}`;

            case 'banana':
            case 'bananadb':
                // Banana Accounting uses SQL Anywhere engine
                return `DRIVER={SQL Anywhere 17};HOST=${host}:${port || 2638};DBN=${database};UID=${username};PWD=${password};${options.extra || ''}`;

            default:
                throw new Error(`Unsupported database type: ${type}`);
        }
    }

    /**
     * Connect to database using native drivers (preferred for better performance)
     */
    async connectNative(sessionId, config) {
        const { type, host, port, database, username, password, options = {} } = config;

        try {
            let connection;

            switch (type.toLowerCase()) {
                case 'mssql':
                case 'sqlserver':
                    connection = await sql.connect({
                        server: host,
                        port: port || 1433,
                        database: database,
                        user: username,
                        password: password,
                        options: {
                            encrypt: options.encrypt !== false,
                            trustServerCertificate: options.trustServerCertificate || false,
                            ...options
                        }
                    });
                    break;

                case 'mysql':
                    connection = await mysql.createConnection({
                        host: host,
                        port: port || 3306,
                        database: database,
                        user: username,
                        password: password,
                        ...options
                    });
                    break;

                case 'postgresql':
                case 'postgres':
                    const pool = new Pool({
                        host: host,
                        port: port || 5432,
                        database: database,
                        user: username,
                        password: password,
                        ...options
                    });
                    connection = await pool.connect();
                    this.pools.set(sessionId, pool);
                    break;

                case 'oracle':
                    connection = await oracledb.getConnection({
                        user: username,
                        password: password,
                        connectString: `${host}:${port || 1521}/${database}`,
                        ...options
                    });
                    break;

                default:
                    // Fall back to ODBC for unsupported types
                    return this.connectODBC(sessionId, config);
            }

            this.connections.set(sessionId, { connection, type: type.toLowerCase(), native: true });
            this.connectionConfigs.set(sessionId, config);

            return {
                success: true,
                sessionId,
                message: `Connected to ${type} database: ${database}`,
                driver: 'native'
            };

        } catch (error) {
            console.error(`Native connection failed for ${type}:`, error.message);
            // Fall back to ODBC
            return this.connectODBC(sessionId, config);
        }
    }

    /**
     * Connect to database using ODBC
     */
    async connectODBC(sessionId, config) {
        try {
            const connectionString = this.buildConnectionString(config);
            const connection = await odbc.connect(connectionString);

            this.connections.set(sessionId, { connection, type: config.type.toLowerCase(), native: false });
            this.connectionConfigs.set(sessionId, config);

            return {
                success: true,
                sessionId,
                message: `Connected to ${config.type} database: ${config.database}`,
                driver: 'odbc',
                connectionString: connectionString.replace(/PWD=[^;]+/, 'PWD=***')
            };

        } catch (error) {
            console.error(`ODBC connection failed:`, error.message);
            throw new Error(`Failed to connect: ${error.message}`);
        }
    }

    /**
     * Execute SQL query
     */
    async executeQuery(sessionId, query, params = []) {
        const connInfo = this.connections.get(sessionId);
        if (!connInfo) {
            throw new Error(`No active connection for session: ${sessionId}`);
        }

        const { connection, type, native } = connInfo;

        try {
            let result;

            if (native) {
                switch (type) {
                    case 'mssql':
                    case 'sqlserver':
                        const request = connection.request();
                        params.forEach((param, idx) => {
                            request.input(`param${idx}`, param);
                        });
                        result = await request.query(query);
                        return {
                            rows: result.recordset || [],
                            rowCount: result.rowsAffected ? result.rowsAffected[0] : 0,
                            fields: result.recordset && result.recordset.columns ? Object.keys(result.recordset.columns) : []
                        };

                    case 'mysql':
                        const [rows, fields] = await connection.execute(query, params);
                        return {
                            rows: rows,
                            rowCount: rows.length,
                            fields: fields.map(f => f.name)
                        };

                    case 'postgresql':
                    case 'postgres':
                        result = await connection.query(query, params);
                        return {
                            rows: result.rows,
                            rowCount: result.rowCount,
                            fields: result.fields.map(f => f.name)
                        };

                    case 'oracle':
                        result = await connection.execute(query, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
                        return {
                            rows: result.rows || [],
                            rowCount: result.rowsAffected || 0,
                            fields: result.metaData ? result.metaData.map(m => m.name) : []
                        };

                    default:
                        throw new Error(`Unsupported native driver type: ${type}`);
                }
            } else {
                // ODBC
                result = await connection.query(query, params);
                return {
                    rows: result,
                    rowCount: result.count || result.length,
                    fields: result.columns ? result.columns.map(c => c.name) : []
                };
            }

        } catch (error) {
            console.error(`Query execution failed:`, error.message);
            throw new Error(`Query failed: ${error.message}`);
        }
    }

    /**
     * List all tables in the database
     */
    async listTables(sessionId) {
        const connInfo = this.connections.get(sessionId);
        if (!connInfo) {
            throw new Error(`No active connection for session: ${sessionId}`);
        }

        const { type } = connInfo;
        let query;

        switch (type) {
            case 'mssql':
            case 'sqlserver':
                query = "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_SCHEMA, TABLE_NAME";
                break;

            case 'mysql':
                query = "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME";
                break;

            case 'postgresql':
            case 'postgres':
                query = "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name";
                break;

            case 'oracle':
                query = "SELECT OWNER as TABLE_SCHEMA, TABLE_NAME FROM ALL_TABLES ORDER BY OWNER, TABLE_NAME";
                break;

            case 'sqlanywhere':
            case 'banana':
            case 'bananadb':
                query = "SELECT creator as TABLE_SCHEMA, tname as TABLE_NAME FROM sys.systable WHERE creator NOT IN ('SYS', 'dbo') ORDER BY creator, tname";
                break;

            default:
                query = "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'";
        }

        return this.executeQuery(sessionId, query);
    }

    /**
     * Describe table structure
     */
    async describeTable(sessionId, tableName) {
        const connInfo = this.connections.get(sessionId);
        if (!connInfo) {
            throw new Error(`No active connection for session: ${sessionId}`);
        }

        const { type } = connInfo;
        let query;

        switch (type) {
            case 'mssql':
            case 'sqlserver':
                query = `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
                         FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}' ORDER BY ORDINAL_POSITION`;
                break;

            case 'mysql':
                query = `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
                         FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}' AND TABLE_SCHEMA = DATABASE() ORDER BY ORDINAL_POSITION`;
                break;

            case 'postgresql':
            case 'postgres':
                query = `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                         FROM information_schema.columns WHERE table_name = '${tableName}' ORDER BY ordinal_position`;
                break;

            case 'oracle':
                query = `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH as CHARACTER_MAXIMUM_LENGTH, NULLABLE as IS_NULLABLE, DATA_DEFAULT as COLUMN_DEFAULT
                         FROM ALL_TAB_COLUMNS WHERE TABLE_NAME = '${tableName.toUpperCase()}' ORDER BY COLUMN_ID`;
                break;

            case 'sqlanywhere':
            case 'banana':
            case 'bananadb':
                query = `SELECT c.cname as COLUMN_NAME, t.type_name as DATA_TYPE, c.length as CHARACTER_MAXIMUM_LENGTH,
                         CASE WHEN c.nulls = 'Y' THEN 'YES' ELSE 'NO' END as IS_NULLABLE, c."default" as COLUMN_DEFAULT
                         FROM sys.syscolumn c
                         JOIN sys.systable st ON c.tname = st.tname
                         JOIN sys.sysusertype t ON c.utype = t.type_id
                         WHERE st.tname = '${tableName}' ORDER BY c.colno`;
                break;

            default:
                query = `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
                         FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`;
        }

        return this.executeQuery(sessionId, query);
    }

    /**
     * Disconnect from database
     */
    async disconnect(sessionId) {
        const connInfo = this.connections.get(sessionId);
        if (!connInfo) {
            return { success: false, message: `No connection found for session: ${sessionId}` };
        }

        const { connection, type, native } = connInfo;

        try {
            if (native) {
                switch (type) {
                    case 'mssql':
                    case 'sqlserver':
                        await connection.close();
                        break;

                    case 'mysql':
                        await connection.end();
                        break;

                    case 'postgresql':
                    case 'postgres':
                        connection.release();
                        const pool = this.pools.get(sessionId);
                        if (pool) {
                            await pool.end();
                            this.pools.delete(sessionId);
                        }
                        break;

                    case 'oracle':
                        await connection.close();
                        break;
                }
            } else {
                // ODBC
                await connection.close();
            }

            this.connections.delete(sessionId);
            this.connectionConfigs.delete(sessionId);

            return {
                success: true,
                message: `Disconnected from ${type} database`
            };

        } catch (error) {
            console.error(`Disconnect failed:`, error.message);
            // Force cleanup
            this.connections.delete(sessionId);
            this.connectionConfigs.delete(sessionId);

            return {
                success: true,
                message: `Force disconnected from ${type} database (with errors)`
            };
        }
    }

    /**
     * Get active connections
     */
    getActiveConnections() {
        const connections = [];
        for (const [sessionId, connInfo] of this.connections.entries()) {
            const config = this.connectionConfigs.get(sessionId);
            connections.push({
                sessionId,
                type: connInfo.type,
                driver: connInfo.native ? 'native' : 'odbc',
                database: config ? config.database : 'unknown',
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
        for (const sessionId of this.connections.keys()) {
            const result = await this.disconnect(sessionId);
            results.push({ sessionId, ...result });
        }
        return results;
    }
}

module.exports = new ODBCManager();