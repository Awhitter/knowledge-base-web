/**
 * Security Utilities - Rate limiting and input sanitization
 * Prevents API abuse and XSS attacks
 */

class RateLimiter {
    constructor(maxRequests = 10, windowMs = 60000) { // 10 requests per minute
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    /**
     * Check if request is allowed
     */
    isAllowed(key = 'default') {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        
        // Remove old requests
        this.requests = this.requests.filter(req => 
            req.timestamp > windowStart && req.key === key
        );
        
        // Check if limit exceeded
        if (this.requests.length >= this.maxRequests) {
            console.warn(`[RateLimiter] Rate limit exceeded for ${key}`);
            return false;
        }
        
        // Add new request
        this.requests.push({ key, timestamp: now });
        return true;
    }

    /**
     * Get remaining requests
     */
    getRemaining(key = 'default') {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        
        const recentRequests = this.requests.filter(req => 
            req.timestamp > windowStart && req.key === key
        );
        
        return Math.max(0, this.maxRequests - recentRequests.length);
    }

    /**
     * Get time until reset (ms)
     */
    getTimeUntilReset(key = 'default') {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        
        const oldestRequest = this.requests
            .filter(req => req.key === key)
            .sort((a, b) => a.timestamp - b.timestamp)[0];
        
        if (!oldestRequest) return 0;
        
        const resetTime = oldestRequest.timestamp + this.windowMs;
        return Math.max(0, resetTime - now);
    }

    /**
     * Reset rate limit for key
     */
    reset(key = 'default') {
        this.requests = this.requests.filter(req => req.key !== key);
    }
}

/**
 * Input Sanitizer - Prevent XSS attacks
 */
class InputSanitizer {
    /**
     * Escape HTML to prevent XSS
     */
    static escapeHTML(str) {
        if (typeof str !== 'string') return str;
        
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Strip HTML tags
     */
    static stripHTML(str) {
        if (typeof str !== 'string') return str;
        
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent || div.innerText || '';
    }

    /**
     * Sanitize URL to prevent javascript: protocol
     */
    static sanitizeURL(url) {
        if (typeof url !== 'string') return '';
        
        // Remove dangerous protocols
        const dangerous = ['javascript:', 'data:', 'vbscript:', 'file:'];
        const lower = url.toLowerCase().trim();
        
        for (const protocol of dangerous) {
            if (lower.startsWith(protocol)) {
                console.warn('[Security] Blocked dangerous URL:', url);
                return '';
            }
        }
        
        return url;
    }

    /**
     * Validate email format
     */
    static isValidEmail(email) {
        if (typeof email !== 'string') return false;
        
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Validate URL format
     */
    static isValidURL(url) {
        if (typeof url !== 'string') return false;
        
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Sanitize form input
     */
    static sanitizeInput(input, options = {}) {
        if (typeof input !== 'string') return input;
        
        let sanitized = input;
        
        // Trim whitespace
        if (options.trim !== false) {
            sanitized = sanitized.trim();
        }
        
        // Escape HTML
        if (options.escapeHTML !== false) {
            sanitized = this.escapeHTML(sanitized);
        }
        
        // Limit length
        if (options.maxLength) {
            sanitized = sanitized.substring(0, options.maxLength);
        }
        
        // Remove dangerous characters
        if (options.removeDangerous) {
            sanitized = sanitized.replace(/[<>\"']/g, '');
        }
        
        return sanitized;
    }

    /**
     * Validate and sanitize all form inputs
     */
    static sanitizeFormData(formData) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(formData)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeInput(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }
}

/**
 * CSRF Protection
 */
class CSRFProtection {
    constructor() {
        this.token = this.generateToken();
    }

    generateToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    getToken() {
        return this.token;
    }

    validateToken(token) {
        return token === this.token;
    }

    refreshToken() {
        this.token = this.generateToken();
        return this.token;
    }
}

/**
 * Content Security Policy Helper
 */
class CSPHelper {
    /**
     * Check if inline script would be blocked
     */
    static isInlineScriptAllowed() {
        try {
            eval('1+1');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Report CSP violation
     */
    static reportViolation(violation) {
        console.error('[CSP] Violation:', violation);
        // Could send to monitoring service
    }
}

// Initialize global security utilities
window.rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
window.inputSanitizer = InputSanitizer;
window.csrfProtection = new CSRFProtection();

/**
 * Secure fetch wrapper with rate limiting
 */
async function secureFetch(url, options = {}) {
    // Check rate limit
    if (!window.rateLimiter.isAllowed(url)) {
        const remaining = window.rateLimiter.getRemaining(url);
        const resetTime = Math.ceil(window.rateLimiter.getTimeUntilReset(url) / 1000);
        
        window.errorRecovery?.showToast(
            `Rate limit exceeded. Please wait ${resetTime} seconds.`,
            'warning'
        );
        
        throw new Error(`Rate limit exceeded. Try again in ${resetTime}s`);
    }
    
    // Add CSRF token for POST/PUT/DELETE
    if (['POST', 'PUT', 'DELETE'].includes(options.method?.toUpperCase())) {
        options.headers = {
            ...options.headers,
            'X-CSRF-Token': window.csrfProtection.getToken()
        };
    }
    
    // Use error recovery if available
    if (window.errorRecovery) {
        return window.errorRecovery.fetchWithRetry(url, options);
    }
    
    return fetch(url, options);
}

// Listen for CSP violations
document.addEventListener('securitypolicyviolation', (e) => {
    CSPHelper.reportViolation({
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy
    });
});

// Expose for debugging
window.debugSecurity = () => {
    console.log('Security Status:', {
        rateLimitRemaining: window.rateLimiter.getRemaining(),
        rateLimitReset: Math.ceil(window.rateLimiter.getTimeUntilReset() / 1000) + 's',
        csrfToken: window.csrfProtection.getToken(),
        inlineScriptsAllowed: CSPHelper.isInlineScriptAllowed()
    });
};

// Test functions
window.testRateLimit = async () => {
    console.log('Testing rate limit (10 requests per minute)...');
    for (let i = 0; i < 12; i++) {
        const allowed = window.rateLimiter.isAllowed('test');
        console.log(`Request ${i + 1}: ${allowed ? 'ALLOWED' : 'BLOCKED'}`);
    }
};

window.testSanitization = () => {
    const dangerous = '<script>alert("XSS")</script>';
    const sanitized = window.inputSanitizer.escapeHTML(dangerous);
    console.log('Original:', dangerous);
    console.log('Sanitized:', sanitized);
    
    const dangerousURL = 'javascript:alert("XSS")';
    const sanitizedURL = window.inputSanitizer.sanitizeURL(dangerousURL);
    console.log('Dangerous URL:', dangerousURL);
    console.log('Sanitized URL:', sanitizedURL);
};

