const express = require('express');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Import Context Assembly Service
const { initialize: initializeContextAssembly, assembleUnifiedContext } = require('./services/context-assembly');

// Import SSE Events Service
const sseEvents = require('./services/sse-events');

// Import Schema Service
const SchemaService = require('./services/schema-service');

// Initialize Airtable Client
const Airtable = require('airtable');
const airtable = process.env.AIRTABLE_API_KEY ? new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }) : null;

// ============================================================
// ENVIRONMENT-DRIVEN CONFIGURATION
// ============================================================
// All IDs loaded from environment variables (see .env.example)
// Server will fail fast on startup if required vars are missing

// Base IDs
const BASE_AUTOMATION_MASTERY = process.env.AIRTABLE_BASE_ID_AUTOMATION || process.env.AIRTABLE_BASE_ID || 'appe6CB5XnPgGVQHw';
const BASE_CONTENT_HUB = process.env.AIRTABLE_BASE_ID_CONTENT || process.env.AIRTABLE_TERTIARY_BASE_ID || 'appQ4aluTCMQbVpaQ';
const BASE_REFERENCE_LIBRARY = process.env.AIRTABLE_BASE_ID_REFERENCE || process.env.AIRTABLE_SECONDARY_BASE_ID || 'apppcjitC32W0rAMb';

// Table IDs - All loaded from environment variables
const TABLES = {
    // Automation Mastery Base - Core orchestration tables
    INITIATOR: process.env.AIRTABLE_TABLE_INITIATOR || 'tblBCiyCEEFJCJ1nO',
    OUTPUTS: process.env.AIRTABLE_TABLE_OUTPUTS || 'tblYhaVCh9DMO9Mt8',
    WORKFLOWS: process.env.AIRTABLE_TABLE_WORKFLOWS || 'tblwCDWd0pm7f3OK2',
    
    // Configuration tables
    ENTITIES: process.env.AIRTABLE_TABLE_ENTITIES || 'tbl9q3pHR5qtALyzm',
    PROMPTS: process.env.AIRTABLE_TABLE_PROMPTS || 'tblvgWQST4Z0P88np',
    PERSONA: process.env.AIRTABLE_TABLE_PERSONA || 'tblbtN4oFHF4Q8e30',
    CONTENT_TYPES: process.env.AIRTABLE_TABLE_CONTENT_TYPES || 'tbl1ywo3FVRw8skix',
    SEO_DATA: process.env.AIRTABLE_TABLE_SEO_DATA || 'tblaGirYbZB1Uj1iO',
    
    // Synced tables from other bases
    REFERENCES: process.env.AIRTABLE_TABLE_REFERENCES_SYNC || 'tblXfxCDOO4AGabsA',
    IDEAS_PLANS: process.env.AIRTABLE_TABLE_IDEAS_PLANS_SYNC || 'tblM5dc4nOO7A354P',
    CONTENT_HUB_SYNC: process.env.AIRTABLE_TABLE_CONTENT_HUB_SYNC || 'tblA0i05AefC1aPAh',
    DOCUMENTATION: process.env.AIRTABLE_TABLE_DOCUMENTATION_SYNC || 'tbl6ye6CD9O2edO2t',
    ARTICLES_SYNC: process.env.AIRTABLE_TABLE_ARTICLES_SYNC || 'tblldKWyq3kppzUoP',
    
    // Content Hub Base - Final published content
    CONTENT_MASTER_INDEX: process.env.AIRTABLE_TABLE_CONTENT_MASTER_INDEX || 'tblDtUblOw04ftTEC',
    ARTICLES: process.env.AIRTABLE_TABLE_ARTICLES || 'tbl5rmBlJtZPXTaqK',
    SOCIAL_MEDIA: process.env.AIRTABLE_TABLE_SOCIAL_MEDIA || 'tblBy3FDefmckuaho',
    NEWSLETTERS: process.env.AIRTABLE_TABLE_NEWSLETTERS || 'tbljQnDqtUThZ3jXv',
    RESEARCH_REPORTS: process.env.AIRTABLE_TABLE_RESEARCH_REPORTS || 'tblyTku0TChhhyE2n',
    
    // Educational content tables
    QBANK: process.env.AIRTABLE_TABLE_QBANK || 'tblPcbkyxX6NRIu8O',
    QBANK_ITEMS: process.env.AIRTABLE_TABLE_QBANK_ITEMS || 'tbl02eKB6iO4jBL8I',
    CONCEPTS: process.env.AIRTABLE_TABLE_CONCEPTS || 'tblGbQEvYqjqHKm3K',
    MNEMONICS: process.env.AIRTABLE_TABLE_MNEMONICS || 'tblrQZlfLgYR9P5PU',
    FLIPCARDS: process.env.AIRTABLE_TABLE_FLIPCARDS || 'tblyef7zmNuy7cWMe',
    
    // Media & interactive tables
    MULTIMEDIA: process.env.AIRTABLE_TABLE_MULTIMEDIA || 'tblbAFtmJKOiDWRfY',
    INTERACTIVE: process.env.AIRTABLE_TABLE_INTERACTIVE || 'tblfuPMhd4u6xA0eH',
    DISCUSSIONS: process.env.AIRTABLE_TABLE_DISCUSSIONS || 'tblHxJYXgVbBgkbBZ',
    SOCIAL_MEDIA_POST_ITEMS: process.env.AIRTABLE_TABLE_SOCIAL_MEDIA_POST_ITEMS || 'tbln6jVWWGuRMb3z5',
    
    // Reference Library Base
    REFERENCE_INDEX: process.env.AIRTABLE_TABLE_REFERENCE_INDEX || 'tblvlkIrIDHZRYfCe',
};

// Make.com webhook URL
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL || 'https://hook.us1.make.com/s5hmufrf4lrbapk8qcqrmd6oio8cnmgf';

// Advanced configuration
const CONFIG = {
    STATUS_TIMEOUT_MINUTES: parseInt(process.env.STATUS_TIMEOUT_MINUTES) || 5,
    SSE_TIMEOUT_SECONDS: parseInt(process.env.SSE_TIMEOUT_SECONDS) || 300,
    POLLING_INTERVAL_SECONDS: parseInt(process.env.POLLING_INTERVAL_SECONDS) || 5,
    ENABLE_SCHEMA_CACHE: process.env.ENABLE_SCHEMA_CACHE !== 'false',
    SCHEMA_CACHE_TTL: parseInt(process.env.SCHEMA_CACHE_TTL) || 3600,
    ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// Validate required environment variables on startup
function validateEnvironment() {
    const required = [
        'AIRTABLE_API_KEY',
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\nPlease check your .env file against .env.example');
        process.exit(1);
    }
    
    console.log('✅ Environment variables validated');
}

validateEnvironment();

// Initialize Context Assembly Service with Airtable base
if (airtable) {
  const automationMasteryBase = airtable.base(BASE_AUTOMATION_MASTERY);
  initializeContextAssembly(automationMasteryBase);
}

// Initialize Schema Service
const schemaService = new SchemaService(process.env.AIRTABLE_API_KEY, {
  cacheTTL: CONFIG.SCHEMA_CACHE_TTL * 1000, // Convert seconds to milliseconds
  enableCache: CONFIG.ENABLE_SCHEMA_CACHE
});

// Pre-fetch schemas for all bases on startup (async, non-blocking)
if (process.env.AIRTABLE_API_KEY) {
  schemaService.fetchMultipleSchemas([
    BASE_AUTOMATION_MASTERY,
    BASE_CONTENT_HUB,
    BASE_REFERENCE_LIBRARY
  ]).then(() => {
    console.log('✅ Schema cache warmed up');
  }).catch(err => {
    console.warn('⚠️  Schema pre-fetch failed (will fetch on demand):', err.message);
  });
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

        // Fetch all tables, but don't fail if individual tables error
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
        ] = await Promise.allSettled([
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.PROMPTS),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.WORKFLOWS),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.ENTITIES),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.TOOLS),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.REFERENCES),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.CONTENT_TYPES),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.SEO_DATA),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.IDEAS_PLANS),
            fetchAllRecords(BASE_AUTOMATION_MASTERY, TABLES.DOCUMENTATION)
        ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));

        console.log(`Fetched: ${prompts.length} prompts, ${workflows.length} workflows, ${entities.length} entities`);

        res.json({
            prompts: prompts || [],
            workflows: workflows || [],
            entities: entities || [],
            tools: tools || [],
            references: references || [],
            contentTypes: contentTypes || [],
            seoData: seoData || [],
            ideasPlans: ideasPlans || [],
            documentation: documentation || []
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
    // SSE doesn't work reliably on Vercel (stateless lambdas)
    if (process.env.VERCEL) {
        return res.status(501).json({ 
            ok: false, 
            message: 'SSE disabled on Vercel deployment. Use polling tracker instead.',
            fallback: `/api/requests/status/${req.params.recordId}`
        });
    }
    
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
    // On Vercel, accept events but don't try to emit via SSE
    if (process.env.VERCEL) {
        return res.json({ 
            ok: true, 
            message: 'Event received (SSE disabled on Vercel). Use polling tracker.' 
        });
    }
    
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

// --- API Endpoint to list all submitted requests (for Tracker) ---
app.get('/api/requests/submitted', async (req, res) => {
    try {
        if (!airtable) {
            return res.json({ items: [] });
        }

        const base = airtable.base(BASE_AUTOMATION_MASTERY);
        const initiatorTable = base(TABLES.INITIATOR);
        
        console.log('Fetching all submitted requests...');
        
        // Fetch records, sorted by creation time (newest first)
        const records = await initiatorTable.select({
            pageSize: 50,
            sort: [{ field: 'Created', direction: 'desc' }]
        }).all().catch(() => {
            // Fallback if 'Created' field doesn't exist
            return initiatorTable.select({ pageSize: 50 }).all();
        });

        const items = records.map(record => {
            const fields = record.fields;
            
            // Derive status from progress markers
            const hasFinalOutput = fields['Final Output In Content Hub Record Id'] || 
                                  fields['Final Output Record Id'] ||
                                  fields['Final Output (ID)'];
            const hasOutputs = fields['Outputs Record ID'] || 
                              fields['Output Record ID'] ||
                              fields['Multimedia Record Id'];
            
            let status = 'queued';
            if (hasFinalOutput) {
                status = 'completed';
            } else if (hasOutputs) {
                status = 'processing';
            }
            
            // Get workflow name
            const workflowName = fields['Workflow (WF) Name'] || 
                                fields['Premade AI Workflow'] ||
                                'Unknown Workflow';
            
            return {
                id: record.id,
                name: fields['Descriptive title'] || 
                      fields['Article Title Once We Have It'] ||
                      fields['Initiator id'] ||
                      `Request ${record.id.substring(0, 8)}`,
                workflow: Array.isArray(workflowName) ? workflowName[0] : workflowName,
                status: status,
                createdTime: record.createdTime || record._rawJson?.createdTime,
                goal: fields['Whats Your Goal?'] || fields['Goal'] || '',
                outputRecordId: hasFinalOutput || null
            };
        });

        console.log(`Found ${items.length} submitted requests`);
        res.json({ items });
        
    } catch (error) {
        console.error('Error fetching submitted requests:', error);
        res.status(500).json({ 
            error: 'Failed to fetch requests',
            message: error.message 
        });
    }
});

// --- API Endpoint to fetch published articles from Content Hub base ---
app.get('/api/content-hub/articles', async (req, res) => {
    try {
        if (!airtable) {
            return res.json({ items: [] });
        }

        const contentHubBaseId = BASE_CONTENT_HUB || 'appQ4aluTCMQbVpaQ';
        const base = airtable.base(contentHubBaseId);
        const articlesTable = base(TABLES.ARTICLES);
        
        console.log('Fetching published articles from Content Hub...');
        
        // Fetch published articles
        const records = await articlesTable.select({
            pageSize: 50,
            filterByFormula: "OR({Status} = 'Published', {Status} = 'New AI Draft')",
            sort: [{ field: 'Created Date', direction: 'desc' }]
        }).all().catch(() => {
            // Fallback without filter
            return articlesTable.select({ pageSize: 50 }).all();
        });

        const items = records.map(record => {
            const fields = record.fields;
            
            return {
                id: record.id,
                slug: fields['Slug (string)'] || fields['Slug'] || '',
                title: fields['Title (string)'] || fields['Title'] || 'Untitled',
                subtitle: fields['Subtitle (string)'] || fields['Subtitle'] || '',
                status: fields['Status'] || 'Draft',
                articleType: fields['Article Type'] || 'General',
                brand: fields['Brand (single select option)'] || fields['Brand'] || '',
                cardText: fields['Card Text'] || fields['Short Card Text'] || '',
                cardImage: fields['Card Image'] ? fields['Card Image'][0]?.url : null,
                createdDate: fields['Created Date'] || record.createdTime,
                publishDate: fields['Publish Date'] || null,
                readTime: fields['Read Time'] || '',
                initiatorRecordId: fields['Initiator record id'] || null
            };
        });

        console.log(`Found ${items.length} published articles`);
        res.json({ items });
        
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({ 
            error: 'Failed to fetch articles',
            message: error.message 
        });
    }
});

// --- API Endpoint to fetch single article details ---
app.get('/api/content-hub/article/:id', async (req, res) => {
    try {
        if (!airtable) {
            return res.status(404).json({ error: 'Article not found' });
        }

        const contentHubBaseId = BASE_CONTENT_HUB || 'appQ4aluTCMQbVpaQ';
        const base = airtable.base(contentHubBaseId);
        const articlesTable = base(TABLES.ARTICLES);
        
        console.log(`Fetching article: ${req.params.id}`);
        
        const record = await articlesTable.find(req.params.id);
        const fields = record.fields;
        
        const article = {
            id: record.id,
            slug: fields['Slug (string)'] || fields['Slug'] || '',
            title: fields['Title (string)'] || fields['Title'] || 'Untitled',
            subtitle: fields['Subtitle (string)'] || fields['Subtitle'] || '',
            status: fields['Status'] || 'Draft',
            articleType: fields['Article Type'] || 'General',
            brand: fields['Brand (single select option)'] || fields['Brand'] || '',
            author: fields['Author (string)'] || fields['Author'] || '',
            tags: fields['Tags'] || '',
            cardText: fields['Card Text'] || '',
            shortCardText: fields['Short Card Text'] || '',
            cardImage: fields['Card Image'] ? fields['Card Image'][0]?.url : null,
            introImage: fields['Intro Image'] ? fields['Intro Image'][0]?.url : null,
            introContent: fields['Intro Content'] || '',
            bodyContent1: fields['Body Content 1'] || '',
            bodyContent2: fields['Body Content 2'] || '',
            bodyContent3: fields['Body Content 3'] || '',
            bodyImage1: fields['Body Image 1'] ? fields['Body Image 1'][0]?.url : null,
            bodyImage2: fields['Body Image 2 '] ? fields['Body Image 2 '][0]?.url : null,
            bodyImage3: fields['Body Image 3'] ? fields['Body Image 3'][0]?.url : null,
            conclusion: fields['Conclusion & Key Takeaways'] || '',
            citations: fields['Citations We Used'] || '',
            externalLinks: fields['External links the user might find helpful'] || '',
            aiFormattedDraft: fields['AI Formatted Draft'] || '',
            aiHumanReadableDraft: fields['AI Human Readable Draft'] || '',
            faq: fields['FAQ'] || '',
            createdDate: fields['Created Date'] || record.createdTime,
            publishDate: fields['Publish Date'] || null,
            readTime: fields['Read Time'] || '',
            initiatorRecordId: fields['Initiator record id'] || null
        };

        res.json(article);
        
    } catch (error) {
        console.error('Error fetching article:', error);
        res.status(404).json({ 
            error: 'Article not found',
            message: error.message 
        });
    }
});

// ============================================================
// META API ENDPOINTS - Schema Introspection & Documentation
// ============================================================

// Get schema for all bases
app.get('/api/meta/schema', async (req, res) => {
    try {
        const schemas = await schemaService.fetchMultipleSchemas([
            BASE_AUTOMATION_MASTERY,
            BASE_CONTENT_HUB,
            BASE_REFERENCE_LIBRARY
        ]);
        
        res.json({
            success: true,
            schemas,
            cacheStats: schemaService.getCacheStats()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get schema for a specific base
app.get('/api/meta/schema/:baseId', async (req, res) => {
    try {
        const { baseId } = req.params;
        const schema = await schemaService.fetchBaseSchema(baseId);
        
        res.json({
            success: true,
            schema
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get schema for a specific table
app.get('/api/meta/schema/:baseId/:tableName', async (req, res) => {
    try {
        const { baseId, tableName } = req.params;
        const tableSchema = await schemaService.getTableSchema(baseId, tableName);
        
        if (!tableSchema) {
            return res.status(404).json({
                success: false,
                error: `Table "${tableName}" not found in base ${baseId}`
            });
        }
        
        res.json({
            success: true,
            table: tableSchema
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get field map for a table (for tolerant field matching)
app.get('/api/meta/fieldmap/:baseId/:tableName', async (req, res) => {
    try {
        const { baseId, tableName } = req.params;
        const fieldMap = await schemaService.generateFieldMap(baseId, tableName);
        
        if (!fieldMap) {
            return res.status(404).json({
                success: false,
                error: `Table "${tableName}" not found in base ${baseId}`
            });
        }
        
        res.json({
            success: true,
            fieldMap
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Clear schema cache
app.post('/api/meta/cache/clear', (req, res) => {
    const { baseId } = req.body;
    schemaService.clearCache(baseId);
    
    res.json({
        success: true,
        message: baseId ? `Cache cleared for ${baseId}` : 'All caches cleared'
    });
});

// Get cache statistics
app.get('/api/meta/cache/stats', (req, res) => {
    const stats = schemaService.getCacheStats();
    
    res.json({
        success: true,
        stats
    });
});

// Get system configuration (non-sensitive values only)
app.get('/api/meta/config', (req, res) => {
    res.json({
        success: true,
        config: {
            statusTimeoutMinutes: CONFIG.STATUS_TIMEOUT_MINUTES,
            sseTimeoutSeconds: CONFIG.SSE_TIMEOUT_SECONDS,
            pollingIntervalSeconds: CONFIG.POLLING_INTERVAL_SECONDS,
            enableSchemaCache: CONFIG.ENABLE_SCHEMA_CACHE,
            schemaCacheTTL: CONFIG.SCHEMA_CACHE_TTL,
            logLevel: CONFIG.LOG_LEVEL
        },
        bases: {
            automation: BASE_AUTOMATION_MASTERY,
            contentHub: BASE_CONTENT_HUB,
            referenceLibrary: BASE_REFERENCE_LIBRARY
        },
        tables: Object.keys(TABLES).length
    });
});

// --- Health Check Endpoint ---
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

// On Vercel, export the app as a handler (no listening!)
if (process.env.VERCEL) {
  module.exports = app;
} else {
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
}

