/**
 * Dynamic Form Builder - Generate forms from Airtable schema
 * Adapts automatically when schema changes
 */

class DynamicFormBuilder {
    constructor() {
        this.schema = null;
        this.advancedMode = false;
    }

    /**
     * Fetch schema from API
     */
    async fetchSchema() {
        try {
            const response = await (window.errorRecovery?.fetchWithRetry || fetch)(
                '/api/schema/initiator'
            );
            this.schema = await response.json();
            console.log('[DynamicForm] Schema loaded:', this.schema.fields.length, 'fields');
            return this.schema;
        } catch (error) {
            console.error('[DynamicForm] Failed to load schema:', error);
            throw error;
        }
    }

    /**
     * Get editable fields (exclude lookups, formulas, etc.)
     */
    getEditableFields() {
        if (!this.schema) return [];
        
        const excludeTypes = ['multipleLookupValues', 'formula', 'rollup', 'autoNumber', 'createdTime', 'lastModifiedTime'];
        return this.schema.fields.filter(f => !excludeTypes.includes(f.type));
    }

    /**
     * Categorize fields
     */
    categorizeFields() {
        const editable = this.getEditableFields();
        
        const categories = {
            core: [],
            content: [],
            research: [],
            workflow: [],
            other: []
        };

        // Core fields (already in the form)
        const coreFieldNames = [
            'Premade AI Workflow (Initiator link to WF Table)',
            'What Entity Are We Creating Content On Behalf of? (Initiator Table link to entities table)',
            'Persona To Embody (From Initiator Table)',
            'What are you imagining? (From Initiator Table)',
            'Whats Your Goal?',
            'Reference URLs (from initiator table)',
            'Additional Notes (from initiator table)',
            'Request Name (from initiator table)'
        ];

        editable.forEach(field => {
            const name = field.name.toLowerCase();
            
            if (coreFieldNames.some(core => field.name === core)) {
                categories.core.push(field);
            } else if (name.includes('content') || name.includes('edit') || name.includes('build upon')) {
                categories.content.push(field);
            } else if (name.includes('research') || name.includes('reference') || name.includes('youtube')) {
                categories.research.push(field);
            } else if (name.includes('workflow') || name.includes('run') || name.includes('times')) {
                categories.workflow.push(field);
            } else {
                categories.other.push(field);
            }
        });

        return categories;
    }

    /**
     * Generate HTML for a field based on its type
     */
    generateFieldHTML(field, value = '') {
        const fieldId = this.sanitizeFieldName(field.name);
        const isRequired = false; // Most advanced fields are optional
        
        let html = `<div class="form-group" data-field-id="${fieldId}">`;
        html += `<label for="${fieldId}">${field.name}${isRequired ? ' *' : ''}</label>`;

        switch (field.type) {
            case 'singleLineText':
            case 'email':
            case 'url':
            case 'phoneNumber':
                html += `<input type="${this.getInputType(field.type)}" id="${fieldId}" name="${fieldId}" value="${value}" ${isRequired ? 'required' : ''}>`;
                break;

            case 'multilineText':
            case 'aiText':
                html += `<textarea id="${fieldId}" name="${fieldId}" rows="3" ${isRequired ? 'required' : ''}>${value}</textarea>`;
                break;

            case 'singleSelect':
                html += `<select id="${fieldId}" name="${fieldId}" ${isRequired ? 'required' : ''}>`;
                html += `<option value="">-- Select --</option>`;
                if (field.options && field.options.choices) {
                    field.options.choices.forEach(choice => {
                        html += `<option value="${choice.name}" ${value === choice.name ? 'selected' : ''}>${choice.name}</option>`;
                    });
                }
                html += `</select>`;
                break;

            case 'multipleSelects':
                html += `<select id="${fieldId}" name="${fieldId}" multiple>`;
                if (field.options && field.options.choices) {
                    field.options.choices.forEach(choice => {
                        const selected = Array.isArray(value) && value.includes(choice.name);
                        html += `<option value="${choice.name}" ${selected ? 'selected' : ''}>${choice.name}</option>`;
                    });
                }
                html += `</select>`;
                html += `<small>Hold Ctrl/Cmd to select multiple</small>`;
                break;

            case 'number':
            case 'currency':
            case 'percent':
            case 'duration':
                html += `<input type="number" id="${fieldId}" name="${fieldId}" value="${value}" ${isRequired ? 'required' : ''}>`;
                break;

            case 'checkbox':
                html += `<input type="checkbox" id="${fieldId}" name="${fieldId}" ${value ? 'checked' : ''}>`;
                break;

            case 'date':
            case 'dateTime':
                html += `<input type="${field.type === 'dateTime' ? 'datetime-local' : 'date'}" id="${fieldId}" name="${fieldId}" value="${value}" ${isRequired ? 'required' : ''}>`;
                break;

            case 'multipleRecordLinks':
                html += `<input type="text" id="${fieldId}" name="${fieldId}" value="${value}" placeholder="Enter record IDs (comma-separated)">`;
                html += `<small>This field links to another table. Enter record IDs separated by commas.</small>`;
                break;

            case 'attachment':
                html += `<input type="file" id="${fieldId}" name="${fieldId}" multiple>`;
                html += `<small>File uploads will be handled separately</small>`;
                break;

            default:
                html += `<input type="text" id="${fieldId}" name="${fieldId}" value="${value}">`;
                html += `<small>Unsupported field type: ${field.type}</small>`;
        }

        // Add description if available
        if (field.description) {
            html += `<small class="field-description">${field.description}</small>`;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Get HTML input type for Airtable field type
     */
    getInputType(fieldType) {
        const typeMap = {
            'email': 'email',
            'url': 'url',
            'phoneNumber': 'tel',
            'singleLineText': 'text'
        };
        return typeMap[fieldType] || 'text';
    }

    /**
     * Sanitize field name for use as HTML ID
     */
    sanitizeFieldName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * Generate advanced fields section
     */
    generateAdvancedFieldsHTML() {
        const categories = this.categorizeFields();
        let html = '<div id="advanced-fields" style="display: none;">';
        
        // Content fields
        if (categories.content.length > 0) {
            html += '<h3 style="margin-top: 20px;">Content Settings</h3>';
            categories.content.forEach(field => {
                html += this.generateFieldHTML(field);
            });
        }

        // Research fields
        if (categories.research.length > 0) {
            html += '<h3 style="margin-top: 20px;">Research & References</h3>';
            categories.research.forEach(field => {
                html += this.generateFieldHTML(field);
            });
        }

        // Workflow fields
        if (categories.workflow.length > 0) {
            html += '<h3 style="margin-top: 20px;">Workflow Settings</h3>';
            categories.workflow.forEach(field => {
                html += this.generateFieldHTML(field);
            });
        }

        // Other fields
        if (categories.other.length > 0) {
            html += '<h3 style="margin-top: 20px;">Additional Options</h3>';
            categories.other.forEach(field => {
                html += this.generateFieldHTML(field);
            });
        }

        html += '</div>';
        return html;
    }

    /**
     * Add advanced fields toggle to form
     */
    addAdvancedFieldsToggle(formElement) {
        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.id = 'toggle-advanced-fields';
        toggleBtn.className = 'btn-secondary';
        toggleBtn.textContent = '⚙️ Show Advanced Fields';
        toggleBtn.style.cssText = 'margin: 20px 0; width: 100%;';
        
        toggleBtn.onclick = () => {
            this.advancedMode = !this.advancedMode;
            const advancedSection = document.getElementById('advanced-fields');
            
            if (this.advancedMode) {
                advancedSection.style.display = 'block';
                toggleBtn.textContent = '⚙️ Hide Advanced Fields';
            } else {
                advancedSection.style.display = 'none';
                toggleBtn.textContent = '⚙️ Show Advanced Fields';
            }
        };

        // Insert before submit button
        const submitBtn = formElement.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.parentNode.insertBefore(toggleBtn, submitBtn);
        } else {
            formElement.appendChild(toggleBtn);
        }
    }

    /**
     * Extract form data including advanced fields
     */
    extractFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};

        for (const [key, value] of formData.entries()) {
            // Handle multiple selects
            if (formData.getAll(key).length > 1) {
                data[key] = formData.getAll(key);
            } else {
                data[key] = value;
            }
        }

        return data;
    }

    /**
     * Map form data to Airtable field names
     */
    mapToAirtableFields(formData) {
        const mapped = {};
        
        for (const [key, value] of Object.entries(formData)) {
            // Find the original field name from schema
            const field = this.schema.fields.find(f => 
                this.sanitizeFieldName(f.name) === key
            );
            
            if (field) {
                mapped[field.name] = value;
            } else {
                // Keep original key if not found in schema
                mapped[key] = value;
            }
        }

        return mapped;
    }
}

// Initialize global dynamic form builder
window.dynamicFormBuilder = new DynamicFormBuilder();

// Helper function to enhance existing form with advanced fields
async function enhanceFormWithAdvancedFields(formElement) {
    try {
        // Fetch schema
        await window.dynamicFormBuilder.fetchSchema();
        
        // Generate advanced fields HTML
        const advancedHTML = window.dynamicFormBuilder.generateAdvancedFieldsHTML();
        
        // Insert advanced fields before submit button
        const submitBtn = formElement.querySelector('button[type="submit"]');
        if (submitBtn) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = advancedHTML;
            submitBtn.parentNode.insertBefore(tempDiv.firstChild, submitBtn);
        }
        
        // Add toggle button
        window.dynamicFormBuilder.addAdvancedFieldsToggle(formElement);
        
        console.log('[DynamicForm] Form enhanced with advanced fields');
    } catch (error) {
        console.error('[DynamicForm] Failed to enhance form:', error);
        // Form still works without advanced fields
    }
}

// Expose globally
window.enhanceFormWithAdvancedFields = enhanceFormWithAdvancedFields;

console.log('[DynamicForm] Module loaded. Use enhanceFormWithAdvancedFields(formElement) to add advanced fields.');

