/**
 * SSE Event Service
 * 
 * Server-Sent Events for real-time lane progress tracking.
 * 
 * Events:
 * - lane_start: Lane execution begins
 * - lane_finish: Lane execution completes
 * - lane_error: Lane execution fails
 * - publish: Output published to Content Hub
 * - done: Entire workflow complete
 */

// Store active SSE connections by recordId
const connections = new Map();

/**
 * Register a new SSE connection
 */
function registerConnection(recordId, res) {
  if (!connections.has(recordId)) {
    connections.set(recordId, []);
  }
  connections.get(recordId).push(res);
  
  console.log(`[SSE] Client connected for record ${recordId} (${connections.get(recordId).length} total)`);
  
  // Send initial connection event
  sendEvent(recordId, {
    type: 'connected',
    timestamp: new Date().toISOString(),
    message: 'Connected to event stream'
  });
  
  // Clean up on disconnect
  res.on('close', () => {
    const clients = connections.get(recordId);
    if (clients) {
      const index = clients.indexOf(res);
      if (index > -1) {
        clients.splice(index, 1);
      }
      if (clients.length === 0) {
        connections.delete(recordId);
      }
    }
    console.log(`[SSE] Client disconnected for record ${recordId}`);
  });
}

/**
 * Send an event to all clients listening to a recordId
 */
function sendEvent(recordId, event) {
  const clients = connections.get(recordId);
  if (!clients || clients.length === 0) {
    console.log(`[SSE] No clients for record ${recordId}, event queued`);
    return;
  }
  
  const data = JSON.stringify(event);
  const message = `data: ${data}\n\n`;
  
  clients.forEach(res => {
    try {
      res.write(message);
    } catch (error) {
      console.error(`[SSE] Error sending event:`, error);
    }
  });
  
  console.log(`[SSE] Sent ${event.type} event to ${clients.length} client(s) for record ${recordId}`);
}

/**
 * Emit lane_start event
 */
function emitLaneStart(recordId, lane, promptName) {
  sendEvent(recordId, {
    type: 'lane_start',
    timestamp: new Date().toISOString(),
    lane,
    prompt: promptName,
    message: `Starting lane ${lane}`
  });
}

/**
 * Emit lane_finish event
 */
function emitLaneFinish(recordId, lane, output, eval_score = null) {
  sendEvent(recordId, {
    type: 'lane_finish',
    timestamp: new Date().toISOString(),
    lane,
    output_preview: output ? output.substring(0, 200) : '',
    eval: eval_score ? { score: eval_score } : null,
    message: `Completed lane ${lane}`
  });
}

/**
 * Emit lane_error event
 */
function emitLaneError(recordId, lane, error) {
  sendEvent(recordId, {
    type: 'lane_error',
    timestamp: new Date().toISOString(),
    lane,
    error: error.message || String(error),
    message: `Error in lane ${lane}`
  });
}

/**
 * Emit publish event
 */
function emitPublish(recordId, contentType, outputId) {
  sendEvent(recordId, {
    type: 'publish',
    timestamp: new Date().toISOString(),
    content_type: contentType,
    output_id: outputId,
    message: `Published to ${contentType}`
  });
}

/**
 * Emit done event
 */
function emitDone(recordId, summary) {
  sendEvent(recordId, {
    type: 'done',
    timestamp: new Date().toISOString(),
    summary,
    message: 'Workflow complete'
  });
}

/**
 * Emit progress update (generic)
 */
function emitProgress(recordId, message, data = {}) {
  sendEvent(recordId, {
    type: 'progress',
    timestamp: new Date().toISOString(),
    message,
    ...data
  });
}

module.exports = {
  registerConnection,
  sendEvent,
  emitLaneStart,
  emitLaneFinish,
  emitLaneError,
  emitPublish,
  emitDone,
  emitProgress
};

