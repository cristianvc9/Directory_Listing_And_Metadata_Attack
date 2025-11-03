async function loadGallery() {
    const res = await fetch("/images");
    const images = await res.json();

    const gallery = document.getElementById("galleryGrid");
    gallery.innerHTML = "";

    images.reverse().forEach(img => {
        const item = document.createElement("div");
        item.classList.add("gallery-item");
        item.innerHTML = `
      <img src="${img.file}" class="gallery-img">
      <div class="gallery-overlay">
        <h3>${img.username}</h3>
        <p>${img.comment}</p>
      </div>
    `;
        gallery.appendChild(item);
    });
}

document.getElementById("uploadForm").addEventListener("submit", async e => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const res = await fetch("/upload", {
        method: "POST",
        body: formData
    });

    const result = await res.json();
    if (result.success) {
        e.target.reset();
        loadGallery(); // 🔥 Recarga la galería automáticamente
    } else {
        alert("Error al subir la imagen");
    }
});

loadGallery();
