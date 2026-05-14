# Miss MB — Landing Page

Página de aterrizaje estática para la artista de tatuajes Miss MB.

## Descripción

Este proyecto es una landing page enfocada en realismo de tatuajes con:
- Hero principal con fotografía de entrada.
- Portfolio de trabajos con galería.
- Sección de agendamiento vía WhatsApp.
- Panel de administración para ver citas y modificar disponibilidad.
- Registro e inicio de sesión de clientes para ver una historia personal.

## Funcionalidades implementadas

### Admin
- Inicio de sesión demo con correo y contraseña.
- Panel de citas recientes.
- Panel de horario disponible.
- Bloques de horario interactivos que se pueden alternar entre disponible / cerrado.
- Estado de sesión persistente en `localStorage`.

### Clientes
- Registro de cuenta con correo y contraseña.
- Inicio de sesión de cliente.
- Historia privada accesible solo después de iniciar sesión.
- Cuentas de cliente guardadas en `localStorage`.

### Integraciones futuras
- Google Sheets / webhook (`SHEETS_WEBHOOK_URL` en `js/main.js`).
- Firebase Auth y Firestore (`FIREBASE_CONFIG` en `js/main.js`).

## Credenciales de demo

### Admin
- Correo: `admin@missmb.com`
- Contraseña: `admin123`

### Cliente
- Cualquier correo válido y contraseña.
- Una vez creado el usuario, la sesión permanece activa en el navegador.

## Archivos clave

- `index.html` — estructura de la página.
- `css/style.css` — estilos generales y del panel.
- `js/main.js` — comportamiento, inicio de sesión, registro y lógica de admin/clientes.

## Uso

1. Abre `index.html` en el navegador.
2. En la sección Admin, accede con las credenciales de demo.
3. En la sección Cliente, crea una cuenta con correo y contraseña.
4. En `js/main.js` configura `SHEETS_WEBHOOK_URL` o `FIREBASE_CONFIG` cuando quieras conectar datos reales.

## Notas

- Esta demo usa `localStorage` para el flujo de cliente y admin cuando no hay Firebase.
- No es seguro para producción sin backend real o Firebase Auth.
- Para producción debes cambiar la contraseña admin y añadir validaciones del lado servidor.
