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
});
