// ============================================
// MISS MB — UI/UX Pro Max Edition
// ============================================

// Reemplaza con el número real de WhatsApp (código país + número, sin + ni espacios)
const WHATSAPP_NUMBER = "50663144171";

// URL del Webhook de Google Apps Script para enviar los datos a Google Sheets.
// Crea un Apps Script con un endpoint web y pega aquí su URL.
const SHEETS_WEBHOOK_URL = "";

// Si deseas usar Firebase, completa los datos aquí.
const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

const ADMIN_EMAIL = "admin@missmb.com";
const ADMIN_PASSWORD = "admin123"; // Demo: cambia esta contraseña cuando lo publiques.
const ADMIN_SESSION_KEY = "mb-admin-user";
const CLIENTS_STORAGE_KEY = "mb-client-accounts";
const CLIENT_SESSION_KEY = "mb-client-user";

let firebaseEnabled = false;
let firebaseAuth = null;
let firebaseDb = null;

if (window.firebase && FIREBASE_CONFIG.apiKey) {
  firebase.initializeApp(FIREBASE_CONFIG);
  firebaseAuth = firebase.auth();
  firebaseDb = firebase.firestore();
  firebaseEnabled = true;
}

// ============================================
// CUSTOM CURSOR
// ============================================
const cursor = document.getElementById('cursor');

if (cursor && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
  });
  document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
  document.addEventListener('mouseup',   () => cursor.classList.remove('clicking'));

  document.querySelectorAll('a, button, .portfolio__item, input, textarea, select').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });
}

// ============================================
// NAVIGATION
// ============================================
const nav       = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', open);
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ============================================
// WHATSAPP HELPERS
// ============================================
function buildWaUrl(msg) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

const DEFAULT_MSG = 'Hola Miss MB! 👋 Vi tu trabajo en Instagram y me gustaría agendar una cita para un tatuaje de realismo. ¿Podemos hablar?';

document.getElementById('waDirectBtn').href = buildWaUrl(DEFAULT_MSG);
document.getElementById('waFloat').href     = buildWaUrl(DEFAULT_MSG);

// ============================================
// BOOKING FORM → WHATSAPP
// ============================================
const form = document.getElementById('bookingForm');

form.addEventListener('submit', e => {
  e.preventDefault();

  const required = form.querySelectorAll('[required]');
  let valid = true;
  required.forEach(f => {
    f.classList.remove('error');
    if (!f.value.trim()) { f.classList.add('error'); valid = false; }
  });
  if (!valid) return;

  const nombre   = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const idea     = document.getElementById('idea').value.trim();
  const tamano   = document.getElementById('tamano').value;
  const zona     = document.getElementById('zona').value.trim();
  const fecha    = document.getElementById('fecha').value;
  const ref      = document.getElementById('referencia').value;

  const fechaStr = fecha
    ? `\n• Fecha preferida: ${new Date(fecha + 'T00:00:00').toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
    : '';

  const msg =
`Hola Miss MB! 🌟 Quiero agendar una cita para un tatuaje.

*Mis datos:*
• Nombre: ${nombre}
• Teléfono/WhatsApp: ${telefono}

*Detalles del tatuaje:*
• Descripción: ${idea}
• Tamaño: ${tamano}
• Zona del cuerpo: ${zona}${fechaStr}
• Referencia: ${ref}

¡Quedo pendiente de tu respuesta! 😊`;

  if (SHEETS_WEBHOOK_URL) {
    const payload = {
      nombre,
      telefono,
      idea,
      tamano,
      zona,
      fecha,
      referencia: ref,
      enviadoEl: new Date().toISOString(),
    };

    fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(response => {
        if (!response.ok) console.warn('Error al enviar a Sheets:', response.status);
        return response.text();
      })
      .then(data => console.log('Respuesta Sheets:', data))
      .catch(error => console.warn('No se pudo conectar con Sheets:', error));
  }

  window.open(buildWaUrl(msg), '_blank');
});

form.querySelectorAll('[required]').forEach(f => {
  f.addEventListener('input', () => f.classList.remove('error'));
});

// ============================================
// LIGHTBOX
// ============================================
const lightboxEl = document.getElementById('lightbox');
const lbImg      = document.getElementById('lightboxImg');
const lbCounter  = document.getElementById('lightboxCounter');
const lbClose    = document.getElementById('lightboxClose');
const lbPrev     = document.getElementById('lightboxPrev');
const lbNext     = document.getElementById('lightboxNext');
const lbBackdrop = document.getElementById('lightboxBackdrop');

// Collect only items with real images (not placeholders)
const lbImages = [];
document.querySelectorAll('.portfolio__item').forEach(item => {
  const img = item.querySelector('img');
  if (!img) return;
  item.dataset.lbIdx = lbImages.length;
  lbImages.push({ src: img.src, alt: img.alt });
});

let currentLb = 0;

function lbShow(idx) {
  currentLb = (idx + lbImages.length) % lbImages.length;
  lbImg.src = lbImages[currentLb].src;
  lbImg.alt = lbImages[currentLb].alt;
  lbCounter.innerHTML = `<em>${currentLb + 1}</em> / ${lbImages.length}`;
}

function lbOpen(idx) {
  lbShow(idx);
  lightboxEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function lbClose_() {
  lightboxEl.classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('.portfolio__item[data-lb-idx]').forEach(item => {
  item.addEventListener('click', () => lbOpen(parseInt(item.dataset.lbIdx)));
});

const adminLoginForm = document.getElementById('adminLoginForm');
const adminLoginStatus = document.getElementById('adminLoginStatus');
const adminLoginHelp = document.getElementById('adminLoginHelp');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const adminWelcome = document.getElementById('adminWelcome');
const adminUserEmail = document.getElementById('adminUserEmail');
const adminDataPanel = document.getElementById('adminDataPanel');
const adminAppointmentsEl = document.getElementById('adminAppointments');
const adminScheduleEl = document.getElementById('adminSchedule');

const clientEmailInput = document.getElementById('clientEmail');
const clientPasswordInput = document.getElementById('clientPassword');
const clientRegisterBtn = document.getElementById('clientRegisterBtn');
const clientLoginBtn = document.getElementById('clientLoginBtn');
const clientStatus = document.getElementById('clientStatus');
const clientStoryPanel = document.getElementById('clientStoryPanel');
const clientUserEmail = document.getElementById('clientUserEmail');
const clientLogoutBtn = document.getElementById('clientLogoutBtn');

let adminAppointments = [
  { name: 'Mariana G.', size: 'Mediano', zone: 'Antebrazo', date: '24 May', time: '11:30', status: 'Pendiente' },
  { name: 'Karla S.', size: 'Grande', zone: 'Espalda', date: '25 May', time: '14:00', status: 'Confirmado' },
  { name: 'Daniel C.', size: 'XL', zone: 'Muslo', date: '26 May', time: '10:00', status: 'Revisión' },
];

let adminSchedule = [
  { day: 'Lunes', hours: '9:00 – 13:00 · 15:00 – 19:00', available: true },
  { day: 'Martes', hours: '9:00 – 13:00 · 15:00 – 19:00', available: true },
  { day: 'Miércoles', hours: 'Cerrado', available: false },
  { day: 'Jueves', hours: '10:00 – 13:00 · 16:00 – 19:00', available: true },
  { day: 'Viernes', hours: '9:00 – 13:00 · 15:00 – 19:00', available: true },
];

function setAdminState(loggedIn, email = '') {
  if (loggedIn) {
    adminDataPanel.classList.remove('admin__inner--locked');
    adminWelcome.hidden = false;
    adminWelcome.classList.add('show');
    adminLoginForm.hidden = true;
    adminUserEmail.textContent = email || ADMIN_EMAIL;
    adminLoginStatus.textContent = 'Panel admin desbloqueado.';
    adminLoginStatus.style.color = '#d6c48b';
    localStorage.setItem(ADMIN_SESSION_KEY, 'true');
    loadAdminData();
  } else {
    adminDataPanel.classList.add('admin__inner--locked');
    adminWelcome.hidden = true;
    adminWelcome.classList.remove('show');
    adminLoginForm.hidden = false;
    adminUserEmail.textContent = '';
    localStorage.removeItem(ADMIN_SESSION_KEY);
    adminLoginStatus.textContent = 'Ingresa con tu cuenta para desbloquear el panel.';
    adminLoginStatus.style.color = '#d6c48b';
  }
}

function showAdminStatus(message, isError = false) {
  adminLoginStatus.textContent = message;
  adminLoginStatus.style.color = isError ? '#e06c75' : '#d6c48b';
}

function showClientStatus(message, isError = false) {
  if (!clientStatus) return;
  clientStatus.textContent = message;
  clientStatus.style.color = isError ? '#e06c75' : '#d6c48b';
}

function getSavedClients() {
  try {
    const value = localStorage.getItem(CLIENTS_STORAGE_KEY);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function saveClients(clients) {
  localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
}

function setClientState(loggedIn, email = '') {
  if (!clientAuthForm || !clientStoryPanel) return;
  if (loggedIn) {
    clientAuthForm.hidden = true;
    clientStoryPanel.hidden = false;
    clientUserEmail.textContent = email;
    localStorage.setItem(CLIENT_SESSION_KEY, email);
    showClientStatus(`Bienvenida ${email}. Tu historia está lista.`, false);
  } else {
    clientAuthForm.hidden = false;
    clientStoryPanel.hidden = true;
    clientUserEmail.textContent = '';
    localStorage.removeItem(CLIENT_SESSION_KEY);
    showClientStatus('Crea tu cuenta para ver tu historia de tatuaje.', false);
  }
}

function registerClient(email, password) {
  if (!email || !password) {
    showClientStatus('Rellena correo y contraseña.', true);
    return;
  }
  const clients = getSavedClients();
  if (clients[email]) {
    showClientStatus('Ya existe esa cuenta. Inicia sesión o usa otro correo.', true);
    return;
  }
  clients[email] = { password, createdAt: new Date().toISOString() };
  saveClients(clients);
  setClientState(true, email);
}

function loginClient(email, password) {
  if (!email || !password) {
    showClientStatus('Rellena correo y contraseña.', true);
    return;
  }
  const clients = getSavedClients();
  if (clients[email] && clients[email].password === password) {
    setClientState(true, email);
  } else {
    showClientStatus('Credenciales no válidas. Intenta de nuevo.', true);
  }
}

async function loadAdminData() {
  if (!adminDataPanel) return;

  if (firebaseEnabled) {
    try {
      const bookingsSnapshot = await firebaseDb.collection('bookings').orderBy('createdAt', 'desc').limit(10).get();
      adminAppointments = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const scheduleDoc = await firebaseDb.collection('settings').doc('schedule').get();
      if (scheduleDoc.exists) {
        const data = scheduleDoc.data();
        adminSchedule = Array.isArray(data.days) ? data.days : adminSchedule;
      }
    } catch (error) {
      console.warn('Error cargando admin desde Firebase:', error);
    }
  }

  renderAdminAppointments();
  renderAdminSchedule();
}

function renderAdminAppointments() {
  if (!adminAppointmentsEl) return;
  adminAppointmentsEl.innerHTML = adminAppointments.map(app => `
    <article class="admin__item">
      <div>
        <strong>${app.name}</strong>
        <span>${app.zone} · ${app.size}</span>
      </div>
      <div style="text-align:right;">
        <span>${app.date} · ${app.time}</span>
        <span class="admin__status">${app.status}</span>
      </div>
    </article>
  `).join('');
}

function renderAdminSchedule() {
  if (!adminScheduleEl) return;
  adminScheduleEl.innerHTML = adminSchedule.map((slot, index) => `
    <div class="admin__day">
      <div>
        <strong>${slot.day}</strong>
        <span>${slot.hours}</span>
      </div>
      <button type="button" class="admin__toggle ${slot.available ? '' : 'admin__toggle--closed'}" data-index="${index}">
        ${slot.available ? 'Disponible' : 'Cerrado'}
      </button>
    </div>
  `).join('');
}

async function saveSchedule() {
  if (!firebaseEnabled) return;
  try {
    await firebaseDb.collection('settings').doc('schedule').set({ days: adminSchedule }, { merge: true });
  } catch (error) {
    console.warn('No se pudo guardar el horario en Firebase:', error);
  }
}

function loginAdmin(email, password) {
  if (!email || !password) {
    showAdminStatus('Completa los campos de email y contraseña.', true);
    return;
  }

  if (firebaseEnabled) {
    firebaseAuth.signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        setAdminState(true, userCredential.user.email);
        showAdminStatus('Inicio de sesión exitoso. Cargando datos...', false);
      })
      .catch(error => {
        showAdminStatus('Error de acceso: ' + error.message, true);
      });
    return;
  }

  if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    setAdminState(true, email);
    showAdminStatus('Has iniciado sesión en modo demo.', false);
  } else {
    showAdminStatus('Credenciales incorrectas. Usa admin@missmb.com / admin123', true);
  }
}

function logoutAdmin() {
  if (firebaseEnabled) {
    firebaseAuth.signOut().catch(error => console.warn('Error cerrando sesión Firebase:', error));
  }
  setAdminState(false);
}

adminLoginForm?.addEventListener('submit', event => {
  event.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value.trim();
  loginAdmin(email, password);
});

adminLoginHelp?.addEventListener('click', () => {
  loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
});

adminLogoutBtn?.addEventListener('click', () => {
  logoutAdmin();
});

clientRegisterBtn?.addEventListener('click', () => {
  const email = clientEmailInput.value.trim();
  const password = clientPasswordInput.value.trim();
  registerClient(email, password);
});

clientLoginBtn?.addEventListener('click', () => {
  const email = clientEmailInput.value.trim();
  const password = clientPasswordInput.value.trim();
  loginClient(email, password);
});

clientLogoutBtn?.addEventListener('click', () => {
  setClientState(false);
});

adminScheduleEl?.addEventListener('click', async event => {
  const button = event.target.closest('.admin__toggle');
  if (!button) return;
  const index = Number(button.dataset.index);
  adminSchedule[index].available = !adminSchedule[index].available;
  adminSchedule[index].hours = adminSchedule[index].available
    ? (adminSchedule[index].day === 'Miércoles' ? '9:00 – 13:00 · 15:00 – 19:00' : adminSchedule[index].hours)
    : 'Cerrado';
  renderAdminSchedule();
  await saveSchedule();
});

if (localStorage.getItem(ADMIN_SESSION_KEY)) {
  setAdminState(true, ADMIN_EMAIL);
} else {
  setAdminState(false);
}

if (localStorage.getItem(CLIENT_SESSION_KEY)) {
  setClientState(true, localStorage.getItem(CLIENT_SESSION_KEY));
} else {
  setClientState(false);
}

lbClose.addEventListener('click', lbClose_);
lbBackdrop.addEventListener('click', lbClose_);
lbNext.addEventListener('click', e => { e.stopPropagation(); lbShow(currentLb + 1); });
lbPrev.addEventListener('click', e => { e.stopPropagation(); lbShow(currentLb - 1); });

document.addEventListener('keydown', e => {
  if (!lightboxEl.classList.contains('open')) return;
  if (e.key === 'Escape')     lbClose_();
  if (e.key === 'ArrowRight') lbShow(currentLb + 1);
  if (e.key === 'ArrowLeft')  lbShow(currentLb - 1);
});

// Swipe on mobile
let touchX = 0;
lightboxEl.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
lightboxEl.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 48) dx < 0 ? lbShow(currentLb + 1) : lbShow(currentLb - 1);
});

// ============================================
// STAT COUNTER ANIMATION
// ============================================
function animateCount(el) {
  const target   = parseInt(el.dataset.count, 10);
  const prefix   = el.dataset.prefix || '';
  const suffix   = el.dataset.suffix || '';
  const duration = 1600;
  const start    = performance.now();

  const tick = now => {
    const p = Math.min((now - start) / duration, 1);
    const v = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = prefix + Math.round(v * target) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const statsObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('[data-count]').forEach(animateCount);
    statsObs.unobserve(entry.target);
  });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.about__stats');
if (statsSection) statsObs.observe(statsSection);

// ============================================
// SCROLL REVEAL
// ============================================
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    revealObs.unobserve(entry.target);
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.about__image-wrap, .about__text, .booking__form-wrap, .wa-card').forEach(el => {
  el.classList.add('reveal');
  revealObs.observe(el);
});

const portfolioObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');

    const img = entry.target.querySelector('img.portfolio__ph');
    if (img && img.dataset.src) {
      const highRes = new Image();
      highRes.src = img.dataset.src;
      highRes.onload = () => {
        img.src = highRes.src;
        img.classList.add('is-loaded');
      };
    }
    portfolioObs.unobserve(entry.target);
  });
}, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });

document.querySelectorAll('.portfolio__item').forEach(item => portfolioObs.observe(item));

// ============================================
// SMOOTH IMAGE LOADING
// ============================================
document.querySelectorAll('.portfolio__ph').forEach(img => {
  if (img.tagName === 'IMG') {
    if (img.complete) {
      img.classList.add('is-loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    }
  } else {
    // Si es un placeholder (DIV), lo mostramos de inmediato
    img.classList.add('is-loaded');
  }
});

// HERO CAROUSEL
const heroCarousel = document.getElementById('heroCarousel');
if (heroCarousel) {
  const track = heroCarousel.querySelector('.carousel__track');
  const slides = Array.from(heroCarousel.querySelectorAll('.carousel__item'));
  const prevBtn = heroCarousel.querySelector('.carousel__prev');
  const nextBtn = heroCarousel.querySelector('.carousel__next');
  let currentIndex = 0;

  const updateCarousel = () => {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
  };

  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateCarousel();
  });

  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % slides.length;
    updateCarousel();
  });

  let carouselTimer = setInterval(() => {
    currentIndex = (currentIndex + 1) % slides.length;
    updateCarousel();
  }, 6000);

  heroCarousel.addEventListener('mouseenter', () => clearInterval(carouselTimer));
  heroCarousel.addEventListener('mouseleave', () => {
    carouselTimer = setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      updateCarousel();
    }, 6000);
  });
}
