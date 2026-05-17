const { google } = require('googleapis');
const path = require('path');
const fs   = require('fs');

const SPREADSHEET_ID = '1d4dVBf8Cb5m8sG72YWrEAUmpuBb7kxhYmrscHDh5cP0';
const KEY_FILE       = path.join(__dirname, 'loop-landing-jarvis-9921c54cedba.json');

// Si no existe el archivo de credenciales, todas las funciones retornan sin error
const credsExist = fs.existsSync(KEY_FILE);

function getAuth() {
    if (process.env.GOOGLE_CREDENTIALS) {
        return new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
    }
    return new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
}

async function appendRow(sheet, values) {
    if (!credsExist && !process.env.GOOGLE_CREDENTIALS) return;
    const auth   = getAuth();
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values] }
    });
}

function now() {
    return new Date().toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
}

/* ── 1. LEADS — nueva cotización ── */
async function saveLead({ name, whatsapp, email, service, budget, deadline, description }) {
    await appendRow('Leads', [now(), name, whatsapp, email, service, budget, deadline || '—', description, 'Nuevo']);
}

/* ── 2. LEAD ESTADO — cambio de estado ── */
async function saveLeadEstado({ leadId, name, email, service, oldStatus, newStatus }) {
    await appendRow('Lead_Estados', [now(), leadId, name, email, service, oldStatus || '—', newStatus]);
}

/* ── 3. REGISTROS — nuevo usuario ── */
async function saveRegistro({ name, email, company, projectType }) {
    await appendRow('Registros', [now(), name, email, company || '—', projectType || '—']);
}

/* ── 4. CONTACTOS — formulario de contacto ── */
async function saveContacto({ name, email, subject, message }) {
    await appendRow('Contactos', [now(), name, email, subject, message]);
}

/* ── 5. TICKETS — nuevo ticket ── */
async function saveTicket({ user, email, subject, message, ticketId }) {
    await appendRow('Tickets', [now(), ticketId, user, email, subject, message, 'Abierto']);
}

/* ── 6. TICKET RESPUESTA — admin responde ── */
async function saveTicketRespuesta({ ticketId, user, email, subject, response }) {
    await appendRow('Ticket_Respuestas', [now(), ticketId, user, email, subject, response]);
}

/* ── 7. PROGRESO — actualización de avance ── */
async function saveProgresoCliente({ email, name, company, progress, isDelayed }) {
    await appendRow('Progreso', [now(), email, name, company || '—', `${progress}%`, isDelayed ? 'Sí' : 'No']);
}

/* ── 8. VISITAS — contador del sitio ── */
async function saveVisita({ visits }) {
    await appendRow('Visitas', [now(), visits]);
}

/* ── 9. LOGIN — acceso de usuario ── */
async function saveLogin({ name, email, role }) {
    await appendRow('Logins', [now(), name, email, role || 'user']);
}

/* ── 10. PAGOS — registro de pago ── */
async function savePago({ name, email, amount, service, method, notes }) {
    await appendRow('Pagos', [now(), name, email, `$${amount}`, service, method || '—', notes || '—', 'Registrado']);
}

module.exports = {
    saveLead,
    saveLeadEstado,
    saveRegistro,
    saveContacto,
    saveTicket,
    saveTicketRespuesta,
    saveProgresoCliente,
    saveVisita,
    saveLogin,
    savePago
};
