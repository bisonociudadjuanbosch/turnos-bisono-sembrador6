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

// Carpeta pública: index.html y admin.html dentro de /frontend
const FRONTEND = path.join(__dirname, "frontend");
app.use(express.static(FRONTEND));

// Tickets (imágenes capturadas)
const TICKETS = path.join(__dirname, "tickets");
if (!fs.existsSync(TICKETS)) fs.mkdirSync(TICKETS);
app.use("/tickets", express.static(TICKETS));

// Base de datos local
const DB_FILE = path.join(__dirname, "db.json");
function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]");
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Subir imagen de ticket
app.post("/upload-turno", (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "Falta imagen" });

  const b64 = image.replace(/^data:image\/\w+;base64,/, "");
  const filename = `turno_${Date.now()}.jpg`;
  const filepath = path.join(TICKETS, filename);

  fs.writeFile(filepath, b64, "base64", err => {
    if (err) return res.status(500).json({ error: "No se pudo guardar imagen" });
    const url = `${req.protocol}://${req.get("host")}/tickets/${filename}`;
    res.json({ url });
  });
});

// Generar turno
app.post("/generar-turno", (req, res) => {
  const { telefono } = req.body;
  const db = loadDB();
  const hoy = new Date().toISOString().slice(0, 10);
  const hoyTurnos = db.filter(t => t.fecha.startsWith(hoy));
  const ultimo = hoyTurnos.length ? hoyTurnos[hoyTurnos.length - 1].numero : "T-0000";
  const seq = parseInt(ultimo.split("-")[1]) + 1;

  const nuevo = {
    numero: `T-${seq.toString().padStart(4, "0")}`,
    fecha: new Date().toISOString(),
    etapa: "Pendiente",
    telefono: telefono || ""
  };
  db.push(nuevo);
  saveDB(db);

  res.json({
    turno: nuevo,
    enEspera: db.filter(t => t.fecha.startsWith(hoy) && t.etapa === "Pendiente").length
  });
});

// Cambiar etapa + notificar siguiente pendiente si tiene teléfono
async function notificarSiguienteTurno(db) {
  const sig = db.find(t => t.etapa === "Pendiente" && t.telefono);
  if (!sig) return;

  const text = {
    messaging_product: "whatsapp",
    to: sig.telefono,
    type: "text",
    text: { body: "¡Hola! ya está tu turno. Por favor acércate." }
  };

  try {
    await axios.post("https://graph.facebook.com/v19.0/18096690177/messages", text, {
      headers: {
        Authorization: `Bearer SK_TOKEN`, // remplaza por tu token
        "Content-Type": "application/json"
      }
    });
    console.log("WhatsApp enviado a", sig.telefono);
  } catch (e) {
    console.error("Error al notificar:", e.response?.data || e.message);
  }
}

app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  const db = loadDB();
  const i = db.findIndex(t => t.numero === numero);
  if (i === -1) return res.status(404).json({ error: "No encontrado" });

  db[i].etapa = nuevaEtapa;
  saveDB(db);

  if (nuevaEtapa !== "Pendiente") await notificarSiguienteTurno(db);

  res.json({ turno: db[i] });
});

// Obtener turnos con filtros y paginación
app.get("/api/turnos", (req, res) => {
  let db = loadDB();
  const {
    fecha,
    etapa,
    telefono,
    numero,
    orden = "fecha",
    sentido = "asc",
    pagina = "1",
    limite = "20"
  } = req.query;

  if (fecha) db = db.filter(t => t.fecha.startsWith(fecha));
  if (etapa) db = db.filter(t => t.etapa === etapa);
  if (telefono) db = db.filter(t => t.telefono.includes(telefono));
  if (numero) db = db.filter(t => t.numero === numero);

  db.sort((a, b) => {
    let va = orden === "fecha" ? new Date(a[orden]) : a[orden];
    let vb = orden === "fecha" ? new Date(b[orden]) : b[orden];
    return sentido === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : va > vb ? -1 : va < vb ? 1 : 0;
  });

  const p = parseInt(pagina), l = parseInt(limite);
  const total = db.length;
  const resultados = db.slice((p - 1) * l, p * l);

  res.json({ total, pagina: p, limite: l, resultados });
});

// Ruta de prueba
app.get("/prueba", (req, res) => res.send("OK"));

// Servidor
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
