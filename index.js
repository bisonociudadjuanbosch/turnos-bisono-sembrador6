// index.js - Lógica de generación de turno y envío
const backendURL = "https://turnos-bisono-sembrador6-v2n2.onrender.com";
let turnoActual = 0;

function generarTurno() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  if (!nombre || !telefono) {
    alert("Por favor ingresa tu nombre y número de WhatsApp.");
    return;
  }

  turnoActual++;
  const numero = "T-" + turnoActual.toString().padStart(4, "0");
  const ahora = new Date();
  const fechaHora = ahora.toLocaleString("es-DO", {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  document.getElementById("numero-turno").innerText = numero;
  document.getElementById("fecha-hora").innerText = "Fecha y hora: " + fechaHora;
  document.getElementById("nombre-mostrado").innerText = "Cliente: " + nombre;
  document.getElementById("telefono-mostrado").innerText = "Tel: " + telefono;
  document.getElementById("en-espera").innerText = Math.max(0, turnoActual - 1);

  fetch(`${backendURL}/agregar-turno`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numero, nombre, telefono })
  });
}

function descargar() {
  const ticket = document.getElementById("ticket");
  html2canvas(ticket, { backgroundColor: "#ffffff", scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = "turno.jpg";
    link.href = canvas.toDataURL("image/jpeg", 1.0);
    link.click();
  });
}

async function compartirWhatsApp() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const ticket = document.getElementById("ticket");
  if (!nombre || !telefono) {
    alert("Faltan datos del cliente.");
    return;
  }

  const canvas = await html2canvas(ticket, { backgroundColor: "#fff", scale: 2 });
  const base64 = canvas.toDataURL("image/jpeg", 1.0);

  const subida = await fetch(`${backendURL}/subir-imagen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imagenBase64: base64, nombre })
  });

  const { url } = await subida.json();

  const mensaje = "¡Hola! Es tu turno, por favor acércate a nuestro Oficial de Ventas Bisonó. Gracias por preferirnos.";
  await fetch(`${backendURL}/enviar-turno`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefono, mensaje })
  });

  alert("Turno enviado por WhatsApp. Asegúrate de haber hecho opt-in.");
}