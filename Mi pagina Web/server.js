const express  = require('express');
const http     = require('http');
const session  = require('express-session');
const FileStore = require('session-file-store')(session);
const bcrypt   = require('bcryptjs');
const fs       = require('fs');
const path     = require('path');
const helmet   = require('helmet');
const compression = require('compression');
const morgan   = require('morgan');
const webpush  = require('web-push');
const stripe   = require('stripe')(process.env.STRIPE_SECRET || 'sk_test_placeholder');
require('dotenv').config();

const jarvis = require('./jarvis');

const app        = express();
const httpServer = http.createServer(app);
const { Server } = require('socket.io');
const io         = new Server(httpServer);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

webpush.setVapidDetails(
    'mailto:garettjohan12@gmail.com',
    process.env.VAPID_PUBLIC  || '',
    process.env.VAPID_PRIVATE || ''
);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('combined'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('trust proxy', 1);
app.use(session({
    store: new FileStore({ path: './sessions' }),
    secret: process.env.SESSION_SECRET || 'mi_secreto_saas_pro',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

const USERS_PATH = path.join(__dirname, 'views', 'users.json');

const getUsers = () => {
    try {
        if (!fs.existsSync(USERS_PATH)) return [];
        const data = fs.readFileSync(USERS_PATH, 'utf-8');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error leyendo usuarios:', e);
        return [];
    }
};

const getData = (filename) => {
    try {
        const filePath = path.join(__dirname, 'views', filename);
        if (!fs.existsSync(filePath)) return [];
        const data = fs.readFileSync(filePath, 'utf-8');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Error leyendo ${filename}:`, e);
        return [];
    }
};

const saveUsers = (users) => {
    try {
        fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Error guardando users:', e);
    }
};

const saveData = (filename, data) => {
    try {
        const filePath = path.join(__dirname, 'views', filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`Error guardando ${filename}:`, e);
    }
};

const { saveRegistro, saveContacto, saveLead, saveLeadEstado, saveTicket, saveTicketRespuesta, saveProgresoCliente, saveVisita, saveLogin, savePago } = require('./sheets');
const { notifyNewLead, notifyNewContact, notifyLeadEstado, notifyTestimonio } = require('./mailer');
const multer = require('multer');
const PDFDocument = require('pdfkit');
require('./cron');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadDir, req.body.userEmail || 'general');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

const ADMIN_EMAIL = 'garettjohan12@gmail.com';

const isAdmin = (req, res, next) => {
    if (req.session.user?.email === ADMIN_EMAIL) return next();
    const wantsJson = req.xhr || (req.headers.accept || '').includes('application/json');
    return wantsJson
        ? res.status(403).json({ ok: false, error: 'Acceso denegado' })
        : res.status(403).send('Acceso denegado');
};

if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  SESSION_SECRET no definido — usando fallback. NO apto para producción.');
}

// ── Rate limiter en memoria ───────────────────────────────────────────────────
const _rl = new Map();
function rateLimit(windowMs, max) {
    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        const hits = (_rl.get(key) || []).filter(t => now - t < windowMs);
        hits.push(now);
        _rl.set(key, hits);
        if (hits.length > max) {
            return res.status(429).send('Demasiadas solicitudes. Esperá unos minutos e intentá de nuevo.');
        }
        next();
    };
}
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of _rl.entries()) {
        if (v.every(t => now - t > 15 * 60 * 1000)) _rl.delete(k);
    }
}, 10 * 60 * 1000);

// Notificaciones disponibles en todos los templates
app.use((req, res, next) => {
    if (req.session.user) {
        const tickets = getData('tickets.json');
        res.locals.notifCount = tickets.filter(t =>
            t.email === req.session.user.email &&
            (t.messages || []).some(m => m.from === 'admin' && !m.seenByUser)
        ).length;
    } else {
        res.locals.notifCount = 0;
    }
    next();
});

// ── Rutas públicas ────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    const stats = getData('stats.json');
    stats.visits = (stats.visits || 0) + 1;
    saveData('stats.json', stats);
    saveVisita({ visits: stats.visits }).catch(e => console.error('Sheets visita:', e));
    const testimonios = getData('testimonios.json').filter(t => t.approved);
    const weeklySong = getData('weekly-song.json');
    res.render('index', { user: req.session.user || null, visits: stats.visits, testimonios, weeklySong });
});

app.get('/precios', (req, res) => {
    res.render('precios', { user: req.session.user || null });
});

app.get('/portafolio', (req, res) => {
    const projects = getData('projects.json');
    res.render('portafolio', { projects, user: req.session.user || null });
});

app.get('/contacto', (req, res) => {
    res.render('contacto', { user: req.session.user || null, sent: false });
});

app.post('/contacto', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        const contacts = getData('contacts.json');
        contacts.push({
            id: `CNT-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            name, email, subject, message,
            read: false
        });
        saveData('contacts.json', contacts);
        saveContacto({ name, email, subject, message }).catch(e => console.error('Sheets contacto:', e));
        notifyNewContact({ name, email, subject, message }).catch(e => console.error('Mailer contacto:', e));
    } catch (e) {
        console.error('Error /contacto POST:', e);
    }
    res.render('contacto', { user: req.session.user || null, sent: true });
});

app.post('/cotizacion', rateLimit(60 * 60 * 1000, 5), async (req, res) => {
    if (req.body.website) return res.redirect('/?ok=1#cotizacion'); // honeypot anti-spam
    try {
        const { name, whatsapp, email, service, budget, deadline, description } = req.body;
        const leads = getData('leads.json');
        leads.push({
            id: `LEAD-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            name, whatsapp, email, service, budget,
            deadline: deadline || '—',
            description,
            status: 'Nuevo'
        });
        saveData('leads.json', leads);
        saveLead({ name, whatsapp, email, service, budget, deadline, description })
            .catch(e => console.error('Sheets lead:', e));
        notifyNewLead({ name, whatsapp, email, service, budget, description })
            .catch(e => console.error('Mailer lead:', e));
        jarvis.notifyLead({ name, whatsapp, email, service, budget, deadline: deadline || '—', description });
        fireWebhook('lead.nuevo', { name, email, service, budget });
    } catch (e) {
        console.error('Error /cotizacion POST:', e);
    }
    res.redirect('/?ok=1#cotizacion');
});

// ── API pública — estado de cotización ───────────────────────────────────────
app.get('/api/cotizacion/estado', (req, res) => {
    const email = (req.query.email || '').toLowerCase().trim();
    if (!email) return res.json({ found: false });
    const leads = getData('leads.json');
    const lead = leads.filter(l => l.email && l.email.toLowerCase() === email).pop();
    if (!lead) return res.json({ found: false });
    res.json({
        found:   true,
        name:    lead.name,
        service: lead.service,
        status:  lead.status || 'Nuevo',
        date:    lead.date,
        id:      lead.id
    });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

app.get('/register', (req, res) => res.render('register', { error: null }));
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', rateLimit(15 * 60 * 1000, 10), async (req, res) => {
    const { email, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = {
            name: user.name,
            email: user.email,
            role: user.role,
            company: user.company || '',
            projectType: user.projectType || '',
            whatsapp: user.whatsapp || ''
        };
        saveLogin({ name: user.name, email: user.email, role: user.role }).catch(e => console.error('Sheets login:', e));
        return res.redirect('/dashboard');
    }
    res.render('login', { error: 'Credenciales inválidas' });
});

app.post('/register', async (req, res) => {
    try {
        const { name, email, password, company, projectType } = req.body;
        if (!name || !email || !password) {
            return res.render('register', { error: 'Completa todos los campos requeridos' });
        }
        const users = getUsers();
        if (users.find(u => u.email === email)) {
            return res.render('register', { error: 'El usuario ya existe' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        users.push({ name, email, company, projectType, password: hashedPassword, role: 'user' });
        saveUsers(users);
        saveRegistro({ name, email, company, projectType }).catch(e => console.error('Sheets registro:', e));
        fireWebhook('registro.nuevo', { name, email, company, projectType });
        res.redirect('/login');
    } catch (e) {
        console.error('Error /register POST:', e);
        res.render('register', { error: 'Error al registrar. Intenta de nuevo.' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ── Rutas privadas ────────────────────────────────────────────────────────────

app.get('/dashboard', isAuthenticated, (req, res) => {
    const tickets = getData('tickets.json');
    const userTickets = tickets.filter(t => t.email === req.session.user.email);
    const ticketCount = userTickets.filter(t => t.status === 'Abierto').length;
    const newResponses = userTickets.filter(t => (t.messages || []).some(m => m.from === 'admin' && !m.seenByUser));
    const allUsers = getUsers();
    const fullUser = allUsers.find(u => u.email === req.session.user.email);
    const allLeads = getData('leads.json');
    const userLeads = allLeads.filter(l => l.email === req.session.user.email);
    const testimonios = getData('testimonios.json');
    const testimonialSent = testimonios.some(t => t.email === req.session.user.email)
        ? (req.query.t === 'ok' ? 'ok' : 'sent')
        : (req.query.t === 'ok' ? 'ok' : false);
    res.render('dashboard', {
        user: req.session.user,
        ticketCount,
        newResponses,
        projectProgress: fullUser?.projectProgress ?? 0,
        isDelayed: fullUser?.isDelayed ?? false,
        userLeads,
        testimonialSent
    });
});

app.get('/tickets', isAuthenticated, (req, res) => {
    let tickets = getData('tickets.json');
    tickets = tickets.map(t => {
        if (t.email !== req.session.user.email) return t;
        const msgs = t.messages || [];
        const hasUnread = msgs.some(m => m.from === 'admin' && !m.seenByUser);
        if (hasUnread) {
            return { ...t, messages: msgs.map(m => m.from === 'admin' ? { ...m, seenByUser: true } : m) };
        }
        return t;
    });
    saveData('tickets.json', tickets);
    const userTickets = tickets.filter(t => t.email === req.session.user.email);
    res.render('tickets', { tickets: userTickets, user: req.session.user });
});

app.post('/tickets', isAuthenticated, (req, res) => {
    const { subject, message } = req.body;
    const tickets = getData('tickets.json');
    const now = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    const newTicket = {
        id: `TK-${Date.now()}`,
        user: req.session.user.name,
        email: req.session.user.email,
        subject,
        status: 'Abierto',
        date: new Date().toISOString().split('T')[0],
        messages: [{ from: 'user', text: message, time: now, seenByUser: true }]
    };
    tickets.push(newTicket);
    saveData('tickets.json', tickets);
    saveTicket({ user: newTicket.user, email: newTicket.email, subject, message, ticketId: newTicket.id })
        .catch(e => console.error('Sheets ticket:', e));
    jarvis.notifyTicket({ user: newTicket.user, email: newTicket.email, subject, message });
    res.redirect('/tickets');
});

app.post('/tickets/reply', isAuthenticated, (req, res) => {
    const { ticketId, message } = req.body;
    const tickets = getData('tickets.json');
    const ticket = tickets.find(t => t.id === ticketId && t.email === req.session.user.email);
    if (ticket && ticket.status === 'Abierto') {
        const now = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
        if (!ticket.messages) ticket.messages = [];
        ticket.messages.push({ from: 'user', text: message, time: now, seenByUser: true });
        saveData('tickets.json', tickets);
        jarvis.notifyTicket({ user: ticket.user, email: ticket.email, subject: ticket.subject, message: `Respuesta: ${message}` });
    }
    res.redirect('/tickets');
});

app.get('/perfil', isAuthenticated, (req, res) => {
    res.render('perfil', { user: req.session.user, saved: false, error: null });
});

app.post('/perfil', isAuthenticated, async (req, res) => {
    const { name, company, projectType, whatsapp, newPassword } = req.body;
    const users = getUsers();
    const idx = users.findIndex(u => u.email === req.session.user.email);
    if (idx === -1) {
        return res.render('perfil', { user: req.session.user, saved: false, error: 'Usuario no encontrado' });
    }
    users[idx].name = name;
    users[idx].company = company;
    users[idx].projectType = projectType;
    users[idx].whatsapp = whatsapp;
    if (newPassword && newPassword.length >= 6) {
        users[idx].password = await bcrypt.hash(newPassword, 10);
    }
    saveUsers(users);
    req.session.user = { ...req.session.user, name, company, projectType, whatsapp };
    res.render('perfil', { user: req.session.user, saved: true, error: null });
});

app.get('/clients', isAuthenticated, isAdmin, (req, res) => {
    const clients = getData('clients.json');
    res.render('clients', { clients, user: req.session.user });
});

app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    const allUsers = getUsers();
    const tickets = getData('tickets.json');
    const stats = getData('stats.json');
    const leads = getData('leads.json');
    const contacts = getData('contacts.json');
    const pagos = getData('pagos.json');
    const testimonios = getData('testimonios.json');
    const blogPosts = getData('blog.json');
    const newsletterSubs = getData('newsletter-subs.json');
    const webhooksConfig = getData('webhooks-config.json');
    const propuestaTemplates = getData('propuesta-templates.json');
    res.render('admin', { users: allUsers, tickets, stats, leads, contacts, pagos, testimonios, blogPosts, newsletterSubs, webhooksConfig, propuestaTemplates });
});

app.post('/admin/tickets/respond', isAuthenticated, isAdmin, (req, res) => {
    const { ticketId, response } = req.body;
    const tickets = getData('tickets.json');
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        if (!ticket.messages) ticket.messages = [];
        const now = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
        ticket.messages.push({ from: 'admin', text: response, time: now, seenByUser: false });
        saveTicketRespuesta({ ticketId, user: ticket.user, email: ticket.email, subject: ticket.subject, response })
            .catch(e => console.error('Sheets ticket respuesta:', e));
        pushToUser(ticket.email, { title: 'Respuesta a tu ticket', body: ticket.subject, url: '/tickets' });
    }
    saveData('tickets.json', tickets);
    res.redirect('/admin#tickets');
});

app.post('/admin/tickets/close', isAuthenticated, isAdmin, (req, res) => {
    const { ticketId } = req.body;
    const tickets = getData('tickets.json');
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) ticket.status = 'Cerrado';
    saveData('tickets.json', tickets);
    res.redirect('/admin#tickets');
});

app.post('/admin/leads/status', isAuthenticated, isAdmin, (req, res) => {
    const { leadId, status } = req.body;
    const leads = getData('leads.json');
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
        const oldStatus = lead.status || 'Nuevo';
        lead.status = status;
        saveLeadEstado({ leadId, name: lead.name, email: lead.email, service: lead.service, oldStatus, newStatus: status })
            .catch(e => console.error('Sheets lead estado:', e));
        if (lead.email && status !== oldStatus) {
            notifyLeadEstado({ name: lead.name, email: lead.email, service: lead.service, newStatus: status })
                .catch(e => console.error('Mailer lead estado:', e));
            pushToUser(lead.email, { title: 'Estado actualizado', body: `Tu cotización de ${lead.service} pasó a: ${status}`, url: '/dashboard' });
            fireWebhook('lead.estado', { leadId, email: lead.email, oldStatus, newStatus: status });
        }
    }
    saveData('leads.json', leads);
    res.redirect('/admin#leads');
});

app.post('/admin/users/progress', isAuthenticated, isAdmin, (req, res) => {
    const { email, progress, isDelayed } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (user) {
        user.projectProgress = Math.min(100, Math.max(0, parseInt(progress) || 0));
        user.isDelayed = isDelayed === 'true';
        saveProgresoCliente({
            email: user.email,
            name: user.name,
            company: user.company,
            progress: user.projectProgress,
            isDelayed: user.isDelayed
        }).catch(e => console.error('Sheets progreso:', e));
    }
    saveUsers(users);
    res.redirect('/admin#clientes');
});

// ── Subir archivo a cliente ───────────────────────────────────────────────────
app.post('/admin/upload', isAuthenticated, isAdmin, upload.single('file'), (req, res) => {
    res.redirect('/admin#clientes');
});

// ── Descargar archivos del cliente ────────────────────────────────────────────
app.get('/mis-archivos', isAuthenticated, (req, res) => {
    const dir = path.join(uploadDir, req.session.user.email);
    let files = [];
    if (fs.existsSync(dir)) {
        files = fs.readdirSync(dir).map(f => ({
            name: f.replace(/^\d+-/, ''),
            raw: f,
            url: `/archivos/${encodeURIComponent(req.session.user.email)}/${encodeURIComponent(f)}`
        }));
    }
    res.render('mis-archivos', { user: req.session.user, files });
});

app.get('/archivos/:email/:file', isAuthenticated, (req, res) => {
    const email = decodeURIComponent(req.params.email);
    const file  = decodeURIComponent(req.params.file);
    if (req.session.user.email !== ADMIN_EMAIL && req.session.user.email !== email)
        return res.status(403).send('Acceso denegado');
    const filePath = path.join(uploadDir, email, file);
    if (!fs.existsSync(filePath)) return res.status(404).send('Archivo no encontrado');
    res.download(filePath, file.replace(/^\d+-/, ''));
});

// ── Generar factura PDF ───────────────────────────────────────────────────────
app.get('/admin/factura/:email', isAuthenticated, isAdmin, (req, res) => {
    const users  = getUsers();
    const client = users.find(u => u.email === req.params.email);
    if (!client) return res.status(404).send('Cliente no encontrado');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${client.name.replace(/\s/g,'-')}.pdf`);
    doc.pipe(res);

    doc.fontSize(22).font('Helvetica-Bold').text('GARETT BARRANTES', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#888').text('Desarrollo Digital · Costa Rica', 50, 78);
    doc.fillColor('#888').text('garettjohan12@gmail.com  ·  +506 6314-4171', 50, 92);

    doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#333').stroke();

    doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold').text('FACTURA DE SERVICIO', 50, 130);
    const inv = `INV-${Date.now()}`;
    doc.fontSize(10).font('Helvetica').fillColor('#aaa').text(`N° ${inv}`, 50, 150);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CR')}`, 50, 165);

    doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold').text('Facturado a:', 50, 200);
    doc.fontSize(10).font('Helvetica').fillColor('#ccc')
        .text(client.name, 50, 218)
        .text(client.email, 50, 233)
        .text(client.company || '', 50, 248);

    doc.moveTo(50, 280).lineTo(545, 280).strokeColor('#333').stroke();
    doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold')
        .text('Descripción', 50, 292).text('Monto', 460, 292);
    doc.moveTo(50, 308).lineTo(545, 308).strokeColor('#333').stroke();

    doc.fillColor('#ccc').font('Helvetica')
        .text(client.projectType || 'Servicio de desarrollo web', 50, 320)
        .text('$___________', 460, 320);

    doc.moveTo(50, 350).lineTo(545, 350).strokeColor('#333').stroke();
    doc.fillColor('#fff').font('Helvetica-Bold').text('TOTAL:', 380, 365).text('$___________', 460, 365);

    doc.fillColor('#555').fontSize(9).font('Helvetica')
        .text('Gracias por confiar en Garett Barrantes — Desarrollo Digital.', 50, 680, { align: 'center', width: 495 });

    doc.end();
});

app.post('/admin/users/delete', isAuthenticated, isAdmin, (req, res) => {
    const { email } = req.body;
    const users = getUsers().filter(u => u.email !== email);
    saveUsers(users);
    res.redirect('/admin#clientes');
});

// ── Kanban: cambio de estado vía fetch (JSON) ─────────────────────────────────
app.post('/admin/leads/kanban', isAuthenticated, isAdmin, (req, res) => {
    const { leadId, status } = req.body;
    const leads = getData('leads.json');
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return res.status(404).json({ ok: false });
    const oldStatus = lead.status || 'Nuevo';
    lead.status = status;
    saveData('leads.json', leads);
    saveLeadEstado({ leadId, name: lead.name, email: lead.email, service: lead.service, oldStatus, newStatus: status })
        .catch(e => console.error('Sheets kanban:', e));
    if (lead.email && status !== oldStatus) {
        notifyLeadEstado({ name: lead.name, email: lead.email, service: lead.service, newStatus: status })
            .catch(e => console.error('Mailer kanban:', e));
    }
    res.json({ ok: true });
});

// ── Propuesta PDF ─────────────────────────────────────────────────────────────
app.get('/admin/propuesta/:leadId', isAuthenticated, isAdmin, (req, res) => {
    const leads = getData('leads.json');
    const lead = leads.find(l => l.id === req.params.leadId);
    if (!lead) return res.status(404).send('Lead no encontrado');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=propuesta-${(lead.name||'cliente').replace(/\s/g,'-')}.pdf`);
    doc.pipe(res);

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff').text('LOOP-LANDING.COM', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#888888').text('Desarrollo Digital · Curridabat, Costa Rica', 50, 78);
    doc.fillColor('#888888').text('garettjohan12@gmail.com  ·  +506 6314-4171', 50, 93);

    doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#333333').stroke();

    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('PROPUESTA DE PROYECTO', 50, 132);
    doc.fontSize(10).font('Helvetica').fillColor('#aaaaaa')
        .text(`Propuesta: PROP-${lead.id}`, 50, 153)
        .text(`Fecha: ${new Date().toLocaleDateString('es-CR')}`, 50, 168)
        .text(`Válida por: 15 días hábiles`, 50, 183);

    doc.moveTo(50, 205).lineTo(545, 205).strokeColor('#333333').stroke();

    doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold').text('Propuesto a:', 50, 220);
    doc.fontSize(10).font('Helvetica').fillColor('#cccccc')
        .text(lead.name || '—', 50, 238)
        .text(lead.email || '—', 50, 253)
        .text(`WhatsApp: ${lead.whatsapp || '—'}`, 50, 268);

    doc.moveTo(50, 295).lineTo(545, 295).strokeColor('#333333').stroke();

    doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold').text('Detalle del proyecto:', 50, 310);
    doc.fontSize(10).font('Helvetica').fillColor('#aaaaaa').text('Servicio', 50, 330).fillColor('#ffffff').text(lead.service || '—', 200, 330);
    doc.fillColor('#aaaaaa').text('Presupuesto estimado', 50, 350).fillColor('#ffffff').text(lead.budget || '—', 200, 350);
    if (lead.deadline && lead.deadline !== '—') {
        doc.fillColor('#aaaaaa').text('Plazo', 50, 370).fillColor('#ffffff').text(lead.deadline, 200, 370);
    }

    if (lead.description) {
        doc.moveTo(50, 400).lineTo(545, 400).strokeColor('#222222').stroke();
        doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text('Descripción del cliente:', 50, 416);
        doc.fontSize(10).font('Helvetica').fillColor('#aaaaaa').text(lead.description, 50, 435, { width: 495, lineGap: 4 });
    }

    const noteY = lead.description ? 520 : 430;
    doc.moveTo(50, noteY).lineTo(545, noteY).strokeColor('#222222').stroke();
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text('Próximos pasos:', 50, noteY + 16);
    doc.fontSize(10).font('Helvetica').fillColor('#aaaaaa')
        .text('1. Confirmar esta propuesta respondiendo a este correo o por WhatsApp.', 50, noteY + 36)
        .text('2. Pago de anticipo del 50% para iniciar el desarrollo.', 50, noteY + 51)
        .text('3. Entrega del proyecto en el plazo acordado con revisiones incluidas.', 50, noteY + 66);

    doc.fillColor('#555555').fontSize(9).font('Helvetica')
        .text('Loop-Landing.com · garettjohan12@gmail.com · +506 6314-4171 · Curridabat, Costa Rica', 50, 720, { align: 'center', width: 495 });

    doc.end();
});

// ── Canción semanal ───────────────────────────────────────────────────────────
app.post('/admin/weekly-song', isAuthenticated, isAdmin, (req, res) => {
    const { title, artist, url } = req.body;
    saveData('weekly-song.json', { title, artist, url, updatedAt: new Date().toISOString().split('T')[0] });
    res.redirect('/admin#weekly-song');
});

// ── Blog ──────────────────────────────────────────────────────────────────────
app.get('/blog', (req, res) => {
    const posts = getData('blog.json').filter(p => p.published).sort((a, b) => new Date(b.date) - new Date(a.date));
    res.render('blog', { posts, user: req.session.user || null });
});

app.get('/blog/:slug', (req, res) => {
    const post = getData('blog.json').find(p => p.slug === req.params.slug && p.published);
    if (!post) return res.status(404).render('404', { user: req.session?.user || null });
    res.render('blog-post', { post, user: req.session.user || null });
});

app.post('/admin/blog', isAuthenticated, isAdmin, (req, res) => {
    const { title, excerpt, content, tags, published } = req.body;
    const slug = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const posts = getData('blog.json');
    posts.push({
        id: `POST-${Date.now()}`,
        slug: `${slug}-${Date.now()}`,
        title, excerpt, content,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        date: new Date().toLocaleDateString('es-CR'),
        published: published === 'true'
    });
    saveData('blog.json', posts);
    res.redirect('/admin#blog');
});

app.post('/admin/blog/delete', isAuthenticated, isAdmin, (req, res) => {
    const posts = getData('blog.json').filter(p => p.id !== req.body.postId);
    saveData('blog.json', posts);
    res.redirect('/admin#blog');
});

app.post('/admin/blog/toggle', isAuthenticated, isAdmin, (req, res) => {
    const posts = getData('blog.json');
    const post = posts.find(p => p.id === req.body.postId);
    if (post) post.published = !post.published;
    saveData('blog.json', posts);
    res.redirect('/admin#blog');
});

// ── Testimonios ───────────────────────────────────────────────────────────────
app.post('/dashboard/testimonio', isAuthenticated, (req, res) => {
    const { rating, text, company } = req.body;
    const user = req.session.user;
    const testimonios = getData('testimonios.json');
    const already = testimonios.find(t => t.email === user.email);
    if (already) return res.redirect('/dashboard?t=pending');
    const t = {
        id: `TEST-${Date.now()}`,
        name: user.name,
        email: user.email,
        company: company || user.company || '—',
        service: user.projectType || '—',
        rating: Math.min(5, Math.max(1, parseInt(rating) || 5)),
        text,
        date: new Date().toLocaleDateString('es-CR'),
        approved: false
    };
    testimonios.push(t);
    saveData('testimonios.json', testimonios);
    notifyTestimonio({ name: user.name, text, service: t.service }).catch(e => console.error('Mailer testimonio:', e));
    res.redirect('/dashboard?t=ok');
});

app.post('/admin/testimonios/approve', isAuthenticated, isAdmin, (req, res) => {
    const testimonios = getData('testimonios.json');
    const t = testimonios.find(t => t.id === req.body.testId);
    if (t) t.approved = true;
    saveData('testimonios.json', testimonios);
    res.redirect('/admin#testimonios');
});

app.post('/admin/testimonios/delete', isAuthenticated, isAdmin, (req, res) => {
    const testimonios = getData('testimonios.json').filter(t => t.id !== req.body.testId);
    saveData('testimonios.json', testimonios);
    res.redirect('/admin#testimonios');
});

// ── Eliminar lead ─────────────────────────────────────────────────────────────
app.post('/admin/leads/delete', isAuthenticated, isAdmin, (req, res) => {
    const { leadId } = req.body;
    const leads = getData('leads.json').filter(l => l.id !== leadId);
    saveData('leads.json', leads);
    res.redirect('/admin#leads');
});

// ── Notas internas de lead ────────────────────────────────────────────────────
app.post('/admin/leads/notes', isAuthenticated, isAdmin, (req, res) => {
    const { leadId, notes } = req.body;
    const leads = getData('leads.json');
    const lead = leads.find(l => l.id === leadId);
    if (lead) lead.adminNotes = notes;
    saveData('leads.json', leads);
    res.redirect('/admin#leads');
});

// ── Registrar pago ────────────────────────────────────────────────────────────
app.post('/admin/pagos', isAuthenticated, isAdmin, (req, res) => {
    const { name, email, amount, service, method, notes } = req.body;
    const pagos = getData('pagos.json');
    pagos.push({
        id: `PAG-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        name, email, amount, service, method: method || '—', notes: notes || '—'
    });
    saveData('pagos.json', pagos);
    savePago({ name, email, amount, service, method, notes }).catch(e => console.error('Sheets pago:', e));
    res.redirect('/admin#pagos');
});

// ── SEO: sitemap.xml ─────────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
    const posts = getData('blog.json').filter(p => p.published);
    const base  = 'https://loop-landing.com';
    const static_urls = ['', '/precios', '/portafolio', '/blog', '/contacto'];
    const blog_urls   = posts.map(p => `/blog/${p.slug}`);
    const all = [...static_urls, ...blog_urls];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(u => `  <url><loc>${base}${u}</loc><changefreq>weekly</changefreq><priority>${u === '' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>`;
    res.header('Content-Type', 'application/xml').send(xml);
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\nSitemap: https://loop-landing.com/sitemap.xml');
});

// ── Chat en tiempo real ───────────────────────────────────────────────────────
app.get('/chat', isAuthenticated, (req, res) => {
    const chats = getData('chats.json');
    const room  = req.session.user.email;
    const chat  = chats.find(c => c.email === room);
    res.render('chat', { user: req.session.user, userEmail: room, messages: chat ? chat.messages : [] });
});

// ── Exportar leads a CSV ──────────────────────────────────────────────────────
app.get('/admin/leads/export', isAuthenticated, isAdmin, (req, res) => {
    const leads = getData('leads.json');
    const headers = ['ID','Fecha','Nombre','Email','WhatsApp','Servicio','Presupuesto','Estado','Descripcion'];
    const rows = leads.map(l => [
        l.id, l.date, l.name, l.email, l.whatsapp || '',
        l.service, l.budget, l.status || 'Nuevo',
        (l.description || '').replace(/"/g, '""').replace(/\n/g, ' ')
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=leads-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('﻿' + csv);
});

app.get('/admin/chat', isAuthenticated, isAdmin, (req, res) => {
    const users  = getUsers().filter(u => u.email !== ADMIN_EMAIL);
    const chats  = getData('chats.json');
    const chatMap = {};
    chats.forEach(c => { chatMap[c.email] = c.messages; });
    const activeEmail = req.query.email || (users[0] ? users[0].email : '');
    res.render('admin-chat', { users, chatMap, activeEmail });
});

app.post('/admin/chat/mark-read', isAuthenticated, isAdmin, (req, res) => {
    const { email } = req.body;
    const chats = getData('chats.json');
    const chat  = chats.find(c => c.email === email);
    if (chat) chat.messages.forEach(m => { m.readByAdmin = true; });
    saveData('chats.json', chats);
    res.json({ ok: true });
});

// Socket.io
io.on('connection', (socket) => {
    socket.on('join', (room) => { socket.join(room); });
    socket.on('message', (data) => {
        const { room, text, fromAdmin } = data;
        const from = fromAdmin ? ADMIN_EMAIL : room;
        const msg  = { from, text, time: new Date().toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit' }), readByAdmin: !!fromAdmin };
        const chats = getData('chats.json');
        let chat = chats.find(c => c.email === room);
        if (!chat) { chat = { email: room, messages: [] }; chats.push(chat); }
        chat.messages.push(msg);
        saveData('chats.json', chats);
        io.to(room).emit('message', { ...msg, room });
        if (!fromAdmin) {
            const pushSubs = getData('push-subs.json').filter(s => s.email === ADMIN_EMAIL);
            pushSubs.forEach(sub => {
                webpush.sendNotification(sub.subscription, JSON.stringify({ title: 'Nuevo mensaje', body: text, url: '/admin/chat' })).catch(() => {});
            });
        }
    });
});

// ── Push notifications ────────────────────────────────────────────────────────
app.get('/push/vapid-public', (req, res) => res.json({ key: process.env.VAPID_PUBLIC }));

app.post('/push/subscribe', isAuthenticated, (req, res) => {
    const subs = getData('push-subs.json');
    const email = req.session.user.email;
    const existing = subs.findIndex(s => s.email === email && JSON.stringify(s.subscription.endpoint) === JSON.stringify(req.body.endpoint));
    if (existing === -1) subs.push({ email, subscription: req.body });
    saveData('push-subs.json', subs);
    res.json({ ok: true });
});

function pushToUser(email, payload) {
    const subs = getData('push-subs.json').filter(s => s.email === email);
    subs.forEach(s => webpush.sendNotification(s.subscription, JSON.stringify(payload)).catch(() => {}));
}

// ── Contratos digitales ───────────────────────────────────────────────────────
app.get('/admin/contrato/:leadId', isAuthenticated, isAdmin, (req, res) => {
    const lead = getData('leads.json').find(l => l.id === req.params.leadId);
    if (!lead) return res.status(404).send('Lead no encontrado');
    const templates = getData('propuesta-templates.json');
    const tpl = templates.find(t => t.service === lead.service) || templates[0] || {};
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=contrato-${(lead.name||'cliente').replace(/\s/g,'-')}.pdf`);
    doc.pipe(res);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#000').text('CONTRATO DE SERVICIOS DIGITALES', { align: 'center' });
    doc.moveDown().fontSize(10).font('Helvetica').fillColor('#333')
        .text(`Entre GARETT BARRANTES BENAVIDES (Loop-Landing.com) y ${lead.name || '___'}, se acuerda lo siguiente:`)
        .moveDown()
        .text('SERVICIO: ' + (lead.service || '___'))
        .text('PRESUPUESTO: ' + (lead.budget || '___'))
        .text('PLAZO: ' + (lead.deadline || '___'))
        .moveDown();
    if (tpl.scope) {
        const scopeText = tpl.scope.replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').trim();
        doc.text('ALCANCE: ' + scopeText).moveDown();
    }
    if (tpl.terms) doc.text('TÉRMINOS: ' + tpl.terms).moveDown();
    doc.moveDown(4)
        .text('Firma cliente: _______________________________    Fecha: __________', { align: 'left' })
        .moveDown(2)
        .text('Firma proveedor: _____________________________    Fecha: __________')
        .moveDown(3)
        .fontSize(8).fillColor('#888').text('Loop-Landing.com · Curridabat, Costa Rica · garettjohan12@gmail.com', { align: 'center' });
    doc.end();
});

app.post('/contrato/firmar', isAuthenticated, (req, res) => {
    const { leadId, accept } = req.body;
    if (accept !== 'true') return res.redirect('/dashboard');
    const contratos = getData('contratos.json');
    const already = contratos.find(c => c.leadId === leadId && c.email === req.session.user.email);
    if (!already) {
        contratos.push({ id: `CTR-${Date.now()}`, leadId, email: req.session.user.email, name: req.session.user.name, date: new Date().toISOString(), ip: req.ip });
        saveData('contratos.json', contratos);
    }
    res.redirect('/dashboard?contrato=ok');
});

// ── Seguimiento de horas ──────────────────────────────────────────────────────
app.post('/admin/horas', isAuthenticated, isAdmin, (req, res) => {
    const { email, hours, description, date } = req.body;
    const horas = getData('horas.json');
    horas.push({ id: `HR-${Date.now()}`, email, hours: parseFloat(hours) || 0, description, date: date || new Date().toISOString().split('T')[0] });
    saveData('horas.json', horas);
    res.redirect('/admin#clientes');
});

// ── Newsletter ────────────────────────────────────────────────────────────────
app.post('/newsletter/subscribe', (req, res) => {
    const { email, name } = req.body;
    if (!email) return res.redirect('/?nl=error');
    const subs = getData('newsletter-subs.json');
    if (!subs.find(s => s.email === email)) {
        subs.push({ email, name: name || '', date: new Date().toISOString().split('T')[0] });
        saveData('newsletter-subs.json', subs);
    }
    res.redirect('/?nl=ok');
});

app.get('/newsletter/unsub', (req, res) => {
    const email = req.query.email;
    if (email) {
        const subs = getData('newsletter-subs.json').filter(s => s.email !== email);
        saveData('newsletter-subs.json', subs);
    }
    res.send('<html><body style="background:#0a0a0a;color:#fff;font-family:sans-serif;text-align:center;padding:60px"><h2>Suscripción cancelada</h2><a href="/" style="color:#00d4ff;">Volver al inicio</a></body></html>');
});

app.post('/admin/newsletter/send', isAuthenticated, isAdmin, async (req, res) => {
    const { subject, html } = req.body;
    const { sendNewsletter } = require('./mailer');
    const subs = getData('newsletter-subs.json');
    if (subs.length === 0) return res.redirect('/admin#newsletter');
    sendNewsletter({ subject, html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;"><div style="background:#111;padding:24px 32px;border-bottom:1px solid #222;"><h2 style="margin:0;">${subject}</h2></div><div style="padding:24px 32px;">${html}</div></div>`, subscribers: subs })
        .then(() => console.log(`Newsletter enviado a ${subs.length} subs`))
        .catch(e => console.error('Newsletter error:', e));
    res.redirect('/admin#newsletter');
});

// ── Webhooks salientes ────────────────────────────────────────────────────────
app.post('/admin/webhooks', isAuthenticated, isAdmin, (req, res) => {
    const { url, event, secret } = req.body;
    const webhooks = getData('webhooks-config.json');
    webhooks.push({ id: `WH-${Date.now()}`, url, event, secret: secret || '' });
    saveData('webhooks-config.json', webhooks);
    res.redirect('/admin#webhooks');
});

app.post('/admin/webhooks/delete', isAuthenticated, isAdmin, (req, res) => {
    saveData('webhooks-config.json', getData('webhooks-config.json').filter(w => w.id !== req.body.id));
    res.redirect('/admin#webhooks');
});

function fireWebhook(event, payload) {
    const hooks = getData('webhooks-config.json').filter(w => w.event === event || w.event === '*');
    hooks.forEach(hook => {
        fetch(hook.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(hook.secret ? { 'X-Webhook-Secret': hook.secret } : {}) }, body: JSON.stringify({ event, data: payload, ts: Date.now() }) })
            .catch(e => console.error('Webhook fire error:', e.message));
    });
}

// ── Templates de propuestas ───────────────────────────────────────────────────
app.get('/admin/templates', isAuthenticated, isAdmin, (req, res) => {
    res.json(getData('propuesta-templates.json'));
});

app.post('/admin/templates', isAuthenticated, isAdmin, (req, res) => {
    const { name, service, budget, deadline, scope, terms } = req.body;
    const tpls = getData('propuesta-templates.json');
    tpls.push({ id: `TPL-${Date.now()}`, name, service, budget, deadline, scope, terms });
    saveData('propuesta-templates.json', tpls);
    res.redirect('/admin#templates');
});

app.post('/admin/templates/delete', isAuthenticated, isAdmin, (req, res) => {
    saveData('propuesta-templates.json', getData('propuesta-templates.json').filter(t => t.id !== req.body.id));
    res.redirect('/admin#templates');
});

// ── Stripe — checkout ─────────────────────────────────────────────────────────
app.post('/pagos/stripe/checkout', isAuthenticated, async (req, res) => {
    const { amount, service, leadId } = req.body;
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price_data: { currency: 'usd', product_data: { name: service || 'Servicio digital', description: 'Loop-Landing.com' }, unit_amount: Math.round(parseFloat(amount) * 100) }, quantity: 1 }],
            mode: 'payment',
            metadata: { service: service || 'Servicio digital', leadId: leadId || '' },
            success_url: `${req.protocol}://${req.get('host')}/pagos/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:  `${req.protocol}://${req.get('host')}/dashboard`,
            customer_email: req.session.user.email
        });
        res.redirect(303, session.url);
    } catch(e) {
        console.error('Stripe error:', e.message);
        res.redirect('/dashboard?stripe=error');
    }
});

app.get('/pagos/stripe/success', isAuthenticated, async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
        if (session.payment_status === 'paid') {
            const pagos = getData('pagos.json');
            pagos.push({ id: `PAG-${Date.now()}`, date: new Date().toISOString().split('T')[0], name: req.session.user.name, email: req.session.user.email, amount: (session.amount_total / 100).toFixed(2), service: session.metadata?.service || 'Servicio digital', method: 'Stripe', notes: `Session: ${session.id}` });
            saveData('pagos.json', pagos);
            fireWebhook('pago.completado', { email: req.session.user.email, amount: session.amount_total / 100 });
        }
    } catch(e) { console.error('Stripe success handler:', e.message); }
    res.redirect('/dashboard?pago=ok');
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).render('404', { user: req.session?.user || null });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).send('Error interno del servidor. Por favor intenta de nuevo.');
});

httpServer.listen(PORT, () => {
    console.log(`Servidor Loop-Landing corriendo en http://localhost:${PORT}`);
});
