// ── Ripple effect on all buttons ─────────
document.addEventListener('click', function(e) {
  var btn = e.target.closest('button, .nav-btn, .lp-btn, .lp-nav-cta, .quote-submit, .btn-delete, .admin-nav-toggle, .admin-section-bar a');
  if (!btn) return;
  var style = window.getComputedStyle(btn);
  if (style.position === 'static') btn.style.position = 'relative';
  if (style.overflow !== 'hidden') btn.style.overflow = 'hidden';
  var r = btn.getBoundingClientRect();
  var size = Math.max(r.width, r.height) * 1.6;
  var x = e.clientX - r.left - size / 2;
  var y = e.clientY - r.top  - size / 2;
  var ripple = document.createElement('span');
  ripple.style.cssText = [
    'position:absolute',
    'border-radius:50%',
    'pointer-events:none',
    'width:'  + size + 'px',
    'height:' + size + 'px',
    'left:'   + x    + 'px',
    'top:'    + y    + 'px',
    'background:rgba(255,255,255,0.18)',
    'transform:scale(0)',
    'animation:ripple-anim 0.55s cubic-bezier(.4,0,.2,1) forwards',
    'z-index:999'
  ].join(';');
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', function() { ripple.remove(); });
});

// ── Custom cursor (desktop only) ─────────
const cursor     = document.querySelector('.cursor');
const cursorRing = document.querySelector('.cursor-ring');

if (cursor && cursorRing && window.matchMedia('(hover: hover)').matches) {
  let rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
    // Ring follows with slight lag via RAF
    rx += (e.clientX - rx) * 0.14;
    ry += (e.clientY - ry) * 0.14;
  });

  // Smooth ring with rAF
  function trackRing() {
    if (cursor.style.left) {
      const tx = parseFloat(cursor.style.left);
      const ty = parseFloat(cursor.style.top);
      rx += (tx - rx) * 0.1;
      ry += (ty - ry) * 0.1;
      cursorRing.style.left = rx + 'px';
      cursorRing.style.top  = ry + 'px';
    }
    requestAnimationFrame(trackRing);
  }
  trackRing();

  document.querySelectorAll('a, button, .l-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('grow');
      cursorRing.classList.add('grow');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('grow');
      cursorRing.classList.remove('grow');
    });
  });
}

// ── Sticky header scroll effect ──────────
const header = document.querySelector('.l-header');
if (header) {
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ── Reveal on scroll ─────────────────────
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-scale');
if (revealEls.length) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.07 });
  revealEls.forEach(el => io.observe(el));
}

// ── Animated number counters ─────────────
function animateCounter(el) {
  const raw    = el.textContent.trim();
  const suffix = raw.replace(/[\d.]/g, '');
  const target = parseFloat(raw.replace(/[^\d.]/g, ''));
  if (isNaN(target)) return;
  const duration = 1400;
  const start    = performance.now();
  function tick(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    const current  = Math.round(ease * target * 10) / 10;
    el.textContent = (Number.isInteger(target) ? Math.round(current) : current) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statEls = document.querySelectorAll('.lp-stat-n');
if (statEls.length) {
  const counterIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        counterIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  statEls.forEach(el => counterIO.observe(el));
}

// ── 3D card tilt (desktop) ───────────────
if (window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.tilt').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'border-color 0.25s, background 0.25s';
    });
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const x  = e.clientX - r.left;
      const y  = e.clientY - r.top;
      const rx = ((y - r.height / 2) / r.height) * -10;
      const ry = ((x - r.width  / 2) / r.width ) *  10;
      card.style.transform  = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.015)`;
      card.style.transition = 'none';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform  = 'perspective(700px) rotateX(0) rotateY(0) scale(1)';
      card.style.transition = 'transform 0.5s ease, border-color 0.25s, background 0.25s';
    });
  });

  // ── Magnetic buttons ─────────────────────
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.transition = 'box-shadow 0.2s, background 0.2s';
    });
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width  / 2) * 0.22;
      const y = (e.clientY - r.top  - r.height / 2) * 0.22;
      btn.style.transform  = `translate(${x}px, ${y}px)`;
      btn.style.transition = 'box-shadow 0.2s, background 0.2s';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform  = 'translate(0, 0)';
      btn.style.transition = 'transform 0.45s ease, box-shadow 0.2s, background 0.2s';
    });
  });
}
