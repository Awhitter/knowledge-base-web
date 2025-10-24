# Knowledge Base Web - User Guide

**Version:** 1.0  
**Last Updated:** October 24, 2025

---

## 1. Introduction

Welcome to the Knowledge Base Web application! This guide will walk you through all the features and functionalities of the system, from submitting your first request to analyzing usage trends.

### What is Knowledge Base Web?

Knowledge Base Web is a powerful platform for automating content creation and managing knowledge workflows. It allows you to:

- **Submit requests** for automated content generation
- **Track the progress** of your requests in real-time
- **View and manage** published content
- **Analyze usage trends** and workflow popularity
- **Search and filter** through all your data with ease

### Who is this for?

This guide is for all users of the Knowledge Base Web application, including:

- **Content creators** submitting requests
- **Project managers** tracking progress
- **Team leads** analyzing usage
- **Administrators** managing the system

---

## 2. Getting Started

Getting started with Knowledge Base Web is easy. Just open the application URL in your browser and you're ready to go!

**Production URL:** [https://knowledge-base-web.vercel.app](https://knowledge-base-web.vercel.app)

### First Visit

On your first visit, the system will automatically detect your operating system's color scheme (light or dark) and apply the appropriate theme. You can change this at any time using the theme toggle in the top right corner.

### Navigation

The main navigation menu is on the left side of the screen and includes:

- **🏠 Dashboard:** Overview of the system and quick links
- **✨ New Request:** Submit a new request for content generation
- **📊 Tracker:** Track the status of all your requests
- **📚 Content Hub:** View and manage published content
- **📈 Analytics:** Analyze usage trends and system performance

---

## 3. Submitting a New Request

The New Request page allows you to submit a request for automated content generation. The form is designed to be simple for basic users while providing advanced options for power users.

### Basic Fields

These are the core fields required for every request:

- **Request Name:** A descriptive name for your request (e.g., "Q4 Marketing Campaign Blog Posts").
- **Workflow:** The type of content you want to create (e.g., "Create An Article", "Qbank Creator").
- **Entity:** The target audience or brand for this content.
- **Persona:** The writing style or persona to use.
- **Raw Input:** The main input for your request (e.g., a topic, a question, a list of keywords).

### Advanced Fields

Click the "⚙️ Show Advanced Fields" button to reveal additional options organized by category:

- **Content Settings:** Specify content type, brand, desired length, tone of voice, and more.
- **Research & References:** Provide reference URLs, additional notes, and research depth.
- **Workflow Settings:** Customize workflow parameters like output format and language.
- **Additional Options:** Add tags, set priority, or specify a due date.

**Note:** The advanced fields are dynamically generated from the Airtable schema, so they may change over time.

### Form Validation

The form includes validation to ensure all required fields are filled out correctly. If you miss a required field, you'll see a helpful error message.

### Submitting the Form

Once you've filled out the form, click the "Submit Request" button. You'll see a confirmation message, and your request will appear in the Tracker.

---

## 4. Tracking Your Requests

The Tracker page shows the real-time status of all your requests. It automatically refreshes every 30 seconds, so you always have the latest information.

### Request Table

The main table shows the following information for each request:

- **Name:** The name of your request.
- **Status:** The current status (Queued, In Progress, Complete, Error).
- **Created Date:** When the request was submitted.
- **Workflow:** The workflow used for this request.
- **Last Update:** When the request was last updated.
- **Output:** A link to view the final output (if complete).

### Visual Progress Diagram

Click the "📊 View Progress" link on any row to see a visual flowchart of the request's progress through the workflow. This diagram shows:

- **Completed lanes** (green with checkmarks)
- **Current lane** (blue with a yellow dot)
- **Upcoming lanes** (gray)
- **A timeline** of all lane transitions with timestamps

### Filtering and Searching

The Tracker includes powerful filtering and search capabilities:

- **Search Bar:** Fuzzy search across request name, workflow, status, entity, and persona.
- **Status Filter:** Filter by Queued, In Progress, Complete, or Error.
- **Workflow Filter:** Filter by a specific workflow.
- **Date Range Filter:** Filter by Last 7, 30, or 90 days, or All Time.

### Bulk Operations

You can perform actions on multiple requests at once:

- **Select items** using the checkboxes on the left.
- **Select all** items on the current page with the checkbox in the header.
- **Export Selected** to download a CSV file of the selected requests.
- **Export All** to download a CSV of all requests matching the current filters.

---

## 5. Viewing Published Content

The Content Hub is where you can view and manage all published content.

### Content Cards

Each piece of content is displayed as a card with:

- **Title and subtitle**
- **Image**
- **Brand and content type**
- **Creation date**
- **A short summary**

Clicking on a card opens a modal with the full content.

### Filtering and Searching

Similar to the Tracker, the Content Hub has advanced filtering:

- **Search Bar:** Fuzzy search across title, subtitle, brand, and content type.
- **Brand Filter:** Filter by a specific brand.
- **Content Type Filter:** Filter by Article, Blog Post, Research Report, etc.
- **Date Range Filter:** Filter by Last 7, 30, or 90 days, or All Time.

### CSV Export

Click the "Export to CSV" button to download a CSV file of all content items matching the current filters.

---

## 6. Analyzing Usage

The Analytics dashboard provides real-time insights into system usage and performance.

### Key Metrics

The dashboard shows four key metrics at a glance:

- **Total Requests:** The total number of requests submitted.
- **Completion Rate:** The percentage of requests that reach "Complete" status.
- **Average Processing Time:** The average time from submission to completion.
- **Active Workflows:** The number of unique workflows currently in use.

### Visual Charts

- **Status Distribution:** A bar chart showing the breakdown of requests by status.
- **Top Workflows:** A bar chart of the 10 most frequently used workflows.
- **Entity Usage:** A bar chart of the top 5 entities selected in requests.

---

## 7. Customization

### Dark Mode

Toggle between light and dark themes using the moon/sun icon in the top right corner. Your preference will be saved for future visits.

### Animations

The application includes smooth animations and transitions. If you prefer reduced motion, the system will automatically respect your operating system's accessibility settings.

---

## 8. Troubleshooting

If you encounter any issues, try these steps:

1. **Refresh the page.**
2. **Clear your browser cache.**
3. **Check the browser console** for error messages (press F12 or Ctrl+Shift+I).
4. **Contact your system administrator** for assistance.

### Debug Commands

For advanced users, you can open the browser console and use these commands:

- `debugMonitor()`: View all monitoring data.
- `debugCache()`: View cache statistics.
- `debugSecurity()`: View security status.
- `debugErrorRecovery()`: View error recovery status.

---

Enjoy using the Knowledge Base Web application!

