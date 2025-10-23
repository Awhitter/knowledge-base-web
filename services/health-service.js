/**
 * Health Service
 * 
 * Comprehensive system health diagnostics with actionable error messages.
 * Provides two-tier health checking: quick (for load balancers) and detailed (for debugging).
 * 
 * Features:
 * - 6 component health checkers (environment, Airtable, schema, webhook, services, system)
 * - Caching with configurable TTL
 * - Actionable error messages and recommendations
 * - Graceful degradation
 * - Performance metrics
 */

class HealthService {
  constructor(dependencies = {}) {
    this.airtable = dependencies.airtable;
    this.schemaService = dependencies.schemaService;
    this.contextAssembly = dependencies.contextAssembly;
    this.sseEvents = dependencies.sseEvents;
    this.makeWebhookUrl = dependencies.makeWebhookUrl;
    this.config = dependencies.config || {};
    this.bases = dependencies.bases || {};
    this.tables = dependencies.tables || {};
    
    // Cache for health check results
    this.quickHealthCache = null;
    this.quickHealthCacheTime = 0;
    this.detailedHealthCache = null;
    this.detailedHealthCacheTime = 0;
    
    this.quickCacheTTL = 30000; // 30 seconds
    this.detailedCacheTTL = 60000; // 60 seconds
    
    this.startTime = Date.now();
    
    console.log('[Health Service] Initialized');
  }
  
  /**
   * Quick health check (for load balancers)
   * Cached for 30 seconds
   */
  async getQuickHealth() {
    // Check cache
    if (this.isQuickCacheValid()) {
      return this.quickHealthCache;
    }
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: '1.0.0'
    };
    
    // Basic checks
    if (!this.airtable) {
      health.status = 'unhealthy';
    }
    
    // Cache it
    this.quickHealthCache = health;
    this.quickHealthCacheTime = Date.now();
    
    return health;
  }
  
  /**
   * Detailed health check (for debugging/admin)
   * Cached for 60 seconds
   */
  async getDetailedHealth() {
    // Check cache
    if (this.isDetailedCacheValid()) {
      return this.detailedHealthCache;
    }
    
    const startTime = Date.now();
    
    // Run all health checks in parallel
    const [
      environment,
      airtable,
      schemaServiceHealth,
      makeWebhook,
      services,
      system
    ] = await Promise.allSettled([
      this.checkEnvironment(),
      this.checkAirtable(),
      this.checkSchemaService(),
      this.checkMakeWebhook(),
      this.checkServices(),
      this.checkSystem()
    ]);
    
    const components = {
      environment: this.unwrapResult(environment),
      airtable: this.unwrapResult(airtable),
      schemaService: this.unwrapResult(schemaServiceHealth),
      makeWebhook: this.unwrapResult(makeWebhook),
      services: this.unwrapResult(services),
      system: this.unwrapResult(system)
    };
    
    // Calculate overall status
    const statuses = Object.values(components).map(c => c.status);
    const overallStatus = this.calculateOverallStatus(statuses);
    
    // Generate summary
    const summary = {
      healthy: statuses.filter(s => s === 'healthy').length,
      degraded: statuses.filter(s => s === 'degraded').length,
      unhealthy: statuses.filter(s => s === 'unhealthy').length,
      unknown: statuses.filter(s => s === 'unknown').length,
      total: statuses.length
    };
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(components);
    
    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: '1.0.0',
      responseTime: Date.now() - startTime,
      components,
      summary,
      recommendations
    };
    
    // Cache it
    this.detailedHealthCache = health;
    this.detailedHealthCacheTime = Date.now();
    
    return health;
  }
  
  /**
   * Check environment variables
   */
  async checkEnvironment() {
    const required = ['AIRTABLE_API_KEY'];
    const optional = [
      'MAKE_WEBHOOK_URL',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'MASTRA_CLOUD_ACCESS_TOKEN'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    const present = required.filter(key => process.env[key]).length +
                    optional.filter(key => process.env[key]).length;
    
    return {
      status: missing.length === 0 ? 'healthy' : 'unhealthy',
      required: required.length,
      optional: optional.length,
      missing,
      present,
      message: missing.length > 0 
        ? `Missing required environment variables: ${missing.join(', ')}` 
        : 'All required environment variables present'
    };
  }
  
  /**
   * Check Airtable connectivity
   */
  async checkAirtable() {
    if (!this.airtable) {
      return {
        status: 'unhealthy',
        error: 'Airtable client not initialized',
        message: 'Check AIRTABLE_API_KEY in .env',
        documentation: 'https://airtable.com/account'
      };
    }
    
    const startTime = Date.now();
    const baseResults = [];
    
    // Test connectivity to each base
    for (const [name, baseId] of Object.entries(this.bases)) {
      try {
        const base = this.airtable.base(baseId);
        // Try to fetch 1 record from the first available table
        const tableId = Object.values(this.tables)[0];
        
        await Promise.race([
          base(tableId).select({ maxRecords: 1 }).firstPage(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        baseResults.push({
          name,
          baseId,
          status: 'healthy',
          responseTime: Date.now() - startTime
        });
      } catch (error) {
        baseResults.push({
          name,
          baseId,
          status: 'unhealthy',
          error: error.message
        });
      }
    }
    
    const responseTime = Date.now() - startTime;
    const healthyBases = baseResults.filter(b => b.status === 'healthy').length;
    const totalBases = baseResults.length;
    
    let status = 'healthy';
    let message = `All ${totalBases} bases reachable`;
    
    if (healthyBases === 0) {
      status = 'unhealthy';
      message = 'All bases unreachable';
    } else if (healthyBases < totalBases) {
      status = 'degraded';
      message = `${healthyBases}/${totalBases} bases reachable`;
    } else if (responseTime > 2000) {
      status = 'degraded';
      message = `Slow response time (${responseTime}ms)`;
    }
    
    return {
      status,
      responseTime,
      basesTested: totalBases,
      basesHealthy: healthyBases,
      bases: baseResults,
      message
    };
  }
  
  /**
   * Check Schema Service health
   */
  async checkSchemaService() {
    if (!this.schemaService) {
      return {
        status: 'degraded',
        message: 'Schema Service not initialized'
      };
    }
    
    const stats = this.schemaService.getCacheStats();
    
    let status = 'healthy';
    let message = `${stats.cachedBases} bases cached, ${stats.totalTables} tables`;
    
    if (stats.cachedBases === 0) {
      status = 'degraded';
      message = 'No schemas cached (cold start)';
    }
    
    // Check if any cache is older than 2 hours
    const twoHours = 2 * 60 * 60 * 1000;
    const oldCaches = stats.bases.filter(b => b.age > twoHours);
    
    if (oldCaches.length > 0) {
      status = 'degraded';
      message = `${oldCaches.length} schemas older than 2 hours`;
    }
    
    return {
      status,
      cachedBases: stats.cachedBases,
      totalTables: stats.totalTables,
      totalFields: stats.totalFields,
      bases: stats.bases,
      message
    };
  }
  
  /**
   * Check Make.com webhook health
   */
  async checkMakeWebhook() {
    if (!this.makeWebhookUrl) {
      return {
        status: 'unknown',
        configured: false,
        message: 'Make.com webhook not configured'
      };
    }
    
    // We can't actually test the webhook (would trigger workflow)
    // Just check if it's configured and looks valid
    const isValidUrl = this.makeWebhookUrl.startsWith('http');
    
    return {
      status: isValidUrl ? 'healthy' : 'degraded',
      configured: true,
      url: this.makeWebhookUrl.substring(0, 50) + '...',
      message: isValidUrl ? 'Webhook configured' : 'Invalid webhook URL'
    };
  }
  
  /**
   * Check internal services health
   */
  async checkServices() {
    const services = {
      contextAssembly: this.contextAssembly ? 'healthy' : 'unhealthy',
      sseEvents: this.sseEvents ? 'healthy' : 'unhealthy',
      schemaService: this.schemaService ? 'healthy' : 'unhealthy'
    };
    
    const unhealthy = Object.values(services).filter(s => s === 'unhealthy').length;
    
    return {
      status: unhealthy === 0 ? 'healthy' : unhealthy < 3 ? 'degraded' : 'unhealthy',
      services,
      message: unhealthy === 0 
        ? 'All services initialized' 
        : `${unhealthy} services not initialized`
    };
  }
  
  /**
   * Check system resources
   */
  async checkSystem() {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const memPercentage = (usedMem / totalMem) * 100;
    
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    let status = 'healthy';
    let message = `Memory: ${memPercentage.toFixed(1)}%, Uptime: ${uptime}s`;
    
    if (memPercentage > 90) {
      status = 'unhealthy';
      message = `High memory usage (${memPercentage.toFixed(1)}%)`;
    } else if (memPercentage > 80) {
      status = 'degraded';
      message = `Elevated memory usage (${memPercentage.toFixed(1)}%)`;
    }
    
    if (uptime < 60) {
      status = 'degraded';
      message += ' (just restarted)';
    }
    
    return {
      status,
      uptime,
      memory: {
        used: usedMem,
        total: totalMem,
        percentage: parseFloat(memPercentage.toFixed(1))
      },
      nodeVersion: process.version,
      platform: process.platform,
      message
    };
  }
  
  /**
   * Generate actionable recommendations
   */
  generateRecommendations(components) {
    const recommendations = [];
    
    // Environment recommendations
    if (components.environment.status === 'unhealthy') {
      recommendations.push({
        component: 'environment',
        severity: 'critical',
        message: `Missing required environment variables: ${components.environment.missing.join(', ')}`,
        action: 'Check your .env file against .env.example'
      });
    }
    
    // Airtable recommendations
    if (components.airtable.status === 'unhealthy') {
      recommendations.push({
        component: 'airtable',
        severity: 'critical',
        message: components.airtable.message,
        action: 'Check AIRTABLE_API_KEY and network connectivity'
      });
    } else if (components.airtable.status === 'degraded') {
      if (components.airtable.responseTime > 2000) {
        recommendations.push({
          component: 'airtable',
          severity: 'warning',
          message: `Slow Airtable response (${components.airtable.responseTime}ms)`,
          action: 'Check network connectivity or Airtable status page'
        });
      }
    }
    
    // Schema Service recommendations
    if (components.schemaService.status === 'degraded') {
      if (components.schemaService.cachedBases === 0) {
        recommendations.push({
          component: 'schemaService',
          severity: 'info',
          message: 'Schema cache is cold',
          action: 'Warm it up by visiting /api/meta/schema'
        });
      }
    }
    
    // System recommendations
    if (components.system.status === 'degraded' || components.system.status === 'unhealthy') {
      if (components.system.memory.percentage > 80) {
        recommendations.push({
          component: 'system',
          severity: components.system.memory.percentage > 90 ? 'critical' : 'warning',
          message: `High memory usage (${components.system.memory.percentage}%)`,
          action: 'Consider restarting the server or investigating memory leaks'
        });
      }
    }
    
    return recommendations;
  }
  
  /**
   * Calculate overall status from component statuses
   */
  calculateOverallStatus(statuses) {
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    if (statuses.includes('unknown')) return 'degraded';
    return 'healthy';
  }
  
  /**
   * Unwrap Promise.allSettled result
   */
  unwrapResult(result) {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        error: result.reason.message
      };
    }
  }
  
  /**
   * Check if quick health cache is still valid
   */
  isQuickCacheValid() {
    return this.quickHealthCache && 
           (Date.now() - this.quickHealthCacheTime) < this.quickCacheTTL;
  }
  
  /**
   * Check if detailed health cache is still valid
   */
  isDetailedCacheValid() {
    return this.detailedHealthCache && 
           (Date.now() - this.detailedHealthCacheTime) < this.detailedCacheTTL;
  }
  
  /**
   * Clear all caches
   */
  clearCache() {
    this.quickHealthCache = null;
    this.detailedHealthCache = null;
    console.log('[Health Service] Cache cleared');
  }
}

module.exports = HealthService;

