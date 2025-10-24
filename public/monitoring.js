/**
 * Monitoring & Analytics - Track errors, performance, and user behavior
 * Know about issues before users report them
 */

class Monitor {
    constructor() {
        this.errors = [];
        this.performance = [];
        this.events = [];
        this.sessionStart = Date.now();
        this.init();
    }

    init() {
        // Catch unhandled errors
        window.addEventListener('error', (event) => {
            this.logError({
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            });
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                type: 'unhandled_rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
                timestamp: Date.now()
            });
        });

        // Track page visibility
        document.addEventListener('visibilitychange', () => {
            this.logEvent('page_visibility', {
                hidden: document.hidden
            });
        });

        // Track page load performance
        window.addEventListener('load', () => {
            setTimeout(() => this.capturePageLoadMetrics(), 0);
        });

        console.log('[Monitor] Initialized');
    }

    /**
     * Log error
     */
    logError(error) {
        this.errors.push(error);
        console.error('[Monitor] Error logged:', error);

        // Show toast for user-facing errors
        if (window.errorRecovery && error.type !== 'javascript_error') {
            window.errorRecovery.showToast(
                error.message || 'An error occurred',
                'error'
            );
        }

        // Send to external service (e.g., Sentry)
        this.sendToExternalService('error', error);

        // Keep only last 100 errors
        if (this.errors.length > 100) {
            this.errors = this.errors.slice(-100);
        }
    }

    /**
     * Log performance metric
     */
    logPerformance(metric) {
        this.performance.push({
            ...metric,
            timestamp: Date.now()
        });

        console.log('[Monitor] Performance logged:', metric);

        // Keep only last 100 metrics
        if (this.performance.length > 100) {
            this.performance = this.performance.slice(-100);
        }
    }

    /**
     * Log user event
     */
    logEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            data,
            timestamp: Date.now(),
            sessionDuration: Date.now() - this.sessionStart
        };

        this.events.push(event);
        console.log('[Monitor] Event logged:', event);

        // Send to analytics service
        this.sendToExternalService('event', event);

        // Keep only last 200 events
        if (this.events.length > 200) {
            this.events = this.events.slice(-200);
        }
    }

    /**
     * Capture page load metrics
     */
    capturePageLoadMetrics() {
        if (!window.performance || !window.performance.timing) {
            return;
        }

        const timing = window.performance.timing;
        const navigation = window.performance.navigation;

        const metrics = {
            type: 'page_load',
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            tcp: timing.connectEnd - timing.connectStart,
            request: timing.responseStart - timing.requestStart,
            response: timing.responseEnd - timing.responseStart,
            dom: timing.domComplete - timing.domLoading,
            load: timing.loadEventEnd - timing.loadEventStart,
            total: timing.loadEventEnd - timing.navigationStart,
            navigationType: navigation.type // 0=navigate, 1=reload, 2=back/forward
        };

        this.logPerformance(metrics);
    }

    /**
     * Track API call performance
     */
    trackAPICall(url, duration, success, error = null) {
        this.logPerformance({
            type: 'api_call',
            url,
            duration,
            success,
            error: error?.message
        });

        if (!success) {
            this.logError({
                type: 'api_error',
                message: `API call failed: ${url}`,
                error: error?.message,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Track user interaction
     */
    trackInteraction(action, target, data = {}) {
        this.logEvent('user_interaction', {
            action, // click, submit, scroll, etc.
            target, // button ID, form name, etc.
            ...data
        });
    }

    /**
     * Get error summary
     */
    getErrorSummary() {
        const now = Date.now();
        const last24h = this.errors.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000);
        const lastHour = this.errors.filter(e => now - e.timestamp < 60 * 60 * 1000);

        return {
            total: this.errors.length,
            last24h: last24h.length,
            lastHour: lastHour.length,
            byType: this.groupBy(this.errors, 'type'),
            recent: this.errors.slice(-5)
        };
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const apiCalls = this.performance.filter(p => p.type === 'api_call');
        const pageLoads = this.performance.filter(p => p.type === 'page_load');

        return {
            apiCalls: {
                total: apiCalls.length,
                avgDuration: this.average(apiCalls.map(c => c.duration)),
                successRate: apiCalls.filter(c => c.success).length / apiCalls.length * 100
            },
            pageLoads: {
                total: pageLoads.length,
                avgTotal: this.average(pageLoads.map(p => p.total)),
                avgDOM: this.average(pageLoads.map(p => p.dom))
            }
        };
    }

    /**
     * Get user behavior summary
     */
    getUserBehaviorSummary() {
        const interactions = this.events.filter(e => e.name === 'user_interaction');
        const pageViews = this.events.filter(e => e.name === 'page_view');

        return {
            sessionDuration: Date.now() - this.sessionStart,
            interactions: interactions.length,
            pageViews: pageViews.length,
            topActions: this.groupBy(interactions, 'data.action'),
            topTargets: this.groupBy(interactions, 'data.target')
        };
    }

    /**
     * Send data to external monitoring service
     */
    sendToExternalService(type, data) {
        // Placeholder for Sentry, LogRocket, etc.
        // In production, you would send to your monitoring service here
        
        // Example for Sentry:
        // if (window.Sentry) {
        //     if (type === 'error') {
        //         Sentry.captureException(new Error(data.message));
        //     } else if (type === 'event') {
        //         Sentry.addBreadcrumb({
        //             category: data.name,
        //             message: JSON.stringify(data.data),
        //             level: 'info'
        //         });
        //     }
        // }
        
        console.log(`[Monitor] Would send to external service:`, type, data);
    }

    /**
     * Helper: Group array by property
     */
    groupBy(array, property) {
        return array.reduce((acc, item) => {
            const key = this.getNestedProperty(item, property) || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }

    /**
     * Helper: Get nested property
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    /**
     * Helper: Calculate average
     */
    average(numbers) {
        if (numbers.length === 0) return 0;
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }

    /**
     * Export all data for debugging
     */
    exportData() {
        return {
            errors: this.errors,
            performance: this.performance,
            events: this.events,
            summary: {
                errors: this.getErrorSummary(),
                performance: this.getPerformanceSummary(),
                userBehavior: this.getUserBehaviorSummary()
            }
        };
    }

    /**
     * Clear all data
     */
    clearData() {
        this.errors = [];
        this.performance = [];
        this.events = [];
        console.log('[Monitor] All data cleared');
    }
}

/**
 * Performance tracker wrapper
 */
class PerformanceTracker {
    constructor(name) {
        this.name = name;
        this.startTime = performance.now();
    }

    end() {
        const duration = performance.now() - this.startTime;
        window.monitor.logPerformance({
            type: 'operation',
            name: this.name,
            duration
        });
        return duration;
    }
}

/**
 * Helper function to track async operations
 */
async function trackAsync(name, asyncFn) {
    const tracker = new PerformanceTracker(name);
    try {
        const result = await asyncFn();
        tracker.end();
        return result;
    } catch (error) {
        tracker.end();
        window.monitor.logError({
            type: 'async_error',
            operation: name,
            message: error.message,
            stack: error.stack,
            timestamp: Date.now()
        });
        throw error;
    }
}

// Initialize global monitor
window.monitor = new Monitor();

// Track page views
window.addEventListener('hashchange', () => {
    const page = window.location.hash.replace('#', '') || 'dashboard';
    window.monitor.logEvent('page_view', { page });
});

// Track clicks on buttons and links
document.addEventListener('click', (e) => {
    const target = e.target.closest('button, a');
    if (target) {
        window.monitor.trackInteraction('click', target.id || target.textContent.substring(0, 50));
    }
}, true);

// Track form submissions
document.addEventListener('submit', (e) => {
    const form = e.target;
    window.monitor.trackInteraction('submit', form.id || form.name || 'unnamed_form');
}, true);

// Expose for debugging
window.debugMonitor = () => {
    const data = window.monitor.exportData();
    console.log('=== MONITORING DATA ===');
    console.log('Errors:', data.summary.errors);
    console.log('Performance:', data.summary.performance);
    console.log('User Behavior:', data.summary.userBehavior);
    console.log('Full Data:', data);
    return data;
};

window.clearMonitorData = () => {
    window.monitor.clearData();
    console.log('Monitor data cleared');
};

// Performance tracker helper
window.PerformanceTracker = PerformanceTracker;
window.trackAsync = trackAsync;

console.log('[Monitoring] Initialized. Use debugMonitor() to view data.');

