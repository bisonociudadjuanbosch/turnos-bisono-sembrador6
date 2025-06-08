const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS y body parser
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// Ticket images
const TICKETS_FOLDER = path.join(__dirname, "tickets");
if (!fs.existsSync(TICKETS_FOLDER)) fs.mkdirSync(TICKETS_FOLDER);
app.use("/tickets", express.static(TICKETS_FOLDER));

// BD
const DB_FILE = "./db.json";
function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]");
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Endpoints ...
// (tus rutas POST /upload-turno, POST /generar-turno, POST /cambiar-etapa, GET /api/turnos, etc.)

// Servir frontend estático
const FRONTEND_DIR = path.join(__dirname, "frontend");
app.use(express.static(FRONTEND_DIR));

// Asegúrate que admin.html esté dentro de frontend
app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "admin.html"));
});

// Finalizar
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

