const backendURL = window.location.origin;

async function generarTurno() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();

  if (!telefono) {
    alert("Por favor ingresa tu número de WhatsApp.");
    return;
  }

  try {
    const res = await fetch("https://tu-backend-url.onrender.com/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono }),
    });

    if (!res.ok) throw new Error(`Error ${res.status}`);

    const data = await res.json();

    document.getElementById("numero-turno").textContent = data.numero;
    document.getElementById("nombre-mostrado").textContent = data.nombre || "";
    document.getElementById("telefono-mostrado").textContent = data.telefono;

    // Fecha y hora actual
    const ahora = new Date();
    document.getElementById("fecha-hora").textContent = ahora.toLocaleString();

    alert("Turno generado: " + data.numero);

    // Actualizar personas en espera
    await actualizarEnEspera();

  } catch (error) {
    console.error("Error al generar turno:", error);
    alert("Error al generar turno. Intente de nuevo.");
  }
}

async function actualizarEnEspera() {
  try {
    const res = await fetch("https://tu-backend-url.onrender.com/turnos");
    if (!res.ok) throw new Error("No se pudo obtener lista de turnos");
    const turnos = await res.json();
    // Solo contar los que estén en etapa Pendiente
    const pendientes = turnos.filter(t => t.etapa === "Pendiente").length;
    document.getElementById("en-espera").textContent = pendientes;
  } catch (error) {
    console.error("Error al actualizar en espera:", error);
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
