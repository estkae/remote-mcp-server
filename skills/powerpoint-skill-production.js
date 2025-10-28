/**
 * PowerPoint Skill - Production Implementation
 *
 * Wrapper für production-tools.js PowerPoint-Funktionalität
 * Ermöglicht echte .pptx Dateien zu erstellen
 */

const { createPowerPoint } = require('../production-tools');

/**
 * PowerPoint Skill Handler
 * @param {string} toolName - Name des Tools (create_powerpoint, create_powerpoint_presentation)
 * @param {Object} parameters - Tool-Parameter
 * @returns {Promise<Object>} - Ergebnis der Tool-Ausführung
 */
async function handlePowerPointTool(toolName, parameters) {
  console.log(`🎨 PowerPoint Tool: ${toolName}`);

  try {
    switch (toolName) {
      case 'create_powerpoint':
      case 'create_powerpoint_presentation':
        return await createPowerPoint(parameters);

      default:
        throw new Error(`Unknown PowerPoint tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`❌ PowerPoint Tool Error (${toolName}):`, error);
    throw error;
  }
}

/**
 * Prüft ob production-tools verfügbar ist
 */
function isProductionMode() {
  try {
    require('../production-tools');
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  handlePowerPointTool,
  isProductionMode
};
