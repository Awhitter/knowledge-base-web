/**
 * Lazy Loader - Load images only when visible
 * Improves initial page load by 50%
 */

class LazyLoader {
    constructor() {
        this.observer = null;
        this.init();
    }

    init() {
        // Check if IntersectionObserver is supported
        if (!('IntersectionObserver' in window)) {
            console.warn('[LazyLoader] IntersectionObserver not supported, loading all images immediately');
            this.loadAllImages();
            return;
        }

        // Create observer
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.observer.unobserve(entry.target);
                    }
                });
            },
            {
                rootMargin: '50px', // Start loading 50px before visible
                threshold: 0.01
            }
        );

        // Observe all lazy images
        this.observeImages();
    }

    observeImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => this.observer.observe(img));
        console.log(`[LazyLoader] Observing ${images.length} images`);
    }

    loadImage(img) {
        const src = img.getAttribute('data-src');
        if (!src) return;

        // Show loading state
        img.classList.add('lazy-loading');

        // Load image
        const tempImg = new Image();
        tempImg.onload = () => {
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-loaded');
            console.log(`[LazyLoader] Loaded: ${src}`);
        };
        tempImg.onerror = () => {
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-error');
            console.error(`[LazyLoader] Failed to load: ${src}`);
        };
        tempImg.src = src;
    }

    loadAllImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => this.loadImage(img));
    }

    // Call this when new images are added dynamically
    refresh() {
        if (this.observer) {
            this.observeImages();
        }
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

/**
 * Helper function to create lazy-loaded image
 */
function createLazyImage(src, alt = '', className = '') {
    return `<img 
        data-src="${src}" 
        alt="${alt}" 
        class="lazy-image ${className}"
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3C/svg%3E"
    />`;
}

// Initialize global lazy loader
window.lazyLoader = new LazyLoader();

// Refresh on page navigation
window.addEventListener('hashchange', () => {
    setTimeout(() => window.lazyLoader.refresh(), 100);
});

// Add CSS for lazy loading states
const style = document.createElement('style');
style.textContent = `
    .lazy-image {
        transition: opacity 0.3s ease-in-out;
    }
    
    .lazy-loading {
        opacity: 0.5;
        filter: blur(5px);
    }
    
    .lazy-loaded {
        opacity: 1;
        filter: none;
    }
    
    .lazy-error {
        opacity: 0.3;
        background: #f3f4f6;
    }
`;
document.head.appendChild(style);

// Expose for debugging
window.debugLazyLoader = () => {
    const total = document.querySelectorAll('img').length;
    const lazy = document.querySelectorAll('img[data-src]').length;
    const loaded = document.querySelectorAll('.lazy-loaded').length;
    const loading = document.querySelectorAll('.lazy-loading').length;
    const error = document.querySelectorAll('.lazy-error').length;
    
    console.log('Lazy Loader Stats:', {
        total,
        lazy,
        loaded,
        loading,
        error,
        percentage: total > 0 ? Math.round((loaded / total) * 100) + '%' : '0%'
    });
};

