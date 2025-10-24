/**
 * Workflow Diagram - Visual flowchart of request progress
 * Renders lane events as interactive SVG diagram
 */

class WorkflowDiagram {
    constructor() {
        this.width = 800;
        this.height = 400;
        this.nodeWidth = 120;
        this.nodeHeight = 60;
        this.nodeSpacing = 40;
    }

    /**
     * Parse lane events from request data
     */
    parseLaneEvents(request) {
        const laneEventsRaw = request.fields['Lane Events'] || '';
        if (!laneEventsRaw) {
            return [];
        }

        // Parse JSON array of lane events
        try {
            const events = JSON.parse(laneEventsRaw);
            return events.map((event, index) => ({
                index,
                lane: event.lane || 'Unknown',
                timestamp: event.timestamp || new Date().toISOString(),
                type: event.type || 'lane_start',
                details: event.details || {}
            }));
        } catch (error) {
            console.error('[WorkflowDiagram] Failed to parse lane events:', error);
            return [];
        }
    }

    /**
     * Get current lane from events
     */
    getCurrentLane(events) {
        if (events.length === 0) return null;
        
        // Find the last lane_start event
        for (let i = events.length - 1; i >= 0; i--) {
            if (events[i].type === 'lane_start') {
                return events[i].lane;
            }
        }
        
        return events[events.length - 1].lane;
    }

    /**
     * Generate SVG diagram
     */
    generateSVG(request) {
        const events = this.parseLaneEvents(request);
        if (events.length === 0) {
            return '<p style="color: #999; text-align: center; padding: 40px;">No workflow data available</p>';
        }

        const currentLane = this.getCurrentLane(events);
        const uniqueLanes = [...new Set(events.map(e => e.lane))];
        
        // Calculate SVG dimensions
        const totalWidth = uniqueLanes.length * (this.nodeWidth + this.nodeSpacing);
        const svgWidth = Math.max(this.width, totalWidth);

        let svg = `<svg width="${svgWidth}" height="${this.height}" style="background: #f8f9fa; border-radius: 8px;">`;

        // Draw connections first (so they appear behind nodes)
        for (let i = 0; i < uniqueLanes.length - 1; i++) {
            const x1 = this.nodeSpacing + i * (this.nodeWidth + this.nodeSpacing) + this.nodeWidth;
            const x2 = this.nodeSpacing + (i + 1) * (this.nodeWidth + this.nodeSpacing);
            const y = this.height / 2;

            svg += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#ddd" stroke-width="2" />`;
            svg += `<polygon points="${x2 - 10},${y - 5} ${x2},${y} ${x2 - 10},${y + 5}" fill="#ddd" />`;
        }

        // Draw nodes
        uniqueLanes.forEach((lane, index) => {
            const x = this.nodeSpacing + index * (this.nodeWidth + this.nodeSpacing);
            const y = this.height / 2 - this.nodeHeight / 2;
            const isCurrent = lane === currentLane;
            const isCompleted = index < uniqueLanes.indexOf(currentLane);

            // Node background
            const bgColor = isCurrent ? '#007bff' : (isCompleted ? '#28a745' : '#e9ecef');
            const textColor = isCurrent || isCompleted ? 'white' : '#333';

            svg += `<rect x="${x}" y="${y}" width="${this.nodeWidth}" height="${this.nodeHeight}" 
                    fill="${bgColor}" stroke="${isCurrent ? '#0056b3' : '#ddd'}" stroke-width="2" 
                    rx="8" class="workflow-node" data-lane="${lane}" />`;

            // Node text
            const textX = x + this.nodeWidth / 2;
            const textY = y + this.nodeHeight / 2 + 5;
            const truncatedLane = lane.length > 15 ? lane.substring(0, 12) + '...' : lane;

            svg += `<text x="${textX}" y="${textY}" fill="${textColor}" text-anchor="middle" 
                    font-size="12" font-weight="bold">${truncatedLane}</text>`;

            // Current indicator
            if (isCurrent) {
                svg += `<circle cx="${textX}" cy="${y - 15}" r="5" fill="#ffc107" />`;
            }

            // Checkmark for completed
            if (isCompleted) {
                svg += `<text x="${textX}" y="${y - 10}" fill="white" text-anchor="middle" font-size="16">✓</text>`;
            }
        });

        svg += '</svg>';

        return svg;
    }

    /**
     * Generate timeline HTML
     */
    generateTimeline(request) {
        const events = this.parseLaneEvents(request);
        if (events.length === 0) {
            return '';
        }

        let html = '<div class="workflow-timeline">';
        html += '<h4 style="margin: 20px 0 10px 0;">Timeline</h4>';

        events.forEach((event, index) => {
            const date = new Date(event.timestamp);
            const formattedDate = date.toLocaleString();
            const icon = event.type === 'lane_start' ? '▶️' : '⏸️';

            html += `
                <div class="timeline-event">
                    <div class="timeline-icon">${icon}</div>
                    <div class="timeline-content">
                        <div class="timeline-lane">${event.lane}</div>
                        <div class="timeline-time">${formattedDate}</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    /**
     * Generate complete diagram HTML
     */
    generateHTML(request) {
        let html = '<div class="workflow-diagram-container">';
        html += '<h3>Workflow Progress</h3>';
        html += '<div class="diagram-wrapper">';
        html += this.generateSVG(request);
        html += '</div>';
        html += this.generateTimeline(request);
        html += '</div>';
        html += this.generateCSS();
        return html;
    }

    /**
     * Generate CSS for diagram
     */
    generateCSS() {
        return `
            <style>
                .workflow-diagram-container {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    margin: 20px 0;
                }

                .workflow-diagram-container h3 {
                    margin: 0 0 20px 0;
                    color: #333;
                }

                .diagram-wrapper {
                    overflow-x: auto;
                    margin-bottom: 20px;
                }

                .workflow-node {
                    cursor: pointer;
                    transition: opacity 0.2s;
                }

                .workflow-node:hover {
                    opacity: 0.8;
                }

                .workflow-timeline {
                    border-top: 2px solid #e9ecef;
                    padding-top: 20px;
                }

                .timeline-event {
                    display: flex;
                    gap: 15px;
                    padding: 10px;
                    border-left: 3px solid #007bff;
                    margin-left: 10px;
                    margin-bottom: 10px;
                }

                .timeline-icon {
                    font-size: 20px;
                }

                .timeline-lane {
                    font-weight: bold;
                    color: #333;
                }

                .timeline-time {
                    font-size: 12px;
                    color: #666;
                }
            </style>
        `;
    }

    /**
     * Render diagram to element
     */
    render(elementId, request) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error('[WorkflowDiagram] Element not found:', elementId);
            return;
        }

        element.innerHTML = this.generateHTML(request);
        console.log('[WorkflowDiagram] Diagram rendered');
    }
}

// Initialize global workflow diagram
window.workflowDiagram = new WorkflowDiagram();

// Helper function to show diagram in modal
function showWorkflowDiagram(request) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        max-width: 900px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        padding: 30px;
        position: relative;
    `;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 32px;
        cursor: pointer;
        color: #999;
    `;
    closeBtn.onclick = () => modal.remove();

    // Request info
    const requestInfo = document.createElement('div');
    requestInfo.innerHTML = `
        <h2 style="margin: 0 0 10px 0;">${request.fields['Request Name'] || 'Unnamed Request'}</h2>
        <p style="color: #666; margin: 0 0 20px 0;">
            Status: <strong>${request.fields['Derived Status'] || 'Unknown'}</strong> | 
            Workflow: <strong>${request.fields['Workflow'] || 'Unknown'}</strong>
        </p>
    `;

    // Diagram
    const diagramContainer = document.createElement('div');
    diagramContainer.id = 'modal-workflow-diagram';

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(requestInfo);
    modalContent.appendChild(diagramContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Render diagram
    window.workflowDiagram.render('modal-workflow-diagram', request);

    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// Expose globally
window.showWorkflowDiagram = showWorkflowDiagram;

console.log('[WorkflowDiagram] Module loaded. Use showWorkflowDiagram(request) to display diagram.');

