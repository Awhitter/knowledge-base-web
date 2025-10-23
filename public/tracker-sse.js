/**
 * SSE Client for Real-Time Lane Progress Tracking
 * 
 * This module handles the EventSource connection to the SSE endpoint
 * and updates the UI with real-time lane execution events.
 */

let eventSource = null;
let currentRecordId = null;
let startTime = null;
let stats = {
    lanesStarted: 0,
    lanesCompleted: 0,
    lanesErrors: 0
};

/**
 * Start tracking a specific request in real-time
 */
function startLiveTracking(recordId) {
    // Close any existing connection
    if (eventSource) {
        eventSource.close();
    }
    
    currentRecordId = recordId;
    startTime = Date.now();
    
    // Reset stats
    stats = {
        lanesStarted: 0,
        lanesCompleted: 0,
        lanesErrors: 0
    };
    
    // Show the live monitor
    document.getElementById('liveProgressMonitor').style.display = 'block';
    document.getElementById('monitorRecordId').textContent = recordId;
    document.getElementById('monitorConnectionStatus').textContent = 'Connecting...';
    document.getElementById('monitorConnectionStatus').style.color = '#ffc107';
    
    // Clear previous events
    document.getElementById('laneEvents').innerHTML = '<p style="color: #999; text-align: center;">Waiting for events...</p>';
    
    // Update stats display
    updateStatsDisplay();
    
    // Create EventSource connection
    eventSource = new EventSource(`/api/events/${recordId}`);
    
    // Handle connection open
    eventSource.addEventListener('open', () => {
        console.log('[SSE] Connection opened for record:', recordId);
        document.getElementById('monitorConnectionStatus').textContent = 'Connected';
        document.getElementById('monitorConnectionStatus').style.color = '#28a745';
    });
    
    // Handle incoming messages
    eventSource.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            handleSSEEvent(data);
        } catch (error) {
            console.error('[SSE] Error parsing event data:', error);
        }
    });
    
    // Handle errors
    eventSource.addEventListener('error', (error) => {
        console.error('[SSE] Connection error:', error);
        document.getElementById('monitorConnectionStatus').textContent = 'Connection Error';
        document.getElementById('monitorConnectionStatus').style.color = '#dc3545';
        
        // Try to reconnect after 5 seconds
        setTimeout(() => {
            if (currentRecordId) {
                console.log('[SSE] Attempting to reconnect...');
                startLiveTracking(currentRecordId);
            }
        }, 5000);
    });
    
    // Start elapsed time counter
    startElapsedTimeCounter();
}

/**
 * Handle different types of SSE events
 */
function handleSSEEvent(event) {
    console.log('[SSE] Received event:', event);
    
    const eventsContainer = document.getElementById('laneEvents');
    
    // Remove "waiting for events" message if present
    if (eventsContainer.querySelector('p')) {
        eventsContainer.innerHTML = '';
    }
    
    // Create event element
    const eventElement = document.createElement('div');
    eventElement.className = `lane-event ${event.type}`;
    
    const time = new Date(event.timestamp).toLocaleTimeString();
    
    let eventHTML = `
        <div class="lane-event-time">${time}</div>
        <div class="lane-event-message">${event.message}</div>
    `;
    
    // Add type-specific details
    switch (event.type) {
        case 'connected':
            eventHTML += `<div class="lane-event-details">Ready to receive updates</div>`;
            break;
            
        case 'lane_start':
            stats.lanesStarted++;
            eventHTML += `
                <div class="lane-event-details">
                    <strong>Lane:</strong> ${event.lane}<br>
                    <strong>Prompt:</strong> ${event.prompt || 'N/A'}
                </div>
            `;
            break;
            
        case 'lane_finish':
            stats.lanesCompleted++;
            eventHTML += `
                <div class="lane-event-details">
                    <strong>Lane:</strong> ${event.lane}<br>
                    ${event.output_preview ? `<strong>Output Preview:</strong> ${event.output_preview}...<br>` : ''}
                    ${event.eval && event.eval.score ? `<strong>Quality Score:</strong> ${event.eval.score}/10<br>` : ''}
                </div>
            `;
            break;
            
        case 'lane_error':
            stats.lanesErrors++;
            eventHTML += `
                <div class="lane-event-details">
                    <strong>Lane:</strong> ${event.lane}<br>
                    <strong>Error:</strong> ${event.error}
                </div>
            `;
            break;
            
        case 'publish':
            eventHTML += `
                <div class="lane-event-details">
                    <strong>Content Type:</strong> ${event.content_type}<br>
                    <strong>Output ID:</strong> ${event.output_id}
                </div>
            `;
            break;
            
        case 'done':
            eventHTML += `
                <div class="lane-event-details">
                    ✅ Workflow execution complete!<br>
                    ${event.summary ? JSON.stringify(event.summary, null, 2) : ''}
                </div>
            `;
            // Auto-close after 10 seconds
            setTimeout(() => {
                if (confirm('Workflow complete! Close live monitor?')) {
                    closeLiveMonitor();
                }
            }, 10000);
            break;
            
        case 'progress':
            eventHTML += `
                <div class="lane-event-details">
                    ${event.data ? JSON.stringify(event.data, null, 2) : ''}
                </div>
            `;
            break;
    }
    
    eventElement.innerHTML = eventHTML;
    
    // Add to top of events list (most recent first)
    eventsContainer.insertBefore(eventElement, eventsContainer.firstChild);
    
    // Update stats
    updateStatsDisplay();
}

/**
 * Update the stats display
 */
function updateStatsDisplay() {
    document.getElementById('statLanesStarted').textContent = stats.lanesStarted;
    document.getElementById('statLanesCompleted').textContent = stats.lanesCompleted;
    document.getElementById('statLanesErrors').textContent = stats.lanesErrors;
}

/**
 * Start the elapsed time counter
 */
function startElapsedTimeCounter() {
    const interval = setInterval(() => {
        if (!currentRecordId) {
            clearInterval(interval);
            return;
        }
        
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        document.getElementById('statElapsedTime').textContent = 
            minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    }, 1000);
}

/**
 * Close the live monitor and disconnect SSE
 */
function closeLiveMonitor() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    
    currentRecordId = null;
    document.getElementById('liveProgressMonitor').style.display = 'none';
    document.getElementById('monitorConnectionStatus').textContent = 'Disconnected';
    document.getElementById('monitorConnectionStatus').style.color = '#999';
}

/**
 * View request details (called from table)
 */
async function viewRequest(recordId) {
    try {
        const response = await fetch(`/api/requests/status/${recordId}`);
        const data = await response.json();
        
        let output = 'Not available yet.';
        if (data.outputLink) {
            output = `<a href="${data.outputLink}" target="_blank">View Final Output</a>`;
        }

        const details = `
--- Request Details ---
Record ID: ${data.recordId}
Status: ${data.status}
Current Step: ${data.currentStep || 'N/A'}
Progress: ${data.progress || 'N/A'}
Output: ${output}

Would you like to start live tracking for this request?
        `;
        
        if (confirm(details)) {
            startLiveTracking(recordId);
        }
    } catch (error) {
        alert(`Could not fetch details for request ${recordId}. Error: ${error.message}`);
    }
}

// Export functions for use in main script
window.startLiveTracking = startLiveTracking;
window.closeLiveMonitor = closeLiveMonitor;
window.viewRequest = viewRequest;

