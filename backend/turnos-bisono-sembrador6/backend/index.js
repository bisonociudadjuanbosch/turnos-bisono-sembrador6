const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// Carpeta para tickets
const TICKETS_FOLDER = path.join(__dirname, "tickets");
if (!fs.existsSync(TICKETS_FOLDER)) fs.mkdirSync(TICKETS_FOLDER);
app.use("/tickets", express.static(TICKETS_FOLDER));

// Directorio `frontend` estático
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND_DIR));

// Base de datos
const DB_FILE = path.join(__dirname, "db.json");
function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]");
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Rutas API (upload, generar-turno, cambiar-etapa, `/api/turnos`, etc.)

// Ejemplo de ruta para obtener turnos
app.get("/api/turnos", (req, res) => {
  const db = loadDB();
  res.json(db);
});

// Envío de WhatsApp, generación de turnos, etc. (lo que ya tengas)...

// Finalmente: siempre servir index.html para rutas no manejadas
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT} (usando puerto ${PORT})`);
});