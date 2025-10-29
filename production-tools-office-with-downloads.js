/**
 * Production Tools - Office Suite mit Download-Links
 *
 * PowerPoint, Excel, Word, PDF mit echten Download-URLs
 */

const { createPowerPoint: createPowerPointBase, createExcel: createExcelBase, createWord: createWordBase } = require('./production-tools-office');
const { createPDF: createPDFBase } = require('./pdf-tool');
const { generateDownloadToken } = require('./file-server');

/**
 * Fügt Download-Link zu Result hinzu
 */
function addDownloadInfo(result, filepath) {
  try {
    const downloadInfo = generateDownloadToken(filepath, 60); // 60 Min gültig

    result.download_url = downloadInfo.download_url;
    result.download_token = downloadInfo.token;
    result.download_expires_at = downloadInfo.expires_at;
    result.download_expires_in = `${downloadInfo.expires_in_minutes} Minuten`;

    console.log(`📥 Download-Link: ${downloadInfo.download_url}`);
  } catch (error) {
    console.error('⚠️  Download-Link konnte nicht erstellt werden:', error.message);
  }

  return result;
}

/**
 * PowerPoint mit Download-Link
 */
async function createPowerPoint(parameters) {
  const result = await createPowerPointBase(parameters);
  return addDownloadInfo(result, result.filepath);
}

/**
 * Excel mit Download-Link
 */
async function createExcel(parameters) {
  const result = await createExcelBase(parameters);
  return addDownloadInfo(result, result.filepath);
}

/**
 * Word mit Download-Link
 */
async function createWord(parameters) {
  const result = await createWordBase(parameters);
  return addDownloadInfo(result, result.filepath);
}

/**
 * PDF mit Download-Link
 */
async function createPDF(parameters) {
  const result = await createPDFBase(parameters);
  return addDownloadInfo(result, result.filepath);
}

/**
 * Tool-Executor mit Download-Links
 */
async function executeOfficeTool(toolName, parameters) {
  console.log(`🔧 Office Tool (with downloads): ${toolName}`);

  try {
    let result;

    switch (toolName) {
      case 'create_powerpoint':
      case 'create_powerpoint_presentation':
        result = await createPowerPoint(parameters);
        break;

      case 'create_excel':
      case 'create_excel_spreadsheet':
        result = await createExcel(parameters);
        break;

      case 'create_word':
      case 'create_word_document':
        result = await createWord(parameters);
        break;

      case 'create_pdf':
      case 'create_pdf_document':
        result = await createPDF(parameters);
        break;

      default:
        throw new Error(`Unknown office tool: ${toolName}`);
    }

    result.mode = 'PRODUCTION_WITH_DOWNLOADS';
    return result;

  } catch (error) {
    console.error(`❌ Office tool error (${toolName}):`, error);
    throw error;
  }
}

module.exports = {
  executeOfficeTool,
  createPowerPoint,
  createExcel,
  createWord,
  createPDF
};
