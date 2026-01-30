/**
 * Form Handler for Palak Steel Mill
 * Handles contact form submissions with validation and Web3Forms integration
 */

// Web3Forms API endpoint
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

// Web3Forms Access Key - REPLACE WITH YOUR KEY for info@psml.ke
const WEB3FORMS_ACCESS_KEY = 'YOUR_WEB3FORMS_ACCESS_KEY_HERE';

/**
 * Initialize all forms on the page
 */
export function initForms() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        setupFormSubmission(contactForm);
        setupFormValidation(contactForm);
    }
}

/**
 * Setup form submission handler
 */
function setupFormSubmission(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form elements
        const submitBtn = form.querySelector('button[type="submit"]');
        const statusDiv = getOrCreateStatusDiv(form);

        // Validate form
        if (!validateForm(form)) {
            showStatus(statusDiv, 'Please fill in all required fields correctly.', 'error');
            return;
        }

        // Disable submit button
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
            // Prepare form data
            const formData = new FormData(form);

            // Add Web3Forms required fields
            formData.append('access_key', WEB3FORMS_ACCESS_KEY);
            formData.append('subject', 'New Contact Form Submission - Palak Steel Mill');
            formData.append('from_name', 'Palak Steel Mill Website');
            formData.append('redirect', 'false');

            // Send to Web3Forms
            const response = await fetch(WEB3FORMS_ENDPOINT, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showStatus(statusDiv, 'Thank you! Your message has been sent successfully.', 'success');
                form.reset();
            } else {
                showStatus(statusDiv, data.message || 'Oops! There was a problem submitting your form. Please try again.', 'error');
            }
        } catch (error) {
            showStatus(statusDiv, 'Network error. Please check your connection and try again.', 'error');
            console.error('Form submission error:', error);
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
}

function getOrCreateStatusDiv(form) {
    let statusDiv = form.querySelector('.form-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.className = 'form-status';
        statusDiv.style.marginTop = '1rem';
        statusDiv.style.padding = '1rem';
        statusDiv.style.borderRadius = '0.5rem';
        form.appendChild(statusDiv);
    }
    return statusDiv;
}

function showStatus(statusDiv, message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `form-status ${type}`;
    statusDiv.style.display = 'block';

    if (type === 'success') {
        statusDiv.style.backgroundColor = '#ecfdf5';
        statusDiv.style.color = '#065f46';
        statusDiv.style.border = '1px solid #a7f3d0';
        setTimeout(() => { statusDiv.style.display = 'none'; }, 10000);
    } else {
        statusDiv.style.backgroundColor = '#fef2f2';
        statusDiv.style.color = '#991b1b';
        statusDiv.style.border = '1px solid #fecaca';
    }
}

// Validation Helpers
function setupFormValidation(form) {
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });
}

function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    inputs.forEach(input => {
        if (!validateField(input)) isValid = false;
    });
    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    clearFieldError(field);

    if (!value) {
        showFieldError(field, 'This field is required');
        return false;
    }

    if (field.type === 'email' && !validateEmail(value)) {
        showFieldError(field, 'Please enter a valid email');
        return false;
    }

    return true;
}

function showFieldError(field, message) {
    field.style.borderColor = '#dc2626';
    // Add error message logic if needed, currently just red border
}

function clearFieldError(field) {
    field.style.borderColor = '';
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
