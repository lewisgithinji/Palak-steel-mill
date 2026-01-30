/**
 * PALAK STEEL MILLS - Main JavaScript
 */

// Import shared UI utilities
import { initAll } from '@palak/ui';
import { initForms } from './scripts/form-handler.js';

// Initialize all shared components
document.addEventListener('DOMContentLoaded', () => {
    initAll();
    initForms();

    // Additional PSML-specific initializations can go here
    console.log('PSML Website Loaded');
});
