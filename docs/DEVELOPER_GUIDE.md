# Knowledge Base Web - Developer Guide

**Version:** 1.0  
**Last Updated:** October 24, 2025

---

## 1. Introduction

This guide is for developers who want to contribute to, customize, or extend the Knowledge Base Web application.

### Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** Node.js + Express
- **Database:** Airtable API
- **Deployment:** Vercel
- **Code Style:** StandardJS (enforced via linting)

**Design Philosophy:**
- **No frameworks:** Keep the frontend lightweight and fast.
- **Vanilla JS:** Use modern JavaScript features, no jQuery.
- **Modularity:** Break down features into separate JS modules.
- **Self-documenting code:** Write clean, readable code with clear naming.
- **Zero dependencies:** Minimize external libraries where possible.

---

## 2. Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Awhitter/knowledge-base-web.git
   cd knowledge-base-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file:**
   Copy the `.env.example` file to `.env` and fill in your Airtable and Make.com credentials.
   ```bash
   cp .env.example .env
   ```

4. **Start the development server:**
   ```bash
   node server.js
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3001](http://localhost:3001)

---

## 3. Codebase Overview

### File Structure

```
knowledge-base-web/
├── docs/                  # Documentation files
│   ├── ADMIN_GUIDE.md
│   ├── DEVELOPER_GUIDE.md
│   └── USER_GUIDE.md
├── public/                # All frontend files
│   ├── index.html         # Main HTML file
│   ├── analytics.js       # Phase 4: Analytics dashboard
│   ├── animations.js      # Phase 5: Animations
│   ├── cache-manager.js   # Phase 3: Caching
│   ├── dark-mode.js       # Phase 5: Dark mode
│   ├── dynamic-form.js    # Phase 4: Dynamic forms
│   ├── error-recovery.js  # Phase 3: Error recovery
│   ├── lazy-loader.js     # Phase 3: Lazy loading
│   ├── monitoring.js      # Phase 3: Monitoring
│   ├── pagination.js      # Phase 3: Pagination
│   ├── security.js        # Phase 3: Security
│   ├── semantic-search.js # Phase 4: Semantic search
│   └── workflow-diagram.js# Phase 4: Workflow diagrams
├── .env                   # Environment variables (local)
├── .env.example           # Example .env file
├── .gitignore             # Files to ignore in git
├── package.json           # Project dependencies
├── README.md              # Project README
├── server.js              # Main backend server
└── vercel.json            # Vercel deployment config
```

### `server.js`

This is the heart of the backend. It uses Express to serve the `public` directory and handle all API requests.

**Key API Endpoints:**
- `/api/health`: System health check.
- `/api/schema/initiator`: Fetches the schema of the Initiator table.
- `/api/lookups/:type`: Fetches data for form dropdowns (workflows, entities, personas).
- `/api/requests/submitted`: Fetches all submitted requests for the Tracker.
- `/api/requests/new`: Submits a new request.
- `/api/content/:type`: Fetches published content for the Content Hub.
- `/api/content/view/:id`: Fetches a single content item by ID.

### `public/index.html`

This is a single-page application (SPA). All "pages" are just `div` elements that are shown or hidden with JavaScript.

**Page Structure:**
- `#dashboardPage`
- `#newRequestPage`
- `#trackerPage`
- `#contentHubPage`
- `#analyticsPage`

### JavaScript Modules

Each major feature is encapsulated in its own JavaScript module in the `public/` directory. These modules are loaded in `index.html` and expose global objects (e.g., `window.darkMode`, `window.animations`).

**Module Pattern:**
- Each module is a class (e.g., `class DarkMode`).
- It initializes itself upon loading (`window.darkMode = new DarkMode()`).
- It may expose helper functions on the `window` object.

---

## 4. How to Add a New Feature

Follow this pattern to add a new feature:

1. **Create a new JavaScript module** in the `public/` directory (e.g., `public/new-feature.js`).
2. **Encapsulate your logic** in a class within the module.
3. **Initialize your class** at the end of the module file.
4. **Add the script tag** for your new module to `index.html`.
5. **If it adds a new page:**
   - Add a `div` with a unique ID (e.g., `#newFeaturePage`) to `index.html`.
   - Add a link to the navigation menu.
   - Add a case to the `switchPage()` function to handle showing/hiding your new page.
6. **If it modifies an existing page:**
   - Use DOM manipulation to add your new elements.
   - Be sure to check if the elements already exist to avoid duplicates.

---

## 5. Backend Development

### Adding a New API Endpoint

1. Open `server.js`.
2. Add a new `app.get()` or `app.post()` route.
3. Keep your logic within the route handler for simplicity.
4. Use the `airtable` object to interact with the Airtable API.
5. Remember to handle errors and send a proper JSON response.

**Example:**

```javascript
app.get("/api/my-new-endpoint", async (req, res) => {
    try {
        // Your logic here
        const records = await airtable("MyTable").select().firstPage();
        res.json(records.map(r => r.fields));
    } catch (error) {
        console.error("Error in my-new-endpoint:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
```

### Airtable API

The `airtable` library is already configured. You can use it to query any table in your base:

```javascript
// Get all records from a table
const records = await airtable("MyTable").select().all();

// Get a single record by ID
const record = await airtable("MyTable").find("rec12345");

// Create a new record
await airtable("MyTable").create({
    "Name": "New Record",
    "Status": "Queued"
});

// Update a record
await airtable("MyTable").update("rec12345", {
    "Status": "In Progress"
});
```

---

## 6. Frontend Development

### Key Functions in `index.html`

- **`switchPage(pageId)`:** The main function for navigating between pages.
- **`loadDashboard()`:** Loads the dashboard data.
- **`loadNewRequestForm()`:** Initializes the New Request form.
- **`loadTracker()`:** Loads the Tracker data.
- **`loadContentHub()`:** Loads the Content Hub data.
- **`loadAnalytics()`:** Loads the Analytics dashboard.

### DOM Manipulation

Use standard DOM APIs (`document.getElementById`, `document.querySelector`, `document.createElement`) for all DOM manipulation. **Do not use jQuery.**

### Style Guide

- **CSS:** Use inline styles for simple one-off styling. For more complex styles, add a `<style>` tag in the `<head>` of `index.html`.
- **Naming:** Use `camelCase` for JavaScript variables and functions, and `kebab-case` for CSS classes and IDs.
- **Formatting:** Code formatting is not strictly enforced, but try to keep it clean and readable.

---

## 7. Contributing

1. **Create a new branch** for your feature (`git checkout -b feature/my-new-feature`).
2. **Make your changes.**
3. **Test your changes** locally.
4. **Commit your changes** with a descriptive commit message.
5. **Push your branch** to GitHub (`git push origin feature/my-new-feature`).
6. **Open a pull request** for review.

---

This guide should provide everything you need to get started with developing on the Knowledge Base Web application. Happy coding!

