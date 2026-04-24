/* ============================================================
   Bond6.io — Main JavaScript
   ============================================================ */

// ── Nav scroll behavior ──
const nav = document.querySelector('.nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const current = window.scrollY;
  if (current > 80) {
    nav.style.borderBottomColor = 'rgba(201,168,76,0.15)';
  } else {
    nav.style.borderBottomColor = '';
  }
  lastScroll = current;
}, { passive: true });

// ── Mobile hamburger ──
const hamburger = document.querySelector('.nav__hamburger');
const navLinks  = document.querySelector('.nav__links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open);
    // Animate spans
    const spans = hamburger.querySelectorAll('span');
    if (open) {
      spans[0].style.transform = 'translateY(6px) rotate(45deg)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'translateY(-6px) rotate(-45deg)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });

  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      const spans = hamburger.querySelectorAll('span');
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    });
  });
}

// ── Fade-up on scroll (Intersection Observer) ──
const fadeEls = document.querySelectorAll(
  '.card, .identity__item, .manifesto-section, .team-card, .value-item, .guideline-item'
);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  fadeEls.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = `opacity 0.6s ease ${i * 0.05}s, transform 0.6s ease ${i * 0.05}s`;
    observer.observe(el);
  });
}

// ── Hero fade-in ──
const heroContent = document.querySelector('.hero__content');
if (heroContent) {
  heroContent.style.opacity = '0';
  heroContent.style.transform = 'translateY(24px)';
  heroContent.style.transition = 'opacity 0.9s ease 0.2s, transform 0.9s ease 0.2s';
  requestAnimationFrame(() => {
    heroContent.style.opacity = '1';
    heroContent.style.transform = 'translateY(0)';
  });
}

// ── Magazine filter tabs ──
const filterBtns = document.querySelectorAll('.filter-btn');
const magCards   = document.querySelectorAll('.mag-grid .card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    magCards.forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.style.display = '';
        card.style.opacity = '0';
        card.style.transform = 'translateY(12px)';
        requestAnimationFrame(() => {
          card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
      } else {
        card.style.display = 'none';
      }
    });
  });
});

// ── Character counter for submit form ──
const contentArea = document.getElementById('content');
const charCount   = document.getElementById('charCount');

if (contentArea && charCount) {
  contentArea.addEventListener('input', () => {
    charCount.textContent = contentArea.value.length.toLocaleString();
  });
}

// ── Submit form ──
const submitForm    = document.getElementById('submitForm');
const submitSuccess = document.getElementById('submitSuccess');

if (submitForm) {
  submitForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const humanCheck = submitForm.querySelector('#human');
    if (!humanCheck.checked) {
      humanCheck.closest('.form-group').style.outline = '1px solid #c9a84c';
      setTimeout(() => {
        humanCheck.closest('.form-group').style.outline = '';
      }, 2000);
      return;
    }

    // Simulate submission
    submitForm.style.opacity = '0';
    submitForm.style.transition = 'opacity 0.4s ease';
    setTimeout(() => {
      submitForm.hidden = true;
      submitSuccess.hidden = false;
      submitSuccess.style.opacity = '0';
      submitSuccess.style.transition = 'opacity 0.5s ease';
      requestAnimationFrame(() => {
        submitSuccess.style.opacity = '1';
      });
    }, 400);
  });
}

// ── Molecule node hover pulse ──
const moleculeNodes = document.querySelectorAll('.molecule__node');
moleculeNodes.forEach((node, i) => {
  node.style.animationDelay = `${i * 0.3}s`;
});
