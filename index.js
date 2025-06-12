// index.js - Actualizado con flujo de opt-in y envío de imagen por plantilla
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

  // Paso 1: Redirigir al opt-in de Gupshup
  const optinURL = "https://www.gupshup.io/whatsapp/optin?bId=957b8460-920b-4f6e-89a6-ce93c9b58890";
  window.open(optinURL, "_blank");

  // Paso 2: Continuar después de confirmación
  const confirmar = confirm("¿Ya diste opt-in en WhatsApp? Si ya iniciaste conversación con Bisonó, haz clic en Aceptar para enviar el ticket.");
  if (!confirmar) return;

  // Paso 3: Generar imagen y subir
  const canvas = await html2canvas(ticket, { backgroundColor: "#fff", scale: 2 });
  const base64 = canvas.toDataURL("image/jpeg", 1.0);
  const nombreArchivo = `turno_${Date.now()}.jpg`;

  const subida = await fetch(`${backendURL}/subir-imagen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, nombreArchivo })
  });

  const { url } = await subida.json();

  // Paso 4: Enviar imagen por plantilla
  const envio = await fetch(`${backendURL}/enviar-whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      numeroTelefono: telefono,
      plantillaId: "b7648d2e-cc8b-428d-8552-d3374061df33",
      nombreCliente: nombre,
      imagenUrl: url
    })
  });

  if (envio.ok) {
    alert(`✅ Turno enviado por WhatsApp. También puedes descargar tu ticket aquí: ${url}`);
  } else {
    alert("❌ No se pudo enviar por WhatsApp. Verifica que hayas hecho opt-in.");
  }
}
