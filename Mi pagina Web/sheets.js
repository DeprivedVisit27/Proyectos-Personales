const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1d4dVBf8Cb5m8sG72YWrEAUmpuBb7kxhYmrscHDh5cP0';

const authConfig = process.env.GOOGLE_CREDENTIALS
    ? { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes: ['https://www.googleapis.com/auth/spreadsheets'] }
    : { keyFile: path.join(__dirname, 'neon-framing-496000-g8-6a6aa5253057.json'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] };

const auth = new google.auth.GoogleAuth(authConfig);

async function appendRow(sheet, values) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values] }
    });
}

async function saveRegistro({ name, email, company, projectType }) {
    const date = new Date().toLocaleDateString('es-CR');
    await appendRow('Registros', [date, name, email, company || '', projectType || '']);
}

async function saveContacto({ name, email, subject, message }) {
    const date = new Date().toLocaleDateString('es-CR');
    await appendRow('Contactos', [date, name, email, subject, message]);
}

async function saveLead({ name, whatsapp, email, service, budget, deadline, description }) {
    const date = new Date().toLocaleDateString('es-CR');
    await appendRow('Leads', [date, name, whatsapp, email, service, budget, deadline || '—', description, 'Nuevo']);
}

async function saveTicket({ user, email, subject, message, ticketId }) {
    const date = new Date().toLocaleDateString('es-CR');
    await appendRow('Tickets', [date, ticketId, user, email, subject, message, 'Abierto']);
}

async function saveProgresoCliente({ email, name, company, progress, isDelayed }) {
    const date = new Date().toLocaleDateString('es-CR');
    await appendRow('Progreso', [date, email, name, company || '', `${progress}%`, isDelayed ? 'Sí' : 'No']);
}

module.exports = { saveRegistro, saveContacto, saveLead, saveTicket, saveProgresoCliente };
