// index.js del frontend (HTML)
const backendURL = "https://turnos-bisono-sembrador6-v2n2.onrender.com";
let turnoActual = 0;

async function generarTurno() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  if (!nombre || !telefono) {
    alert("Por favor, completa tu nombre y número de WhatsApp.");
    return;
  }

  turnoActual++;
  const numero = "T-" + turnoActual.toString().padStart(4, "0");

  document.getElementById("numero-turno").textContent = numero;
  document.getElementById("nombre-mostrado").textContent = nombre;
  document.getElementById("telefono-mostrado").textContent = telefono;
  document.getElementById("fecha-hora").textContent = new Date().toLocaleString();

  try {
    const res = await fetch(`${backendURL}/turnos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero, telefono }),
    });

    if (!res.ok) throw new Error("No se pudo registrar el turno");

    const turnosRes = await fetch(`${backendURL}/turnos`);
    const turnos = await turnosRes.json();
    const enEspera = turnos.filter(t => t.etapa === "Pendiente").length - 1;

    document.getElementById("en-espera").textContent = enEspera;
  } catch (err) {
    alert("Error al registrar el turno: " + err.message);
  }
}

async function descargar() {
  const ticket = document.getElementById("ticket");
  html2canvas(ticket).then(canvas => {
    const link = document.createElement("a");
    link.download = "turno.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

async function compartirWhatsApp() {
  const ticket = document.getElementById("ticket");
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  if (!nombre || !telefono) return alert("Falta nombre o teléfono");

  html2canvas(ticket).then(async canvas => {
    const imgData = canvas.toDataURL("image/jpeg");
    try {
      const res = await fetch(`${backendURL}/subir-imagen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: imgData }),
      });
      const { url } = await res.json();

      const mensaje = encodeURIComponent(`Hola ${nombre}, este es tu turno para visitar Constructora Bisonó: ${url}`);
      const whatsappLink = `https://wa.me/${telefono.replace(/\D/g, "")}?text=${mensaje}`;
      window.open(whatsappLink, "_blank");
    } catch (e) {
      alert("Error al compartir por WhatsApp");
    }
  });
}
