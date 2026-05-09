const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/login', (req, res) => {
    const { email } = req.body;

    req.session.user = { email };

    res.redirect('/client/dashboard');
});

router.post('/register', (req, res) => {
    const {
        name,
        company,
        whatsapp,
        projectType,
        email
    } = req.body;

    req.session.user = {
        name,
        company,
        whatsapp,
        projectType,
        email
    };

    res.redirect('/client/dashboard');
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
