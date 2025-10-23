# Remote MCP Server with Skill-Routing

A production-ready Remote MCP (Model Context Protocol) Server with intelligent skill-routing and Kerio Connect email integration. Built for deployment on DigitalOcean App Platform with **90% token optimization**.

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/estkae/remote-mcp-server/tree/main)

## Features

- **Intelligent Skill-Routing**: Token-optimized routing system that loads only required skills
- **6 Built-in Skills**: PowerPoint, Excel, Brand Guidelines, PDF, Code Review, Blog Writer
- **Kerio Connect Integration**: Full IMAP/SMTP support for email management
- **90% Token Savings**: Reduces token usage from 890 to ~8 tokens for initial load
- **DigitalOcean Ready**: One-click deployment to App Platform
- **MCP Protocol Standard**: Works with Claude Desktop, Cursor, Windsurf, and other MCP clients

## Quick Start

### Deploy to DigitalOcean (Recommended)

1. Click the "Deploy to DO" button above
2. Connect your GitHub repository
3. Set environment variables (optional for Kerio Connect)
4. Deploy and get your URL (e.g., `https://your-app.ondigitalocean.app`)

### Configure MCP Client

Add to your MCP client configuration:

**Claude Desktop / Cursor / Windsurf:**

```json
{
  "mcpServers": {
    "remote-skills": {
      "url": "https://your-app.ondigitalocean.app",
      "description": "Remote MCP Server with Skill-Routing"
    }
  }
}
```

Configuration file locations:
- **Claude Desktop**:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- **Cursor**:
  - macOS: `~/Library/Application Support/Cursor/cursor_desktop_config.json`
  - Windows: `%APPDATA%\Cursor\cursor_desktop_config.json`
- **Windsurf**:
  - macOS: `~/Library/Application Support/Windsurf/windsurf_desktop_config.json`
  - Windows: `%APPDATA%\Windsurf\windsurf_desktop_config.json`

## Architecture

### Skill-Routing System

The server uses an intelligent routing system that dramatically reduces token usage:

```
Traditional Approach: Load all skills upfront = 890 tokens
With Skill-Router: Load router only = 8 tokens
Average Savings: 90% (when routing to specific skills)
```

**How it works:**

1. Client loads only the `skill_router` tool (8 tokens)
2. User makes a request (e.g., "Create a PowerPoint presentation")
3. Router analyzes keywords and selects relevant skills
4. Only selected skills are loaded on-demand
5. Total: 8 + ~50 tokens per skill = ~108 tokens vs. 890 tokens

## Available Skills

| Skill | Description | Keywords | Tools |
|-------|-------------|----------|-------|
| **PowerPoint** | Create PowerPoint presentations | powerpoint, presentation, slides, pptx | create_powerpoint |
| **Excel** | Create and analyze Excel spreadsheets | excel, spreadsheet, xlsx, data | create_excel |
| **Brand Guidelines** | Apply brand guidelines to content | brand, corporate, branding, guidelines | apply_brand_guidelines |
| **PDF** | Read and process PDF files | pdf, document, read, ocr | read_pdf |
| **Code Review** | Review code quality and security | code, review, quality, bugs, security | review_code |
| **Blog Writer** | Write blog posts and content | blog, article, content, seo, writing | write_blog_post |

## Kerio Connect Integration

The server includes built-in Kerio Connect email integration with the following capabilities:

### Email Tools

- `kerio_list_emails`: List emails from inbox or specific folder
- `kerio_read_email`: Read specific email with full content and attachments
- `kerio_send_email`: Send emails with attachments
- `kerio_search_emails`: Search emails by subject, sender, date range

### Configuration

Set these environment variables to enable Kerio Connect:

```bash
KERIO_HOST=mail.example.com
KERIO_IMAP_PORT=993
KERIO_SMTP_PORT=465
KERIO_USERNAME=your.email@domain.com
KERIO_PASSWORD=your_password
KERIO_USE_SSL=true
```

## API Endpoints

### Core Endpoints

- `GET /` - Service information and status
- `GET /health` - Health check endpoint
- `GET /tools` - List available tools (router + Kerio if configured)
- `GET /skills` - List all available skills with details

### Routing Endpoints

- `POST /route` - Analyze request and select appropriate skills
- `POST /execute` - Execute a specific tool

### Example: Skill Routing

```bash
curl -X POST https://your-app.ondigitalocean.app/route \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Create a PowerPoint presentation about Q3 results",
    "context": ""
  }'
```

Response:
```json
{
  "success": true,
  "selected_skills": [
    {
      "id": "powerpoint",
      "name": "PowerPoint Skill",
      "description": "Erstellt PowerPoint-Präsentationen",
      "tool_count": 1
    }
  ],
  "tools": [...],
  "token_savings": {
    "without_routing": 890,
    "with_routing": 58,
    "savings_percentage": 93
  }
}
```

## Local Development

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/estkae/remote-mcp-server.git
   cd remote-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment (optional)**
   ```bash
   cp .env.example .env
   # Edit .env with your Kerio Connect credentials
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Test the server**
   ```bash
   curl http://localhost:8080/health
   ```

## Deployment

### DigitalOcean App Platform

This server is optimized for DigitalOcean App Platform with auto-deployment:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Auto-Deploy**
   - DigitalOcean detects the push
   - Builds the application
   - Deploys automatically (2-3 minutes)

3. **Verify Deployment**
   ```bash
   curl https://your-app.ondigitalocean.app/health
   ```

### Configuration

The server uses the following configuration:

- **Procfile**: `web: node remote-mcp-server-with-skills.js`
- **Port**: 8080 (auto-configured via PORT environment variable)
- **Node Version**: >=18.0.0 (specified in package.json)

## Usage Examples

### Example 1: List Available Skills

```
User: "What skills are available?"
Router: Analyzes and lists all 6 skills with descriptions
```

### Example 2: Create PowerPoint

```
User: "Create a PowerPoint presentation about Q3 financial results"
Router: Selects PowerPoint skill (keyword: "powerpoint", "presentation")
Result: PowerPoint tool is loaded and executed
```

### Example 3: Check Email

```
User: "List my recent emails"
Router: Kerio Connect integration handles the request
Result: Returns list of emails from inbox
```

### Example 4: Multi-Skill Request

```
User: "Create a presentation with charts from Excel data"
Router: Selects PowerPoint + Excel skills (keywords: "presentation", "excel")
Result: Both tools are loaded for combined workflow
```

## Token Optimization Details

### Cost Comparison (10,000 requests/month)

**Without Skill-Routing:**
```
10,000 × 890 tokens = 8,900,000 tokens
Cost: ~$26.70/month (at $0.000003 per token)
```

**With Skill-Routing:**
```
10,000 × 100 tokens (average) = 1,000,000 tokens
Cost: ~$3.00/month (at $0.000003 per token)
```

**Annual Savings: $284.40**

## Project Structure

```
remote-mcp-server/
├── remote-mcp-server-with-skills.js  # Main server with skill-routing
├── kerio-connector.js                # Kerio Connect integration
├── skill-definitions.json            # External skill definitions (optional)
├── package.json                      # Node.js dependencies
├── Procfile                          # DigitalOcean deployment config
├── .env.example                      # Environment variables template
└── README.md                         # This file
```

## Troubleshooting

### Server won't start

**Check Node.js version:**
```bash
node --version  # Should be >= 18.0.0
```

**Check dependencies:**
```bash
npm install
```

### Kerio Connect not working

**Verify environment variables:**
```bash
echo $KERIO_HOST
echo $KERIO_USERNAME
```

**Check server logs:**
- DigitalOcean: Runtime Logs tab
- Local: Console output

### Tools not appearing in MCP client

**Clear MCP client cache:**
1. Remove the server URL from settings
2. Save settings
3. Add the server URL again
4. Restart the MCP client

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/estkae/remote-mcp-server/issues
- Documentation: See README-SKILL-ROUTER.md for detailed routing guide

## Credits

Developed by AALS Software AG

---

**Note**: This server is designed for production use. All tools (except Kerio Connect) are currently simulated. To add real tool execution, integrate with specialized services or implement tool logic in the execute endpoint.
