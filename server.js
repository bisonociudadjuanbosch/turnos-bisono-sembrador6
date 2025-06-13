require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");
const Turno = require("./models/Turno");

const app = express();
const port = process.env.PORT || 10000;
const host = "0.0.0.0";

// Validación de variables críticas
if (!process.env.MONGODB_URI) {
  console.error("❌ FALTA la variable de entorno MONGODB_URI");
  process.exit(1);
}

// Validación de variables de entorno para WhatsApp (Gupshup)
if (
  !process.env.GUPSHUP_SOURCE ||
  !process.env.GUPSHUP_SRC_NAME ||
  !process.env.GUPSHUP_APIKEY
) {
  console.warn(
    "⚠️ Advertencia: faltan variables de entorno para WhatsApp (GUPSHUP_SOURCE, GUPSHUP_SRC_NAME o GUPSHUP_APIKEY). El envío de WhatsApp podría fallar."
  );
}

// Directorios públicos
const PUBLIC_DIR = path.join(__dirname, "public");
const IMG_DIR = path.join(PUBLIC_DIR, "turnos");
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(PUBLIC_DIR));
app.use("/turnos", express.static(IMG_DIR));

// Conexión MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Conectado a MongoDB"))
  .catch((error) => {
    console.error("Error conectando a MongoDB:", error);
    process.exit(1);
  });

// Rutas básicas
app.get("/", (req, res) => res.send("✅ Servicio en línea"));
app.get("/health", (req, res) => res.status(200).send("OK"));

// Obtener todos los turnos ordenados por fecha de creación descendente
app.get("/turnos", async (req, res) => {
  try {
    // Si en tu esquema usas timestamps, ordena por createdAt, si no, usa fechaCreacion
    const turnos = await Turno.find().sort({ createdAt: -1, fechaCreacion: -1 });
    res.json({ turnos });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener turnos: " + err.message });
  }
});

// Agregar un nuevo turno
app.post("/agregar-turno", async (req, res) => {
  const { numero, telefono, nombre } = req.body;
  if (!numero || !telefono || !nombre) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    // Verifica si el turno ya existe para evitar duplicados
    const existe = await Turno.findOne({ numero });
    if (existe) {
      return res.status(409).json({ error: "El número de turno ya existe." });
    }

    const nuevoTurno = new Turno({
      numero,
      nombre,
      telefono,
      etapa: "Pendiente",
    });

    await nuevoTurno.save();

    res.status(201).json({ mensaje: "Turno agregado con éxito", turno: nuevoTurno });
  } catch (error) {
    console.error("Error al agregar turno:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// Cambiar etapa de un turno
app.post("/cambiar-etapa", async (req, res) => {
  const { numero, nuevaEtapa } = req.body;

  const etapasValidas = [
    "Pendiente",
    "Visitando apartamento modelo",
    "Precalificando con el banco",
    "En Proceso",
    "Finalizado",
    "OK",
  ];

  if (!etapasValidas.includes(nuevaEtapa)) {
    return res.status(400).json({ error: "Etapa no válida" });
  }

  try {
    const turno = await Turno.findOneAndUpdate(
      { numero },
      { etapa: nuevaEtapa },
      { new: true }
    );
    if (!turno) return res.status(404).json({ error: "Turno no encontrado" });
    res.json({ mensaje: "Etapa actualizada", turno });
  } catch (err) {
    res.status(500).json({ error: "Error al cambiar la etapa: " + err.message });
  }
});

// Subir imagen en base64
app.post("/subir-imagen", (req, res) => {
  const { base64, nombreArchivo } = req.body;
  if (!base64 || !nombreArchivo) {
    return res.status(400).json({ error: "Faltan datos para subir la imagen" });
  }

  try {
    // Sanitizar el nombre de archivo para evitar vulnerabilidades
    const nombreSeguro = path.basename(nombreArchivo);

    const data = base64.replace(/^data:image\/\w+;base64,/, "");
    const ruta = path.join(IMG_DIR, nombreSeguro);
    fs.writeFileSync(ruta, data, "base64");
    const url = `${req.protocol}://${req.get("host")}/turnos/${nombreSeguro}`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar la imagen: " + err.message });
  }
});

// Enviar WhatsApp vía Gupshup
app.post("/enviar-whatsapp", async (req, res) => {
  const { numeroTelefono, plantillaId, nombreCliente, imagenUrl } = req.body;
  if (![numeroTelefono, plantillaId, nombreCliente, imagenUrl].every(Boolean)) {
    return res.status(400).json({ error: "Datos incompletos para la plantilla" });
  }

  if (
    !process.env.GUPSHUP_SOURCE ||
    !process.env.GUPSHUP_SRC_NAME ||
    !process.env.GUPSHUP_APIKEY
  ) {
    return res.status(500).json({ error: "Configuración de WhatsApp incompleta" });
  }

  try {
    const response = await axios.post(
      "https://api.gupshup.io/wa/api/v1/template/msg",
      new URLSearchParams({
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE,
        destination: numeroTelefono,
        "src.name": process.env.GUPSHUP_SRC_NAME,
        template: JSON.stringify({ id: plantillaId, params: [nombreCliente] }),
        message: JSON.stringify({ type: "image", image: { link: imagenUrl } }),
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_APIKEY,
        },
      }
    );
    res.json({ status: "ok", data: response.data });
  } catch (err) {
    console.error("❌ Error enviando WhatsApp:", err.message);
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

// Reiniciar todos los turnos
app.post("/reiniciar-turnos", async (req, res) => {
  try {
    await Turno.deleteMany({});
    res.json({ mensaje: "Todos los turnos han sido eliminados." });
  } catch (err) {
    console.error("Error reiniciando turnos:", err.message);
    res.status(500).json({ error: "Error al reiniciar los turnos." });
  }
});

// Iniciar servidor
app.listen(port, host, () => {
  console.log(`🚀 Servidor corriendo en http://${host}:${port}`);
});
