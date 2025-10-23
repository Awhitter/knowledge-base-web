/**
 * Schema Service
 * 
 * Introspects Airtable table schemas using the Meta API and caches them.
 * Provides schema information for all tables across all bases.
 * 
 * Features:
 * - Automatic schema fetching on startup
 * - In-memory caching with TTL
 * - Field type information
 * - Linked table relationships
 * - Self-documenting API endpoints
 */

const fetch = require('node-fetch');

class SchemaService {
  constructor(apiKey, config = {}) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.airtable.com/v0/meta/bases';
    this.schemas = new Map(); // baseId -> schema
    this.lastFetch = new Map(); // baseId -> timestamp
    this.cacheTTL = config.cacheTTL || 3600000; // 1 hour default
    this.enableCache = config.enableCache !== false;
    
    console.log('[Schema Service] Initialized');
  }
  
  /**
   * Fetch schema for a specific base
   */
  async fetchBaseSchema(baseId) {
    // Check cache first
    if (this.enableCache && this.isCacheValid(baseId)) {
      console.log(`[Schema Service] Using cached schema for ${baseId}`);
      return this.schemas.get(baseId);
    }
    
    console.log(`[Schema Service] Fetching schema for ${baseId}...`);
    
    try {
      const response = await fetch(`${this.baseUrl}/${baseId}/tables`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform to more usable format
      const schema = {
        baseId,
        fetchedAt: new Date().toISOString(),
        tables: data.tables.map(table => ({
          id: table.id,
          name: table.name,
          primaryFieldId: table.primaryFieldId,
          description: table.description || null,
          fields: table.fields.map(field => ({
            id: field.id,
            name: field.name,
            type: field.type,
            description: field.description || null,
            options: field.options || null
          }))
        }))
      };
      
      // Cache it
      this.schemas.set(baseId, schema);
      this.lastFetch.set(baseId, Date.now());
      
      console.log(`[Schema Service] Fetched ${schema.tables.length} tables for ${baseId}`);
      
      return schema;
      
    } catch (error) {
      console.error(`[Schema Service] Error fetching schema for ${baseId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Fetch schemas for multiple bases
   */
  async fetchMultipleSchemas(baseIds) {
    const results = await Promise.allSettled(
      baseIds.map(baseId => this.fetchBaseSchema(baseId))
    );
    
    const schemas = {};
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        schemas[baseIds[index]] = result.value;
      } else {
        console.error(`[Schema Service] Failed to fetch ${baseIds[index]}:`, result.reason.message);
        schemas[baseIds[index]] = { error: result.reason.message };
      }
    });
    
    return schemas;
  }
  
  /**
   * Get schema for a specific table by name
   */
  async getTableSchema(baseId, tableName) {
    const baseSchema = await this.fetchBaseSchema(baseId);
    
    if (!baseSchema || baseSchema.error) {
      return null;
    }
    
    return baseSchema.tables.find(t => 
      t.name === tableName || 
      t.name.toLowerCase() === tableName.toLowerCase()
    );
  }
  
  /**
   * Get schema for a specific table by ID
   */
  async getTableSchemaById(baseId, tableId) {
    const baseSchema = await this.fetchBaseSchema(baseId);
    
    if (!baseSchema || baseSchema.error) {
      return null;
    }
    
    return baseSchema.tables.find(t => t.id === tableId);
  }
  
  /**
   * Find a field in a table by name (case-insensitive, partial match)
   */
  async findField(baseId, tableName, fieldName) {
    const tableSchema = await this.getTableSchema(baseId, tableName);
    
    if (!tableSchema) {
      return null;
    }
    
    // Try exact match first
    let field = tableSchema.fields.find(f => f.name === fieldName);
    if (field) return field;
    
    // Try case-insensitive match
    field = tableSchema.fields.find(f => 
      f.name.toLowerCase() === fieldName.toLowerCase()
    );
    if (field) return field;
    
    // Try partial match (contains)
    field = tableSchema.fields.find(f => 
      f.name.toLowerCase().includes(fieldName.toLowerCase())
    );
    if (field) return field;
    
    return null;
  }
  
  /**
   * Get all fields of a specific type in a table
   */
  async getFieldsByType(baseId, tableName, fieldType) {
    const tableSchema = await this.getTableSchema(baseId, tableName);
    
    if (!tableSchema) {
      return [];
    }
    
    return tableSchema.fields.filter(f => f.type === fieldType);
  }
  
  /**
   * Get all linked record fields in a table
   */
  async getLinkedFields(baseId, tableName) {
    return this.getFieldsByType(baseId, tableName, 'multipleRecordLinks');
  }
  
  /**
   * Check if cache is still valid
   */
  isCacheValid(baseId) {
    if (!this.schemas.has(baseId) || !this.lastFetch.has(baseId)) {
      return false;
    }
    
    const age = Date.now() - this.lastFetch.get(baseId);
    return age < this.cacheTTL;
  }
  
  /**
   * Clear cache for a specific base or all bases
   */
  clearCache(baseId = null) {
    if (baseId) {
      this.schemas.delete(baseId);
      this.lastFetch.delete(baseId);
      console.log(`[Schema Service] Cleared cache for ${baseId}`);
    } else {
      this.schemas.clear();
      this.lastFetch.clear();
      console.log('[Schema Service] Cleared all caches');
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      cachedBases: this.schemas.size,
      totalTables: 0,
      totalFields: 0,
      bases: []
    };
    
    this.schemas.forEach((schema, baseId) => {
      if (!schema.error) {
        const tableCount = schema.tables.length;
        const fieldCount = schema.tables.reduce((sum, t) => sum + t.fields.length, 0);
        
        stats.totalTables += tableCount;
        stats.totalFields += fieldCount;
        
        stats.bases.push({
          baseId,
          tables: tableCount,
          fields: fieldCount,
          fetchedAt: schema.fetchedAt,
          age: Date.now() - this.lastFetch.get(baseId)
        });
      }
    });
    
    return stats;
  }
  
  /**
   * Generate field mapping documentation for a table
   */
  async generateFieldMap(baseId, tableName) {
    const tableSchema = await this.getTableSchema(baseId, tableName);
    
    if (!tableSchema) {
      return null;
    }
    
    const fieldMap = {
      tableName: tableSchema.name,
      tableId: tableSchema.id,
      primaryFieldId: tableSchema.primaryFieldId,
      fieldCount: tableSchema.fields.length,
      fields: tableSchema.fields.map(field => ({
        name: field.name,
        id: field.id,
        type: field.type,
        // Generate common aliases for this field
        aliases: this.generateFieldAliases(field.name),
        // Extract key terms for matching
        keyTerms: this.extractKeyTerms(field.name)
      }))
    };
    
    return fieldMap;
  }
  
  /**
   * Generate common aliases for a field name
   */
  generateFieldAliases(fieldName) {
    const aliases = [fieldName];
    
    // Add lowercase version
    aliases.push(fieldName.toLowerCase());
    
    // Add version without parentheses
    const withoutParens = fieldName.replace(/\([^)]*\)/g, '').trim();
    if (withoutParens !== fieldName) {
      aliases.push(withoutParens);
    }
    
    // Add version with just key words (remove common words)
    const keyWords = fieldName
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['from', 'table', 'link', 'field', 'initiator', 'sync'].includes(word.toLowerCase()))
      .join(' ');
    
    if (keyWords && keyWords !== fieldName) {
      aliases.push(keyWords);
    }
    
    return [...new Set(aliases)]; // Remove duplicates
  }
  
  /**
   * Extract key terms from field name for matching
   */
  extractKeyTerms(fieldName) {
    return fieldName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['what', 'from', 'table', 'link', 'field', 'initiator', 'sync'].includes(word));
  }
}

module.exports = SchemaService;

