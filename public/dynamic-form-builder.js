/**
 * Dynamic Form Builder
 * Generates forms dynamically from Airtable schema
 */

class DynamicFormBuilder {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            showComputedFields: false,
            showSystemFields: false,
            fieldOrder: options.fieldOrder || [],
            fieldGroups: options.fieldGroups || {},
            ...options
        };
        this.schema = null;
        this.formData = {};
    }

    /**
     * Fetch schema from API and build form
     */
    async fetchAndBuild(schemaUrl) {
        try {
            const response = await fetch(schemaUrl);
            if (!response.ok) throw new Error('Failed to fetch schema');
            
            this.schema = await response.json();
            this.buildForm();
            return true;
        } catch (error) {
            console.error('Error fetching schema:', error);
            this.showError('Failed to load form schema. Please refresh the page.');
            return false;
        }
    }

    /**
     * Filter fields to show only user-editable ones
     */
    filterFields() {
        if (!this.schema || !this.schema.fields) return [];

        return this.schema.fields.filter(field => {
            // Skip computed fields
            if (field.type === 'formula' || field.type === 'rollup' || field.type === 'count' || 
                field.type === 'lookup' || field.type === 'autoNumber' || field.type === 'createdTime' || 
                field.type === 'lastModifiedTime' || field.type === 'createdBy' || field.type === 'lastModifiedBy') {
                return false;
            }

            // Skip system fields unless explicitly enabled
            if (!this.options.showSystemFields && field.name.startsWith('_')) {
                return false;
            }

            // Skip fields with specific patterns (Airtable computed fields)
            if (field.name.includes('(from ') || field.name.includes('(rollup)') || 
                field.name.includes('(lookup)') || field.name.includes('(formula)')) {
                return false;
            }

            return true;
        });
    }

    /**
     * Build the form HTML
     */
    buildForm() {
        if (!this.container) {
            console.error('Form container not found');
            return;
        }

        const fields = this.filterFields();
        
        // Group fields if grouping is specified
        const groups = this.groupFields(fields);
        
        let formHTML = '<form id="dynamicForm" class="dynamic-form">';
        
        // Render each group
        for (const [groupName, groupFields] of Object.entries(groups)) {
            if (groupName !== 'default') {
                formHTML += `<div class="form-group-section">
                    <h3 class="form-group-title">${groupName}</h3>
                </div>`;
            }
            
            groupFields.forEach(field => {
                formHTML += this.renderField(field);
            });
        }
        
        formHTML += `
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Submit Request</button>
                <button type="reset" class="btn btn-secondary">Clear Form</button>
            </div>
        </form>`;
        
        this.container.innerHTML = formHTML;
        this.attachEventListeners();
    }

    /**
     * Group fields based on configuration
     */
    groupFields(fields) {
        const groups = { default: [] };
        
        fields.forEach(field => {
            let groupName = 'default';
            
            // Check if field belongs to a specific group
            for (const [group, fieldNames] of Object.entries(this.options.fieldGroups)) {
                if (fieldNames.includes(field.name)) {
                    groupName = group;
                    break;
                }
            }
            
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(field);
        });
        
        return groups;
    }

    /**
     * Render a single field based on its type
     */
    renderField(field) {
        const fieldId = this.sanitizeId(field.name);
        const isRequired = field.options?.required || false;
        const requiredAttr = isRequired ? 'required' : '';
        const requiredLabel = isRequired ? '<span class="required">*</span>' : '';
        
        let fieldHTML = `<div class="form-group" data-field-type="${field.type}">
            <label for="${fieldId}">${field.name}${requiredLabel}</label>`;
        
        switch (field.type) {
            case 'singleLineText':
                fieldHTML += `<input type="text" id="${fieldId}" name="${field.name}" 
                    class="form-control" ${requiredAttr} 
                    placeholder="Enter ${field.name.toLowerCase()}">`;
                break;
                
            case 'multilineText':
                fieldHTML += `<textarea id="${fieldId}" name="${field.name}" 
                    class="form-control" rows="4" ${requiredAttr}
                    placeholder="Enter ${field.name.toLowerCase()}"></textarea>`;
                break;
                
            case 'number':
                const precision = field.options?.precision || 0;
                const step = precision > 0 ? Math.pow(10, -precision) : 1;
                fieldHTML += `<input type="number" id="${fieldId}" name="${field.name}" 
                    class="form-control" step="${step}" ${requiredAttr}
                    placeholder="Enter ${field.name.toLowerCase()}">`;
                break;
                
            case 'singleSelect':
                fieldHTML += `<select id="${fieldId}" name="${field.name}" 
                    class="form-control" ${requiredAttr}>
                    <option value="">Select ${field.name.toLowerCase()}...</option>`;
                if (field.options && field.options.choices) {
                    field.options.choices.forEach(choice => {
                        fieldHTML += `<option value="${choice.name}">${choice.name}</option>`;
                    });
                }
                fieldHTML += `</select>`;
                break;
                
            case 'multipleSelects':
                fieldHTML += `<select id="${fieldId}" name="${field.name}" 
                    class="form-control" multiple ${requiredAttr}>`;
                if (field.options && field.options.choices) {
                    field.options.choices.forEach(choice => {
                        fieldHTML += `<option value="${choice.name}">${choice.name}</option>`;
                    });
                }
                fieldHTML += `</select>
                    <small class="form-text">Hold Ctrl/Cmd to select multiple</small>`;
                break;
                
            case 'multipleRecordLinks':
                // For linked records, we'll need to fetch the options via API
                fieldHTML += `<select id="${fieldId}" name="${field.name}" 
                    class="form-control" multiple ${requiredAttr} 
                    data-linked-table="${field.options?.linkedTableId || ''}">
                    <option value="">Loading options...</option>
                </select>
                <small class="form-text">Hold Ctrl/Cmd to select multiple</small>`;
                break;
                
            case 'checkbox':
                fieldHTML += `<div class="form-check">
                    <input type="checkbox" id="${fieldId}" name="${field.name}" 
                        class="form-check-input" ${requiredAttr}>
                    <label class="form-check-label" for="${fieldId}">Yes</label>
                </div>`;
                break;
                
            case 'date':
                fieldHTML += `<input type="date" id="${fieldId}" name="${field.name}" 
                    class="form-control" ${requiredAttr}>`;
                break;
                
            case 'dateTime':
                fieldHTML += `<input type="datetime-local" id="${fieldId}" name="${field.name}" 
                    class="form-control" ${requiredAttr}>`;
                break;
                
            case 'url':
                fieldHTML += `<input type="url" id="${fieldId}" name="${field.name}" 
                    class="form-control" ${requiredAttr}
                    placeholder="https://example.com">`;
                break;
                
            case 'email':
                fieldHTML += `<input type="email" id="${fieldId}" name="${field.name}" 
                    class="form-control" ${requiredAttr}
                    placeholder="email@example.com">`;
                break;
                
            case 'phoneNumber':
                fieldHTML += `<input type="tel" id="${fieldId}" name="${field.name}" 
                    class="form-control" ${requiredAttr}
                    placeholder="+1 (555) 123-4567">`;
                break;
                
            case 'rating':
                const max = field.options?.max || 5;
                fieldHTML += `<input type="number" id="${fieldId}" name="${field.name}" 
                    class="form-control" min="1" max="${max}" ${requiredAttr}
                    placeholder="Rate from 1 to ${max}">`;
                break;
                
            case 'duration':
                fieldHTML += `<input type="number" id="${fieldId}" name="${field.name}" 
                    class="form-control" ${requiredAttr}
                    placeholder="Duration in seconds">`;
                break;
                
            case 'currency':
                const symbol = field.options?.symbol || '$';
                fieldHTML += `<div class="input-group">
                    <span class="input-group-text">${symbol}</span>
                    <input type="number" id="${fieldId}" name="${field.name}" 
                        class="form-control" step="0.01" ${requiredAttr}
                        placeholder="0.00">
                </div>`;
                break;
                
            case 'percent':
                fieldHTML += `<div class="input-group">
                    <input type="number" id="${fieldId}" name="${field.name}" 
                        class="form-control" min="0" max="100" step="0.1" ${requiredAttr}
                        placeholder="0">
                    <span class="input-group-text">%</span>
                </div>`;
                break;
                
            case 'attachment':
                fieldHTML += `<input type="file" id="${fieldId}" name="${field.name}" 
                    class="form-control" multiple ${requiredAttr}>
                    <small class="form-text">You can select multiple files</small>`;
                break;
                
            default:
                // Fallback to text input for unknown types
                fieldHTML += `<input type="text" id="${fieldId}" name="${field.name}" 
                    class="form-control" ${requiredAttr}
                    placeholder="Enter ${field.name.toLowerCase()}">
                    <small class="form-text text-muted">Type: ${field.type}</small>`;
        }
        
        fieldHTML += `</div>`;
        return fieldHTML;
    }

    /**
     * Sanitize field name to use as HTML ID
     */
    sanitizeId(name) {
        return 'field_' + name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }

    /**
     * Attach event listeners to the form
     */
    attachEventListeners() {
        const form = document.getElementById('dynamicForm');
        if (!form) return;
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit(e);
        });
        
        // Form reset
        form.addEventListener('reset', () => {
            this.formData = {};
        });
        
        // Load linked record options
        this.loadLinkedRecordOptions();
    }

    /**
     * Load options for linked record fields
     */
    async loadLinkedRecordOptions() {
        const linkedFields = this.container.querySelectorAll('[data-linked-table]');
        
        for (const field of linkedFields) {
            const linkedTableId = field.getAttribute('data-linked-table');
            if (!linkedTableId) continue;
            
            try {
                // Determine which endpoint to use based on field name
                const fieldName = field.name;
                let endpoint = null;
                
                if (fieldName.toLowerCase().includes('workflow')) {
                    endpoint = '/api/lookups/workflows';
                } else if (fieldName.toLowerCase().includes('entit')) {
                    endpoint = '/api/lookups/entities';
                } else if (fieldName.toLowerCase().includes('persona')) {
                    endpoint = '/api/lookups/personas';
                }
                
                if (endpoint) {
                    const response = await fetch(endpoint);
                    if (response.ok) {
                        const options = await response.json();
                        field.innerHTML = options.map(opt => 
                            `<option value="${opt.id}">${opt.name}</option>`
                        ).join('');
                    }
                }
            } catch (error) {
                console.error('Failed to load options for', field.name, error);
            }
        }
    }

    /**
     * Handle form submission
     */
    async handleSubmit(event) {
        const form = event.target;
        const formData = new FormData(form);
        
        // Convert FormData to object
        const data = {};
        for (const [key, value] of formData.entries()) {
            // Handle multiple selects
            if (form.elements[key] && form.elements[key].multiple) {
                if (!data[key]) data[key] = [];
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }
        
        this.formData = data;
        
        // Trigger custom event for parent to handle
        const submitEvent = new CustomEvent('dynamicFormSubmit', {
            detail: { data: this.formData }
        });
        this.container.dispatchEvent(submitEvent);
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        }
    }

    /**
     * Get form data
     */
    getData() {
        return this.formData;
    }

    /**
     * Set form data (for editing)
     */
    setData(data) {
        this.formData = data;
        
        // Populate form fields
        for (const [key, value] of Object.entries(data)) {
            const fieldId = this.sanitizeId(key);
            const field = document.getElementById(fieldId);
            
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = !!value;
                } else if (field.multiple) {
                    // Handle multiple select
                    const values = Array.isArray(value) ? value : [value];
                    Array.from(field.options).forEach(option => {
                        option.selected = values.includes(option.value);
                    });
                } else {
                    field.value = value;
                }
            }
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicFormBuilder;
}

