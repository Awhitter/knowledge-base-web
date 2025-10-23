/**
 * Tolerant Field Getter
 * 
 * Solves the field name mismatch problem without requiring Airtable schema changes.
 * Accepts a list of possible field names (aliases) and returns the first one that exists.
 * 
 * Usage:
 *   const workflow = getField(initiator.fields, [
 *     'Workflow',
 *     'Premade AI Workflow (Initiator link to WF Table)',
 *     'Workflow Record Id'
 *   ]);
 */

function getField(fields, aliasList) {
  if (!fields || !aliasList || !Array.isArray(aliasList)) {
    return undefined;
  }
  
  for (const name of aliasList) {
    if (Object.prototype.hasOwnProperty.call(fields, name) && fields[name] != null) {
      return fields[name];
    }
  }
  
  return undefined;
}

module.exports = { getField };

