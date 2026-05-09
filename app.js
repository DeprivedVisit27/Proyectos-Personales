const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de EJS (opcional si vas a usar plantillas .ejs)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para archivos estáticos (CSS, Imágenes, JS frontal)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para procesar datos de formularios (POST)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rutas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email } = req.body;
    console.log('Intento de login:', email);
    res.send(`¡Bienvenido! Has iniciado sesión con ${email}. (Simulación)`);
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const userData = req.body;
    console.log('Nuevo registro:', userData);
    res.send(`Gracias ${userData.name}, tu cuenta para ${userData.company} ha sido creada. (Simulación)`);
});

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en: http://localhost:${PORT}`);
});