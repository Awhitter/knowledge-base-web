/**
 * Context Assembly Service v0.3
 * 
 * Builds the UnifiedContext object by fetching and assembling all required data:
 * - User input from Initiator record
 * - Entity knowledge bases (Brand, Audience, Marketing XML bundles)
 * - Workflow configuration (active lanes)
 * - Content Type schema (contract)
 * - References, Tools, Research
 * - Prior step outputs
 * 
 * This is the "brain" of the system - the unified context that flows through all AI processing lanes.
 */

const Airtable = require('airtable');

// Base will be injected by the server
let base = null;

/**
 * Initialize the Context Assembly Service with an Airtable base instance
 * @param {Object} airtableBase - The Airtable base instance from the server
 */
function initialize(airtableBase) {
  base = airtableBase;
  console.log('[Context Assembly] Initialized with Airtable base');
}

// Table IDs (from deep analysis)
const TABLES = {
  INITIATOR: 'tblBCiyCEEFJCJ1nO',
  WORKFLOWS: 'tblwCDWd0pm7f3OK2',
  PROMPTS: 'tblvgWQST4Z0P88np',
  ENTITIES: 'tbl9q3pHR5qtALyzm',
  CONTENT_TYPES: 'tbl1ywo3FVRw8skix',
  REFERENCES: 'tblXfxCDOO4AGabsA',
  TOOLS: 'tblO5ZEgmxJVI3FIR',
  RESEARCH_CACHE: 'tblResearchCache', // To be created
  RESEARCH_REPORTS: 'tblAMKqhZqLwHqKZU', // Existing
  AUDIENCE: 'tblEb8YJxwVBC6Vp6' // Existing (in Audience KB base)
};

/**
 * Assemble the UnifiedContext object for a given Initiator record
 * @param {string} recordId - The Initiator record ID
 * @returns {Promise<Object>} - The UnifiedContext object (v0.3)
 */
async function assembleUnifiedContext(recordId) {
  try {
    console.log(`[Context Assembly] Starting assembly for record: ${recordId}`);
    
    // Step 1: Fetch Initiator record
    const initiator = await fetchInitiatorRecord(recordId);
    console.log(`[Context Assembly] ✅ Fetched Initiator record`);
    
    // Step 2: Fetch Workflow (to get active lanes)
    const workflowField = initiator.fields['Premade AI Workflow (Initiator link to WF Table)'];
    const workflow = await fetchWorkflow(workflowField);
    console.log(`[Context Assembly] Fetched Workflow: ${workflow ? (workflow.fields['Name'] || workflow.fields['Workflow (WF) Name (From WF)']) : 'None'}`);
    
    // Step 3: Fetch Entity (to get knowledge bases)
    const entityField = initiator.fields['What Entity Are We Creating Content On Behalf of? (Initiator Table link to entities table)'];
    const entity = await fetchEntity(entityField);
    console.log(`[Context Assembly] Fetched Entity: ${entity ? entity.fields['Name'] : 'None'}`);
    
    // Step 4: Fetch Content Type (to get schema/contract)
    const contentTypeField = initiator.fields['Content Type'];
    const contentType = await fetchContentType(contentTypeField);
    console.log(`[Context Assembly] Fetched Content Type: ${contentType ? contentType.fields['Name'] : 'None'}`);
    
    // Step 5: Fetch References (if any)
    const referencesField = initiator.fields['References'] || [];
    const references = await fetchReferences(referencesField);
    console.log(`[Context Assembly] Fetched ${references.length} references`);
    
    // Step 6: Fetch Tools (if any)
    const toolsField = initiator.fields['Tools'] || [];
    const tools = await fetchTools(toolsField);
    console.log(`[Context Assembly] Fetched ${tools.length} tools`);
    
    // Step 7: Fetch Research Cache (if topic matches)
    const goal = initiator.fields['Whats Your Goal?'] || initiator.fields['What are you imagining? (From Initiator Table)'];
    const researchCache = await fetchResearchCache(goal);
    console.log(`[Context Assembly] Fetched ${researchCache.length} cached research items`);
    
    // Step 8: Extract active lanes from Workflow
    const activeLanes = extractActiveLanes(workflow, initiator);
    console.log(`[Context Assembly] Active lanes: ${activeLanes.join(', ')}`);
    
    // Step 9: Build UnifiedContext v0.3
    const unifiedContext = {
      initiator_id: recordId,
      timestamp: new Date().toISOString(),
      content_type: buildContentTypeContract(contentType),
      entity: buildEntityContext(entity, initiator),
      audience: buildAudienceContext(initiator),
      research: buildResearchContext(researchCache, initiator),
      tools: buildToolsContext(tools),
      platform: {
        provider: 'openai', // Default, can be overridden by workflow
        model: 'gpt-4'
      },
      lane_plan: activeLanes.map(lane => ({ lane, enabled: true })),
      prior_steps: [], // Will be populated during execution
      rules: extractRules(workflow, contentType),
      context: {
        user_input: {
          goal: initiator.fields['Whats Your Goal?'],
          brief: initiator.fields['What are you imagining? (From Initiator Table)'],
          audience: initiator.fields['Audience Name'],
          apps: initiator.fields['Apps'] || []
        },
        personalization: {
          reading_level: initiator.fields['Reading Level'] || 'professional',
          tone: initiator.fields['Tone'] || 'informative'
        },
        tags: initiator.fields['Tags'] || []
      }
    };
    
    console.log(`[Context Assembly] ✅ Assembly complete`);
    return unifiedContext;
    
  } catch (error) {
    console.error(`[Context Assembly] ❌ Error assembling context:`, error);
    throw new Error(`Failed to assemble context: ${error.message}`);
  }
}

/**
 * Fetch Initiator record
 */
async function fetchInitiatorRecord(recordId) {
  try {
    console.log(`[Context Assembly] Fetching Initiator record: ${recordId} from table: ${TABLES.INITIATOR}`);
    const record = await base(TABLES.INITIATOR).find(recordId);
    console.log(`[Context Assembly] ✅ Successfully fetched Initiator record`);
    return record;
  } catch (error) {
    console.error(`[Context Assembly] ❌ Error fetching Initiator record:`, error);
    throw error;
  }
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
    console.warn(`[Context Assembly] Could not fetch Workflow ${workflowId}: ${error.message}`);
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
    console.warn(`[Context Assembly] Could not fetch Entity ${entityId}: ${error.message}`);
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
    console.warn(`[Context Assembly] Could not fetch Content Type ${contentTypeId}: ${error.message}`);
    return null;
  }
}

/**
 * Fetch References
 */
async function fetchReferences(referenceIds) {
  if (!referenceIds || referenceIds.length === 0) return [];
  const references = [];
  for (const refId of referenceIds) {
    try {
      const ref = await base(TABLES.REFERENCES).find(refId);
      references.push(ref);
    } catch (error) {
      console.warn(`[Context Assembly] Could not fetch Reference ${refId}: ${error.message}`);
    }
  }
  return references;
}

/**
 * Fetch Tools
 */
async function fetchTools(toolIds) {
  if (!toolIds || toolIds.length === 0) return [];
  const tools = [];
  for (const toolId of toolIds) {
    try {
      const tool = await base(TABLES.TOOLS).find(toolId);
      tools.push(tool);
    } catch (error) {
      console.warn(`[Context Assembly] Could not fetch Tool ${toolId}: ${error.message}`);
    }
  }
  return tools;
}

/**
 * Fetch Research Cache
 */
async function fetchResearchCache(topic) {
  if (!topic) return [];
  // TODO: Implement Research_Cache table query
  // For now, return empty array
  return [];
}

/**
 * Extract active lanes from Workflow and Initiator
 */
function extractActiveLanes(workflow, initiator) {
  if (!workflow) return [];
  
  const activeLanes = [];
  const lanes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const subLanes = ['1.1', '2.1', '3.1', '4.1', '5.1'];
  
  // Check branch toggles from Initiator (these are lookup fields from Workflow)
  const branchToggles = {
    'A': initiator.fields['WF - Branch A - on/off'],
    'B': initiator.fields['WF - Branch B (full) - on/off'],
    'C': initiator.fields['WF - Branch C - on/off'],
    'D': initiator.fields['WF - Branch D - on/off'],
    'E': initiator.fields['WF - Branch E - on/off'],
    'F': initiator.fields['WF - Branch F - on/off'],
    'G': initiator.fields['WF - Branch G - on/off'],
    'H': initiator.fields['WF - Branch H -- on/off'],
    'I': initiator.fields['WF - Branch I - on/off'],
    'J': initiator.fields['WF - Branch J - on/off']
  };
  
  // For each branch that's enabled, check which sub-lanes have prompts
  for (const lane of lanes) {
    const branchEnabled = branchToggles[lane];
    if (branchEnabled) {
      for (const subLane of subLanes) {
        const laneKey = `${lane}${subLane}`;
        const laneFieldName = `WF - ${laneKey}`;
        
        // Check if this lane has a prompt linked (from Initiator lookup or Workflow)
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
 * Build Content Type contract
 */
function buildContentTypeContract(contentType) {
  if (!contentType) {
    return {
      id: null,
      name: 'Unknown',
      schema_version: '1.0.0',
      output_contract: {
        fields: []
      }
    };
  }
  
  return {
    id: contentType.id,
    name: contentType.fields['Name'] || 'Unknown',
    schema_version: contentType.fields['Schema Version'] || '1.0.0',
    output_contract: {
      destination_table: contentType.fields['Destination Table'] || 'Articles',
      fields: parseJSON(contentType.fields['Fields Schema (JSON)']) || [],
      validators: parseJSON(contentType.fields['Validators (JSON)']) || [],
      post_processing: parseJSON(contentType.fields['Post Processing (JSON)']) || []
    }
  };
}

/**
 * Build Entity context
 */
function buildEntityContext(entity, initiator) {
  if (!entity) {
    return {
      id: null,
      name: 'Unknown',
      kb_xml_bundle: '',
      app_context: {}
    };
  }
  
  // Get knowledge bases from Initiator (lookup fields)
  const brandKB = initiator.fields['📚 Brand Knowledgebase (from entities table)'];
  const audienceKB = initiator.fields['📚 Audience Knowledgebase (from entities table)'];
  const marketingKB = initiator.fields['📚 Marketing Knowledgebase (from entities table)'];
  
  // Combine into a single XML bundle
  const kbBundle = `<kb xmlns:brand="urn:brand" xmlns:audience="urn:audience" xmlns:marketing="urn:marketing">
  ${brandKB || ''}
  ${audienceKB || ''}
  ${marketingKB || ''}
</kb>`;
  
  return {
    id: entity.id,
    name: entity.fields['Name'] || 'Unknown',
    kb_xml_bundle: kbBundle,
    app_context: {
      description: entity.fields['Description'] || '',
      links: parseJSON(entity.fields['Links (JSON)']) || [],
      capabilities: parseJSON(entity.fields['Capabilities (JSON)']) || []
    }
  };
}

/**
 * Build Audience context
 */
function buildAudienceContext(initiator) {
  const audienceKB = initiator.fields['📚 Audience Knowledgebase (from entities table)'];
  
  return {
    kb_xml: audienceKB || '',
    personas: initiator.fields['Personas'] || [],
    priority: initiator.fields['Audience Priority'] || 5
  };
}

/**
 * Build Research context
 */
function buildResearchContext(researchCache, initiator) {
  return {
    sources: initiator.fields['Research Sources'] || [],
    normalized: researchCache.map(r => ({
      id: r.id,
      type: r.fields['Type'] || 'unknown',
      snippets: parseJSON(r.fields['Snippets (JSON)']) || []
    })),
    cache_refs: researchCache.map(r => `rc:${r.fields['Date']}:${r.fields['Topic']}:${r.fields['Hash']}`)
  };
}

/**
 * Build Tools context
 */
function buildToolsContext(tools) {
  return tools.map(tool => ({
    name: tool.fields['Name'] || 'Unknown',
    cred: `kb:cred-ref:${tool.fields['Name']?.toLowerCase().replace(/\s+/g, '_')}_v1`,
    endpoint: tool.fields['API Endpoint'] || ''
  }));
}

/**
 * Extract rules from Workflow and Content Type
 */
function extractRules(workflow, contentType) {
  const rules = [];
  
  // Add rules from Content Type validators
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
  
  // Add rules from Workflow
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
    console.warn(`[Context Assembly] Could not parse JSON: ${error.message}`);
    return null;
  }
}

module.exports = {
  initialize,
  assembleUnifiedContext
};

