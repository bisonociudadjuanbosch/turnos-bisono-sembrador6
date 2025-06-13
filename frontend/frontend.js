function generarTurno() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();

  if (!nombre || !telefono) {
    alert("Por favor completa todos los campos.");
    return;
  }

  const numero = "T-" + Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  document.getElementById("numero-turno").innerText = numero;
  document.getElementById("fecha-hora").innerText = new Date().toLocaleString();
  document.getElementById("nombre-mostrado").innerText = nombre;
  document.getElementById("telefono-mostrado").innerText = telefono;

  fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/turnos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numero, telefono }),
  }).then(r => r.json()).then(console.log).catch(console.error);
}

function descargar() {
  const ticket = document.getElementById("ticket");
  html2canvas(ticket).then(canvas => {
    const link = document.createElement("a");
    link.download = "turno.png";
    link.href = canvas.toDataURL();
    link.click();
  });
}

function compartirWhatsApp() {
  const numero = document.getElementById("numero-turno").innerText;
  const nombre = document.getElementById("nombre").value.trim();
  const mensaje = encodeURIComponent(`Hola ${nombre}, tu turno es: ${numero}.\nTe esperamos en Constructora Bisonó.`);
  window.open(`https://wa.me/?text=${mensaje}`, "_blank");
}
