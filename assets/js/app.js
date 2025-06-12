document.getElementById("year").textContent = new Date().getFullYear();

document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM para promedios
  const avgScoreGeneralEl = document.getElementById("avg-score-general");
  const avgStarsGeneralContainer = document.getElementById("avg-stars-general");
  const totalReviewsEl = document.getElementById("total-reviews");

  // Elementos para promedios por categoría
  const avgScoreSaborEl = document.getElementById("avg-score-sabor");
  const avgStarsSaborContainer = document.getElementById("avg-stars-sabor");
  const avgScoreServicioEl = document.getElementById("avg-score-servicio");
  const avgStarsServicioContainer = document.getElementById("avg-stars-servicio");
  const avgScorePrecioEl = document.getElementById("avg-score-precio");
  const avgStarsPrecioContainer = document.getElementById("avg-stars-precio");

  // Elementos del formulario de calificación
  const submitBtn = document.getElementById("submit-rating");

  // Objeto para almacenar las calificaciones seleccionadas
  let selectedRatings = {
    sabor: 0,
    servicio: 0,
    precio: 0
  };

  // 1) Función para pintar las estrellas del promedio
  function renderAverageStars(container, avg) {
    container.innerHTML = "";
    const full = Math.floor(avg);
    const half = avg - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);

    // Estrellas completas
    for (let i = 0; i < full; i++) {
      const span = document.createElement("span");
      span.classList.add("star", "avg-star");
      span.textContent = "★";
      container.appendChild(span);
    }

    // Media estrella
    if (half) {
      const span = document.createElement("span");
      span.classList.add("star", "text-muted");
      span.style.position = "relative";
      span.innerHTML = '<span style="position:absolute; overflow:hidden; width:50%; color:#ffc107;">★</span>★';
      container.appendChild(span);
    }

    // Estrellas vacías
    for (let i = 0; i < empty; i++) {
      const span = document.createElement("span");
      span.classList.add("star", "text-muted");
      span.textContent = "★";
      container.appendChild(span);
    }
  }

  // 2) Obtener promedios desde get_ratings.php
  function fetchAverages() {
    fetch("get_ratings.php")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        // Actualizar promedio general
        const avgGeneral = parseFloat(data.average_general || 0);
        const totalReviews = parseInt(data.total_reviews || 0, 10);

        avgScoreGeneralEl.textContent = avgGeneral.toFixed(1);
        totalReviewsEl.textContent = `(${totalReviews} reseñas)`;
        renderAverageStars(avgStarsGeneralContainer, avgGeneral);

        // Actualizar promedios por categoría
        const avgSabor = parseFloat(data.average_sabor || 0);
        const avgServicio = parseFloat(data.average_servicio || 0);
        const avgPrecio = parseFloat(data.average_precio || 0);

        avgScoreSaborEl.textContent = avgSabor.toFixed(1);
        avgScoreServicioEl.textContent = avgServicio.toFixed(1);
        avgScorePrecioEl.textContent = avgPrecio.toFixed(1);

        renderAverageStars(avgStarsSaborContainer, avgSabor);
        renderAverageStars(avgStarsServicioContainer, avgServicio);
        renderAverageStars(avgStarsPrecioContainer, avgPrecio);
      })
      .catch((err) => {
        console.error("Error cargando promedios:", err);
        // Valores por defecto en caso de error
        avgScoreGeneralEl.textContent = "0.0";
        avgScoreSaborEl.textContent = "0.0";
        avgScoreServicioEl.textContent = "0.0";
        avgScorePrecioEl.textContent = "0.0";
        totalReviewsEl.textContent = "(0 reseñas)";
      });
  }

  // Al cargar la página, traemos los promedios
  fetchAverages();

  // 3) Función para actualizar estrellas de calificación
  function updateRatingStars(category, rating) {
    const categoryContainer = document.querySelector(`[data-category="${category}"]`);
    const stars = categoryContainer.querySelectorAll(".rating-star");

    stars.forEach((star) => {
      const val = Number(star.dataset.value);
      if (val <= rating) {
        star.classList.add("active");
        star.classList.remove("text-muted");
      } else {
        star.classList.remove("active");
        star.classList.add("text-muted");
      }
    });
  }

  // 4) Función para verificar si se puede enviar la calificación
  function checkSubmitButton() {
    const canSubmit = selectedRatings.sabor > 0 && selectedRatings.servicio > 0 && selectedRatings.precio > 0;
    submitBtn.disabled = !canSubmit;
  }

  // 5) Event listeners para las estrellas de calificación
  document.querySelectorAll(".rating-star").forEach((star) => {
    const value = Number(star.dataset.value);
    const category = star.parentElement.getAttribute("data-category");

    // Evento click
    star.addEventListener("click", () => {
      selectedRatings[category] = value;
      updateRatingStars(category, value);
      checkSubmitButton();
    });

    // Evento mouseover
    star.addEventListener("mouseover", () => {
      const categoryStars = star.parentElement.querySelectorAll(".rating-star");
      categoryStars.forEach((s) => {
        const starValue = Number(s.dataset.value);
        if (starValue <= value) {
          s.style.color = "#ffc107";
        } else {
          s.style.color = "#6c757d";
        }
      });
    });

    // Evento mouseout
    star.addEventListener("mouseout", () => {
      const currentRating = selectedRatings[category];
      updateRatingStars(category, currentRating);
    });
  });

  // 6) Envío de calificaciones a submit_rating.php
  submitBtn.addEventListener("click", () => {
    // Verificar que todas las categorías tengan calificación
    if (selectedRatings.sabor < 1 || selectedRatings.servicio < 1 || selectedRatings.precio < 1) {
      Swal.fire({
        icon: "warning",
        title: "Calificación incompleta",
        text: "Por favor califica todas las categorías (Sabor, Servicio y Precio)",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#f39c12"
      });
      return;
    }

    // Mostrar loading
    Swal.fire({
      title: "Enviando calificación...",
      text: "Por favor espera un momento",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Preparar datos para enviar
    const ratingsData = {
      sabor: selectedRatings.sabor,
      servicio: selectedRatings.servicio,
      precio: selectedRatings.precio
    };

    // Enviar a PHP
    fetch("submit_rating.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(ratingsData)
    })
      .then(async (res) => {
        const data = await res.json();

        // Manejar diferentes códigos de estado HTTP
        if (res.status === 429) {
          // Too Many Requests - Usuario ya envió una calificación recientemente
          throw new Error("RATE_LIMIT");
        } else if (res.status === 400) {
          // Bad Request - Datos inválidos
          throw new Error(data.error || "Datos de calificación inválidos");
        } else if (!res.ok) {
          // Otros errores HTTP
          throw new Error(data.error || `Error HTTP: ${res.status}`);
        }

        return data;
      })
      .then((response) => {
        if (response.success) {
          // Resetear formulario
          selectedRatings = { sabor: 0, servicio: 0, precio: 0 };

          // Limpiar estrellas
          document.querySelectorAll(".rating-star").forEach((star) => {
            star.classList.remove("active");
            star.classList.add("text-muted");
            star.style.color = "#6c757d";
          });

          // Deshabilitar botón
          submitBtn.disabled = true;

          // Recargar promedios
          fetchAverages();

          // Mostrar mensaje de éxito con SweetAlert
          Swal.fire({
            icon: "success",
            title: "¡Gracias por tu calificación!",
            text: response.message || "Tu opinión es muy importante para nosotros",
            confirmButtonText: "De nada",
            confirmButtonColor: "#28a745",
            timer: 3000,
            timerProgressBar: true
          });
        } else {
          throw new Error(response.message || "Error al enviar calificación");
        }
      })
      .catch((err) => {
        console.error("Error enviando calificación:", err);

        // Manejar diferentes tipos de errores
        if (err.message === "RATE_LIMIT") {
          Swal.fire({
            icon: "info",
            title: "Calificación reciente detectada",
            text: "Ya has enviado una calificación recientemente. Por favor espera un poco antes de calificar nuevamente.",
            confirmButtonText: "Entendido",
            confirmButtonColor: "#17a2b8",
            footer: "<small>Esto ayuda a prevenir el spam y mantener la calidad de las calificaciones</small>"
          });
        } else if (err.message.includes("datos") || err.message.includes("inválid")) {
          Swal.fire({
            icon: "error",
            title: "Datos inválidos",
            text: err.message,
            confirmButtonText: "Intentar de nuevo",
            confirmButtonColor: "#dc3545"
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error al enviar calificación",
            text: "Hubo un problema técnico. Por favor intenta nuevamente en unos momentos.",
            confirmButtonText: "Intentar de nuevo",
            confirmButtonColor: "#dc3545",
            footer: "<small>Si el problema persiste, contacta al soporte técnico</small>"
          });
        }
      });
  });

  // 7) Función auxiliar para debugging (opcional)
  window.getCurrentRatings = function () {
    return selectedRatings;
  };

  // 8) Función para refrescar promedios manualmente (opcional)
  window.refreshAverages = function () {
    fetchAverages();
  };

  // 9) Función para mostrar información sobre el sistema de calificaciones
  window.showRatingInfo = function () {
    Swal.fire({
      icon: "info",
      title: "Sistema de Calificaciones",
      html: `
        <div style="text-align: left;">
          <p><strong>¿Cómo funciona?</strong></p>
          <ul>
            <li>Califica cada categoría del 1 al 5</li>
            <li>1 = Muy malo, 5 = Excelente</li>
            <li>Solo puedes calificar una vez por hora</li>
            <li>Tu calificación se promedia con las demás</li>
          </ul>
        </div>
      `,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#17a2b8"
    });
  };
});

// Scroll suave para navegación y botones
document.querySelectorAll("[data-scroll]").forEach((el) => {
  el.addEventListener("click", function (e) {
    e.preventDefault();
    const sectionId = this.getAttribute("data-scroll");
    if (sectionId) {
      const section = document.getElementById(sectionId);
      window.scrollTo({
        top: section.offsetTop - document.querySelector(".navbar").offsetHeight,
        behavior: "smooth"
      });
    }
  });
});
// Inicializar Typed.js
new Typed("#typed", {
  strings: ["Sabores que inspiran.", "Innovación sin límites.", "Calidad en cada detalle."],
  typeSpeed: 60,
  backSpeed: 40,
  loop: true
});
// GSAP Parallax en el Hero
gsap.to("#hero", {
  scrollTrigger: {
    trigger: "#hero",
    start: "top top",
    scrub: true
  },
  backgroundPosition: "center 15%"
});
// Lazy Loading con IntersectionObserver
const lazyImages = document.querySelectorAll(".lazy");
const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.getAttribute("data-src");
      img.classList.remove("lazy");
      observer.unobserve(img);
    }
  });
});
lazyImages.forEach((img) => observer.observe(img));
// Filtro y búsqueda en productos
const filterBtns = document.querySelectorAll(".filter-btn");
const productItems = document.querySelectorAll(".product-item");
const buscador = document.getElementById("buscador");
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.getAttribute("data-filter");
    productItems.forEach((item) => {
      item.style.display = filter === "all" || item.getAttribute("data-category") === filter ? "block" : "none";
    });
  });
});
buscador.addEventListener("input", () => {
  const query = buscador.value.toLowerCase();
  productItems.forEach((item) => {
    const title = item.querySelector(".card-title").textContent.toLowerCase();
    item.style.display = title.includes(query) ? "block" : "none";
  });
});
