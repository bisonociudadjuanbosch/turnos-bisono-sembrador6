const backendURL = "https://turnos-bisono-sembrador6-5pfm.onrender.com";
let ticketImagenBase64 = "";

async function generarTurno() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const mensaje = document.getElementById("mensaje");
  const ticket = document.getElementById("ticket");

  if (!telefono) {
    mensaje.textContent = "Por favor, ingresa tu número de WhatsApp.";
    mensaje.style.color = "red";
    return;
  }

  try {
    const res = await fetch(`${backendURL}/turnos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono })
    });
    if (!res.ok) throw new Error("Error al generar el turno");

    const data = await res.json();
    mensaje.textContent = `✅ Turno generado. Revisa tu WhatsApp.`;
    mensaje.style.color = "green";

    document.getElementById("ticketTurno").textContent = data.numeroTurno;
    document.getElementById("ticketFecha").textContent = new Date().toLocaleString();
    document.getElementById("ticketEspera").textContent = data.enEspera ?? "0";
    ticket.style.display = "block";

    // Espera medio segundo para que el DOM se actualice
    setTimeout(generarYSubirImagen, 500);

    document.getElementById("nombre").value = '';
    document.getElementById("telefono").value = '';
  } catch (err) {
    mensaje.textContent = "❌ Error al generar el turno.";
    mensaje.style.color = "red";
  }
}

async function generarYSubirImagen() {
  const ticket = document.getElementById("ticket");
  const canvas = await html2canvas(ticket);
  ticketImagenBase64 = canvas.toDataURL("image/jpeg", 1.0);

  const numero = document.getElementById("ticketTurno").textContent;
  const nombreArchivo = `turno-${String(numero).padStart(4, "0")}`;

  const resp = await fetch(`${backendURL}/subir-ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64: ticketImagenBase64, nombreArchivo })
  });
  const result = await resp.json();

  if (result.url) {
    window.ticketURL = `${backendURL}${result.url}`;
    console.log("📸 Ticket subido:", window.ticketURL);
  } else {
    alert("Error al subir el ticket: " + (result.error || "desconocido"));
  }
}

function descargarTicket() {
  if (!ticketImagenBase64) return alert("Imagen aún no generada");
  const a = document.createElement("a");
  a.href = ticketImagenBase64;
  a.download = `Turno-Bisono-${Date.now()}.jpg`;
  a.click();
}

function compartirWhatsApp() {
  if (!window.ticketURL) return alert("Imagen aún no subida");
  const texto = `¡Hola! Aquí tienes tu turno para Constructora Bisonó:\n${window.ticketURL}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
}

window.generarTurno = generarTurno;
window.descargarTicket = descargarTicket;
window.compartirWhatsApp = compartirWhatsApp;
