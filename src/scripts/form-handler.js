/**
 * Form Handler for Palak Steel Mill
 * Handles contact form submissions with validation and Web3Forms integration
 */

// The site is hosted on Cloudflare Pages, which serves static files only and so
// cannot run a handler of our own - submissions go to Web3Forms. The endpoint
// and access key live on the <form> itself (action + a hidden input) so the
// no-JS path keeps working and there is a single place to edit the key.
// The key is injected at build time from VITE_WEB3FORMS_KEY. If that variable is
// missing, Vite leaves the token untouched, so treat the raw token as "unset"
// too - otherwise a misconfigured deploy posts the literal string and the only
// clue is a 403 from the API.
const UNSET_KEYS = ['%VITE_WEB3FORMS_KEY%', 'YOUR_WEB3FORMS_ACCESS_KEY', ''];

/**
 * Initialize all forms on the page
 */
export function initForms() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        setupFormSubmission(contactForm);
        setupFormValidation(contactForm);
        showRedirectResult(contactForm);
    }
}

/**
 * A no-JS submission lands back here as /contact.html?sent=1|0. Surface that as
 * the same status banner a fetch() submission would produce, then drop the
 * parameter so a refresh does not repeat the message.
 */
function showRedirectResult(form) {
    const sent = new URLSearchParams(window.location.search).get('sent');
    if (sent === null) return;
    const statusDiv = getOrCreateStatusDiv(form);
    if (sent === '1') {
        showStatus(statusDiv, 'Thank you! Your message has been sent. We will get back to you within 24 hours.', 'success');
    } else {
        showStatus(statusDiv, 'Sorry, we could not send your message. Please call +254 716 923 777 or email info@psml.ke.', 'error');
    }
    window.history.replaceState({}, '', window.location.pathname);
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

        // Fail loudly in the console rather than sending a request that is
        // guaranteed to come back rejected.
        const keyField = form.querySelector('input[name="access_key"]');
        if (!keyField || UNSET_KEYS.includes(keyField.value.trim())) {
            showStatus(statusDiv, 'Sorry, the form is unavailable right now. Please call +254 716 923 777 or email info@psml.ke.', 'error');
            console.error('Contact form: VITE_WEB3FORMS_KEY was not set at build time, so no access key was injected.');
            return;
        }

        // Disable submit button
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
            const formData = new FormData(form);

            // 'redirect' is only meaningful for a no-JS form post; leaving it in
            // an AJAX request makes Web3Forms answer with a redirect instead of
            // the JSON this handler expects.
            formData.delete('redirect');
            // Lets the recipient reply straight to the enquirer from the inbox.
            const email = form.querySelector('[name="email"]');
            if (email && email.value) formData.set('replyto', email.value);

            const response = await fetch(form.action, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showStatus(statusDiv, 'Thank you! Your message has been sent. We will get back to you within 24 hours.', 'success');
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
