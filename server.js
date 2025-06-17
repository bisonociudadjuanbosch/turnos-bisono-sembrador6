require("dotenv").config(); // Carga .env
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const uploadTurnoRouter = require("./upload-turno"); // Asegúrate de que la ruta es correcta

const app = express();
app.use(cors());
app.use("/tickets", express.static("backend/tickets")); // Servir carpeta estática
app.use("/", uploadTurnoRouter);

// 🔌 Conexión a MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error conectando a MongoDB:", err));

// Inicia el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
