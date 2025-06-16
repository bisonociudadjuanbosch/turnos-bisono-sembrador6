require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;
const TICKETS_DIR = path.join(__dirname, 'tickets');
if (!fs.existsSync(TICKETS_DIR)) fs.mkdirSync(TICKETS_DIR);

let turnos = []; // En memoria, para producción usar DB

// Carga turnos guardados si existen
const TURNOS_FILE = path.join(__dirname, 'turnos.json');
if (fs.existsSync(TURNOS_FILE)) {
  turnos = JSON.parse(fs.readFileSync(TURNOS_FILE));
}
function saveTurnos() {
  fs.writeFileSync(TURNOS_FILE, JSON.stringify(turnos, null, 2));
}

// Generar nuevo número de turno T-0001, T-0002 ...
function generarNumeroTurno() {
  if (turnos.length === 0) return 'T-0001';
  const ultTurno = turnos[turnos.length -1].numeroTurno;
  const num = parseInt(ultTurno.split('-')[1]) + 1;
  return 'T-' + num.toString().padStart(4, '0');
}

// POST /agregar-turno
app.post('/agregar-turno', (req, res) => {
  const { nombre, telefono } = req.body;
  if (!nombre || !telefono) return res.status(400).json({ error: 'Faltan datos' });

  // Validar teléfono simple (10-15 dígitos, permite +)
  if (!/^(\+)?\d{10,15}$/.test(telefono)) {
    return res.status(400).json({ error: 'Teléfono inválido' });
  }

  const numeroTurno = generarNumeroTurno();
  const fecha = new Date().toISOString();
  const nuevoTurno = {
    id: Date.now().toString(),
    numeroTurno,
    nombre,
    telefono,
    fecha,
    estado: 'Pendiente',
    imagenUrl: null
  };
  turnos.push(nuevoTurno);
  saveTurnos();
  res.json(nuevoTurno);
});

// POST /subir-imagen
// Recibe { idTurno, base64image }
// Guarda la imagen en /tickets y retorna url pública
app.post('/subir-imagen', (req, res) => {
  const { idTurno, base64image } = req.body;
  if (!idTurno || !base64image) return res.status(400).json({ error: 'Faltan datos' });

  const turno = turnos.find(t => t.id === idTurno);
  if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

  // Extraer el contenido base64 puro (quitar prefijo data:image/png;base64,)
  const base64Data = base64image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const fileName = `${turno.numeroTurno}_${turno.id}.jpg`;
  const filePath = path.join(TICKETS_DIR, fileName);

  fs.writeFile(filePath, buffer, err => {
    if (err) return res.status(500).json({ error: 'Error guardando imagen' });

    // URL pública (suponiendo que tickets está servido en /tickets)
    const urlImagen = `${req.protocol}://${req.get('host')}/tickets/${fileName}`;
    turno.imagenUrl = urlImagen;
    saveTurnos();
    res.json({ urlImagen });
  });
});

// Sirve imágenes estáticas en /tickets
app.use('/tickets', express.static(TICKETS_DIR));

// POST /enviar-turno
// Enviar mensaje de texto WhatsApp vía Gupshup API usando datos de turno
app.post('/enviar-turno', async (req, res) => {
  const { idTurno } = req.body;
  if (!idTurno) return res.status(400).json({ error: 'Falta idTurno' });

  const turno = turnos.find(t => t.id === idTurno);
  if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

  // Mensaje fijo (puedes personalizar)
  const texto = `¡Hola ${turno.nombre}! Es tu turno ${turno.numeroTurno}, por favor acércate a nuestro Oficial de Ventas Bisonó. Gracias por preferirnos.`;

  // Consumir API Gupshup
  try {
    const data = new URLSearchParams();
    data.append('channel', 'whatsapp');
    data.append('source', process.env.GUPSHUP_SOURCE); // número remitente, ej: 18096690177
    data.append('destination', turno.telefono.replace(/\D/g, '')); // limpiar solo dígitos
    data.append('message', JSON.stringify({ type: 'text', text: texto }));
    data.append('src.name', process.env.GUPSHUP_APP_NAME || 'ConstructoraBisono');

    const resp = await axios.post('https://api.gupshup.io/wa/api/v1/msg', data.toString(), {
      headers: {
        'apikey': process.env.GUPSHUP_APIKEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    res.json({ status: 'mensaje enviado', gupshup: resp.data });
  } catch (error) {
    console.error('Error enviando WhatsApp:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error enviando WhatsApp' });
  }
});

// POST /cambiar-etapa
// Cambia estado de turno y notifica siguiente pendiente
app.post('/cambiar-etapa', async (req, res) => {
  const { idTurno, nuevoEstado } = req.body;
  if (!idTurno || !nuevoEstado) return res.status(400).json({ error: 'Faltan datos' });

  const turno = turnos.find(t => t.id === idTurno);
  if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

  turno.estado = nuevoEstado;
  saveTurnos();

  // Notificar siguiente turno pendiente si cambia a "En Proceso"
  if (nuevoEstado === 'En Proceso') {
    const siguiente = turnos.find(t => t.estado === 'Pendiente');
    if (siguiente) {
      try {
        const texto = `¡Hola ${siguiente.nombre}! Es tu turno ${siguiente.numeroTurno}, por favor acércate a nuestro Oficial de Ventas Bisonó. Gracias por preferirnos.`;

        const data = new URLSearchParams();
        data.append('channel', 'whatsapp');
        data.append('source', process.env.GUPSHUP_SOURCE);
        data.append('destination', siguiente.telefono.replace(/\D/g, ''));
        data.append('message', JSON.stringify({ type: 'text', text: texto }));
        data.append('src.name', process.env.GUPSHUP_APP_NAME || 'ConstructoraBisono');

        await axios.post('https://api.gupshup.io/wa/api/v1/msg', data.toString(), {
          headers: {
            'apikey': process.env.GUPSHUP_APIKEY,
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        });
      } catch (e) {
        console.error('Error notificando siguiente turno:', e.response?.data || e.message);
      }
    }
  }

  res.json({ status: 'estado cambiado' });
});

// GET /turnos
app.get('/turnos', (req, res) => {
  res.json(turnos);
});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
