/**
 * Database MCP Tools
 * Exposes database operations as MCP tools for Claude integration
 */

const dbWrapper = require('./db-wrapper');

const DATABASE_TOOLS = [
    {
        name: "connect_database",
        description: "Connect to a database (MSSQL, MySQL, PostgreSQL, Oracle, SQL Anywhere, Banana DB, TypeDB 3.x). Returns a sessionId for subsequent operations.",
        input_schema: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    description: "Database type: mssql, mysql, postgresql, oracle, sqlanywhere, banana, typedb",
                    enum: ["mssql", "mysql", "postgresql", "oracle", "sqlanywhere", "banana", "typedb"]
                },
                host: {
                    type: "string",
                    description: "Database host/server address"
                },
                port: {
                    type: "number",
                    description: "Database port (optional, uses defaults: MSSQL:1433, MySQL:3306, PostgreSQL:5432, Oracle:1521, SQL Anywhere:2638, TypeDB:1729)"
                },
                database: {
                    type: "string",
                    description: "Database name"
                },
                username: {
                    type: "string",
                    description: "Database username"
                },
                password: {
                    type: "string",
                    description: "Database password"
                },
                cloudConnection: {
                    type: "boolean",
                    description: "For TypeDB only: set to true for TypeDB Cloud, false for TypeDB Core (default: false)"
                },
                options: {
                    type: "object",
                    description: "Additional connection options (encrypt, trustServerCertificate, etc.)"
                }
            },
            required: ["type", "host", "database", "username", "password"]
        }
    },
    {
        name: "disconnect_database",
        description: "Disconnect from a database using the sessionId",
        input_schema: {
            type: "object",
            properties: {
                sessionId: {
                    type: "string",
                    description: "Session ID returned from connect_database"
                }
            },
            required: ["sessionId"]
        }
    },
    {
        name: "execute_query",
        description: "Execute SQL query or TypeQL query on connected database",
        input_schema: {
            type: "object",
            properties: {
                sessionId: {
                    type: "string",
                    description: "Session ID from connect_database"
                },
                query: {
                    type: "string",
                    description: "SQL query (SELECT, INSERT, UPDATE, DELETE) or TypeQL query (match, insert, delete, define, undefine)"
                },
                params: {
                    type: "array",
                    description: "Query parameters for parameterized queries (optional)",
                    items: { type: "string" }
                },
                readOnly: {
                    type: "boolean",
                    description: "For TypeDB: set to false for write operations (default: true)"
                }
            },
            required: ["sessionId", "query"]
        }
    },
    {
        name: "list_tables",
        description: "List all tables in the database (for SQL databases) or show schema (for TypeDB)",
        input_schema: {
            type: "object",
            properties: {
                sessionId: {
                    type: "string",
                    description: "Session ID from connect_database"
                }
            },
            required: ["sessionId"]
        }
    },
    {
        name: "describe_table",
        description: "Describe the structure of a specific table (columns, data types, etc.). Only works for SQL databases.",
        input_schema: {
            type: "object",
            properties: {
                sessionId: {
                    type: "string",
                    description: "Session ID from connect_database"
                },
                tableName: {
                    type: "string",
                    description: "Name of the table to describe"
                }
            },
            required: ["sessionId", "tableName"]
        }
    },
    {
        name: "list_active_connections",
        description: "List all active database connections",
        input_schema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "disconnect_all_databases",
        description: "Disconnect all active database connections",
        input_schema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "save_connection_config",
        description: "Save database connection configuration locally for reuse",
        input_schema: {
            type: "object",
            properties: {
                configName: {
                    type: "string",
                    description: "Name for this connection configuration"
                },
                config: {
                    type: "object",
                    description: "Connection configuration object (type, host, port, database, username, password, etc.)"
                }
            },
            required: ["configName", "config"]
        }
    },
    {
        name: "load_connection_config",
        description: "Load saved database connection configuration",
        input_schema: {
            type: "object",
            properties: {
                configName: {
                    type: "string",
                    description: "Name of the saved configuration"
                }
            },
            required: ["configName"]
        }
    },
    {
        name: "list_connection_configs",
        description: "List all saved database connection configurations",
        input_schema: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "delete_connection_config",
        description: "Delete a saved database connection configuration",
        input_schema: {
            type: "object",
            properties: {
                configName: {
                    type: "string",
                    description: "Name of the configuration to delete"
                }
            },
            required: ["configName"]
        }
    },
    {
        name: "test_database_connection",
        description: "Test database connection without saving or maintaining the connection",
        input_schema: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    description: "Database type",
                    enum: ["mssql", "mysql", "postgresql", "oracle", "sqlanywhere", "banana", "typedb"]
                },
                host: {
                    type: "string",
                    description: "Database host"
                },
                port: {
                    type: "number",
                    description: "Database port"
                },
                database: {
                    type: "string",
                    description: "Database name"
                },
                username: {
                    type: "string",
                    description: "Database username"
                },
                password: {
                    type: "string",
                    description: "Database password"
                }
            },
            required: ["type", "host", "database", "username", "password"]
        }
    },
    {
        name: "export_query_results",
        description: "Export query results to various formats (JSON, CSV, TSV, Markdown)",
        input_schema: {
            type: "object",
            properties: {
                sessionId: {
                    type: "string",
                    description: "Session ID from connect_database"
                },
                query: {
                    type: "string",
                    description: "SQL/TypeQL query to execute"
                },
                format: {
                    type: "string",
                    description: "Export format: json, csv, tsv, markdown",
                    enum: ["json", "csv", "tsv", "markdown"]
                },
                params: {
                    type: "array",
                    description: "Query parameters (optional)",
                    items: { type: "string" }
                }
            },
            required: ["sessionId", "query", "format"]
        }
    }
];

/**
 * Handle database tool calls
 */
async function handleDatabaseTool(toolName, toolInput) {
    try {
        switch (toolName) {
            case "connect_database":
                return await dbWrapper.connect(toolInput);

            case "disconnect_database":
                return await dbWrapper.disconnect(toolInput.sessionId);

            case "execute_query":
                const queryResult = await dbWrapper.executeQuery(
                    toolInput.sessionId,
                    toolInput.query,
                    toolInput.params || [],
                    { readOnly: toolInput.readOnly }
                );
                return {
                    success: true,
                    ...queryResult
                };

            case "list_tables":
                const tablesResult = await dbWrapper.listTables(toolInput.sessionId);
                return {
                    success: true,
                    ...tablesResult
                };

            case "describe_table":
                const describeResult = await dbWrapper.describeTable(
                    toolInput.sessionId,
                    toolInput.tableName
                );
                return {
                    success: true,
                    ...describeResult
                };

            case "list_active_connections":
                return {
                    success: true,
                    ...dbWrapper.getAllConnections()
                };

            case "disconnect_all_databases":
                return {
                    success: true,
                    ...await dbWrapper.disconnectAll()
                };

            case "save_connection_config":
                return await dbWrapper.saveConfigLocal(
                    toolInput.configName,
                    toolInput.config
                );

            case "load_connection_config":
                const config = await dbWrapper.loadConfigLocal(toolInput.configName);
                return {
                    success: true,
                    config
                };

            case "list_connection_configs":
                const configs = await dbWrapper.listConfigs();
                return {
                    success: true,
                    configs
                };

            case "delete_connection_config":
                return await dbWrapper.deleteConfig(toolInput.configName);

            case "test_database_connection":
                return await dbWrapper.testConnection(toolInput);

            case "export_query_results":
                const results = await dbWrapper.executeQuery(
                    toolInput.sessionId,
                    toolInput.query,
                    toolInput.params || []
                );
                const exported = await dbWrapper.exportResults(results, toolInput.format);
                return {
                    success: true,
                    format: toolInput.format,
                    data: exported,
                    rowCount: results.rowCount
                };

            default:
                throw new Error(`Unknown database tool: ${toolName}`);
        }
    } catch (error) {
        console.error(`Database tool error [${toolName}]:`, error.message);
        return {
            success: false,
            error: error.message,
            tool: toolName
        };
    }
}

module.exports = {
    DATABASE_TOOLS,
    handleDatabaseTool
};
