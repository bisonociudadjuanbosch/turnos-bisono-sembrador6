const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" })); // aumentar límite para base64

// Carpeta para guardar tickets
const TICKETS_FOLDER = path.join(__dirname, "tickets");
if (!fs.existsSync(TICKETS_FOLDER)) fs.mkdirSync(TICKETS_FOLDER);

// Servir carpeta tickets estática
app.use("/tickets", express.static(TICKETS_FOLDER));

// Endpoint para subir imagen base64 (frontend)
app.post("/upload-turno", (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No se envió la imagen" });
    }

    // Quitar encabezado base64 tipo "data:image/jpeg;base64,"
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    // Nombre único con timestamp
    const filename = `turno_${Date.now()}.jpg`;
    const filepath = path.join(TICKETS_FOLDER, filename);

    // Guardar archivo en disco
    fs.writeFileSync(filepath, base64Data, { encoding: "base64" });

    // URL pública para acceder a la imagen
    const imageUrl = `${req.protocol}://${req.get("host")}/tickets/${filename}`;
    res.json({ url: imageUrl });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error guardando imagen" });
  }
});

// === FUNCIONES DE BASE DE DATOS JSON ===
const DB_FILE = "./db.json";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Generar nuevo turno
app.post("/generar-turno", (req, res) => {
  let db = loadDB();
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const turnosHoy = db.filter(t => t.fecha.startsWith(fechaHoy));
  const ultimo = turnosHoy.length > 0 ? turnosHoy[turnosHoy.length - 1].numero : "T-0000";
  const secuencia = parseInt(ultimo.split("-")[1]) + 1;
  const nuevoTurno = {
    numero: `T-${secuencia.toString().padStart(4, '0')}`,
    fecha: new Date().toISOString(),
    etapa: "Pendiente"
  };
  db.push(nuevoTurno);
  saveDB(db);
  res.json({
    turno: nuevoTurno,
    enEspera: db.filter(t => t.fecha.startsWith(fechaHoy) && t.etapa === "Pendiente").length
  });
});

// Cambiar estado
app.post("/cambiar-etapa", (req, res) => {
  const { numero, nuevaEtapa } = req.body;
  let db = loadDB();
  const index = db.findIndex(t => t.numero === numero);
  if (index >= 0) {
    db[index].etapa = nuevaEtapa;
    saveDB(db);
    res.json({ status: "ok", turno: db[index] });
  } else {
    res.status(404).json({ status: "not found" });
  }
});

// Ruta de prueba
app.get("/prueba", (req, res) => {
  res.send("Ruta de prueba funcionando");
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
