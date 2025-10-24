/**
 * Analytics Dashboard - Visualize usage trends and system metrics
 * Uses existing monitoring and tracker data
 */

class AnalyticsDashboard {
    constructor() {
        this.data = {
            requests: [],
            monitoring: null
        };
    }

    /**
     * Fetch all analytics data
     */
    async fetchData() {
        try {
            // Fetch requests from Tracker
            const requestsResponse = await (window.errorRecovery?.fetchWithRetry || fetch)(
                '/api/submitted-requests'
            );
            this.data.requests = await requestsResponse.json();

            // Get monitoring data
            if (window.monitor) {
                this.data.monitoring = window.monitor.exportData();
            }

            console.log('[Analytics] Data loaded:', {
                requests: this.data.requests.length,
                hasMonitoring: !!this.data.monitoring
            });

            return this.data;
        } catch (error) {
            console.error('[Analytics] Failed to load data:', error);
            throw error;
        }
    }

    /**
     * Calculate request trends (submissions over time)
     */
    calculateRequestTrends(period = 'daily') {
        const trends = {};
        const now = new Date();

        this.data.requests.forEach(req => {
            const createdDate = new Date(req.fields['Created At'] || req.createdTime);
            let key;

            if (period === 'daily') {
                key = createdDate.toISOString().split('T')[0]; // YYYY-MM-DD
            } else if (period === 'weekly') {
                const weekStart = new Date(createdDate);
                weekStart.setDate(createdDate.getDate() - createdDate.getDay());
                key = weekStart.toISOString().split('T')[0];
            } else if (period === 'monthly') {
                key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
            }

            trends[key] = (trends[key] || 0) + 1;
        });

        return Object.entries(trends)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));
    }

    /**
     * Calculate status distribution
     */
    calculateStatusDistribution() {
        const distribution = {};

        this.data.requests.forEach(req => {
            const status = req.fields['Derived Status'] || 'Unknown';
            distribution[status] = (distribution[status] || 0) + 1;
        });

        return Object.entries(distribution)
            .map(([status, count]) => ({
                status,
                count,
                percentage: (count / this.data.requests.length * 100).toFixed(1)
            }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Calculate workflow popularity
     */
    calculateWorkflowPopularity() {
        const popularity = {};

        this.data.requests.forEach(req => {
            const workflow = req.fields['Workflow'] || 'Unknown';
            popularity[workflow] = (popularity[workflow] || 0) + 1;
        });

        return Object.entries(popularity)
            .map(([workflow, count]) => ({ workflow, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10
    }

    /**
     * Calculate completion rate
     */
    calculateCompletionRate() {
        const total = this.data.requests.length;
        const completed = this.data.requests.filter(req => 
            req.fields['Derived Status'] === 'Complete'
        ).length;

        return {
            total,
            completed,
            percentage: total > 0 ? (completed / total * 100).toFixed(1) : 0
        };
    }

    /**
     * Calculate average processing time
     */
    calculateAverageProcessingTime() {
        const completedRequests = this.data.requests.filter(req => 
            req.fields['Derived Status'] === 'Complete' &&
            req.fields['Created At'] &&
            req.fields['Last Modified']
        );

        if (completedRequests.length === 0) {
            return { average: 0, count: 0 };
        }

        const totalTime = completedRequests.reduce((sum, req) => {
            const created = new Date(req.fields['Created At']);
            const modified = new Date(req.fields['Last Modified']);
            return sum + (modified - created);
        }, 0);

        const averageMs = totalTime / completedRequests.length;
        const averageHours = (averageMs / (1000 * 60 * 60)).toFixed(1);

        return {
            average: averageHours,
            count: completedRequests.length
        };
    }

    /**
     * Calculate entity usage
     */
    calculateEntityUsage() {
        const usage = {};

        this.data.requests.forEach(req => {
            const entity = req.fields['Entity'] || 'Unknown';
            usage[entity] = (usage[entity] || 0) + 1;
        });

        return Object.entries(usage)
            .map(([entity, count]) => ({ entity, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Calculate persona usage
     */
    calculatePersonaUsage() {
        const usage = {};

        this.data.requests.forEach(req => {
            const persona = req.fields['Persona'] || 'Unknown';
            usage[persona] = (usage[persona] || 0) + 1;
        });

        return Object.entries(usage)
            .map(([persona, count]) => ({ persona, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Generate dashboard HTML
     */
    generateDashboardHTML() {
        const completionRate = this.calculateCompletionRate();
        const avgProcessingTime = this.calculateAverageProcessingTime();
        const statusDist = this.calculateStatusDistribution();
        const workflowPop = this.calculateWorkflowPopularity();
        const entityUsage = this.calculateEntityUsage();

        let html = '<div class="analytics-dashboard">';

        // Header
        html += '<h2>📊 Analytics Dashboard</h2>';
        html += '<p style="color: #666; margin-bottom: 30px;">Real-time insights into system usage and performance</p>';

        // Key metrics cards
        html += '<div class="metrics-grid">';
        html += this.generateMetricCard('Total Requests', this.data.requests.length, '📝');
        html += this.generateMetricCard('Completion Rate', `${completionRate.percentage}%`, '✅');
        html += this.generateMetricCard('Avg Processing Time', `${avgProcessingTime.average}h`, '⏱️');
        html += this.generateMetricCard('Active Workflows', workflowPop.length, '🔄');
        html += '</div>';

        // Status distribution
        html += '<div class="chart-section">';
        html += '<h3>Status Distribution</h3>';
        html += this.generateBarChart(statusDist.map(s => ({
            label: s.status,
            value: s.count,
            percentage: s.percentage
        })), 'status');
        html += '</div>';

        // Workflow popularity
        html += '<div class="chart-section">';
        html += '<h3>Top Workflows</h3>';
        html += this.generateBarChart(workflowPop.map(w => ({
            label: w.workflow,
            value: w.count
        })), 'workflow');
        html += '</div>';

        // Entity usage
        html += '<div class="chart-section">';
        html += '<h3>Entity Usage</h3>';
        html += this.generateBarChart(entityUsage.slice(0, 5).map(e => ({
            label: e.entity,
            value: e.count
        })), 'entity');
        html += '</div>';

        html += '</div>';

        // Add CSS
        html += this.generateCSS();

        return html;
    }

    /**
     * Generate metric card HTML
     */
    generateMetricCard(title, value, icon) {
        return `
            <div class="metric-card">
                <div class="metric-icon">${icon}</div>
                <div class="metric-content">
                    <div class="metric-value">${value}</div>
                    <div class="metric-title">${title}</div>
                </div>
            </div>
        `;
    }

    /**
     * Generate bar chart HTML (CSS-based)
     */
    generateBarChart(data, type) {
        if (data.length === 0) {
            return '<p style="color: #999;">No data available</p>';
        }

        const maxValue = Math.max(...data.map(d => d.value));
        let html = '<div class="bar-chart">';

        data.forEach(item => {
            const percentage = (item.value / maxValue * 100).toFixed(1);
            const color = this.getBarColor(type, item.label);

            html += `
                <div class="bar-item">
                    <div class="bar-label">${item.label}</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${percentage}%; background: ${color};">
                            <span class="bar-value">${item.value}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Get color for bar based on type and label
     */
    getBarColor(type, label) {
        if (type === 'status') {
            const colors = {
                'Complete': '#28a745',
                'In Progress': '#007bff',
                'Queued': '#ffc107',
                'Error': '#dc3545'
            };
            return colors[label] || '#6c757d';
        }
        return '#007bff';
    }

    /**
     * Generate CSS for dashboard
     */
    generateCSS() {
        return `
            <style>
                .analytics-dashboard {
                    padding: 20px;
                }

                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 40px;
                }

                .metric-card {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }

                .metric-card:nth-child(2) {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }

                .metric-card:nth-child(3) {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                }

                .metric-card:nth-child(4) {
                    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                }

                .metric-icon {
                    font-size: 36px;
                }

                .metric-value {
                    font-size: 32px;
                    font-weight: bold;
                }

                .metric-title {
                    font-size: 14px;
                    opacity: 0.9;
                }

                .chart-section {
                    background: white;
                    padding: 25px;
                    border-radius: 12px;
                    margin-bottom: 30px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .chart-section h3 {
                    margin: 0 0 20px 0;
                    color: #333;
                }

                .bar-chart {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .bar-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .bar-label {
                    min-width: 150px;
                    font-size: 14px;
                    color: #666;
                }

                .bar-container {
                    flex: 1;
                    background: #f0f0f0;
                    border-radius: 8px;
                    overflow: hidden;
                    height: 32px;
                }

                .bar-fill {
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding-right: 10px;
                    transition: width 0.3s ease;
                }

                .bar-value {
                    color: white;
                    font-weight: bold;
                    font-size: 12px;
                }
            </style>
        `;
    }

    /**
     * Render dashboard to container
     */
    async render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[Analytics] Container not found:', containerId);
            return;
        }

        try {
            // Show loading
            container.innerHTML = '<div class="loading-spinner"></div><p>Loading analytics...</p>';

            // Fetch data
            await this.fetchData();

            // Generate and render HTML
            container.innerHTML = this.generateDashboardHTML();

            console.log('[Analytics] Dashboard rendered');
        } catch (error) {
            console.error('[Analytics] Failed to render dashboard:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <h3>⚠️ Failed to Load Analytics</h3>
                    <p>${error.message}</p>
                    <button onclick="window.analyticsDashboard.render('${containerId}')">Retry</button>
                </div>
            `;
        }
    }
}

// Initialize global analytics dashboard
window.analyticsDashboard = new AnalyticsDashboard();

// Helper function to show analytics
async function showAnalytics() {
    const container = document.getElementById('content');
    if (container) {
        await window.analyticsDashboard.render('content');
    }
}

// Expose globally
window.showAnalytics = showAnalytics;

console.log('[Analytics] Module loaded. Use showAnalytics() to display dashboard.');

