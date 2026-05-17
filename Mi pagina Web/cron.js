const cron = require('node-cron');
const fs   = require('fs');
const path = require('path');
const { notifyNewLead, sendWeeklyReport } = require('./mailer');

function readJSON(name) {
    try {
        const f = path.join(__dirname, 'views', name);
        return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8') || '[]') : [];
    } catch { return []; }
}

const LEADS_PATH = path.join(__dirname, 'views', 'leads.json');

function getLeads() {
  try {
    const data = fs.readFileSync(LEADS_PATH, 'utf-8');
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

// Cada mañana a las 9am revisa leads sin atender por más de 48h
cron.schedule('0 9 * * *', async () => {
  const leads = getLeads();
  const now   = Date.now();
  const MS48H = 48 * 60 * 60 * 1000;

  const pendientes = leads.filter(l => {
    if (l.status !== 'Nuevo') return false;
    const created = new Date(l.date).getTime();
    return (now - created) > MS48H;
  });

  for (const lead of pendientes) {
    try {
      await notifyNewLead({
        name: `⚠️ RECORDATORIO — ${lead.name}`,
        email: lead.email,
        whatsapp: lead.whatsapp || '',
        service: lead.service,
        budget: lead.budget,
        description: `Este lead lleva más de 48h sin ser contactado.\n\n${lead.description}`
      });
      console.log(`Recordatorio enviado para lead: ${lead.name}`);
    } catch (e) {
      console.error('Cron mailer error:', e);
    }
  }
});

// Reporte semanal — todos los lunes a las 8am
cron.schedule('0 8 * * 1', async () => {
    try {
        const leads   = readJSON('leads.json');
        const tickets = readJSON('tickets.json');
        const pagos   = readJSON('pagos.json');
        const stats   = readJSON('stats.json');
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const newLeads = leads.filter(l => new Date(l.date).getTime() > oneWeekAgo).length;
        const closedTickets = tickets.filter(t => t.status === 'Cerrado').length;
        await sendWeeklyReport({ leads, tickets, pagos, visits: stats.visits || 0, newLeads, closedTickets });
        console.log('Reporte semanal enviado');
    } catch(e) { console.error('Cron reporte semanal:', e); }
});

// Backup diario a las 3am
cron.schedule('0 3 * * *', () => {
    const today      = new Date().toISOString().split('T')[0];
    const backupDir  = path.join(__dirname, 'backups', today);
    const backupsRoot = path.join(__dirname, 'backups');
    try {
        fs.mkdirSync(backupDir, { recursive: true });
        const files = ['leads.json','tickets.json','users.json','contacts.json','pagos.json','testimonios.json','clients.json'];
        files.forEach(f => {
            const src = path.join(__dirname, 'views', f);
            if (fs.existsSync(src)) fs.copyFileSync(src, path.join(backupDir, f));
        });
        // Eliminar backups de más de 30 días
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        fs.readdirSync(backupsRoot).forEach(dir => {
            const dirPath = path.join(backupsRoot, dir);
            try {
                const stat = fs.statSync(dirPath);
                if (stat.isDirectory() && stat.mtimeMs < cutoff) fs.rmSync(dirPath, { recursive: true, force: true });
            } catch {}
        });
        console.log('Backup diario completado:', backupDir);
    } catch(e) { console.error('Backup error:', e); }
});

console.log('Cron activo: recordatorios 9am · reporte semanal lunes 8am · backup diario 3am');
