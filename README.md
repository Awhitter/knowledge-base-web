# 📚 Knowledge Base Web - v1.0

**Status:** ✅ **Production Ready** | **Version:** 1.0.0 | **Last Updated:** October 24, 2025

---

## Overview

The Knowledge Base Web application is a powerful internal tool designed to streamline content creation, manage workflows, and provide a centralized hub for your organization's knowledge. It connects directly to your Airtable bases, providing a real-time, dynamic interface for your team.

### Key Features

- **Dashboard:** At-a-glance view of key metrics and recent requests
- **New Request Form:** Submit new content requests with validated input
- **Tracker:** Monitor the status of all requests with auto-refresh
- **Content Hub:** View and search published articles
- **Real-time Airtable Integration:** All data is live from your Airtable bases
- **Health Monitoring:** API endpoints to monitor system status
- **SSE Infrastructure:** Ready for Make.com automation

---

## Getting Started

### Prerequisites

- Node.js (v22 or later)
- npm
- Airtable account
- Make.com account (optional)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Awhitter/knowledge-base-web.git
   cd knowledge-base-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   Create a `.env` file in the root directory and add the following:
   ```
   AIRTABLE_API_KEY=your_airtable_api_key
   MAKE_WEBHOOK_URL=your_make_webhook_url
   PORT=3001
   ```

4. **Run the server:**
   ```bash
   node server.js
   ```

5. **Visit the application:**
   Open your browser and go to `http://localhost:3001`

---

## Deployment

### Vercel (Recommended)

1. **Import Project:** Go to https://vercel.com/new and import the GitHub repository.
2. **Add Environment Variables:** In the Vercel dashboard, add your `AIRTABLE_API_KEY`, `MAKE_WEBHOOK_URL`, and `NODE_ENV=production`.
3. **Deploy:** Click "Deploy" and get your production URL.

### Docker

1. **Build the image:**
   ```bash
   docker build -t knowledge-base-web .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3001:3001 --env-file .env knowledge-base-web
   ```

---

## Architecture

### Backend

- **Framework:** Express.js
- **Database:** Airtable (live integration)
- **API:** RESTful API with endpoints for lookups, requests, content, and health
- **Services:**
  - `Schema Service`: Caches Airtable schema for performance
  - `Health Service`: Monitors system health
  - `SSE Events`: Real-time updates for request tracking

### Frontend

- **Stack:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Features:**
  - Single Page Application (SPA) design
  - Dynamic content loading with `fetch`
  - Loading states, modals, form validation
  - Auto-refresh on Tracker page

---

## API Endpoints

### Health
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed component status

### Lookups
- `GET /api/lookups/workflows` - Get all workflows
- `GET /api/lookups/entities` - Get all entities
- `GET /api/lookups/personas` - Get all personas

### Requests
- `POST /api/initiator` - Submit a new request
- `GET /api/requests/submitted` - Get all submitted requests

### Content
- `GET /api/content-hub/articles` - Get all published articles

---

## What's Next (Roadmap)

### Phase 2: Advanced Features

- **Dynamic Form Builder:** Generate forms from Airtable schema
- **Advanced Filtering:** Search and filter capabilities
- **Bulk Operations:** Batch updates and exports

### Phase 3: Production Hardening

- **Error Recovery:** Retry failed API calls
- **Performance Optimization:** Caching and lazy loading
- **Security Enhancements:** Rate limiting and input sanitization

---

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

---

## License

This project is licensed under the MIT License.

---

## Support

For issues, questions, or feedback, please create an issue on GitHub:
https://github.com/Awhitter/knowledge-base-web/issues

---

**Author:** Manus AI  
**Version:** 1.0.0

