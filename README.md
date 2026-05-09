# Mi Web Pro 3.0

## 🚀 Plataforma SaaS profesional

Mi Web Pro es un dashboard SaaS diseñado para gestionar clientes, proyectos, tickets y estadísticas de uso con una interfaz moderna en modo oscuro.

## Características principales
- Registro e inicio de sesión de usuarios
- Dashboard de usuario con estado de proyectos y tickets
- Panel de administración para usuarios, clientes y tickets
- Portafolio de proyectos con enlaces a GitHub
- Vista de clientes y tickets con permisos restringidos
- Diseño responsive con estilo en CSS personalizado

## Stack
- Node.js
- Express
- EJS
- CSS
- express-session
- bcrypt
- dotenv

## Estructura del proyecto
- `server.js`: servidor Express y rutas principales
- `views/`: plantillas EJS para el front-end
- `public/`: archivos estáticos (CSS, HTML, assets)
- `views/projects.json`: datos de proyectos y enlaces a GitHub
- `views/clients.json`, `views/tickets.json`, `views/stats.json`: datos de ejemplo

## Instalación
```bash
npm install
```

## Ejecutar en local
```bash
npm run dev
```

Luego abre en el navegador:

- http://localhost:3000

> Si el puerto `3000` está ocupado, puedes ejecutar el servidor en otro puerto usando:
> 
> ```bash
> PORT=3001 npm run dev
> ```

## Uso
- Visita `/register` para crear un usuario
- Visita `/login` para iniciar sesión
- Accede a `/dashboard` como usuario
- Si el usuario tiene rol `admin`, accede a `/admin` y `/clients`
- Visita `/portafolio` para ver los proyectos y los enlaces a GitHub

## Notas
- El proyecto utiliza archivos JSON como datos de ejemplo en lugar de una base de datos real.
- `bcrypt` se usa para el hashing de contraseñas.
- `express-session` gestiona sesiones de usuario.

