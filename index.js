const backendURL = "https://turnos-bisono-sembrador6-v2n2.onrender.com";
let turnoActual = 0;

// Al cargar, obtener el último turno del backend
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(`${backendURL}/turnos`);
    const turnos = await res.json();
    if (Array.isArray(turnos) && turnos.length > 0) {
      // Extraer el último número (formato: T-0005)
      const ultimosNumeros = turnos.map(t => parseInt(t.numero?.split("-")[1] || 0, 10));
      turnoActual = Math.max(...ultimosNumeros);
    }
  } catch (err) {
    console.warn("No se pudo cargar el número de turno actual:", err);
  }
});

function generarTurno() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();

  if (!nombre || !telefono) {
    alert("Por favor ingresa tu nombre y número de WhatsApp.");
    return;
  }

  if (!/^\d{10}$/.test(telefono)) {
    alert("El número de WhatsApp debe tener 10 dígitos (sin espacios ni guiones).");
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

  // Enviar al backend
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
  const boton = document.getElementById("btn-whatsapp");

  if (!nombre || !telefono) {
    alert("Faltan datos del cliente.");
    return;
  }

  if (!/^\d{10}$/.test(telefono)) {
    alert("El número debe tener 10 dígitos.");
    return;
  }

  try {
    boton.disabled = true;
    boton.innerText = "Enviando...";

    // Captura y convierte el ticket a base64
    const canvas = await html2canvas(ticket, { backgroundColor: "#fff", scale: 2 });
    const base64 = canvas.toDataURL("image/jpeg", 1.0);
    const nombreArchivo = `turno_${Date.now()}.jpg`;

    // Subir imagen al servidor
    const subida = await fetch(`${backendURL}/subir-imagen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, nombreArchivo })
    });

    const { url } = await subida.json();

    // Enviar por WhatsApp usando plantilla
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
  } catch (err) {
    console.error("Error al compartir por WhatsApp:", err);
    alert("Hubo un error al subir o enviar el ticket.");
  } finally {
    boton.disabled = false;
    boton.innerText = "Compartir por WhatsApp";
  }
}
