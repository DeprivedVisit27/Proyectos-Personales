const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
require('dotenv').config();
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Simulación de base de datos en memoria
const usersPath = path.join(__dirname, 'views', 'users.json');
if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, '[]');
}
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

// Cargar proyectos desde el archivo JSON
const projectsPath = path.join(__dirname, 'views', 'projects.json');
const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

// Cargar Clientes y Tickets
const clientsPath = path.join(__dirname, 'views', 'clients.json');
const ticketsPath = path.join(__dirname, 'views', 'tickets.json');
const clients = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));
let tickets = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));

// Cargar Estadísticas
const statsPath = path.join(__dirname, 'views', 'stats.json');
if (!fs.existsSync(statsPath)) {
    fs.writeFileSync(statsPath, JSON.stringify({ visits: 0 }));
}
let stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

// Configuración de EJS (opcional si vas a usar plantillas .ejs)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para archivos estáticos (CSS, Imágenes, JS frontal)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Middleware para procesar datos de formularios (POST)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configuración de Sesiones
app.use(session({
    secret: 'mi-secreto-ultra-seguro',
    resave: false,
    saveUninitialized: true
}));

// Rutas
app.get('/', (req, res) => {
    stats.visits++;
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    res.render('index', { visits: stats.visits });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const emailInput = req.body.email.trim().toLowerCase();
    const passwordInput = req.body.password;
    
    const user = users.find(u => u.email.toLowerCase().trim() === emailInput);
    
    if (user && await bcrypt.compare(passwordInput, user.password)) {
        req.session.userId = user.email;
        req.session.userName = user.name;
        req.session.role = user.role || 'user';
        return res.redirect('/dashboard');
    }
    res.render('error', { 
        status: 401, 
        title: 'Acceso Fallido', 
        message: 'Las credenciales ingresadas no son correctas.', 
        link: '/login', 
        linkText: 'Reintentar' 
    });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { name, email, password, company } = req.body;

    if (!name || !email || !password) {
        return res.render('error', { 
            status: 400, 
            title: 'Datos Incompletos', 
            message: 'Todos los campos marcados como obligatorios deben ser completados.', 
            link: '/register', 
            linkText: 'Volver al registro' 
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validar si el correo ya existe
    const userExists = users.some(u => u.email.toLowerCase().trim() === normalizedEmail);
    if (userExists) {
        return res.render('error', { 
            status: 409, 
            title: 'Correo Duplicado', 
            message: 'Esta dirección de correo ya se encuentra en nuestra base de datos.', 
            link: '/register', 
            linkText: 'Usar otro correo' 
        });
    }

    // Encriptar la contraseña (10 rondas de salting)
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = { name, email: normalizedEmail, password: hashedPassword, company, role: 'user' };
    
    users.push(newUser);
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    console.log('Usuario registrado:', name);
    res.redirect('/login');
});

// Ruta para ver trabajos terminados (Portafolio)
app.get('/portafolio', (req, res) => {
    res.render('portafolio', { projects });
});

app.get('/tickets', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    // El admin ve todos los tickets, el cliente solo los suyos
    const filteredTickets = req.session.role === 'admin' 
        ? tickets 
        : tickets.filter(t => t.user === req.session.userName);
    res.render('tickets', { tickets: filteredTickets });
});

app.post('/tickets', (req, res) => {
    const { subject, message } = req.body;
    const newTicket = {
        id: `TK-${Math.floor(Math.random() * 1000)}`,
        user: req.session.userName || 'Invitado',
        subject,
        status: 'Abierto',
        date: new Date().toISOString().split('T')[0]
    };
    tickets.push(newTicket);
    fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2));
    res.redirect('/tickets');
});

// Ruta del Panel Admin
app.get('/admin', (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.render('error', { 
            status: 403, 
            title: 'Acceso Denegado', 
            message: 'No tienes los privilegios necesarios para acceder a la administración.', 
            link: '/dashboard', 
            linkText: 'Ir a mi Panel' 
        });
    }
    // Cargamos todos los datos para que el admin los vea
    res.render('admin', { user: req.session.userName, users, clients, tickets, stats });
});

// Restringir acceso a /clients solo para admins
app.get('/clients', (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.render('error', { 
            status: 403, 
            title: 'Área Restringida', 
            message: 'Solo el personal administrativo puede visualizar la base de datos de clientes.', 
            link: '/dashboard', 
            linkText: 'Volver al inicio' 
        });
    }
    res.render('clients', { clients });
});

// Ruta Protegida: Dashboard
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    // Contamos cuántos tickets tiene el usuario actual
    const myTicketsCount = tickets.filter(t => t.user === req.session.userName).length;
    const projectProgress = 65; // Ejemplo de progreso
    const isDelayed = true;    // Cambia a false para ver el color verde normal
    res.render('dashboard', { user: req.session.userName, role: req.session.role, ticketCount: myTicketsCount, projectProgress, isDelayed });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Manejador de error 404 (Debe ser la última ruta)
app.use((req, res) => {
    res.status(404).render('error', { 
        status: 404, 
        title: 'Página no encontrada', 
        message: 'Lo sentimos, la sección que buscas no existe o ha sido movida.', 
        link: '/', 
        linkText: 'Volver al Inicio' 
    });
});

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en: http://localhost:${PORT}`);
});