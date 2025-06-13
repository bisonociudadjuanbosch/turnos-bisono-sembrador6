function generarTurno() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();

  if (!nombre || !telefono) {
    alert("Por favor completa tu nombre y número de WhatsApp.");
    return;
  }

  const numero = "T-" + Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  const fechaHora = new Date().toLocaleString();

  // Mostrar en pantalla
  document.getElementById("numero-turno").innerText = numero;
  document.getElementById("fecha-hora").innerText = fechaHora;
  document.getElementById("nombre-mostrado").innerText = nombre;
  document.getElementById("telefono-mostrado").innerText = telefono;

  // Registrar en backend
  fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/turnos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numero, telefono })
  })
  .then(res => res.json())
  .then(data => {
    console.log("✅ Turno registrado:", data);
    actualizarEspera();
  })
  .catch(err => {
    console.error("❌ Error al registrar turno:", err);
    alert("Hubo un problema al registrar tu turno.");
  });
}

function descargar() {
  const ticket = document.getElementById("ticket");

  html2canvas(ticket).then(canvas => {
    const link = document.createElement("a");
    link.download = "turno.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

function compartirWhatsApp() {
  const numero = document.getElementById("numero-turno").innerText;
  const nombre = document.getElementById("nombre").value.trim();
  const mensaje = encodeURIComponent(
    `Hola ${nombre}, tu turno es ${numero}.\nTe esperamos en Constructora Bisonó.`
  );

  const url = `https://wa.me/?text=${mensaje}`;
  window.open(url, "_blank");
}

function actualizarEspera() {
  fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/turnos")
    .then(res => res.json())
    .then(turnos => {
      const pendientes = turnos.filter(t => t.etapa === "Pendiente").length;
      document.getElementById("en-espera").innerText = pendientes;
    })
    .catch(console.error);
}

// Ejecutar al cargar
document.addEventListener("DOMContentLoaded", actualizarEspera);
