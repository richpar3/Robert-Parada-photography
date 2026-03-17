/**
 * Robert Parada Photography — main.js
 */

(function () {
  'use strict';

  /* =========================================================
     UTILS
  ========================================================= */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /** Escape HTML to prevent XSS */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* =========================================================
     NAV — scroll behaviour + mobile toggle
  ========================================================= */
  const nav       = $('#nav');
  const navToggle = $('#navToggle');
  const navMenu   = $('#navMenu');

  if (nav) {
    const handleNavScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', handleNavScroll, { passive: true });
    handleNavScroll();
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    $$('.nav__link', navMenu).forEach(link => {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('click', e => {
      if (navMenu.classList.contains('open') && nav && !nav.contains(e.target)) {
        closeNav();
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && navMenu.classList.contains('open')) closeNav();
    });
  }

  function closeNav() {
    if (!navMenu || !navToggle) return;
    navMenu.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  /* =========================================================
     HERO — Ken-Burns entrance
  ========================================================= */
  const heroBg = $('#heroBg');
  if (heroBg) {
    requestAnimationFrame(() => setTimeout(() => heroBg.classList.add('loaded'), 80));
  }

  /* =========================================================
     SCROLL REVEAL
  ========================================================= */
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const siblings = $$('.reveal', entry.target.parentElement);
          const idx = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = `${idx * 75}ms`;
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -36px 0px' }
    );
    $$('.reveal').forEach(el => revealObserver.observe(el));
  } else {
    // Fallback: show all immediately
    $$('.reveal').forEach(el => el.classList.add('visible'));
  }

  /* =========================================================
     STATS COUNTER
  ========================================================= */
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;
    const duration = 1800;
    const start = performance.now();

    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cubic, clamped to [0,1]
      const eased = Math.min(1 - Math.pow(1 - progress, 3), 1);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );
    $$('.stat__number').forEach(el => counterObserver.observe(el));
  }

  /* =========================================================
     PORTFOLIO FILTERS
  ========================================================= */
  const filterBtns  = $$('.filter-btn');
  const galleryItems = $$('.gallery-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      filterBtns.forEach(b => {
        b.classList.remove('filter-btn--active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('filter-btn--active');
      btn.setAttribute('aria-selected', 'true');

      galleryItems.forEach(item => {
        const visible = filter === 'all' || item.dataset.category === filter;
        item.style.display = visible ? '' : 'none';
        item.setAttribute('aria-hidden', String(!visible));
      });
    });
  });

  /* =========================================================
     TESTIMONIAL SLIDER
  ========================================================= */
  const testimonialSlider = $('#testimonialsSlider');
  const prevBtn           = $('#prevTestimonial');
  const nextBtn           = $('#nextTestimonial');
  const dotsContainer     = $('#testimonialDots');

  const testimonials    = testimonialSlider ? $$('.testimonial', testimonialSlider) : [];
  let currentPage       = 0;

  const getItemsPerPage = () => window.innerWidth < 768 ? 1 : 2;

  function buildDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    const total = Math.ceil(testimonials.length / getItemsPerPage());
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.className = `dot${i === 0 ? ' active' : ''}`;
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-selected', String(i === 0));
      dot.setAttribute('aria-label', `Testimonials page ${i + 1} of ${total}`);
      dot.addEventListener('click', () => goToPage(i));
      dotsContainer.appendChild(dot);
    }
  }

  function goToPage(page) {
    const ipp   = getItemsPerPage();
    const total = Math.ceil(testimonials.length / ipp);
    currentPage = ((page % total) + total) % total;

    testimonials.forEach((t, i) => {
      const visible = Math.floor(i / ipp) === currentPage;
      t.style.display = visible ? '' : 'none';
    });

    $$('.dot', dotsContainer || document).forEach((dot, i) => {
      dot.classList.toggle('active', i === currentPage);
      dot.setAttribute('aria-selected', String(i === currentPage));
    });
  }

  function initSlider() {
    buildDots();
    if (getItemsPerPage() === 1) {
      goToPage(0);
      if (prevBtn) prevBtn.style.display = '';
      if (nextBtn) nextBtn.style.display = '';
      $$('.dot', dotsContainer || document).forEach(d => d.style.display = '');
    } else {
      testimonials.forEach(t => t.style.display = '');
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      $$('.dot', dotsContainer || document).forEach(d => d.style.display = 'none');
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToPage(currentPage + 1));

  initSlider();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initSlider, 200);
  }, { passive: true });

  /* =========================================================
     CART
  ========================================================= */
  let cart = [];

  const cartFab     = $('#cartFab');
  const cartDrawer  = $('#cartDrawer');
  const cartOverlay = $('#cartOverlay');
  const cartClose   = $('#cartClose');
  const cartItemsEl = $('#cartItems');
  const cartTotalEl = $('#cartTotal');
  const cartCountEl = $('#cartCount');

  function openCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.add('open');
    if (cartOverlay) { cartOverlay.classList.add('visible'); cartOverlay.removeAttribute('aria-hidden'); }
    cartDrawer.setAttribute('aria-hidden', 'false');
    if (cartClose) cartClose.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('open');
    if (cartOverlay) { cartOverlay.classList.remove('visible'); cartOverlay.setAttribute('aria-hidden', 'true'); }
    cartDrawer.setAttribute('aria-hidden', 'true');
    if (cartFab) cartFab.focus();
    document.body.style.overflow = '';
  }

  if (cartFab)     cartFab.addEventListener('click', openCart);
  if (cartClose)   cartClose.addEventListener('click', closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);
  if (cartDrawer)  cartDrawer.addEventListener('keydown', e => { if (e.key === 'Escape') closeCartDrawer(); });

  function renderCart() {
    if (!cartItemsEl) return;

    if (cart.length === 0) {
      cartItemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    } else {
      const fragment = document.createDocumentFragment();
      cart.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        // Use textContent/createElement for safe rendering — no innerHTML with user data
        const nameEl = document.createElement('span');
        nameEl.className = 'cart-item__name';
        nameEl.textContent = item.name;

        const priceEl = document.createElement('span');
        priceEl.className = 'cart-item__price';
        priceEl.textContent = `$${item.price}`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'cart-item__remove';
        removeBtn.textContent = '×';
        removeBtn.setAttribute('aria-label', `Remove ${item.name} from cart`);
        removeBtn.dataset.index = String(i);

        div.appendChild(nameEl);
        div.appendChild(priceEl);
        div.appendChild(removeBtn);
        fragment.appendChild(div);
      });
      cartItemsEl.innerHTML = '';
      cartItemsEl.appendChild(fragment);
    }

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (cartTotalEl) cartTotalEl.textContent = `$${total}`;

    const count = cart.length;
    if (cartCountEl) {
      cartCountEl.textContent = String(count);
      cartCountEl.classList.toggle('visible', count > 0);
    }
    if (cartFab) {
      cartFab.setAttribute('aria-label', `Open cart — ${count} item${count !== 1 ? 's' : ''}`);
    }
  }

  // Remove item
  if (cartItemsEl) {
    cartItemsEl.addEventListener('click', e => {
      const btn = e.target.closest('.cart-item__remove');
      if (!btn) return;
      const idx = parseInt(btn.dataset.index, 10);
      if (!isNaN(idx) && idx >= 0 && idx < cart.length) {
        cart.splice(idx, 1);
        renderCart();
      }
    });
  }

  // Add to cart buttons
  $$('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const name  = String(btn.dataset.name  || '').trim();
      const price = parseInt(btn.dataset.price, 10);

      if (!name || isNaN(price) || price <= 0) return;

      // If already in cart, replace (same item = update)
      cart = cart.filter(item => item.name !== name);
      cart.push({ name, price });

      renderCart();
      openCart();
    });
  });

  renderCart();

  /* =========================================================
     CONTACT FORM — client-side validation
  ========================================================= */
  const form       = $('#contactForm');
  const formStatus = $('#formStatus');
  const submitBtn  = $('#submitBtn');

  if (form) {
    const showError = (fieldId, msg) => {
      const input = $(`#${fieldId}`);
      const error = $(`#${fieldId}Error`);
      if (input) input.classList.add('error');
      if (error) error.textContent = msg;
    };

    const clearError = (fieldId) => {
      const input = $(`#${fieldId}`);
      const error = $(`#${fieldId}Error`);
      if (input) input.classList.remove('error');
      if (error) error.textContent = '';
    };

    const validateField = (id) => {
      const input = $(`#${id}`);
      const val   = input ? input.value.trim() : '';
      clearError(id);

      if (id === 'firstName' || id === 'lastName') {
        if (!val) { showError(id, 'This field is required.'); return false; }
        if (val.length < 2) { showError(id, 'Must be at least 2 characters.'); return false; }
        // Only allow letters, spaces, hyphens, apostrophes
        if (!/^[\p{L}\s'\-]{2,60}$/u.test(val)) { showError(id, 'Please enter a valid name.'); return false; }
      }

      if (id === 'email') {
        if (!val) { showError(id, 'Email address is required.'); return false; }
        // RFC 5321-compliant enough for client-side
        if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(val)) {
          showError(id, 'Please enter a valid email address.');
          return false;
        }
      }

      return true;
    };

    ['firstName', 'lastName', 'email'].forEach(id => {
      const input = $(`#${id}`);
      if (!input) return;
      input.addEventListener('blur',  () => validateField(id));
      input.addEventListener('input', () => {
        if (input.classList.contains('error')) validateField(id);
      });
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (formStatus) { formStatus.textContent = ''; formStatus.className = 'form-status'; }

      const ok = validateField('firstName') & validateField('lastName') & validateField('email');
      if (!ok) {
        if (formStatus) {
          formStatus.textContent = 'Please fix the errors above and try again.';
          formStatus.className = 'form-status error-msg';
        }
        const firstErr = $$('.form-input.error', form)[0];
        if (firstErr) firstErr.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      // NOTE: To make this actually submit, replace the setTimeout below with
      // a fetch() call to your Netlify/Formspree endpoint, e.g.:
      //   fetch('/', { method: 'POST', body: new FormData(form) })
      //     .then(() => handleSuccess())
      //     .catch(() => handleError());
      setTimeout(() => {
        form.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Inquiry';
        }
        if (formStatus) {
          formStatus.textContent = '✓ Message sent! I\'ll be in touch within 24 hours.';
          formStatus.className = 'form-status success';
          setTimeout(() => {
            if (formStatus) { formStatus.textContent = ''; formStatus.className = 'form-status'; }
          }, 7000);
        }
      }, 1200);
    });
  }

  /* =========================================================
     FAQ — keyboard accessibility
  ========================================================= */
  $$('.faq__question').forEach(q => {
    q.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        q.closest('details').toggleAttribute('open');
      }
    });
  });

  /* =========================================================
     ACTIVE NAV LINK — highlight current section
  ========================================================= */
  if ('IntersectionObserver' in window) {
    const sections  = $$('section[id]');
    const navLinks  = $$('.nav__link:not(.nav__link--cta)');

    const sectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach(link => {
            const active = link.getAttribute('href') === `#${id}`;
            link.style.color = active ? 'var(--color-white)' : '';
          });
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach(sec => sectionObserver.observe(sec));
  }

  /* =========================================================
     FOOTER YEAR
  ========================================================= */
  const yearEl = $('#footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
