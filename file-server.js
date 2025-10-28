/**
 * File Server für Office-Dokumente
 *
 * Stellt generierte Office-Dateien über HTTP zum Download bereit
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, 'output');
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8080';

// File-Token-Mapping (in Production: Redis oder Datenbank)
const fileTokens = new Map();

/**
 * Generiert einen sicheren Download-Token für eine Datei
 *
 * @param {string} filepath - Absoluter Pfad zur Datei
 * @param {number} expiresInMinutes - Token-Gültigkeit in Minuten (default: 60)
 * @returns {Object} - Token und Download-URL
 */
function generateDownloadToken(filepath, expiresInMinutes = 60) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (expiresInMinutes * 60 * 1000);

  fileTokens.set(token, {
    filepath: filepath,
    filename: path.basename(filepath),
    expiresAt: expiresAt,
    downloads: 0,
    maxDownloads: 10 // Max Downloads pro Token
  });

  const downloadUrl = `${SERVER_URL}/download/${token}`;

  console.log(`🔑 Download-Token erstellt: ${token.substring(0, 16)}...`);
  console.log(`   Datei: ${path.basename(filepath)}`);
  console.log(`   Gültig bis: ${new Date(expiresAt).toISOString()}`);

  return {
    token: token,
    download_url: downloadUrl,
    expires_at: new Date(expiresAt).toISOString(),
    expires_in_minutes: expiresInMinutes
  };
}

/**
 * Validiert einen Download-Token
 *
 * @param {string} token - Download-Token
 * @returns {Object|null} - File-Info oder null bei ungültigem Token
 */
function validateToken(token) {
  const fileInfo = fileTokens.get(token);

  if (!fileInfo) {
    console.log(`❌ Token nicht gefunden: ${token.substring(0, 16)}...`);
    return null;
  }

  // Token abgelaufen?
  if (Date.now() > fileInfo.expiresAt) {
    console.log(`❌ Token abgelaufen: ${token.substring(0, 16)}...`);
    fileTokens.delete(token);
    return null;
  }

  // Max Downloads erreicht?
  if (fileInfo.downloads >= fileInfo.maxDownloads) {
    console.log(`❌ Max Downloads erreicht: ${token.substring(0, 16)}...`);
    fileTokens.delete(token);
    return null;
  }

  return fileInfo;
}

/**
 * Express-Middleware für File-Serving
 */
function setupFileServer(app) {
  // GET /download/:token - Datei herunterladen
  app.get('/download/:token', async (req, res) => {
    const { token } = req.params;

    console.log(`📥 Download-Anfrage: ${token.substring(0, 16)}...`);

    try {
      // Token validieren
      const fileInfo = validateToken(token);

      if (!fileInfo) {
        return res.status(404).json({
          error: 'Download-Link ungültig oder abgelaufen',
          message: 'Der Download-Link ist nicht mehr gültig. Bitte generiere einen neuen Link.'
        });
      }

      // Datei existiert?
      try {
        await fs.access(fileInfo.filepath);
      } catch (error) {
        console.error(`❌ Datei nicht gefunden: ${fileInfo.filepath}`);
        fileTokens.delete(token);
        return res.status(404).json({
          error: 'Datei nicht gefunden',
          message: 'Die Datei wurde möglicherweise gelöscht.'
        });
      }

      // Download-Counter erhöhen
      fileInfo.downloads++;

      // Content-Type basierend auf Dateierweiterung
      const ext = path.extname(fileInfo.filename).toLowerCase();
      const contentTypes = {
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.pdf': 'application/pdf'
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';

      // Download-Header setzen
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
      res.setHeader('X-Download-Count', fileInfo.downloads);
      res.setHeader('X-Remaining-Downloads', fileInfo.maxDownloads - fileInfo.downloads);

      console.log(`✅ Download gestartet: ${fileInfo.filename} (${fileInfo.downloads}/${fileInfo.maxDownloads})`);

      // Datei senden
      res.sendFile(fileInfo.filepath);

    } catch (error) {
      console.error(`❌ Download-Fehler:`, error);
      res.status(500).json({
        error: 'Download fehlgeschlagen',
        message: error.message
      });
    }
  });

  // GET /download/:token/info - Download-Info abrufen (ohne Download)
  app.get('/download/:token/info', (req, res) => {
    const { token } = req.params;
    const fileInfo = validateToken(token);

    if (!fileInfo) {
      return res.status(404).json({
        error: 'Token ungültig oder abgelaufen'
      });
    }

    res.json({
      filename: fileInfo.filename,
      downloads: fileInfo.downloads,
      max_downloads: fileInfo.maxDownloads,
      remaining_downloads: fileInfo.maxDownloads - fileInfo.downloads,
      expires_at: new Date(fileInfo.expiresAt).toISOString(),
      is_expired: Date.now() > fileInfo.expiresAt
    });
  });

  // GET /files - Liste aller verfügbaren Dateien im Output-Verzeichnis
  app.get('/files', async (req, res) => {
    try {
      const files = await fs.readdir(OUTPUT_DIR);
      const fileList = await Promise.all(
        files.map(async (filename) => {
          const filepath = path.join(OUTPUT_DIR, filename);
          const stats = await fs.stat(filepath);

          return {
            filename: filename,
            size: stats.size,
            size_human: `${(stats.size / 1024).toFixed(2)} KB`,
            created: stats.birthtime.toISOString(),
            modified: stats.mtime.toISOString(),
            type: path.extname(filename).substring(1).toUpperCase()
          };
        })
      );

      res.json({
        output_directory: OUTPUT_DIR,
        file_count: fileList.length,
        files: fileList.sort((a, b) => new Date(b.created) - new Date(a.created))
      });
    } catch (error) {
      console.error('❌ Fehler beim Auflisten der Dateien:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /files/cleanup - Alte Dateien löschen
  app.post('/files/cleanup', async (req, res) => {
    const { older_than_hours = 24 } = req.body;

    try {
      const files = await fs.readdir(OUTPUT_DIR);
      const cutoffTime = Date.now() - (older_than_hours * 60 * 60 * 1000);

      let deletedCount = 0;
      let deletedSize = 0;

      for (const filename of files) {
        const filepath = path.join(OUTPUT_DIR, filename);
        const stats = await fs.stat(filepath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filepath);
          deletedCount++;
          deletedSize += stats.size;
          console.log(`🗑️  Gelöscht: ${filename}`);
        }
      }

      res.json({
        success: true,
        deleted_files: deletedCount,
        deleted_size: `${(deletedSize / 1024).toFixed(2)} KB`,
        older_than_hours: older_than_hours
      });
    } catch (error) {
      console.error('❌ Cleanup-Fehler:', error);
      res.status(500).json({ error: error.message });
    }
  });

  console.log('📁 File-Server aktiviert:');
  console.log('   GET  /download/:token     - Datei herunterladen');
  console.log('   GET  /download/:token/info - Download-Info');
  console.log('   GET  /files                - Alle Dateien auflisten');
  console.log('   POST /files/cleanup        - Alte Dateien löschen');
}

/**
 * Cleanup-Job: Entfernt abgelaufene Tokens
 */
function startTokenCleanupJob(intervalMinutes = 15) {
  setInterval(() => {
    const now = Date.now();
    let removedCount = 0;

    for (const [token, fileInfo] of fileTokens.entries()) {
      if (now > fileInfo.expiresAt) {
        fileTokens.delete(token);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Token-Cleanup: ${removedCount} abgelaufene Tokens entfernt`);
    }
  }, intervalMinutes * 60 * 1000);

  console.log(`⏰ Token-Cleanup-Job gestartet (alle ${intervalMinutes} Minuten)`);
}

module.exports = {
  generateDownloadToken,
  validateToken,
  setupFileServer,
  startTokenCleanupJob
};
