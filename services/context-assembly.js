/**
 * Context Assembly Service v0.4
 * 
 * Builds the UnifiedContext object by fetching and assembling all required data.
 * 
 * Key improvements in v0.4:
 * - Tolerant field mapping using getField() helper
 * - Better structure with meta and routing sections
 * - Integration with Research_Reports and Audience XML (existing tables)
 * - Idempotency key for lane execution
 */

const Airtable = require('airtable');
const { getField } = require('../utils/getField');
const fieldAliases = require('../utils/field-alias-map.json');

// Base will be injected by the server
let base = null;

// Table IDs (from deep analysis)
const TABLES = {
  INITIATOR: 'tblBCiyCEEFJCJ1nO',
  WORKFLOWS: 'tblwCDWd0pm7f3OK2',
  PROMPTS: 'tblvgWQST4Z0P88np',
  ENTITIES: 'tbl9q3pHR5qtALyzm',
  CONTENT_TYPES: 'tbl1ywo3FVRw8skix',
  REFERENCES: 'tblXfxCDOO4AGabsA',
  TOOLS: 'tblO5ZEgmxJVI3FIR',
  RESEARCH_REPORTS: 'tblAMKqhZqLwHqKZU', // Existing
  AUDIENCE: 'tblEb8YJxwVBC6Vp6' // Existing (in Audience KB base)
};

/**
 * Initialize the Context Assembly Service with an Airtable base instance
 */
function initialize(airtableBase) {
  base = airtableBase;
  console.log('[Context Assembly v0.4] Initialized');
}

/**
 * Assemble the UnifiedContext object (v0.4) for a given Initiator record
 */
async function assembleUnifiedContext(recordId, laneId = null) {
  try {
    console.log(`[Context Assembly] Starting assembly for record: ${recordId}`);
    
    // Step 1: Fetch Initiator record
    const initiator = await fetchInitiatorRecord(recordId);
    console.log(`[Context Assembly] ✅ Fetched Initiator`);
    
    // Step 2: Fetch Workflow using tolerant field mapping
    const workflowIds = getField(initiator.fields, fieldAliases.workflow_link);
    const workflow = await fetchWorkflow(workflowIds);
    console.log(`[Context Assembly] Workflow: ${workflow ? (workflow.fields['Name'] || 'Found') : 'None'}`);
    
    // Step 3: Fetch Entity
    const entityIds = getField(initiator.fields, fieldAliases.entity_link);
    const entity = await fetchEntity(entityIds);
    console.log(`[Context Assembly] Entity: ${entity ? entity.fields['Name'] : 'None'}`);
    
    // Step 4: Fetch Content Type
    const contentTypeIds = getField(initiator.fields, fieldAliases.content_type_link);
    const contentType = await fetchContentType(contentTypeIds);
    console.log(`[Context Assembly] Content Type: ${contentType ? contentType.fields['Name'] : 'None'}`);
    
    // Step 5: Extract active lanes
    const activeLanes = extractActiveLanes(workflow, initiator);
    console.log(`[Context Assembly] Active lanes: ${activeLanes.join(', ')}`);
    
    // Step 6: Build UnifiedContext v0.4
    const unifiedContext = {
      meta: {
        schema: 'unified-context',
        version: '0.4',
        initiator_id: recordId,
        workflow_id: workflow ? workflow.id : null,
        content_type_id: contentType ? contentType.id : null,
        idempotency_key: laneId ? `${recordId}:${laneId}` : recordId,
        timestamp: new Date().toISOString()
      },
      routing: {
        provider: workflow?.fields['AI Platform'] || 'openai',
        model: workflow?.fields['Model'] || 'gpt-4',
        webhook: getField(initiator.fields, ['Make Webhook URL']) || process.env.MAKE_WEBHOOK_URL,
        callbacks: {
          sse_channel: `/api/events/${recordId}`
        }
      },
      app_context: buildAppContext(entity, initiator),
      entity_context: buildEntityContext(entity, initiator),
      audience_context: await buildAudienceContext(initiator, entityIds),
      research: await buildResearchContext(initiator),
      tools: await buildToolsContext(initiator),
      content_type: buildContentTypeContract(contentType),
      lane_plan: activeLanes.map(lane => ({ lane, enabled: true })),
      prior_steps: [], // Will be populated during execution
      rules: extractRules(workflow, contentType),
      user_input: {
        goal: getField(initiator.fields, fieldAliases.goal),
        audience: getField(initiator.fields, fieldAliases.audience),
        tags: initiator.fields['Tags'] || []
      }
    };
    
    console.log(`[Context Assembly] ✅ Assembly complete (v0.4)`);
    return unifiedContext;
    
  } catch (error) {
    console.error(`[Context Assembly] ❌ Error:`, error);
    throw new Error(`Failed to assemble context: ${error.message}`);
  }
}

/**
 * Fetch Initiator record
 */
async function fetchInitiatorRecord(recordId) {
  return await base(TABLES.INITIATOR).find(recordId);
}

/**
 * Fetch Workflow record
 */
async function fetchWorkflow(workflowIds) {
  if (!workflowIds || workflowIds.length === 0) return null;
  const workflowId = Array.isArray(workflowIds) ? workflowIds[0] : workflowIds;
  try {
    return await base(TABLES.WORKFLOWS).find(workflowId);
  } catch (error) {
    console.warn(`[Context Assembly] Could not fetch Workflow: ${error.message}`);
    return null;
  }
}

/**
 * Fetch Entity record
 */
async function fetchEntity(entityIds) {
  if (!entityIds || entityIds.length === 0) return null;
  const entityId = Array.isArray(entityIds) ? entityIds[0] : entityIds;
  try {
    return await base(TABLES.ENTITIES).find(entityId);
  } catch (error) {
    console.warn(`[Context Assembly] Could not fetch Entity: ${error.message}`);
    return null;
  }
}

/**
 * Fetch Content Type record
 */
async function fetchContentType(contentTypeIds) {
  if (!contentTypeIds || contentTypeIds.length === 0) return null;
  const contentTypeId = Array.isArray(contentTypeIds) ? contentTypeIds[0] : contentTypeIds;
  try {
    return await base(TABLES.CONTENT_TYPES).find(contentTypeId);
  } catch (error) {
    console.warn(`[Context Assembly] Could not fetch Content Type: ${error.message}`);
    return null;
  }
}

/**
 * Extract active lanes using tolerant field mapping
 */
function extractActiveLanes(workflow, initiator) {
  if (!workflow) return [];
  
  const activeLanes = [];
  const lanes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const subLanes = ['1.1', '2.1', '3.1', '4.1', '5.1'];
  
  // Check branch toggles using tolerant field mapping
  for (const lane of lanes) {
    const branchEnabled = getField(initiator.fields, fieldAliases.branch_toggles[lane]);
    
    if (branchEnabled) {
      for (const subLane of subLanes) {
        const laneKey = `${lane}${subLane}`;
        const laneFieldName = `WF - ${laneKey}`;
        
        // Check if this lane has a prompt linked
        const laneValue = initiator.fields[laneFieldName] || workflow.fields[laneKey];
        if (laneValue && laneValue.length > 0) {
          activeLanes.push(laneKey);
        }
      }
    }
  }
  
  return activeLanes;
}

/**
 * Build App Context (auto-loaded when app/entity is selected)
 */
function buildAppContext(entity, initiator) {
  if (!entity) return null;
  
  return {
    app_id: entity.fields['App ID'] || entity.id,
    name: entity.fields['Name'] || 'Unknown',
    capabilities: parseJSON(entity.fields['Capabilities (JSON)']) || [],
    docs: parseJSON(entity.fields['Links (JSON)']) || [],
    kb_xml_bundle: getField(initiator.fields, fieldAliases.brand_kb) || ''
  };
}

/**
 * Build Entity Context
 */
function buildEntityContext(entity, initiator) {
  if (!entity) return null;
  
  const brandKB = getField(initiator.fields, fieldAliases.brand_kb);
  const marketingKB = getField(initiator.fields, fieldAliases.marketing_kb);
  
  return {
    entity_id: entity.id,
    name: entity.fields['Name'] || 'Unknown',
    kb_xml: `<kb xmlns:brand="urn:brand" xmlns:marketing="urn:marketing">
  ${brandKB || ''}
  ${marketingKB || ''}
</kb>`,
    tags: entity.fields['Tags'] || []
  };
}

/**
 * Build Audience Context (using existing Audience XML from Airtable)
 */
async function buildAudienceContext(initiator, entityIds) {
  const audienceKB = getField(initiator.fields, fieldAliases.audience_kb);
  
  return {
    kb_xml: audienceKB || '',
    personas: initiator.fields['Personas'] || [],
    priority: initiator.fields['Audience Priority'] || 5
  };
}

/**
 * Build Research Context (using existing Research_Reports table)
 */
async function buildResearchContext(initiator) {
  // TODO: Query Research_Reports table for related research
  // For now, return empty structure
  return {
    cache_refs: [],
    xml_kb: '',
    reports: []
  };
}

/**
 * Build Tools Context
 */
async function buildToolsContext(initiator) {
  const toolIds = getField(initiator.fields, fieldAliases.tools_link) || [];
  if (toolIds.length === 0) return [];
  
  const tools = [];
  for (const toolId of toolIds) {
    try {
      const tool = await base(TABLES.TOOLS).find(toolId);
      tools.push({
        name: tool.fields['Name'] || 'Unknown',
        cred: `kb:cred-ref:${tool.fields['Name']?.toLowerCase().replace(/\s+/g, '_')}_v1`,
        endpoint: tool.fields['API Endpoint'] || ''
      });
    } catch (error) {
      console.warn(`[Context Assembly] Could not fetch Tool ${toolId}: ${error.message}`);
    }
  }
  
  return tools;
}

/**
 * Build Content Type Contract
 */
function buildContentTypeContract(contentType) {
  if (!contentType) {
    return {
      id: null,
      name: 'Unknown',
      schema_version: '1.0.0',
      output_contract: { fields: [] }
    };
  }
  
  return {
    id: contentType.id,
    name: contentType.fields['Name'] || 'Unknown',
    schema_version: contentType.fields['Schema Version'] || '1.0.0',
    output_contract: {
      destination_table: contentType.fields['Destination Table'] || 'Articles',
      fields: parseJSON(contentType.fields['Fields Schema (JSON)']) || [],
      validators: parseJSON(contentType.fields['Validators (JSON)']) || []
    }
  };
}

/**
 * Extract rules from Workflow and Content Type
 */
function extractRules(workflow, contentType) {
  const rules = [];
  
  if (contentType && contentType.fields['Validators (JSON)']) {
    const validators = parseJSON(contentType.fields['Validators (JSON)']);
    if (validators) {
      rules.push(...validators.map(v => ({
        type: 'validator',
        name: v.name,
        value: v.value
      })));
    }
  }
  
  if (workflow && workflow.fields['Rules (JSON)']) {
    const workflowRules = parseJSON(workflow.fields['Rules (JSON)']);
    if (workflowRules) {
      rules.push(...workflowRules);
    }
  }
  
  return rules;
}

/**
 * Parse JSON safely
 */
function parseJSON(jsonString) {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return null;
  }
}

module.exports = {
  initialize,
  assembleUnifiedContext
};

