const express = require('express');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Import Context Assembly Service
const { initialize: initializeContextAssembly, assembleUnifiedContext } = require('./services/context-assembly');

// Import SSE Events Service
const sseEvents = require('./services/sse-events');

// Initialize Airtable Client
const Airtable = require('airtable');
const airtable = process.env.AIRTABLE_API_KEY ? new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }) : null;

// Base IDs (Confirmed from deep analysis)
const BASE_AUTOMATION_MASTERY = process.env.AIRTABLE_BASE_ID || 'appe6CB5XnPgGVQHw';
const BASE_CONTENT_HUB = process.env.AIRTABLE_TERTIARY_BASE_ID || 'appQ4aluTCMQbVpaQ';
const BASE_AUDIENCE_KB = process.env.AIRTABLE_SECONDARY_BASE_ID || 'appnPandXPt8iB4DT';

// Table IDs (Confirmed from deep analysis - airtable_deep_analysis.json)
const TABLES = {
    // Automation Mastery Base
    INITIATOR: 'tblBCiyCEEFJCJ1nO',           // AI Automation Initiator (58 fields)
    WORKFLOWS: 'tblwCDWd0pm7f3OK2',           // Workflow (117 fields)
    PROMPTS: 'tblvgWQST4Z0P88np',             // Prompts (24 fields)
    ENTITIES: 'tbl9q3pHR5qtALyzm',            // Entities (20 fields)
    REFERENCES: 'tblXfxCDOO4AGabsA',          // References (Sync) (19 fields)
    TOOLS: 'tblO5ZEgmxJVI3FIR',               // Tools (Sync) (12 fields)
    CONTENT_TYPES: 'tbl1ywo3FVRw8skix',       // Content Types Table (21 fields)
    SEO_DATA: 'tblaGirYbZB1Uj1iO',            // SEO Data (15 fields)
    IDEAS_PLANS: 'tblM5dc4nOO7A354P',         // Ideas and Plans (sync)
    DOCUMENTATION: 'tblLQJSNMBVFIZVFR',       // Documentation
    
    // Content Hub Base
    ARTICLES: 'tbl5rmBlJtZPXTaqK',            // Articles
    QBANK: 'tbl02eKB6iO4jBL8I',               // Qbank Items
    SOCIAL_MEDIA: 'tblBy3FDefmckuaho',        // Social Media
    NEWSLETTERS: 'tbljQnDqtUThZ3jXv',         // Newsletters
    CONCEPTS: 'tblGbQEvYqjqHKm3K',            // Concepts
    MNEMONICS: 'tblrQZlfLgYR9P5PU',           // Mnemonics
    RESEARCH_REPORTS: 'tblAMKqhZqLwHqKZU',    // Research Reports
    
    // Audience Knowledgebase Base
    AUDIENCE: 'tblEb8YJxwVBC6Vp6',            // Entities (in Audience KB base)
};

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || 'https://hook.us1.make.com/s5hmufrf4lrbapk8qcqrmd6oio8cnmgf';

// Initialize Context Assembly Service with Airtable base
if (airtable) {
  const automationMasteryBase = airtable.base(BASE_AUTOMATION_MASTERY);
  initializeContextAssembly(automationMasteryBase);
}

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Helper function to fetch all records from a table ---
async function fetchAllRecords(baseId, tableId, viewName = null) {
    if (!airtable) return [];
    
    return new Promise((resolve, reject) => {
        const records = [];
        const selectOptions = viewName ? { view: viewName } : {};
        airtable.base(baseId)(tableId).select(selectOptions).eachPage(function page(pageRecords, fetchNextPage) {
            pageRecords.forEach(record => {
                records.push(record._rawJson);
            });
            fetchNextPage();
        }, function done(err) {
            if (err) {
                console.error(`Airtable fetch error for table ${tableId}:`, err);
                return reject(err);
            }
            resolve(records);
        });
    });
}

// --- Helper function to fetch table schema from Meta API ---
async function fetchTableSchema(baseId, tableId) {
    if (!airtable) return null;
    
    try {
        const response = await axios.get(
            `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
                }
            }
        );
        
        const tables = response.data.tables || [];
        const table = tables.find(t => t.id === tableId);
        return table || null;
    } catch (error) {
        console.error(`Error fetching schema for table ${tableId}:`, error.message);
        return null;
    }
}

// --- Context Assembly Endpoints ---

/**
 * GET /api/context/assemble
 * Assembles the UnifiedContext object for a given Initiator record
 * Query params: recordId (required)
 */
app.get('/api/context/assemble', async (req, res) => {
    try {
        const { recordId } = req.query;
        
        if (!recordId) {
            return res.status(400).json({ error: 'recordId query parameter is required' });
        }
        
        console.log(`[API] Assembling context for record: ${recordId}`);
        const unifiedContext = await assembleUnifiedContext(recordId);
        
        res.json({
            success: true,
            data: unifiedContext
        });
    } catch (error) {
        console.error('[API] Error assembling context:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/context/preview
 * Preview the context that will be assembled for a new request
 * Query params: workflowId, entityId, contentTypeId, goal, audience, brief
 */
app.get('/api/context/preview', async (req, res) => {
    try {
        const { workflowId, entityId, contentTypeId, goal, audience, brief } = req.query;
        
        if (!workflowId || !entityId || !contentTypeId) {
            return res.status(400).json({ 
                error: 'workflowId, entityId, and contentTypeId query parameters are required' 
            });
        }
        
        // Create a temporary Initiator record structure for preview
        const tempInitiator = {
            id: 'preview',
            fields: {
                'Workflow': [workflowId],
                'Entity': [entityId],
                'Content Type': [contentTypeId],
                'Goal': goal || '',
                'Audience': audience || '',
                'Brief': brief || ''
            }
        };
        
        // Fetch the related records to build preview
        const [workflow, entity, contentType] = await Promise.all([
            airtable.base(BASE_AUTOMATION_MASTERY)(TABLES.WORKFLOWS).find(workflowId).catch(() => null),
            airtable.base(BASE_AUTOMATION_MASTERY)(TABLES.ENTITIES).find(entityId).catch(() => null),
            airtable.base(BASE_AUTOMATION_MASTERY)(TABLES.CONTENT_TYPES).find(contentTypeId).catch(() => null)
        ]);
        
        const preview = {
            workflow: workflow ? {
                name: workflow.fields['Name'],
                description: workflow.fields['Description']
            } : null,
            entity: entity ? {
                name: entity.fields['Name'],
                brand_kb_preview: entity.fields['Brand Knowledge Base']?.substring(0, 500) + '...',
                audience_kb_preview: entity.fields['Audience Knowledge Base']?.substring(0, 500) + '...'
            } : null,
            content_type: contentType ? {
                name: contentType.fields['Name'],
                destination_table: contentType.fields['Destination Table']
            } : null,
            user_input: {
                goal: goal || '',
                audience: audience || '',
                brief: brief || ''
            },
            estimated_tokens: estimateTokenCount(entity, goal, audience, brief)
        };
        
        res.json({
            success: true,
            data: preview
        });
    } catch (error) {
        console.error('[API] Error previewing context:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Helper function to estimate token count
 */
function estimateTokenCount(entity, goal, audience, brief) {
    let count = 0;
    
    if (entity) {
        count += (entity.fields['Brand Knowledge Base']?.length || 0) / 4;
        count += (entity.fields['Audience Knowledge Base']?.length || 0) / 4;
    }
    
    count += (goal?.length || 0) / 4;
    count += (audience?.length || 0) / 4;
    count += (brief?.length || 0) / 4;
    
    return Math.round(count);
}

// --- API Endpoint to fetch ALL live data ---
app.get('/api/data/live', async (req, res) => {
    try {
        if (!airtable) {
            return res.status(500).json({ error: "Airtable API not configured." });
        }

        console.log('Fetching all live data from Airtable...');

        const [
            prompts, 
            workflows, 
            entities, 
            tools, 
            references, 
            contentTypes,
            seoData,
            ideasPlans,
            documentation
        ] = await Promise.all([
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.PROMPTS),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.WORKFLOWS),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.ENTITIES),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.TOOLS),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.REFERENCES),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.CONTENT_TYPES),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.SEO_DATA),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.IDEAS_PLANS),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.DOCUMENTATION)
        ]);

        console.log(`Fetched: ${prompts.length} prompts, ${workflows.length} workflows, ${entities.length} entities`);

        res.json({
            prompts,
            workflows,
            entities,
            tools,
            references,
            contentTypes,
            seoData,
            ideasPlans,
            documentation
        });

    } catch (error) {
        console.error('Error fetching all live data:', error);
        res.status(500).json({ error: 'Failed to fetch live data from Airtable.', details: error.message });
    }
});

// --- API Endpoint to fetch Content Hub outputs ---
app.get('/api/content-hub/outputs', async (req, res) => {
    try {
        if (!airtable) {
            return res.status(500).json({ error: "Airtable API not configured." });
        }

        console.log('Fetching Content Hub outputs...');

        const [
            articles,
            qbank,
            socialMedia,
            newsletters,
            concepts,
            mnemonics,
            researchReports
        ] = await Promise.all([
            fetchAllRecords(BASE_CONTENT_HUB, TABLES.ARTICLES),
            fetchAllRecords(BASE_CONTENT_HUB, TABLES.QBANK),
            fetchAllRecords(BASE_CONTENT_HUB, TABLES.SOCIAL_MEDIA),
            fetchAllRecords(BASE_CONTENT_HUB, TABLES.NEWSLETTERS),
            fetchAllRecords(BASE_CONTENT_HUB, TABLES.CONCEPTS),
            fetchAllRecords(BASE_CONTENT_HUB, TABLES.MNEMONICS),
            fetchAllRecords(BASE_CONTENT_HUB, TABLES.RESEARCH_REPORTS)
        ]);

        res.json({
            articles,
            qbank,
            socialMedia,
            newsletters,
            concepts,
            mnemonics,
            researchReports
        });

    } catch (error) {
        console.error('Error fetching Content Hub outputs:', error);
        res.status(500).json({ error: 'Failed to fetch Content Hub data.', details: error.message });
    }
});

// --- API Endpoint to fetch Initiator table schema for dynamic form generation ---
app.get('/api/schema/initiator', async (req, res) => {
    try {
        if (!airtable) {
            return res.status(500).json({ error: "Airtable API not configured." });
        }

        console.log('Fetching Initiator table schema...');

        const schema = await fetchTableSchema(BASE_AUTOMATION_MASTERY, TABLES.INITIATOR);

        if (!schema) {
            return res.status(404).json({ error: 'Initiator table schema not found.' });
        }

        // Filter out read-only fields and system fields
        const editableFields = schema.fields.filter(field => {
            const readOnlyTypes = ['formula', 'rollup', 'count', 'lookup', 'button', 'lastModifiedTime', 'createdTime', 'lastModifiedBy', 'createdBy'];
            return !readOnlyTypes.includes(field.type);
        });

        res.json({
            tableId: schema.id,
            tableName: schema.name,
            description: schema.description,
            fields: editableFields
        });

    } catch (error) {
        console.error('Error fetching Initiator schema:', error);
        res.status(500).json({ error: 'Failed to fetch Initiator schema.', details: error.message });
    }
});

// --- API Endpoint to submit new request (Create record + Trigger Make) ---
app.post('/api/requests/new', async (req, res) => {
    try {
        if (!airtable) {
            return res.status(500).json({ error: "Airtable API not configured." });
        }

        const formData = req.body;

        console.log('Creating new Initiator record with data:', JSON.stringify(formData, null, 2));

        // 1. Create record in AI Automation Initiator table
        const newRecord = await airtable.base(BASE_AUTOMATION_MASTERY)(TABLES.INITIATOR).create([
            { fields: formData }
        ]);

        const recordId = newRecord[0].id;

        console.log(`Created Initiator record: ${recordId}`);

        // 2. Trigger Make.com webhook with the new record ID
        if (MAKE_WEBHOOK_URL) {
            console.log(`Triggering Make.com webhook: ${MAKE_WEBHOOK_URL}`);
            await axios.post(MAKE_WEBHOOK_URL, { recordId }, { timeout: 5000 });
            console.log('Make.com webhook triggered successfully');
        }

        res.json({ success: true, recordId });

    } catch (error) {
        console.error('Error submitting new request:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: 'Failed to submit request to Airtable/Make.com.', 
            details: error.message 
        });
    }
});

// --- API Endpoint to check status of a request (for Tracker) ---
app.get('/api/requests/status/:recordId', async (req, res) => {
    try {
        if (!airtable) {
            return res.status(500).json({ error: "Airtable API not configured." });
        }

        const recordId = req.params.recordId;
        
        console.log(`Fetching status for record: ${recordId}`);

        // Fetch the record from the AI Automation Initiator table
        const record = await airtable.base(BASE_AUTOMATION_MASTERY)(TABLES.INITIATOR).find(recordId);

        // Extract status fields (field names confirmed from deep analysis)
        const status = record.fields['Status'] || record.fields['Workflow Status'] || 'Queued';
        const outputLink = record.fields['Final Output Link'] || record.fields['Output URL'] || null;
        const currentStep = record.fields['Current Step'] || null;
        const progress = record.fields['Progress'] || null;

        res.json({
            recordId,
            status,
            outputLink,
            currentStep,
            progress,
            fields: record.fields // Return all fields for debugging
        });

    } catch (error) {
        console.error('Error fetching request status:', error.message);
        res.status(404).json({ error: 'Record not found or failed to fetch status.', details: error.message });
    }
});

// --- API Endpoint to fetch recent Initiator records for Dashboard ---
app.get('/api/requests/recent', async (req, res) => {
    try {
        if (!airtable) {
            return res.status(500).json({ error: "Airtable API not configured." });
        }

        const limit = parseInt(req.query.limit) || 10;

        console.log(`Fetching ${limit} recent Initiator records...`);

        const records = await new Promise((resolve, reject) => {
            const results = [];
            airtable.base(BASE_AUTOMATION_MASTERY)(TABLES.INITIATOR)
                .select({
                    maxRecords: limit,
                    sort: [{ field: 'Created', direction: 'desc' }]
                })
                .eachPage(
                    function page(pageRecords, fetchNextPage) {
                        pageRecords.forEach(record => results.push(record._rawJson));
                        fetchNextPage();
                    },
                    function done(err) {
                        if (err) return reject(err);
                        resolve(results);
                    }
                );
        });

        res.json({ records });

    } catch (error) {
        console.error('Error fetching recent requests:', error);
        res.status(500).json({ error: 'Failed to fetch recent requests.', details: error.message });
    }
});

// --- SSE Endpoint for Real-Time Lane Progress Tracking ---
app.get('/api/events/:recordId', (req, res) => {
    const { recordId } = req.params;
    
    console.log(`[SSE] Client connecting for record: ${recordId}`);
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Register this connection
    sseEvents.registerConnection(recordId, res);
    
    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000); // Every 30 seconds
    
    // Clean up on disconnect
    req.on('close', () => {
        clearInterval(heartbeat);
        console.log(`[SSE] Connection closed for record: ${recordId}`);
    });
});

// --- Webhook endpoint for Make.com to send lane progress events ---
app.post('/api/events/:recordId/lane', async (req, res) => {
    try {
        const { recordId } = req.params;
        const { event_type, lane, prompt, output, eval_score, error, content_type, output_id, summary } = req.body;
        
        console.log(`[Webhook] Received ${event_type} event for record ${recordId}, lane ${lane}`);
        
        // Emit the appropriate event based on event_type
        switch (event_type) {
            case 'lane_start':
                sseEvents.emitLaneStart(recordId, lane, prompt);
                break;
            case 'lane_finish':
                sseEvents.emitLaneFinish(recordId, lane, output, eval_score);
                break;
            case 'lane_error':
                sseEvents.emitLaneError(recordId, lane, error || 'Unknown error');
                break;
            case 'publish':
                sseEvents.emitPublish(recordId, content_type, output_id);
                break;
            case 'done':
                sseEvents.emitDone(recordId, summary || {});
                break;
            case 'progress':
                sseEvents.emitProgress(recordId, req.body.message || 'Progress update', req.body.data || {});
                break;
            default:
                console.warn(`[Webhook] Unknown event type: ${event_type}`);
        }
        
        res.json({ success: true, message: 'Event emitted' });
    } catch (error) {
        console.error('[Webhook] Error processing lane event:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- Health check endpoint ---
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        airtable: !!airtable,
        makeWebhook: !!MAKE_WEBHOOK_URL,
        timestamp: new Date().toISOString()
    });
});

// --- Fallback to serve index.html for all other routes (SPA routing) ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(process.env.PORT || 3001, () => {
  const serverPort = process.env.PORT || 3001;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📚 Knowledge Base Web Server`);
  console.log(`${'='.repeat(60)}`);
  console.log(`🌐 Running at: http://localhost:${serverPort}`);
  console.log(`📊 Airtable configured: ${!!airtable}`);
  console.log(`🔗 Make.com configured: ${!!MAKE_WEBHOOK_URL}`);
  console.log(`${'='.repeat(60)}\n`);
});

