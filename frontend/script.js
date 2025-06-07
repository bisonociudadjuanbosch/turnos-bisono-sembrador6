const backendURL = "http://localhost:3000";

function generarTurno() {
  fetch(`${backendURL}/generar-turno`, {
    method: "POST"
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("numero-turno").innerText = data.turno.numero;
      document.getElementById("fecha-hora").innerText = new Date(data.turno.fecha).toLocaleString();
      document.getElementById("en-espera").innerText = data.enEspera;
    });
}

function descargar() {
  window.print(); // temporal: luego reemplazamos por descarga JPG
}

function compartirWhatsApp() {
  alert("Integración con WhatsApp API se configurará en próximos pasos.");
}
