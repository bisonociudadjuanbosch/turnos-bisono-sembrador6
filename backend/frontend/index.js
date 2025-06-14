const backendURL = window.location.origin;

async function generarTurno() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();

  if (!telefono) return alert("Debes ingresar tu teléfono");

  const res = await fetch(`${backendURL}/turnos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, telefono })
  });

  const data = await res.json();

  if (data.error) return alert("Error: " + data.error);

  mostrarTicket(data.numero);
}

function mostrarTicket(numeroTurno) {
  const canvas = document.getElementById("ticketCanvas");
  const ctx = canvas.getContext("2d");

  // Fondo blanco
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Texto
  ctx.fillStyle = "#000";
  ctx.font = "20px sans-serif";
  ctx.fillText("Constructora Bisonó", 30, 40);
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(numeroTurno, 90, 90);
  ctx.font = "14px sans-serif";
  ctx.fillText("Gracias por preferirnos", 50, 130);

  document.getElementById("ticket-container").style.display = "block";
}

function descargarTicket() {
  const canvas = document.getElementById("ticketCanvas");
  const link = document.createElement("a");
  link.download = "turno-bisono.jpg";
  link.href = canvas.toDataURL("image/jpeg");
  link.click();
}

async function compartirPorWhatsApp() {
  const canvas = document.getElementById("ticketCanvas");
  const imageBase64 = canvas.toDataURL("image/jpeg");

  // Subimos al servidor
  const res = await fetch(`${backendURL}/subir-imagen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imagen: imageBase64 })
  });

  const data = await res.json();

  if (!data.url) return alert("No se pudo subir la imagen");

  const link = `https://api.whatsapp.com/send?text=¡Hola! Aquí está tu turno: ${data.url}`;
  window.open(link, "_blank");
}
