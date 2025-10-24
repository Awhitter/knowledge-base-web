/**
 * Animations - Smooth transitions and effects
 * Respects prefers-reduced-motion for accessibility
 */

class Animations {
    constructor() {
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.init();
    }

    /**
     * Initialize animations
     */
    init() {
        // Add CSS
        this.injectCSS();

        // Setup page transition animations
        this.setupPageTransitions();

        // Setup scroll animations
        this.setupScrollAnimations();

        // Setup hover effects
        this.setupHoverEffects();

        console.log('[Animations] Initialized (reduced motion:', this.prefersReducedMotion, ')');
    }

    /**
     * Inject animation CSS
     */
    injectCSS() {
        const css = `
            /* Respect reduced motion preference */
            @media (prefers-reduced-motion: reduce) {
                *,
                *::before,
                *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                    scroll-behavior: auto !important;
                }
            }

            /* Page transitions */
            .page-content {
                animation: fadeIn 0.3s ease-in-out;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Fade in from bottom */
            .fade-in-up {
                animation: fadeInUp 0.5s ease-out;
            }

            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Fade in from left */
            .fade-in-left {
                animation: fadeInLeft 0.5s ease-out;
            }

            @keyframes fadeInLeft {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            /* Scale in */
            .scale-in {
                animation: scaleIn 0.3s ease-out;
            }

            @keyframes scaleIn {
                from {
                    opacity: 0;
                    transform: scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            /* Slide in from right */
            .slide-in-right {
                animation: slideInRight 0.4s ease-out;
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                }
                to {
                    transform: translateX(0);
                }
            }

            /* Skeleton loading */
            .skeleton {
                background: linear-gradient(
                    90deg,
                    var(--bg-tertiary) 25%,
                    var(--bg-secondary) 50%,
                    var(--bg-tertiary) 75%
                );
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s ease-in-out infinite;
            }

            @keyframes skeleton-loading {
                0% {
                    background-position: 200% 0;
                }
                100% {
                    background-position: -200% 0;
                }
            }

            /* Pulse animation */
            .pulse {
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }

            /* Bounce animation */
            .bounce {
                animation: bounce 1s ease-in-out infinite;
            }

            @keyframes bounce {
                0%, 100% {
                    transform: translateY(0);
                }
                50% {
                    transform: translateY(-10px);
                }
            }

            /* Smooth transitions for all interactive elements */
            button,
            a,
            input,
            select,
            textarea,
            .card,
            .metric-card {
                transition: all 0.2s ease;
            }

            /* Hover effects */
            button:hover,
            a:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            button:active,
            a:active {
                transform: translateY(0);
            }

            .card:hover,
            .metric-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            }

            /* Modal animations */
            .modal-overlay {
                animation: fadeIn 0.3s ease-out;
            }

            .modal-overlay > div {
                animation: scaleIn 0.3s ease-out;
            }

            /* Toast animations */
            .toast {
                animation: slideInRight 0.4s ease-out;
            }

            .toast.hiding {
                animation: slideOutRight 0.4s ease-out;
            }

            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                }
                to {
                    transform: translateX(120%);
                }
            }

            /* Loading spinner animation */
            .loading-spinner {
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }

            /* Stagger animation for lists */
            .stagger-item {
                opacity: 0;
                animation: fadeInUp 0.5s ease-out forwards;
            }

            .stagger-item:nth-child(1) { animation-delay: 0.05s; }
            .stagger-item:nth-child(2) { animation-delay: 0.1s; }
            .stagger-item:nth-child(3) { animation-delay: 0.15s; }
            .stagger-item:nth-child(4) { animation-delay: 0.2s; }
            .stagger-item:nth-child(5) { animation-delay: 0.25s; }
            .stagger-item:nth-child(6) { animation-delay: 0.3s; }
            .stagger-item:nth-child(7) { animation-delay: 0.35s; }
            .stagger-item:nth-child(8) { animation-delay: 0.4s; }
            .stagger-item:nth-child(9) { animation-delay: 0.45s; }
            .stagger-item:nth-child(10) { animation-delay: 0.5s; }

            /* Smooth scrolling */
            html {
                scroll-behavior: smooth;
            }

            /* Focus animations */
            input:focus,
            textarea:focus,
            select:focus {
                outline: none;
                box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
                transform: scale(1.02);
            }

            /* Progress bar animation */
            .progress-bar {
                animation: progressBar 2s ease-out;
            }

            @keyframes progressBar {
                from {
                    width: 0;
                }
            }
        `;

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * Setup page transition animations
     */
    setupPageTransitions() {
        if (this.prefersReducedMotion) return;

        // Observe page content changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList) {
                        // Add fade-in animation to new content
                        if (node.id && node.id.includes('Page')) {
                            node.classList.add('fade-in-up');
                        }
                    }
                });
            });
        });

        const container = document.querySelector('.container');
        if (container) {
            observer.observe(container, { childList: true, subtree: true });
        }
    }

    /**
     * Setup scroll animations
     */
    setupScrollAnimations() {
        if (this.prefersReducedMotion) return;

        // Intersection Observer for scroll animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-up');
                }
            });
        }, {
            threshold: 0.1
        });

        // Observe cards and metric cards
        document.querySelectorAll('.card, .metric-card, .chart-section').forEach((el) => {
            observer.observe(el);
        });
    }

    /**
     * Setup hover effects
     */
    setupHoverEffects() {
        if (this.prefersReducedMotion) return;

        // Add ripple effect to buttons
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const button = e.target;
                const ripple = document.createElement('span');
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.6);
                    left: ${x}px;
                    top: ${y}px;
                    pointer-events: none;
                    animation: ripple 0.6s ease-out;
                `;

                button.style.position = 'relative';
                button.style.overflow = 'hidden';
                button.appendChild(ripple);

                setTimeout(() => ripple.remove(), 600);
            }
        });

        // Add ripple animation
        const rippleCSS = `
            @keyframes ripple {
                from {
                    transform: scale(0);
                    opacity: 1;
                }
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        const style = document.createElement('style');
        style.textContent = rippleCSS;
        document.head.appendChild(style);
    }

    /**
     * Animate element with specified animation
     */
    animate(element, animationName) {
        if (this.prefersReducedMotion) return;

        element.classList.add(animationName);
        element.addEventListener('animationend', () => {
            element.classList.remove(animationName);
        }, { once: true });
    }

    /**
     * Create skeleton loader
     */
    createSkeleton(width = '100%', height = '20px') {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton';
        skeleton.style.width = width;
        skeleton.style.height = height;
        skeleton.style.borderRadius = '4px';
        return skeleton;
    }

    /**
     * Stagger animate list items
     */
    staggerAnimate(container) {
        if (this.prefersReducedMotion) return;

        const items = container.querySelectorAll('tr, .card, .metric-card');
        items.forEach((item, index) => {
            if (index < 10) {
                item.classList.add('stagger-item');
            }
        });
    }
}

// Initialize animations
window.animations = new Animations();

// Expose helper functions
window.animateElement = (el, animation) => window.animations.animate(el, animation);
window.createSkeleton = (width, height) => window.animations.createSkeleton(width, height);
window.staggerAnimate = (container) => window.animations.staggerAnimate(container);

console.log('[Animations] Module loaded and initialized.');

