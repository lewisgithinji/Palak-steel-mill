/**
 * THE PALAK GROUP - Shared UI Components
 * 
 * This module exports reusable JavaScript components and utilities
 * for creating consistent UI across all Palak Group websites.
 */

// ============================================
// MOBILE NAVIGATION
// ============================================

export function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');
  const body = document.body;

  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    menu.classList.toggle('open');
    body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) {
      menu.classList.remove('open');
      body.style.overflow = '';
    }
  });

  // Close menu when pressing Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      menu.classList.remove('open');
      body.style.overflow = '';
    }
  });
}

// ============================================
// HEADER SCROLL EFFECT
// ============================================

export function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  });
}

// ============================================
// SCROLL ANIMATIONS (Intersection Observer)
// ============================================

export function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('[data-animate]');
  
  if (!animatedElements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Optionally unobserve after animation
          // observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }
  );

  animatedElements.forEach((el) => observer.observe(el));
}

// ============================================
// SMOOTH SCROLL
// ============================================

export function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      
      const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    });
  });
}

// ============================================
// COUNTER ANIMATION
// ============================================

export function initCounterAnimation() {
  const counters = document.querySelectorAll('[data-counter]');
  
  if (!counters.length) return;

  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute('data-counter'), 10);
    const duration = parseInt(el.getAttribute('data-duration') || '2000', 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const start = 0;
    const startTime = performance.now();

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      const current = Math.floor(start + (target - start) * easeOutQuad);

      el.textContent = current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    requestAnimationFrame(updateCounter);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((counter) => observer.observe(counter));
}

// ============================================
// FORM VALIDATION
// ============================================

export function initFormValidation(formSelector) {
  const form = document.querySelector(formSelector);
  if (!form) return;

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone) => {
    const re = /^[\d\s\-+()]{10,}$/;
    return re.test(phone);
  };

  const showError = (input, message) => {
    const formGroup = input.closest('.form-group');
    const existingError = formGroup.querySelector('.form-error');
    
    if (existingError) {
      existingError.textContent = message;
    } else {
      const error = document.createElement('span');
      error.className = 'form-error';
      error.textContent = message;
      formGroup.appendChild(error);
    }
    
    input.classList.add('error');
  };

  const clearError = (input) => {
    const formGroup = input.closest('.form-group');
    const error = formGroup.querySelector('.form-error');
    if (error) error.remove();
    input.classList.remove('error');
  };

  form.addEventListener('submit', (e) => {
    let isValid = true;

    // Validate required fields
    form.querySelectorAll('[required]').forEach((input) => {
      clearError(input);
      
      if (!input.value.trim()) {
        showError(input, 'This field is required');
        isValid = false;
      } else if (input.type === 'email' && !validateEmail(input.value)) {
        showError(input, 'Please enter a valid email address');
        isValid = false;
      } else if (input.type === 'tel' && !validatePhone(input.value)) {
        showError(input, 'Please enter a valid phone number');
        isValid = false;
      }
    });

    if (!isValid) {
      e.preventDefault();
    }
  });

  // Clear errors on input
  form.querySelectorAll('input, textarea, select').forEach((input) => {
    input.addEventListener('input', () => clearError(input));
  });
}

// ============================================
// LAZY LOADING IMAGES
// ============================================

export function initLazyLoad() {
  const lazyImages = document.querySelectorAll('img[data-src]');
  
  if (!lazyImages.length) return;

  const imageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          img.classList.add('loaded');
          imageObserver.unobserve(img);
        }
      });
    },
    { rootMargin: '50px 0px' }
  );

  lazyImages.forEach((img) => imageObserver.observe(img));
}

// ============================================
// INIT ALL
// ============================================

export function initAll() {
  initMobileNav();
  initHeaderScroll();
  initScrollAnimations();
  initSmoothScroll();
  initCounterAnimation();
  initLazyLoad();
}

// Auto-init on DOMContentLoaded
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initAll);
}
