/**
 * PDF-OCR RAG Service für Remote MCP Server
 *
 * Features:
 * - OneDrive PDF Processing via Microsoft Graph API
 * - Embedding Generation (@xenova/transformers)
 * - Vector Store (hnswlib-node)
 * - Semantic Search + RAG with Claude
 *
 * Deploy: DigitalOcean (Port 8081)
 *
 * Environment Variables:
 * - AZURE_CLIENT_ID
 * - AZURE_CLIENT_SECRET
 * - AZURE_TENANT_ID
 * - ANTHROPIC_API_KEY
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PDF_OCR_PORT || 8081;

// Azure AD Configuration
const AZURE_CONFIG = {
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  tenantId: process.env.AZURE_TENANT_ID,
  scope: 'https://graph.microsoft.com/.default'
};

// OneDrive Base Path
const ONEDRIVE_BASE_PATH = '/AALS/AALS Int/Fibu';

// Vector Store Base Directory
const VECTOR_STORE_DIR = path.join(__dirname, 'vector_store');

// Graph Client
let graphClient = null;
let accessToken = null;
let tokenExpiry = null;

// In-memory collections registry
const collections = new Map();

/**
 * Microsoft Graph API Authentication
 */
async function authenticate() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  console.log('🔐 Authenticating with Microsoft Graph API...');

  const tokenEndpoint = `https://login.microsoftonline.com/${AZURE_CONFIG.tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: AZURE_CONFIG.clientId,
    client_secret: AZURE_CONFIG.clientSecret,
    scope: AZURE_CONFIG.scope,
    grant_type: 'client_credentials'
  });

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Auth failed: ${error}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

    console.log('✅ Authentication successful');
    return accessToken;
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error;
  }
}

/**
 * Get initialized Graph Client
 */
async function getGraphClient() {
  if (!graphClient || Date.now() >= tokenExpiry) {
    const token = await authenticate();

    graphClient = Client.init({
      authProvider: (done) => {
        done(null, token);
      }
    });
  }

  return graphClient;
}

/**
 * Convert OneDrive path to Graph API path
 */
function toGraphPath(oneDrivePath) {
  const cleaned = oneDrivePath.replace(/^\/+/, '');
  return `/drive/root:/${cleaned}`;
}

/**
 * Download file from OneDrive
 */
async function downloadFile(oneDrivePath) {
  const client = await getGraphClient();
  const graphPath = toGraphPath(oneDrivePath);

  console.log(`📥 Downloading: ${oneDrivePath}`);

  try {
    const stream = await client
      .api(`${graphPath}:/content`)
      .get();

    return Buffer.from(stream);
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * List directory contents from OneDrive
 */
async function listDirectory(oneDrivePath, recursive = false) {
  const client = await getGraphClient();
  const graphPath = toGraphPath(oneDrivePath);

  console.log(`📂 Listing directory: ${oneDrivePath}`);

  try {
    const result = await client
      .api(`${graphPath}:/children`)
      .get();

    const files = [];

    for (const item of result.value) {
      if (item.file && item.name.toLowerCase().endsWith('.pdf')) {
        files.push({
          name: item.name,
          path: path.posix.join(oneDrivePath, item.name),
          size: item.size,
          sizeHuman: formatBytes(item.size),
          modified: item.lastModifiedDateTime,
          created: item.createdDateTime,
          webUrl: item.webUrl
        });
      } else if (item.folder && recursive) {
        const subPath = path.posix.join(oneDrivePath, item.name);
        const subFiles = await listDirectory(subPath, true);
        files.push(...subFiles.pdfs);
      }
    }

    return {
      directory: oneDrivePath,
      count: files.length,
      recursive: recursive,
      pdfs: files
    };

  } catch (error) {
    throw new Error(`Listing failed: ${error.message}`);
  }
}

/**
 * Extract text from PDF
 */
async function extractTextFromPDF(fileBuffer) {
  try {
    const data = await pdfParse(fileBuffer);

    return {
      text: data.text,
      numPages: data.numpages,
      metadata: data.info || {},
      stats: {
        textLength: data.text.length,
        words: data.text.split(/\s+/).filter(w => w.length > 0).length,
        lines: data.text.split('\n').length
      }
    };
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

/**
 * Split text into chunks
 * Simple implementation - can be replaced with langchain later
 */
function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.slice(startIndex, endIndex);

    if (chunk.trim().length > 0) {
      chunks.push({
        text: chunk.trim(),
        startIndex,
        endIndex,
        length: chunk.length
      });
    }

    startIndex += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Generate embeddings using Xenova Transformers
 */
let embeddingPipeline = null;

async function generateEmbedding(text) {
  try {
    // Try to use @xenova/transformers if available
    if (!embeddingPipeline) {
      console.log('🔄 Loading embedding model (first time only)...');
      const { pipeline } = await import('@xenova/transformers');
      embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('✅ Embedding model loaded');
    }

    const output = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);

  } catch (error) {
    // Fallback to placeholder if @xenova/transformers not installed
    console.warn('⚠️  @xenova/transformers not available, using placeholder embeddings');
    console.warn('   Install with: npm install @xenova/transformers');

    // Create a simple 384-dimensional vector based on text characteristics
    const vector = new Array(384).fill(0);
    for (let i = 0; i < text.length && i < 384; i++) {
      vector[i] = text.charCodeAt(i) / 255.0;
    }

    return vector;
  }
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Create collection directory
 */
async function ensureCollectionDir(collectionName) {
  const collectionDir = path.join(VECTOR_STORE_DIR, collectionName);
  await fs.mkdir(collectionDir, { recursive: true });
  return collectionDir;
}

/**
 * Load collection from disk
 */
async function loadCollection(collectionName) {
  if (collections.has(collectionName)) {
    return collections.get(collectionName);
  }

  const collectionDir = path.join(VECTOR_STORE_DIR, collectionName);
  const metadataPath = path.join(collectionDir, 'metadata.json');
  const chunksPath = path.join(collectionDir, 'chunks.json');
  const vectorsPath = path.join(collectionDir, 'vectors.json');

  try {
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    const chunks = JSON.parse(await fs.readFile(chunksPath, 'utf-8'));
    const vectors = JSON.parse(await fs.readFile(vectorsPath, 'utf-8'));

    const collection = {
      name: collectionName,
      metadata,
      chunks,
      vectors,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt
    };

    collections.set(collectionName, collection);
    return collection;

  } catch (error) {
    throw new Error(`Failed to load collection: ${error.message}`);
  }
}

/**
 * Save collection to disk
 */
async function saveCollection(collectionName, metadata, chunks, vectors) {
  const collectionDir = await ensureCollectionDir(collectionName);

  const metadataPath = path.join(collectionDir, 'metadata.json');
  const chunksPath = path.join(collectionDir, 'chunks.json');
  const vectorsPath = path.join(collectionDir, 'vectors.json');

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  await fs.writeFile(chunksPath, JSON.stringify(chunks, null, 2));
  await fs.writeFile(vectorsPath, JSON.stringify(vectors, null, 2));

  const collection = {
    name: collectionName,
    metadata,
    chunks,
    vectors,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt
  };

  collections.set(collectionName, collection);
  return collection;
}

/**
 * Embed OneDrive folder
 */
async function embedOneDriveFolder(folderPath, collectionName, recursive = true) {
  console.log(`🚀 Starting embedding process for: ${folderPath}`);

  // List all PDFs
  const listing = await listDirectory(folderPath, recursive);
  console.log(`📄 Found ${listing.count} PDF files`);

  const allChunks = [];
  const allVectors = [];
  const documentMetadata = [];

  let processedFiles = 0;
  let totalChunks = 0;

  for (const pdf of listing.pdfs) {
    try {
      console.log(`📖 Processing: ${pdf.name} (${pdf.sizeHuman})`);

      // Download PDF
      const fileBuffer = await downloadFile(pdf.path);

      // Extract text
      const extracted = await extractTextFromPDF(fileBuffer);

      // Split into chunks
      const chunks = splitTextIntoChunks(extracted.text, 1000, 200);

      console.log(`✂️  Split into ${chunks.length} chunks`);

      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.text);

        allChunks.push({
          text: chunk.text,
          documentName: pdf.name,
          documentPath: pdf.path,
          chunkIndex: totalChunks,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex
        });

        allVectors.push(embedding);
        totalChunks++;
      }

      documentMetadata.push({
        name: pdf.name,
        path: pdf.path,
        size: pdf.size,
        numPages: extracted.numPages,
        numChunks: chunks.length,
        processedAt: new Date().toISOString()
      });

      processedFiles++;

    } catch (error) {
      console.error(`❌ Failed to process ${pdf.name}:`, error.message);
    }
  }

  // Save collection
  const metadata = {
    collectionName,
    sourceFolder: folderPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    numDocuments: processedFiles,
    numChunks: totalChunks,
    documents: documentMetadata,
    embeddingModel: embeddingPipeline ? 'Xenova/all-MiniLM-L6-v2' : 'placeholder (fallback)',
    chunkSize: 1000,
    chunkOverlap: 200
  };

  await saveCollection(collectionName, metadata, allChunks, allVectors);

  console.log(`✅ Embedding completed: ${processedFiles} files, ${totalChunks} chunks`);

  return {
    collectionName,
    numDocuments: processedFiles,
    numChunks: totalChunks,
    documents: documentMetadata
  };
}

/**
 * Search embedded documents
 */
async function searchEmbeddedDocuments(collectionName, query, topK = 5) {
  console.log(`🔍 Searching in collection: ${collectionName} for "${query}"`);

  // Load collection
  const collection = await loadCollection(collectionName);

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Compute similarities
  const results = [];

  for (let i = 0; i < collection.vectors.length; i++) {
    const similarity = cosineSimilarity(queryEmbedding, collection.vectors[i]);

    results.push({
      chunkIndex: i,
      similarity,
      text: collection.chunks[i].text,
      documentName: collection.chunks[i].documentName,
      documentPath: collection.chunks[i].documentPath
    });
  }

  // Sort by similarity (descending)
  results.sort((a, b) => b.similarity - a.similarity);

  // Return top K
  return {
    query,
    collectionName,
    topK,
    results: results.slice(0, topK)
  };
}

/**
 * RAG Query with Claude
 */
async function ragQuery(collectionName, question, topK = 5) {
  console.log(`💬 RAG Query: "${question}"`);

  // Search for relevant chunks
  const searchResults = await searchEmbeddedDocuments(collectionName, question, topK);

  // Build context from top results
  const context = searchResults.results
    .map((result, idx) => `[${idx + 1}] ${result.documentName}:\n${result.text}`)
    .join('\n\n---\n\n');

  // Build prompt for Claude
  const prompt = `Answer the question based on the provided context from PDF documents.

Context:
${context}

Question: ${question}

Instructions:
- Provide a detailed answer based on the context
- If the answer is not in the context, say "The answer is not available in the provided documents"
- Cite which document(s) you're referencing

Answer:`;

  // Call Claude API
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    const answer = data.content[0].text;

    return {
      question,
      answer,
      sources: searchResults.results.map(r => ({
        document: r.documentName,
        similarity: r.similarity.toFixed(4)
      })),
      context: context.substring(0, 500) + '...' // Preview
    };

  } catch (error) {
    throw new Error(`RAG query failed: ${error.message}`);
  }
}

/**
 * List all collections
 */
async function listCollections() {
  try {
    await fs.mkdir(VECTOR_STORE_DIR, { recursive: true });
    const entries = await fs.readdir(VECTOR_STORE_DIR, { withFileTypes: true });

    const collectionList = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metadataPath = path.join(VECTOR_STORE_DIR, entry.name, 'metadata.json');

        try {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          collectionList.push({
            name: entry.name,
            numDocuments: metadata.numDocuments,
            numChunks: metadata.numChunks,
            createdAt: metadata.createdAt,
            updatedAt: metadata.updatedAt,
            sourceFolder: metadata.sourceFolder
          });
        } catch (error) {
          console.error(`Failed to read metadata for ${entry.name}:`, error.message);
        }
      }
    }

    return {
      count: collectionList.length,
      collections: collectionList
    };

  } catch (error) {
    throw new Error(`Failed to list collections: ${error.message}`);
  }
}

/**
 * Delete collection
 */
async function deleteCollection(collectionName) {
  const collectionDir = path.join(VECTOR_STORE_DIR, collectionName);

  try {
    await fs.rm(collectionDir, { recursive: true, force: true });
    collections.delete(collectionName);

    return {
      success: true,
      message: `Collection "${collectionName}" deleted`
    };

  } catch (error) {
    throw new Error(`Failed to delete collection: ${error.message}`);
  }
}

/**
 * Helper: Format bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ==================== MCP Server Endpoints ====================

/**
 * Available Tools
 */
const tools = [
  {
    name: "embed_onedrive_folder",
    description: "Embeds all PDF files from a OneDrive folder into a searchable vector store collection",
    input_schema: {
      type: "object",
      properties: {
        folderPath: {
          type: "string",
          description: "OneDrive folder path (e.g. '/AALS/AALS Int/Fibu/2025')"
        },
        collectionName: {
          type: "string",
          description: "Name for this collection (e.g. 'fibu-2025')"
        },
        recursive: {
          type: "boolean",
          description: "Search subfolders recursively",
          default: true
        }
      },
      required: ["folderPath", "collectionName"]
    }
  },
  {
    name: "search_embedded_documents",
    description: "Search for similar text chunks in an embedded collection",
    input_schema: {
      type: "object",
      properties: {
        collectionName: {
          type: "string",
          description: "Name of the collection to search"
        },
        query: {
          type: "string",
          description: "Search query"
        },
        topK: {
          type: "number",
          description: "Number of results to return",
          default: 5
        }
      },
      required: ["collectionName", "query"]
    }
  },
  {
    name: "rag_query",
    description: "Ask a question and get an answer from embedded documents using Claude",
    input_schema: {
      type: "object",
      properties: {
        collectionName: {
          type: "string",
          description: "Name of the collection to query"
        },
        question: {
          type: "string",
          description: "Your question"
        },
        topK: {
          type: "number",
          description: "Number of document chunks to use as context",
          default: 5
        }
      },
      required: ["collectionName", "question"]
    }
  },
  {
    name: "list_embedded_collections",
    description: "List all available embedded document collections",
    input_schema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "delete_collection",
    description: "Delete an embedded document collection",
    input_schema: {
      type: "object",
      properties: {
        collectionName: {
          type: "string",
          description: "Name of the collection to delete"
        }
      },
      required: ["collectionName"]
    }
  }
];

// GET /tools
app.get('/tools', (req, res) => {
  console.log('📋 Tools requested');
  res.json({ tools });
});

// GET /health
app.get('/health', async (req, res) => {
  let authStatus = 'not_checked';
  let vectorStoreStatus = 'unknown';

  try {
    await authenticate();
    authStatus = 'ok';
  } catch (error) {
    authStatus = 'failed: ' + error.message;
  }

  try {
    await fs.access(VECTOR_STORE_DIR);
    vectorStoreStatus = 'ok';
  } catch {
    vectorStoreStatus = 'directory not found (will be created)';
  }

  res.json({
    status: 'ok',
    service: 'PDF-OCR RAG Service (Remote MCP)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    authentication: authStatus,
    vectorStore: vectorStoreStatus,
    onedrivePath: ONEDRIVE_BASE_PATH,
    tools: tools.length,
    collections: collections.size
  });
});

// POST /execute
app.post('/execute', async (req, res) => {
  const { tool, parameters } = req.body;

  console.log(`🔧 Executing tool: ${tool}`, parameters);

  try {
    let result;

    switch(tool) {
      case 'embed_onedrive_folder':
        result = await embedOneDriveFolder(
          parameters.folderPath,
          parameters.collectionName,
          parameters.recursive !== false
        );
        break;

      case 'search_embedded_documents':
        result = await searchEmbeddedDocuments(
          parameters.collectionName,
          parameters.query,
          parameters.topK || 5
        );
        break;

      case 'rag_query':
        result = await ragQuery(
          parameters.collectionName,
          parameters.question,
          parameters.topK || 5
        );
        break;

      case 'list_embedded_collections':
        result = await listCollections();
        break;

      case 'delete_collection':
        result = await deleteCollection(parameters.collectionName);
        break;

      default:
        return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }

    console.log(`✅ Tool executed successfully: ${tool}`);
    res.json({ success: true, result });

  } catch (error) {
    console.error(`❌ Tool execution failed: ${tool}`, error);
    res.status(500).json({
      error: error.message,
      tool: tool,
      details: error.stack
    });
  }
});

// GET / - Root
app.get('/', (req, res) => {
  res.json({
    service: 'PDF-OCR RAG Service (Remote MCP)',
    version: '1.0.0',
    description: 'OneDrive PDF Embedding & Semantic Search with Claude',
    endpoints: {
      'GET /': 'This page',
      'GET /tools': 'List available tools',
      'GET /health': 'Health check',
      'POST /execute': 'Execute a tool'
    },
    features: [
      'OneDrive PDF processing via Microsoft Graph API',
      'Text embedding (placeholder - install @xenova/transformers)',
      'Vector store (JSON-based - upgrade to hnswlib-node for production)',
      'Semantic search',
      'RAG with Claude Sonnet'
    ]
  });
});

// Start Server
async function start() {
  // Validate configuration
  if (!AZURE_CONFIG.clientId || !AZURE_CONFIG.clientSecret || !AZURE_CONFIG.tenantId) {
    console.error('❌ Missing Azure configuration!');
    console.error('   Required environment variables:');
    console.error('   - AZURE_CLIENT_ID');
    console.error('   - AZURE_CLIENT_SECRET');
    console.error('   - AZURE_TENANT_ID');
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set - rag_query will not work');
  }

  // Test authentication
  try {
    await authenticate();
    console.log('✅ Connected to Microsoft Graph API');
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
  }

  // Ensure vector store directory exists
  await fs.mkdir(VECTOR_STORE_DIR, { recursive: true });
  console.log(`✅ Vector store directory: ${VECTOR_STORE_DIR}`);

  app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   📄 PDF-OCR RAG Service (Remote MCP)         ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║  🚀 Port: ${PORT.toString().padEnd(38)} ║`);
    console.log(`║  🔧 Tools: ${tools.length.toString().padEnd(37)} ║`);
    console.log(`║  ☁️  OneDrive: ${ONEDRIVE_BASE_PATH.padEnd(29)} ║`);
    console.log(`║  🔐 Azure: ${(AZURE_CONFIG.tenantId?.substring(0, 8) + '...').padEnd(33)} ║`);
    console.log('╚════════════════════════════════════════════════╝\n');
    console.log('✅ Service ready!\n');
    console.log('⚠️  Production Setup:');
    console.log('   1. Install @xenova/transformers for real embeddings');
    console.log('   2. Install hnswlib-node for fast vector search');
    console.log('   3. Configure ANTHROPIC_API_KEY for RAG queries\n');
  });
}

start();

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('👋 Shutting down...');
  process.exit(0);
});

module.exports = app;