/**
 * Pagination Manager - Handle large datasets smoothly
 * Supports both traditional pagination and "Load More" pattern
 */

class Pagination {
    constructor(items, itemsPerPage = 50) {
        this.allItems = items;
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
        this.totalPages = Math.ceil(items.length / itemsPerPage);
    }

    /**
     * Get items for current page
     */
    getCurrentPageItems() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.allItems.slice(start, end);
    }

    /**
     * Get items up to current page (for "Load More" pattern)
     */
    getItemsUpToCurrentPage() {
        const end = this.currentPage * this.itemsPerPage;
        return this.allItems.slice(0, end);
    }

    /**
     * Go to next page
     */
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            return true;
        }
        return false;
    }

    /**
     * Go to previous page
     */
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            return true;
        }
        return false;
    }

    /**
     * Go to specific page
     */
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            return true;
        }
        return false;
    }

    /**
     * Check if there are more pages
     */
    hasMore() {
        return this.currentPage < this.totalPages;
    }

    /**
     * Get pagination info
     */
    getInfo() {
        const start = (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(this.currentPage * this.itemsPerPage, this.allItems.length);
        
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            itemsPerPage: this.itemsPerPage,
            totalItems: this.allItems.length,
            start,
            end,
            hasNext: this.currentPage < this.totalPages,
            hasPrev: this.currentPage > 1
        };
    }

    /**
     * Reset to first page
     */
    reset() {
        this.currentPage = 1;
    }

    /**
     * Update items (e.g., after filtering)
     */
    updateItems(items) {
        this.allItems = items;
        this.totalPages = Math.ceil(items.length / this.itemsPerPage);
        this.currentPage = 1; // Reset to first page
    }
}

/**
 * Create pagination controls HTML
 */
function createPaginationControls(pagination, onPageChange) {
    const info = pagination.getInfo();
    
    if (info.totalPages <= 1) {
        return ''; // No pagination needed
    }
    
    const controls = document.createElement('div');
    controls.className = 'pagination-controls';
    controls.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 20px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
    `;
    
    // Info text
    const infoText = document.createElement('div');
    infoText.className = 'pagination-info';
    infoText.textContent = `Showing ${info.start}-${info.end} of ${info.totalItems}`;
    infoText.style.cssText = 'color: #666; font-size: 14px;';
    
    // Buttons container
    const buttons = document.createElement('div');
    buttons.className = 'pagination-buttons';
    buttons.style.cssText = 'display: flex; gap: 10px;';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.disabled = !info.hasPrev;
    prevBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: ${info.hasPrev ? 'pointer' : 'not-allowed'};
        opacity: ${info.hasPrev ? '1' : '0.5'};
    `;
    prevBtn.onclick = () => {
        if (pagination.prevPage()) {
            onPageChange();
        }
    };
    
    // Page indicator
    const pageIndicator = document.createElement('div');
    pageIndicator.className = 'page-indicator';
    pageIndicator.textContent = `Page ${info.currentPage} of ${info.totalPages}`;
    pageIndicator.style.cssText = 'padding: 8px 16px; color: #333; font-weight: 500;';
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = !info.hasNext;
    nextBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: ${info.hasNext ? 'pointer' : 'not-allowed'};
        opacity: ${info.hasNext ? '1' : '0.5'};
    `;
    nextBtn.onclick = () => {
        if (pagination.nextPage()) {
            onPageChange();
        }
    };
    
    buttons.appendChild(prevBtn);
    buttons.appendChild(pageIndicator);
    buttons.appendChild(nextBtn);
    
    controls.appendChild(infoText);
    controls.appendChild(buttons);
    
    return controls;
}

/**
 * Create "Load More" button
 */
function createLoadMoreButton(pagination, onLoadMore) {
    if (!pagination.hasMore()) {
        return null;
    }
    
    const button = document.createElement('button');
    button.className = 'load-more-btn';
    button.textContent = 'Load More';
    button.style.cssText = `
        display: block;
        margin: 20px auto;
        padding: 12px 24px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
    `;
    button.onclick = () => {
        if (pagination.nextPage()) {
            onLoadMore();
        }
    };
    
    return button;
}

/**
 * Debounce utility - Delay function execution
 * Reduces unnecessary API calls and renders
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle utility - Limit function execution rate
 * Useful for scroll and resize events
 */
function throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Expose globally
window.Pagination = Pagination;
window.createPaginationControls = createPaginationControls;
window.createLoadMoreButton = createLoadMoreButton;
window.debounce = debounce;
window.throttle = throttle;

// Expose for debugging
window.debugPagination = (pagination) => {
    console.log('Pagination Info:', pagination.getInfo());
};

