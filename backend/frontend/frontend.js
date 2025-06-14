// Función para generar turno y obtener número desde backend
function generarTurno() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();

  if (!nombre || !telefono) {
    alert("Por favor completa todos los campos.");
    return;
  }

  fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/turnos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefono, nombre }),
  })
    .then((res) => res.json())
    .then((data) => {
      const numero = data.numero;
      if (!numero) throw new Error("No se recibió número de turno");

      // Mostrar datos en el ticket
      document.getElementById("numero-turno").innerText = numero;
      document.getElementById("fecha-hora").innerText = new Date().toLocaleString();
      document.getElementById("nombre-mostrado").innerText = nombre;
      document.getElementById("telefono-mostrado").innerText = telefono;

      // Hacer visible el ticket
      document.getElementById("ticket").style.display = "block";

      // Capturar imagen y subir
      subirImagen();
    })
    .catch((err) => {
      console.error(err);
      alert("Error al generar turno. Intente de nuevo.");
    });
}

// Función para capturar ticket como imagen y enviarla al backend
function subirImagen() {
  const ticket = document.getElementById("ticket");
  html2canvas(ticket).then((canvas) => {
    const base64image = canvas.toDataURL("image/jpeg", 0.9);

    fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/subir-imagen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagen: base64image }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          alert("Turno generado y ticket guardado correctamente.");
          // Opcional: mostrar enlace o la imagen guardada
          console.log("URL ticket guardado:", data.url);
        } else {
          alert("Turno generado pero hubo un problema guardando el ticket.");
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Error al subir imagen del ticket.");
      });
  });
}

// Función para ocultar el ticket al cargar la página
window.onload = () => {
  const ticket = document.getElementById("ticket");
  if (ticket) {
    ticket.style.display = "none";
  }
};
