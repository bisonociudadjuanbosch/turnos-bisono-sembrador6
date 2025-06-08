const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// === Carpeta para guardar imágenes de tickets ===
const TICKETS_FOLDER = path.join(__dirname, "tickets");
if (!fs.existsSync(TICKETS_FOLDER)) fs.mkdirSync(TICKETS_FOLDER);
app.use("/tickets", express.static(TICKETS_FOLDER));

// === BASE DE DATOS ===
const DB_FILE = "./db.json";
function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// === Subir imagen base64 de ticket ===
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

// === Enviar WhatsApp al siguiente turno pendiente ===
async function notificarSiguienteTurno(db) {
  const siguiente = db.find(t => t.etapa === "Pendiente" && t.telefono);
  if (!siguiente) return;

  const numeroTelefono = siguiente.telefono;
  const mensaje = "¡Hola! es tu Turno, por favor acercate a nuestro Oficial de Ventas Bisono.";

  try {
    await axios.post(
      "https://graph.facebook.com/v19.0/18096690177/messages",
      {
        messaging_product: "whatsapp",
        to: numeroTelefono,
        type: "text",
        text: { body: mensaje }
      },
      {
        headers: {
          Authorization: `Bearer sk_33ed3140aca24e4c98cd75b52b5c7722`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("WhatsApp enviado a:", numeroTelefono);
  } catch (error) {
    console.error("Error al enviar WhatsApp:", error.response?.data || error.message);
  }
}

// === Generar turno nuevo ===
app.post("/generar-turno", (req, res) => {
  let db = loadDB();
  const { telefono } = req.body;
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const turnosHoy = db.filter(t => t.fecha.startsWith(fechaHoy));
  const ultimo = turnosHoy.length > 0 ? turnosHoy[turnosHoy.length - 1].numero : "T-0000";
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

// === Cambiar etapa de un turno y notificar siguiente ===
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

// === Ruta de prueba ===
app.get("/prueba", (req, res) => {
  res.send("Ruta de prueba funcionando");
});

// Cargar turnos desde db.json
function loadDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error("Error al leer db.json", err);
    return [];
  }
}

// Guardar turnos en db.json
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ruta para obtener los turnos
app.get('/turnos', (req, res) => {
  const data = loadDB();
  res.json(data);
});


// === Iniciar servidor ===
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
