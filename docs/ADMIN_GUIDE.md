# Knowledge Base Web - Administrator Guide

**Version:** 1.0  
**Last Updated:** October 24, 2025

---

## 1. Introduction

This guide is for system administrators responsible for configuring, managing, and monitoring the Knowledge Base Web application.

### Administrator Responsibilities

- **Configuration:** Setting up environment variables and integrations.
- **Monitoring:** Tracking system health, performance, and usage.
- **User Management:** (Future feature)
- **Troubleshooting:** Diagnosing and resolving issues.

---

## 2. System Architecture

Understanding the architecture is key to effective administration.

- **Frontend:** Vanilla JavaScript, HTML, CSS (no frameworks)
- **Backend:** Node.js + Express
- **Database:** Airtable API
- **Real-time:** Server-Sent Events (SSE) with a polling fallback
- **Deployment:** Vercel with GitHub integration

### Key Components

- **`server.js`:** The main backend server, handles all API requests.
- **`public/`:** Contains all frontend files (HTML, JS, CSS).
- **`docs/`:** Contains all documentation files.
- **`.env`:** Stores all environment variables and secrets.
- **`vercel.json`:** Vercel deployment configuration.

---

## 3. Configuration

All configuration is managed through environment variables in the `.env` file (for local development) or in the Vercel project settings (for production).

### Required Environment Variables

- **`AIRTABLE_API_KEY`:** Your Airtable API key with access to the required bases.
- **`AIRTABLE_BASE_ID_AUTOMATION`:** The ID of the Automation Mastery Airtable base.
- **`AIRTABLE_BASE_ID_CONTENT_HUB`:** The ID of the Content Hub Airtable base.
- **`MAKE_WEBHOOK_URL`:** The URL of your Make.com webhook for triggering workflows.

### Optional Environment Variables

- **`PORT`:** The port for the backend server to run on (defaults to 3001).
- **`NODE_ENV`:** Set to `production` for production deployments.

### Airtable Configuration

The application relies on specific table and field names in your Airtable bases. If you change these names, you may need to update the corresponding code in `server.js`.

**Key Tables:**
- **Initiator:** Where new requests are created.
- **Workflows:** A list of available workflows.
- **Entities:** A list of target audiences or brands.
- **Personas:** A list of writing styles or personas.
- **Content Hub:** Where published content is stored.

**Dynamic Forms:** The New Request form dynamically generates fields from the Initiator table schema. To add a new field to the form, simply add it to your Initiator table in Airtable.

---

## 4. Deployment

The application is designed for easy deployment to Vercel.

### GitHub Integration

The recommended deployment method is to connect your GitHub repository to a Vercel project. This enables automatic deployments on every push to the `master` branch.

### Manual Deployment

If you need to deploy manually, you can use the Vercel CLI:

```bash
# Install Vercel CLI
npm install -g vercel

# Link to your Vercel project
vercel link

# Deploy to production
vercel --prod
```

### `vercel.json`

The `vercel.json` file configures the deployment:

- **`version: 2`**: Vercel platform version.
- **`builds`**: Specifies that `server.js` is a Node.js serverless function.
- **`routes`**: Rewrites all requests to the `server.js` function.

---

## 5. Monitoring & Maintenance

### Analytics Dashboard

The built-in Analytics dashboard is the first place to look for usage trends and performance metrics. It provides real-time insights into:

- Request volume and completion rates
- Popular workflows and entities
- Average processing times

### Vercel Logs

All `console.log` statements in `server.js` are sent to the Vercel logs. This is the best place to look for backend errors and debug information.

### Browser Console

Client-side errors and monitoring data are available in the browser console. Instruct users to open the console (F12 or Ctrl+Shift+I) if they encounter issues.

**Debug Commands:**

- `debugMonitor()`: Shows a summary of all monitoring data (errors, performance, analytics).
- `debugCache()`: Shows cache hit/miss rates and stored keys.
- `debugSecurity()`: Shows rate limiting status and CSRF token info.
- `debugErrorRecovery()`: Shows offline status and retry queue.

### Regular Maintenance

- **Airtable:** Periodically archive old requests in your Initiator table to keep the application fast.
- **Dependencies:** Run `npm audit` to check for security vulnerabilities in dependencies (though there are currently none).
- **Backups:** Your data is stored in Airtable, which has its own backup and revision history features.

---

## 6. Troubleshooting

### Common Issues

- **Form dropdowns are empty:**
  - Check that the `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID_AUTOMATION` environment variables are correct.
  - Ensure the API key has access to the Automation Mastery base.
  - Verify that the Workflows, Entities, and Personas tables are not empty.

- **Requests are not being processed:**
  - Check that the `MAKE_WEBHOOK_URL` is correct.
  - Check the Make.com scenario history for errors.
  - Verify that the Airtable API key has write access to the Initiator table.

- **Content Hub is empty:**
  - Check that the `AIRTABLE_BASE_ID_CONTENT_HUB` is correct.
  - Ensure the API key has access to the Content Hub base.
  - Verify that the Content Hub table is not empty.

- **500 Internal Server Error:**
  - Check the Vercel logs for backend errors.
  - This usually indicates a problem with an environment variable or an unhandled exception in `server.js`.

### Advanced Debugging

1. **Check Network Requests:** Use the Network tab in your browser's developer tools to inspect API requests and responses.
2. **Test API Endpoints:** Use a tool like `curl` or Postman to test the API endpoints directly.
3. **Enable Verbose Logging:** Add more `console.log` statements in `server.js` to trace the execution flow.

---

This guide provides a comprehensive overview for administering the Knowledge Base Web application. For more detailed technical information, refer to the Developer Guide.

