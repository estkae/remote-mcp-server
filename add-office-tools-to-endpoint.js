const fs = require('fs');

let content = fs.readFileSync('remote-mcp-server-with-skills.js', 'utf-8');

// Find the GET /tools endpoint
const oldEndpoint = `// GET /tools - Gibt Router + Kerio Tools zurück
app.get('/tools', (req, res) => {
  const tools = [routerTool];
  
  // Add Kerio tools if configured
  if (kerioConnector && kerioConnector.isKerioConfigured()) {
    tools.push(...kerioConnector.KERIO_TOOLS);
    console.log('📋 /tools - Returning Router + Kerio Tools (' + (tools.length) + ' tools)');
  } else {
    console.log('📋 /tools - Returning Router Tool only (Kerio not configured)');
  }
  
  res.json(tools);
});`;

const newEndpoint = `// GET /tools - Gibt Router + Office Tools + Kerio Tools zurück
app.get('/tools', (req, res) => {
  const tools = [routerTool];
  
  // Add Office tools from skill definitions
  const powerpoint = skillDefinitions.skills.find(s => s.id === 'powerpoint')?.tools[0];
  const excel = skillDefinitions.skills.find(s => s.id === 'excel')?.tools[0];
  const word = skillDefinitions.skills.find(s => s.id === 'word')?.tools[0];
  const pdf = skillDefinitions.skills.find(s => s.id === 'pdf-creator')?.tools[0];
  
  if (powerpoint) tools.push(powerpoint);
  if (excel) tools.push(excel);
  if (word) tools.push(word);
  if (pdf) tools.push(pdf);
  
  // Add Kerio tools if configured
  if (kerioConnector && kerioConnector.isKerioConfigured()) {
    tools.push(...kerioConnector.KERIO_TOOLS);
  }
  
  console.log(\`📋 /tools - Returning \${tools.length} tools (Router + Office + Kerio)\`);
  res.json(tools);
});`;

content = content.replace(oldEndpoint, newEndpoint);

fs.writeFileSync('remote-mcp-server-with-skills.js', content, 'utf-8');
console.log('✅ Office tools added to /tools endpoint');
