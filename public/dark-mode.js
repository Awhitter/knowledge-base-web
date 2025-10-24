/**
 * Dark Mode - Theme toggle with persistence
 * Supports light and dark themes with smooth transitions
 */

class DarkMode {
    constructor() {
        this.theme = this.getStoredTheme() || this.getSystemTheme();
        this.init();
    }

    /**
     * Get stored theme from localStorage
     */
    getStoredTheme() {
        return localStorage.getItem('theme');
    }

    /**
     * Get system theme preference
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * Initialize dark mode
     */
    init() {
        // Apply theme
        this.applyTheme(this.theme);

        // Create toggle button
        this.createToggleButton();

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!this.getStoredTheme()) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }

        console.log('[DarkMode] Initialized with theme:', this.theme);
    }

    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.theme = theme;
        
        // Update toggle button if it exists
        this.updateToggleButton();
    }

    /**
     * Set theme and save preference
     */
    setTheme(theme) {
        this.applyTheme(theme);
        localStorage.setItem('theme', theme);
        console.log('[DarkMode] Theme changed to:', theme);
    }

    /**
     * Toggle between light and dark
     */
    toggle() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    /**
     * Create toggle button in navbar
     */
    createToggleButton() {
        const navbar = document.querySelector('.navbar-content');
        if (!navbar) {
            console.warn('[DarkMode] Navbar not found, retrying...');
            setTimeout(() => this.createToggleButton(), 100);
            return;
        }

        // Create button
        const button = document.createElement('button');
        button.id = 'dark-mode-toggle';
        button.className = 'dark-mode-toggle';
        button.setAttribute('aria-label', 'Toggle dark mode');
        button.innerHTML = this.theme === 'dark' ? '☀️' : '🌙';
        
        button.onclick = () => this.toggle();

        // Add to navbar
        navbar.appendChild(button);
    }

    /**
     * Update toggle button icon
     */
    updateToggleButton() {
        const button = document.getElementById('dark-mode-toggle');
        if (button) {
            button.innerHTML = this.theme === 'dark' ? '☀️' : '🌙';
        }
    }
}

// CSS for dark mode
const darkModeCSS = `
    /* Dark mode variables */
    :root[data-theme="light"] {
        --bg-primary: #ffffff;
        --bg-secondary: #f8f9fa;
        --bg-tertiary: #e9ecef;
        --text-primary: #212529;
        --text-secondary: #6c757d;
        --text-tertiary: #adb5bd;
        --border-color: #dee2e6;
        --card-bg: #ffffff;
        --card-shadow: rgba(0, 0, 0, 0.1);
        --navbar-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        --navbar-text: #ffffff;
        --input-bg: #ffffff;
        --input-border: #ced4da;
        --button-primary-bg: #007bff;
        --button-primary-text: #ffffff;
        --button-secondary-bg: #6c757d;
        --button-secondary-text: #ffffff;
        --link-color: #007bff;
        --link-hover: #0056b3;
        --success-color: #28a745;
        --warning-color: #ffc107;
        --danger-color: #dc3545;
        --info-color: #17a2b8;
    }

    :root[data-theme="dark"] {
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d2d2d;
        --bg-tertiary: #3a3a3a;
        --text-primary: #e9ecef;
        --text-secondary: #adb5bd;
        --text-tertiary: #6c757d;
        --border-color: #495057;
        --card-bg: #2d2d2d;
        --card-shadow: rgba(0, 0, 0, 0.3);
        --navbar-bg: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
        --navbar-text: #e9ecef;
        --input-bg: #3a3a3a;
        --input-border: #495057;
        --button-primary-bg: #0d6efd;
        --button-primary-text: #ffffff;
        --button-secondary-bg: #495057;
        --button-secondary-text: #e9ecef;
        --link-color: #4dabf7;
        --link-hover: #74c0fc;
        --success-color: #51cf66;
        --warning-color: #ffd43b;
        --danger-color: #ff6b6b;
        --info-color: #22b8cf;
    }

    /* Apply theme colors */
    body {
        background-color: var(--bg-primary);
        color: var(--text-primary);
        transition: background-color 0.3s ease, color 0.3s ease;
    }

    .container {
        background-color: var(--bg-secondary);
        color: var(--text-primary);
    }

    .navbar {
        background: var(--navbar-bg);
        color: var(--navbar-text);
    }

    .navbar-brand,
    .nav-link {
        color: var(--navbar-text) !important;
    }

    .card,
    .metric-card,
    .chart-section,
    .workflow-diagram-container {
        background-color: var(--card-bg);
        color: var(--text-primary);
        box-shadow: 0 2px 8px var(--card-shadow);
    }

    input,
    textarea,
    select {
        background-color: var(--input-bg);
        color: var(--text-primary);
        border-color: var(--input-border);
    }

    input::placeholder,
    textarea::placeholder {
        color: var(--text-tertiary);
    }

    button {
        background-color: var(--button-primary-bg);
        color: var(--button-primary-text);
    }

    button.btn-secondary {
        background-color: var(--button-secondary-bg);
        color: var(--button-secondary-text);
    }

    a {
        color: var(--link-color);
    }

    a:hover {
        color: var(--link-hover);
    }

    table {
        background-color: var(--card-bg);
        color: var(--text-primary);
    }

    table thead {
        background-color: var(--bg-tertiary);
    }

    table tr {
        border-bottom-color: var(--border-color) !important;
    }

    .modal-overlay {
        background: rgba(0, 0, 0, 0.7);
    }

    .modal-overlay > div {
        background-color: var(--card-bg);
        color: var(--text-primary);
    }

    .loading-spinner {
        border-color: var(--border-color);
        border-top-color: var(--button-primary-bg);
    }

    /* Dark mode toggle button */
    .dark-mode-toggle {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 8px;
        margin-left: auto;
        transition: transform 0.3s ease;
    }

    .dark-mode-toggle:hover {
        transform: scale(1.2);
    }

    /* Analytics dashboard dark mode */
    [data-theme="dark"] .bar-container {
        background: var(--bg-tertiary);
    }

    [data-theme="dark"] .timeline-event {
        border-left-color: var(--button-primary-bg);
    }

    /* Form elements dark mode */
    [data-theme="dark"] .form-group label {
        color: var(--text-primary);
    }

    [data-theme="dark"] .form-group small {
        color: var(--text-secondary);
    }

    /* Ensure navbar content is flex */
    .navbar-content {
        display: flex;
        align-items: center;
        gap: 20px;
    }

    .navbar-menu {
        display: flex;
        gap: 10px;
        margin: 0;
        padding: 0;
        list-style: none;
    }
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = darkModeCSS;
document.head.appendChild(style);

// Initialize dark mode
window.darkMode = new DarkMode();

console.log('[DarkMode] Module loaded and initialized.');

