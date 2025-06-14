function compartirWhatsApp() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const ticket = document.getElementById("ticket");

  if (!nombre || !telefono) {
    alert("Completa nombre y teléfono antes de compartir.");
    return;
  }

  html2canvas(ticket).then(canvas => {
    canvas.toBlob(blob => {
      const formData = new FormData();
      formData.append("nombre", nombre);
      formData.append("telefono", telefono);
      formData.append("imagen", blob, "ticket.jpg");

      fetch("https://turnos-bisono-sembrador6-v2n2.onrender.com/enviar-imagen-whatsapp", {
        method: "POST",
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        alert("✅ Imagen enviada por WhatsApp");
        console.log("Respuesta:", data);
      })
      .catch(err => {
        alert("❌ Error al enviar por WhatsApp");
        console.error(err);
      });
    }, "image/jpeg");
  });
}
