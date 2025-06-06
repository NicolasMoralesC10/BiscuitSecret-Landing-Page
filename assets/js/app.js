document.getElementById("year").textContent = new Date().getFullYear();

document.addEventListener("DOMContentLoaded", () => {
  const avgScoreEl = document.getElementById("avg-score");
  const avgStarsContainer = document.getElementById("avg-stars");
  const totalReviewsEl = document.getElementById("total-reviews");

  const starElems = document.querySelectorAll("#star-container .rating-star");
  const submitBtn = document.getElementById("submit-rating");
  let selectedRating = 0;

  // 1) Función para pintar las estrellas del promedio
  function renderAverageStars(avg) {
    avgStarsContainer.innerHTML = "";
    const full = Math.floor(avg);
    const half = avg - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);

    // Estrellas completas
    for (let i = 0; i < full; i++) {
      const span = document.createElement("span");
      span.classList.add("fs-4", "mx-1", "avg-star");
      span.textContent = "★";
      avgStarsContainer.appendChild(span);
    }
    // Media estrella
    if (half) {
      const span = document.createElement("span");
      span.classList.add("fs-4", "mx-1", "text-muted");
      span.innerHTML = '<span style="position:absolute; overflow:hidden; width:50%; color:#f2c94c;">★</span>★';
      avgStarsContainer.appendChild(span);
    }
    // Vacías
    for (let i = 0; i < empty; i++) {
      const span = document.createElement("span");
      span.classList.add("fs-4", "mx-1", "text-muted");
      span.textContent = "★";
      avgStarsContainer.appendChild(span);
    }
  }

  // 2) Obtener promedio y conteos desde get_ratings.php
  function fetchAverage() {
    fetch("get_ratings.php")
      .then((res) => {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then((data) => {
        const avg = parseFloat(data.average_rating.toFixed(2));
        const total = parseInt(data.total_reviews, 10);

        avgScoreEl.textContent = avg.toFixed(2);
        totalReviewsEl.textContent = `(${total} reseñas)`;
        renderAverageStars(avg);
      })
      .catch((err) => console.error("Error cargando promedio:", err));
  }

  // Al cargar la página, traemos el promedio
  fetchAverage();

  // 3) Manejo de estrellas para votar
  function updateRatingStars(rating) {
    starElems.forEach((star) => {
      const val = Number(star.dataset.value);
      if (val <= rating) star.classList.add("selected");
      else star.classList.remove("selected");
    });
  }

  starElems.forEach((star) => {
    const value = Number(star.dataset.value);

    star.addEventListener("mouseover", () => {
      starElems.forEach((s) => {
        if (Number(s.dataset.value) <= value) s.classList.add("hovered");
        else s.classList.remove("hovered");
      });
    });
    star.addEventListener("mouseout", () => {
      starElems.forEach((s) => s.classList.remove("hovered"));
      updateRatingStars(selectedRating);
    });
    star.addEventListener("click", () => {
      selectedRating = value;
      updateRatingStars(selectedRating);
      submitBtn.disabled = false;
    });
  });

  // 4) Envío de rating a submit_rating.php
  submitBtn.addEventListener("click", () => {
    if (selectedRating < 1) return;

    fetch("submit_rating.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: selectedRating }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then((resp) => {
        // Después de guardar el rating, reiniciar y recargar promedio
        selectedRating = 0;
        updateRatingStars(0);
        submitBtn.disabled = true;
        fetchAverage();
      })
      .catch((err) => console.error("Error enviando rating:", err));
  });
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
        behavior: "smooth",
      });
    }
  });
});
// Inicializar Typed.js
new Typed("#typed", {
  strings: ["Sabores que inspiran.", "Innovación sin límites.", "Calidad en cada detalle."],
  typeSpeed: 60,
  backSpeed: 40,
  loop: true,
});
// GSAP Parallax en el Hero
gsap.to("#hero", {
  scrollTrigger: {
    trigger: "#hero",
    start: "top top",
    scrub: true,
  },
  backgroundPosition: "center 15%",
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
