# 📚 Personal Knowledge Base Website

A unified web interface for managing and executing AI-powered content creation and analysis workflows. This website serves as the presentation layer for a sophisticated automation system that integrates **Airtable** (data core), **AgentBox/Mastra** (execution engine), and **n8n/Make.com** (workflow orchestration).

## Overview

The Knowledge Base Website provides a clean, intuitive interface for:

1. **Browsing Knowledge Assets** — Explore reusable prompts, workflows, entities, and references
2. **Initiating Requests** — Submit new content creation or analysis tasks
3. **Tracking Progress** — Monitor the status of submitted requests in real-time
4. **Managing Context** — View and manage XML knowledge bases for different entities

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Knowledge Base Website                      │
│                  (Node.js + Express + HTML/JS)               │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │Airtable│  │AgentBox│  │n8n/Make  │
    │ (Data) │  │(Agents)│  │(Workflow)│
    └────────┘  └────────┘  └──────────┘
```

## Features

### Dashboard
- System status overview with key metrics
- Recent activity feed
- Quick links to all major features

### Prompts Library
- Searchable catalog of reusable prompt templates
- Filter by category and type
- One-click "Use Prompt" to initiate a new request

### Workflows Catalog
- Browse all available AI processing pipelines
- View workflow steps and phases
- Run workflows directly from the catalog

### Entities & Context
- Searchable access to all product/brand/audience entities
- View detailed XML knowledge bases
- Collapsible sections for easy navigation

### New Request Form
- User-friendly form to initiate new tasks
- Dropdown selection for workflows, personas, entities, and projects
- Priority level selection
- Real-time form validation

### Request Tracker
- Live status of all submitted requests
- Quality scores and completion timestamps
- Search and filter capabilities
- View detailed output when complete

## Getting Started

### Prerequisites

- Node.js 14+ and npm
- Docker (optional, for running with AgentBox)
- Airtable account with configured base (for production)
- n8n or Make.com account with configured webhook (for production)

### Installation

1. **Clone or copy the project**
   ```bash
   cd knowledge-base-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file** (optional, for production configuration)
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (optional)
   ```bash
   # .env
   PORT=3001
   NEXT_PUBLIC_API_URL=http://localhost:3000
   AIRTABLE_BASE_ID=your_base_id
   AIRTABLE_API_KEY=your_api_key
   N8N_WEBHOOK_URL=your_webhook_url
   ```

### Running the Server

**Development**
```bash
npm run dev
```

**Production**
```bash
npm start
```

The website will be available at `http://localhost:3001`

## API Endpoints

### Configuration
- `GET /api/config` — Get system configuration and integration status

### Data Retrieval (Mock Data)
- `GET /api/data/prompts` — Get all prompts
- `GET /api/data/workflows` — Get all workflows
- `GET /api/data/entities` — Get all entities
- `GET /api/data/personas` — Get all personas
- `GET /api/data/projects` — Get all projects

### Request Management
- `POST /api/requests/new` — Submit a new content request
- `GET /api/requests/:id` — Get request status and details

### Agent Integration
- `POST /api/agents/:agent/chat` — Call an AgentBox agent (proxy)

## Integration with Airtable

To connect to your live Airtable base:

1. **Get your API key** from Airtable account settings
2. **Get your Base ID** from the Airtable API documentation
3. **Set environment variables:**
   ```bash
   AIRTABLE_API_KEY=your_key
   AIRTABLE_BASE_ID=your_base_id
   ```

4. **Modify `server.js`** to fetch from Airtable API instead of mock data:
   ```javascript
   // Replace mock data endpoints with Airtable API calls
   const fetch = require('node-fetch');
   
   app.get('/api/data/prompts', async (req, res) => {
     const response = await fetch(
       `https://api.airtable.com/v0/${config.airtableBaseId}/Prompts`,
       { headers: { Authorization: `Bearer ${config.airtableApiKey}` } }
     );
     const data = await response.json();
     res.json(data.records.map(r => r.fields));
   });
   ```

## Integration with n8n/Make.com

To trigger workflows when requests are submitted:

1. **Create a webhook** in n8n or Make.com
2. **Copy the webhook URL**
3. **Set environment variable:**
   ```bash
   N8N_WEBHOOK_URL=your_webhook_url
   ```

4. **The webhook will receive:**
   ```json
   {
     "rawInput": "User's request description",
     "workflow": "workflow_id",
     "persona": "persona_id",
     "entity": "entity_id",
     "project": "project_id",
     "priority": 3,
     "status": "queued",
     "created": "2024-10-23T..."
   }
   ```

## Integration with AgentBox Gateway

The website can call AgentBox agents directly via the API Gateway:

```javascript
// Example: Call Marketing Agent
const response = await fetch('http://localhost:3000/api/agents/marketing/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Create a marketing campaign...' })
});
```

## Project Structure

```
knowledge-base-web/
├── public/
│   └── index.html          # Single-page application
├── server.js               # Express server with API endpoints
├── package.json            # Dependencies
├── README.md               # This file
├── Dockerfile              # Docker configuration
└── .env.example            # Environment variables template
```

## Deployment

### Docker

1. **Build the image**
   ```bash
   docker build -t knowledge-base-web .
   ```

2. **Run the container**
   ```bash
   docker run -p 3001:3001 \
     -e AIRTABLE_BASE_ID=your_base_id \
     -e AIRTABLE_API_KEY=your_api_key \
     -e N8N_WEBHOOK_URL=your_webhook_url \
     knowledge-base-web
   ```

### Docker Compose (with AgentBox)

Add to your `docker-compose.yml`:

```yaml
knowledge-base-web:
  build: ./knowledge-base-web
  ports:
    - "3001:3001"
  environment:
    - NEXT_PUBLIC_API_URL=http://gateway:3000
    - AIRTABLE_BASE_ID=${AIRTABLE_BASE_ID}
    - AIRTABLE_API_KEY=${AIRTABLE_API_KEY}
    - N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL}
  depends_on:
    - gateway
```

## Development

### Adding New Pages

1. Add a new section in the navbar menu
2. Create a new `<div class="page">` with matching ID
3. Add navigation handler in the JavaScript
4. Implement `loadPageData()` function for that page

### Customizing Styling

All CSS is embedded in `index.html` for simplicity. To customize:

1. Modify the `:root` CSS variables for colors
2. Update card styles, buttons, and layouts as needed
3. Rebuild and test

### Testing

For local testing without Airtable/n8n:

1. The website uses mock data by default
2. All functionality works with the mock data
3. No API keys required for basic testing

## Troubleshooting

### Port Already in Use
```bash
# Change port in .env or command line
PORT=3002 npm start
```

### Airtable Connection Issues
- Verify API key is correct
- Check Base ID is correct
- Ensure API key has read/write permissions

### n8n Webhook Not Triggering
- Verify webhook URL is correct
- Check n8n workflow is active
- Look at n8n logs for errors

## Future Enhancements

- [ ] Real-time WebSocket updates for request status
- [ ] Advanced filtering and saved searches
- [ ] Batch request submission
- [ ] Custom workflow builder UI
- [ ] Analytics and reporting dashboard
- [ ] User authentication and multi-team support
- [ ] Export results to various formats
- [ ] Integration with more data sources

## Contributing

This is a template project. Feel free to:

1. Customize the UI/UX for your needs
2. Add additional pages and features
3. Integrate with your specific data sources
4. Extend the API with custom endpoints

## License

MIT License - Feel free to use and modify for your projects.

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review the ARCHITECTURE_MAP.md for system design
3. Consult the WEBSITE_PROJECT_PLAN.md for implementation details

---

**Built with ❤️ for the knowledge management and AI automation future**

