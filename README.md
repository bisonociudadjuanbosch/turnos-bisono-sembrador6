# Sistema de Turnos - Constructora Bisonó 🏗️

Este sistema permite generar, visualizar, administrar y notificar turnos de clientes en oficinas de Constructora Bisonó. 
Funciona con un frontend en HTML/JS y un backend en Node.js (Express), con integración de WhatsApp vía Gupshup API.

---

## 🔧 Tecnologías Usadas
- **Frontend:** HTML5 + Vanilla JS + html2canvas
- **Backend:** Node.js + Express + Axios
- **WhatsApp API:** Gupshup (mensaje de texto)
- **Hosting:** Render
- **Repositorio:** https://github.com/bisonociudadjuanbosch/turnos-bisono-sembrador6

---

## ⚙️ Configuración

1. Clona el repositorio:
```bash
git clone https://github.com/bisonociudadjuanbosch/turnos-bisono-sembrador6.git
```

2. Instala dependencias:
```bash
cd turnos-bisono-sembrador6
npm install
```

3. Crea un archivo `.env`:
```bash
cp .env.example .env
```
Edita el archivo `.env` con tus claves reales:
```env
PORT=3000
GUPSHUP_APIKEY=tu_clave_api_gupshup
WHATSAPP_SOURCE=tu_numero
WHATSAPP_SRC_NAME=ConstructoraBisono
```

4. Ejecuta el servidor:
```bash
npm run dev
```

5. Accede en tu navegador a:
```
http://localhost:3000/index.html
```

---

## 📲 Flujo del Cliente
1. El cliente accede al formulario y coloca nombre y WhatsApp
2. Se genera un ticket con su turno y se muestra visualmente
3. Puede descargarlo o enviarlo por WhatsApp (imagen + mensaje)
4. El backend guarda el turno y notifica con texto vía Gupshup

---

## 🧑‍💼 Panel Administrativo
- URL: `/admin.html`
- Permite:
  - Ver lista de turnos
  - Cambiar estado de un turno
  - Enviar recordatorio por WhatsApp

---

## 🛡️ Seguridad
- Las claves están protegidas con `.env`
- No se expone ninguna API key en el frontend

---

## 📩 WhatsApp Opt-In
Antes de enviar mensajes, el cliente debe aceptar el **opt-in**:
```
https://www.gupshup.io/whatsapp/optin?bId=957b8460-920b-4f6e-89a6-ce93c9b58890&bName=ConstructoraBisono
```

---

## 📝 Licencia
Este proyecto es propiedad de Constructora Bisonó. Todos los derechos reservados.
