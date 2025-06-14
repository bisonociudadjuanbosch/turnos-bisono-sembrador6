const backendURL = window.location.origin;

async function generarTurno() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();

  if (!nombre || !telefono) {
    alert("Por favor completa ambos campos.");
    return;
  }

  try {
    const res = await fetch(`${backendURL}/turnos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono }),
    });

    const data = await res.json();

    if (data.error) {
      alert("Error: " + data.error);
      return;
    }

    actualizarTicket(data, nombre, telefono);
    actualizarEnEspera();
  } catch (err) {
    alert("Error al crear turno");
    console.error(err);
  }
}

function actualizarTicket(turnoData, nombre, telefono) {
  document.getElementById("numero-turno").textContent = turnoData.numero;
  document.getElementById("fecha-hora").textContent = new Date().toLocaleString("es-DO");
  document.getElementById("nombre-mostrado").textContent = nombre;
  document.getElementById("telefono-mostrado").textContent = telefono;
}

async function actualizarEnEspera() {
  try {
    const res = await fetch(`${backendURL}/turnos`);
    const turnos = await res.json();

    // Contar cuantos están en etapa "Pendiente"
    const pendientes = turnos.filter(t => t.etapa === "Pendiente").length;
    document.getElementById("en-espera").textContent = pendientes;
  } catch {
    document.getElementById("en-espera").textContent = "?";
  }
}

async function descargar() {
  const ticket = document.getElementById("ticket");

  // Usar html2canvas para convertir el div a imagen
  const canvas = await html2canvas(ticket, { scale: 2 });

  const link = document.createElement("a");
  link.download = "turno-bisono.jpg";
  link.href = canvas.toDataURL("image/jpeg", 1);
  link.click();
}

async function compartirWhatsApp() {
  const ticket = document.getElementById("ticket");

  try {
    const canvas = await html2canvas(ticket, { scale: 2 });
    const imageBase64 = canvas.toDataURL("image/jpeg", 1);

    const res = await fetch(`${backendURL}/subir-imagen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagen: imageBase64 }),
    });

    const data = await res.json();
    if (!data.url) {
      alert("Error al subir la imagen");
      return;
    }

    const mensaje = encodeURIComponent(`¡Hola! Aquí está tu turno: ${data.url}`);
    const whatsappURL = `https://api.whatsapp.com/send?text=${mensaje}`;
    window.open(whatsappURL, "_blank");
  } catch (err) {
    alert("Error al compartir por WhatsApp");
    console.error(err);
  }
}

// Actualizar la cantidad en espera al cargar la página
window.onload = actualizarEnEspera;
.