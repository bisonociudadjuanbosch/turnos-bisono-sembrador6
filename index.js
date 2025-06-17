require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { createCanvas } = require("canvas");
const Turno = require("./models/Turno");
const uploadTurnoRouter = require("./upload-turno");

const app = express();

// Límite alto para evitar PayloadTooLargeError
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Sirve la carpeta de tickets
const TICKETS_DIR = path.join(__dirname, "tickets");
if (!fs.existsSync(TICKETS_DIR)) fs.mkdirSync(TICKETS_DIR);
app.use("/tickets", express.static(TICKETS_DIR));

// Registro de la ruta multipart
app.use("/", uploadTurnoRouter);

const port = process.env.PORT || 10000;
const mongodbUri = process.env.MONGODB_URI; // ← solo una vez

// Conexión a MongoDB
mongoose.connect(mongodbUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error conexión MongoDB:", err));

// Resto de tu servidor (endpoints, funciones, etc.)

app.listen(port, () => console.log(`🚀 Servidor escuchando en ${port}`));
