const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// === RUTAS ESTÁTICAS ===
const PUBLIC_FOLDER = path.join(__dirname, "public");
app.use(express.static(PUBLIC_FOLDER)); // Sirve todo lo que esté en /public

// === Carpeta para guardar imágenes de tickets ===
const TICKETS_FOLDER = path.join(__dirname, "tickets");
if (!fs.existsSync(TICKETS_FOLDER)) fs.mkdirSync(TICKETS_FOLDER);
app.use("/tickets", express.static(TICKETS_FOLDER));

// === BASE DE DATOS LOCAL ===
const DB_FILE = "./db.json";

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("Error al leer db.json", err);
    return [];
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// === SUBIR IMAGEN BASE64 DE TURNO ===
app.post("/upload-turno", (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No se envió la imagen" });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const filename = `turno_${Date.now()}.jpg`;
    const filepath = path.join(TICKETS_FOLDER, filename);
    fs.writeFileSync(filepath, base64Data, { encoding: "base64" });

    const imageUrl = `${req.protocol}://${req.get("host")}/tickets/${filename}`;
    res.json({ url: imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error guardando imagen" });
  }
});

// === WHATSAPP AUTOMÁTICO AL SIGUIENTE TURNO ===
async function notificarSiguienteTurno(db) {
  const siguiente = db.find(t => t.etapa === "Pendiente" && t.telefono);
  if (!siguiente) return;

  try {
    await axios.post(
      "https://graph.facebook.com/v19.0/18096690177/messages",
      {
        messaging_product: "whatsapp",
        to: siguiente.telefono,
        type: "text",
        text: { body: "¡Hola! es tu Turno, por favor acercate a nuestro Oficial de Ventas Bisono." }
      },
      {
        headers: {
          Authorization: `Bearer sk_33ed3140aca24e4c98cd75b52b5c7722`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("WhatsApp enviado a:", siguiente.telefono);
  } catch (error) {
    console.error("Error al enviar WhatsApp:", error.response?.data || error.message);
  }
}

// === GENERAR TURNO ===
app.post("/generar-turno", (req, res) => {
  let db = loadDB();
  const { telefono } = req.body;
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const turnosHoy = db.filter(t => t.fecha.startsWith(fechaHoy));
  const ultimo = turnosHoy.length ? turnosHoy[turnosHoy.length - 1].numero : "T-0000";
  const secuencia = parseInt(ultimo.split("-")[1]) + 1;

  const nuevoTurno = {
    numero: `T-${secuencia.toString().padStart(4, '0')}`,
    fecha: new Date().toISOString(),
    etapa: "Pendiente",
    telefono: telefono || null
  };

  db.push(nuevoTurno);
  saveDB(db);

  res.json({
    turno: nuevoTurno,
    enEspera: db.filter(t => t.fecha.startsWith(fechaHoy) && t.etapa === "Pendiente").length
  });
});

// === CAMBIAR ETAPA ===
app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  let db = loadDB();
  const index = db.findIndex(t => t.numero === numero);

  if (index >= 0) {
    db[index].etapa = nuevaEtapa;
    saveDB(db);

    if (nuevaEtapa !== "Pendiente") {
      await notificarSiguienteTurno(db);
    }

    res.json({ status: "ok", turno: db[index] });
  } else {
    res.status(404).json({ status: "not found" });
  }
});

// === API: CONSULTAR TURNOS CON FILTROS ===
app.get("/api/turnos", (req, res) => {
  let db = loadDB();
  const { fecha, etapa, orden = "fecha", sentido = "asc", pagina = 1, limite = 10, telefono, numero } = req.query;

  if (fecha) db = db.filter(t => t.fecha.startsWith(fecha));
  if (etapa) db = db.filter(t => t.etapa === etapa);
  if (telefono) db = db.filter(t => t.telefono?.includes(telefono));
  if (numero) db = db.filter(t => t.numero === numero);

  db.sort((a, b) => {
    let valA = orden === "fecha" ? new Date(a[orden]) : a[orden];
    let valB = orden === "fecha" ? new Date(b[orden]) : b[orden];
    return (valA < valB ? -1 : 1) * (sentido === "asc" ? 1 : -1);
  });

  const inicio = (parseInt(pagina) - 1) * parseInt(limite);
  const resultados = db.slice(inicio, inicio + parseInt(limite));

  res.json({ total: db.length, pagina: parseInt(pagina), limite: parseInt(limite), resultados });
});

// === PRUEBA DE VIDA ===
app.get("/prueba", (req, res) => {
  res.send("Ruta de prueba funcionando ✅");
});

// === INICIAR SERVIDOR ===
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
