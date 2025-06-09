require("dotenv").config(); // Carga variables de entorno
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

// Estados válidos de un turno
const ESTADOS = [
  "Pendiente",
  "Visitando Apartamentos Modelo",
  "Precalificando con el Banco",
  "OK",
  "En Proceso",
  "Finalizado",
];

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// Carpeta pública: index.html y admin.html dentro de /frontend
const FRONTEND = path.join(__dirname, "frontend");
app.use(express.static(FRONTEND));

// Carpeta para tickets (imágenes)
const TICKETS = path.join(__dirname, "tickets");
if (!fs.existsSync(TICKETS)) fs.mkdirSync(TICKETS);
app.use("/tickets", express.static(TICKETS));

// Archivo base de datos local
const DB_FILE = path.join(__dirname, "db.json");

// Función para cargar DB (arreglo)
function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]");
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

// Guardar DB en archivo
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --------------------
// Rutas y lógica
// --------------------

// 1. Subir imagen (ticket)
app.post("/upload-turno", (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "Falta imagen base64" });

  // Validar que sea base64 de imagen jpg/png (opcional)
  if (!image.startsWith("data:image/")) {
    return res.status(400).json({ error: "Formato de imagen inválido" });
  }

  // Quitar prefijo base64
  const b64 = image.replace(/^data:image\/\w+;base64,/, "");
  const filename = `turno_${Date.now()}.jpg`;
  const filepath = path.join(TICKETS, filename);

  fs.writeFile(filepath, b64, "base64", (err) => {
    if (err)
      return res.status(500).json({ error: "No se pudo guardar la imagen" });

    const url = `${req.protocol}://${req.get("host")}/tickets/${filename}`;
    res.json({ url });
  });
});

// 2. Generar nuevo turno
app.post("/generar-turno", (req, res) => {
  const { telefono } = req.body;

  // Validación básica del teléfono (solo dígitos, longitud 10-13)
  if (telefono && !/^\d{10,13}$/.test(telefono)) {
    return res.status(400).json({ error: "Teléfono inválido" });
  }

  const db = loadDB();
  const hoy = new Date().toISOString().slice(0, 10);

  // Filtrar turnos del día
  const hoyTurnos = db.filter((t) => t.fecha.startsWith(hoy));
  const ultimo = hoyTurnos.length
    ? hoyTurnos[hoyTurnos.length - 1].numero
    : "T-0000";

  const seq = parseInt(ultimo.split("-")[1]) + 1;

  const nuevo = {
    numero: `T-${seq.toString().padStart(4, "0")}`,
    fecha: new Date().toISOString(),
    etapa: "Pendiente",
    telefono: telefono || "",
    notificado: false, // para controlar notificaciones
  };

  db.push(nuevo);
  saveDB(db);

  res.json({
    turno: nuevo,
    enEspera: db.filter((t) => t.fecha.startsWith(hoy) && t.etapa === "Pendiente")
      .length,
  });
});

// 3. Notificar siguiente turno pendiente que tiene teléfono y NO ha sido notificado
async function notificarSiguienteTurno(db) {
  const sig = db.find(
    (t) => t.etapa === "Pendiente" && t.telefono && !t.notificado
  );
  if (!sig) return;

  const text = {
    messaging_product: "whatsapp",
    to: sig.telefono,
    type: "text",
    text: { body: "¡Hola! ya está tu turno. Por favor acércate." },
  };

  try {
    await axios.post(
      "https://graph.facebook.com/v19.0/18096690177/messages",
      text,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("WhatsApp enviado a", sig.telefono);

    // Marcar como notificado para no volver a enviar
    sig.notificado = true;
    saveDB(db);
  } catch (e) {
    console.error("Error al notificar:", e.response?.data || e.message);
  }
}

// 4. Cambiar etapa y notificar siguiente turno
app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;

  // Validar etapa
  if (!ESTADOS.includes(nuevaEtapa)) {
    return res.status(400).json({ error: "Etapa inválida" });
  }

  const db = loadDB();
  const i = db.findIndex((t) => t.numero === numero);

  if (i === -1) return res.status(404).json({ error: "Turno no encontrado" });

  db[i].etapa = nuevaEtapa;

  // Reset notificado si regresa a Pendiente
  if (nuevaEtapa === "Pendiente") {
    db[i].notificado = false;
  }

  saveDB(db);

  // Solo notificar si se avanza en la etapa, no si vuelve a "Pendiente"
  if (nuevaEtapa !== "Pendiente") {
    await notificarSiguienteTurno(db);
  }

  res.json({ turno: db[i] });
});

// 5. Obtener turnos con filtros, paginación y orden
app.get("/turnos", (req, res) => {
  let db = loadDB();

  const {
    fecha,
    etapa,
    telefono,
    numero,
    pagina = 1,
    limite = 10,
    orden = "fecha",
    sentido = "asc",
  } = req.query;

  if (fecha) db = db.filter((t) => t.fecha.startsWith(fecha));
  if (etapa) db = db.filter((t) => t.etapa === etapa);
  if (telefono) db = db.filter((t) => t.telefono.includes(telefono));
  if (numero) db = db.filter((t) => t.numero === numero);

  db.sort((a, b) => {
    let va = orden === "fecha" ? new Date(a[orden]) : a[orden];
    let vb = orden === "fecha" ? new Date(b[orden]) : b[orden];
    return sentido === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : va > vb ? -1 : va < vb ? 1 : 0;
  });

  const p = parseInt(pagina);
  const l = parseInt(limite);
  const total = db.length;
  const resultados = db.slice((p - 1) * l, p * l);

  res.json({ total, pagina: p, limite: l, resultados });
});

// Servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
