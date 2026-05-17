const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER || 'garettjohan12@gmail.com',
        pass: process.env.MAIL_PASS || ''
    }
});

async function notifyNewLead({ name, email, whatsapp, service, budget, description }) {
    await transporter.sendMail({
        from: `"Mi Web Pro" <${process.env.MAIL_USER || 'garettjohan12@gmail.com'}>`,
        to: 'garettjohan12@gmail.com',
        subject: `🔥 Nuevo lead: ${name} — ${service}`,
        html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
            <div style="background:#111;padding:28px 32px;border-bottom:1px solid #222;">
                <h2 style="margin:0;font-size:1.3rem;">🔥 Nuevo lead recibido</h2>
            </div>
            <div style="padding:28px 32px;">
                <table style="width:100%;border-collapse:collapse;">
                    <tr><td style="color:#666;padding:8px 0;font-size:0.85rem;width:130px;">Nombre</td><td style="color:#fff;font-weight:600;">${name}</td></tr>
                    <tr><td style="color:#666;padding:8px 0;font-size:0.85rem;">Email</td><td style="color:#fff;">${email}</td></tr>
                    <tr><td style="color:#666;padding:8px 0;font-size:0.85rem;">WhatsApp</td><td style="color:#fff;">${whatsapp}</td></tr>
                    <tr><td style="color:#666;padding:8px 0;font-size:0.85rem;">Servicio</td><td style="color:#fff;">${service}</td></tr>
                    <tr><td style="color:#666;padding:8px 0;font-size:0.85rem;">Presupuesto</td><td style="color:#fff;">${budget}</td></tr>
                </table>
                <div style="margin-top:20px;padding:16px;background:#181818;border-radius:8px;border-left:3px solid #444;">
                    <p style="margin:0;color:#aaa;font-size:0.9rem;">${description}</p>
                </div>
                <a href="https://wa.me/${whatsapp.replace(/\D/g,'')}?text=Hola%20${encodeURIComponent(name)}%2C%20vi%20tu%20solicitud%20de%20cotizaci%C3%B3n."
                   style="display:inline-block;margin-top:24px;padding:12px 24px;background:#25d366;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.9rem;">
                    📲 Responder por WhatsApp
                </a>
            </div>
        </div>`
    });
}

async function notifyNewContact({ name, email, subject, message }) {
    await transporter.sendMail({
        from: `"Mi Web Pro" <${process.env.MAIL_USER || 'garettjohan12@gmail.com'}>`,
        to: 'garettjohan12@gmail.com',
        subject: `✉️ Nuevo mensaje: ${subject}`,
        html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
            <div style="background:#111;padding:28px 32px;border-bottom:1px solid #222;">
                <h2 style="margin:0;font-size:1.3rem;">✉️ Nuevo mensaje de contacto</h2>
            </div>
            <div style="padding:28px 32px;">
                <p style="color:#666;font-size:0.85rem;margin:0 0 4px;">De: <strong style="color:#fff;">${name}</strong> · ${email}</p>
                <p style="color:#fff;font-weight:600;margin:16px 0 8px;">${subject}</p>
                <p style="color:#aaa;line-height:1.7;margin:0;">${message}</p>
            </div>
        </div>`
    });
}

async function notifyLeadEstado({ name, email, service, newStatus }) {
    const map = {
        'Contactado':        { e:'📞', msg:'¡Te contactaremos pronto para coordinar los detalles!' },
        'Propuesta enviada': { e:'📄', msg:'Revisá tu correo, te enviamos una propuesta completa.' },
        'En negociación':    { e:'🤝', msg:'Estamos afinando los detalles de tu proyecto.' },
        'Ganado':            { e:'🎉', msg:'¡Tu proyecto fue aprobado! Comenzamos pronto.' },
        'En proceso':        { e:'🔧', msg:'Tu proyecto está en desarrollo activo.' },
        'Terminado':         { e:'✅', msg:'¡Tu proyecto está listo y entregado!' },
    };
    const { e, msg } = map[newStatus] || { e:'📋', msg:'El estado de tu solicitud fue actualizado.' };
    await transporter.sendMail({
        from: `"Loop-Landing.com" <${process.env.MAIL_USER || 'garettjohan12@gmail.com'}>`,
        to: email,
        subject: `${e} Tu cotización de ${service} — ${newStatus}`,
        html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
            <div style="background:#111;padding:28px 32px;border-bottom:1px solid #222;">
                <p style="margin:0;font-size:0.8rem;color:#555;text-transform:uppercase;letter-spacing:1px;">Loop-Landing.com</p>
                <h2 style="margin:8px 0 0;font-size:1.3rem;">${e} Estado actualizado</h2>
            </div>
            <div style="padding:28px 32px;">
                <p style="color:#aaa;margin:0 0 20px;">Hola <strong style="color:#fff;">${name}</strong>,</p>
                <div style="background:#161616;border:1px solid #222;border-radius:10px;padding:20px;margin-bottom:20px;">
                    <p style="margin:0 0 8px;font-size:0.78rem;color:#555;text-transform:uppercase;letter-spacing:0.8px;">Servicio</p>
                    <p style="margin:0 0 16px;font-size:1rem;font-weight:600;color:#fff;">${service}</p>
                    <p style="margin:0 0 8px;font-size:0.78rem;color:#555;text-transform:uppercase;letter-spacing:0.8px;">Nuevo estado</p>
                    <p style="margin:0;font-size:1.1rem;font-weight:700;color:#00d4ff;">${e} ${newStatus}</p>
                </div>
                <p style="color:#aaa;line-height:1.7;margin:0 0 24px;">${msg}</p>
                <a href="https://loop-landing.com/dashboard"
                   style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#00d4ff,#7c3aed);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.9rem;">
                    Ver mi panel →
                </a>
            </div>
            <div style="padding:16px 32px;background:#080808;border-top:1px solid #1a1a1a;">
                <p style="margin:0;font-size:0.75rem;color:#333;">Loop-Landing.com · Curridabat, Costa Rica</p>
            </div>
        </div>`
    });
}

async function notifyTestimonio({ name, text, service }) {
    await transporter.sendMail({
        from: `"Loop-Landing.com" <${process.env.MAIL_USER || 'garettjohan12@gmail.com'}>`,
        to: 'garettjohan12@gmail.com',
        subject: `⭐ Nuevo testimonio de ${name}`,
        html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
            <div style="background:#111;padding:24px 32px;border-bottom:1px solid #222;">
                <h2 style="margin:0;">⭐ Nuevo testimonio recibido</h2>
            </div>
            <div style="padding:24px 32px;">
                <p style="color:#666;margin:0 0 4px;">De: <strong style="color:#fff;">${name}</strong> · Servicio: ${service}</p>
                <p style="color:#aaa;line-height:1.7;margin:16px 0;">"${text}"</p>
                <a href="https://loop-landing.com/admin#testimonios"
                   style="display:inline-block;padding:10px 20px;background:#00d4ff;color:#000;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.85rem;">
                    Aprobar testimonio →
                </a>
            </div>
        </div>`
    });
}

async function sendNewsletter({ subject, html, subscribers }) {
    const CHUNK = 5;
    const footer = (sub) => `<div style="font-family:sans-serif;padding:16px 32px;background:#080808;border-top:1px solid #1a1a1a;margin-top:20px;">
        <p style="margin:0;font-size:0.72rem;color:#333;">
            Recibís este email porque te suscribiste en Loop-Landing.com.
            <a href="https://loop-landing.com/newsletter/unsub?email=${encodeURIComponent(sub.email)}" style="color:#444;">Cancelar suscripción</a>
        </p></div>`;
    for (let i = 0; i < subscribers.length; i += CHUNK) {
        const chunk = subscribers.slice(i, i + CHUNK);
        await Promise.all(chunk.map(sub =>
            transporter.sendMail({
                from: `"Loop-Landing.com" <${process.env.MAIL_USER || 'garettjohan12@gmail.com'}>`,
                to: sub.email,
                subject,
                html: html + footer(sub)
            }).catch(e => console.error('Newsletter error para', sub.email, e.message))
        ));
        if (i + CHUNK < subscribers.length) {
            await new Promise(resolve => setTimeout(resolve, 1200));
        }
    }
}

async function sendWeeklyReport({ leads, tickets, pagos, visits, newLeads, closedTickets }) {
    const totalPagos = pagos.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    await transporter.sendMail({
        from: `"Loop-Landing.com" <${process.env.MAIL_USER || 'garettjohan12@gmail.com'}>`,
        to: 'garettjohan12@gmail.com',
        subject: `📊 Reporte semanal — Loop-Landing.com`,
        html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
            <div style="background:#111;padding:28px 32px;border-bottom:1px solid #222;">
                <h2 style="margin:0;font-size:1.2rem;">📊 Reporte semanal</h2>
                <p style="margin:6px 0 0;color:#555;font-size:0.85rem;">${new Date().toLocaleDateString('es-CR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
            </div>
            <div style="padding:28px 32px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
                    <div style="background:#161616;border:1px solid #222;border-radius:10px;padding:16px;text-align:center;">
                        <div style="font-size:2rem;font-weight:800;color:#00d4ff;">${newLeads}</div>
                        <div style="font-size:0.78rem;color:#555;margin-top:4px;">Leads nuevos</div>
                    </div>
                    <div style="background:#161616;border:1px solid #222;border-radius:10px;padding:16px;text-align:center;">
                        <div style="font-size:2rem;font-weight:800;color:#34d399;">$${totalPagos.toLocaleString('es-CR')}</div>
                        <div style="font-size:0.78rem;color:#555;margin-top:4px;">Pagos registrados</div>
                    </div>
                    <div style="background:#161616;border:1px solid #222;border-radius:10px;padding:16px;text-align:center;">
                        <div style="font-size:2rem;font-weight:800;color:#fbbf24;">${closedTickets}</div>
                        <div style="font-size:0.78rem;color:#555;margin-top:4px;">Tickets cerrados</div>
                    </div>
                    <div style="background:#161616;border:1px solid #222;border-radius:10px;padding:16px;text-align:center;">
                        <div style="font-size:2rem;font-weight:800;color:#fff;">${visits}</div>
                        <div style="font-size:0.78rem;color:#555;margin-top:4px;">Visitas totales</div>
                    </div>
                </div>
                <div style="background:#161616;border:1px solid #222;border-radius:10px;padding:16px;margin-bottom:16px;">
                    <p style="margin:0 0 8px;font-size:0.78rem;color:#555;text-transform:uppercase;letter-spacing:0.8px;">Resumen pipeline</p>
                    <p style="margin:0;color:#aaa;font-size:0.9rem;">${leads.filter(l=>l.status==='Nuevo').length} nuevos · ${leads.filter(l=>l.status==='En proceso').length} en proceso · ${leads.filter(l=>l.status==='Terminado').length} terminados</p>
                </div>
                <a href="https://loop-landing.com/admin"
                   style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#00d4ff,#7c3aed);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.9rem;">
                    Ver panel completo →
                </a>
            </div>
        </div>`
    });
}

module.exports = { notifyNewLead, notifyNewContact, notifyLeadEstado, notifyTestimonio, sendNewsletter, sendWeeklyReport };
