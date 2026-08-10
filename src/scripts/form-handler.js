/**
 * Form Handler for Palak Steel Mill
 * Handles contact form submissions with validation and Web3Forms integration
 */

// Posts to our own PHP handler (public/contact.php) rather than a third-party
// form service: the site runs on PHP and info@psml.ke is a mailbox on the same
// server, so there is no submission cap and no public API key to leak.
const ENDPOINT = '/contact.php';

/**
 * Initialize all forms on the page
 */
export function initForms() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        stampRenderTime(contactForm);
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
 * Record when the form became available. contact.php rejects submissions that
 * arrive implausibly fast, which filters most naive bots.
 */
function stampRenderTime(form) {
    const field = form.querySelector('input[name="started_at"]');
    if (field) field.value = String(Date.now());
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
            const formData = new FormData(form);

            // The Accept header is what tells contact.php to answer with JSON
            // instead of the redirect it serves to no-JS submissions.
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showStatus(statusDiv, data.message || 'Thank you! Your message has been sent.', 'success');
                form.reset();
                stampRenderTime(form);   // reset the timing trap for a second enquiry
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
