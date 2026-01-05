document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('gallery-container');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    let currentImages = [];
    let currentIndex = 0;

    // Fetch and Render Data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            data.forEach(car => {
                const section = createCarSection(car);
                container.appendChild(section);
            });
        })
        .catch(error => console.error('Error loading gallery data:', error));

    function createCarSection(car) {
        const section = document.createElement('section');
        section.className = 'car-section';

        // Header
        const header = document.createElement('div');
        header.className = 'car-header';
        header.innerHTML = `
      <div class="header-content">
        <h2 class="car-title">${car.brand} ${car.model}</h2>
        <div class="car-specs">
          <span class="spec-item">📅 ${car.year}</span>
          <span class="spec-item">📝 Reg: ${car.registration}</span>
          <span class="spec-item">🚗 ${car.mileage}</span>
        </div>
      </div>
    `;

        // Grid
        const grid = document.createElement('div');
        grid.className = 'gallery-grid';

        car.images.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            const folder = car.brand === 'Chery' ? 'Chery' : 'DFSK';

            item.innerHTML = `
        <img src="${folder}/${img.filename}" alt="${img.caption}" class="gallery-image" loading="lazy">
        <div class="gallery-caption">${img.caption}</div>
      `;

            item.addEventListener('click', () => openLightbox(car.images, index, folder));
            grid.appendChild(item);
        });

        section.appendChild(header);
        section.appendChild(grid);
        return section;
    }

    // Lightbox Functions
    function openLightbox(images, index, folder) {
        currentImages = images.map(img => `${folder}/${img.filename}`);
        currentIndex = index;
        updateLightboxImage();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function updateLightboxImage() {
        lightboxImg.src = currentImages[currentIndex];
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % currentImages.length;
        updateLightboxImage();
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
        updateLightboxImage();
    }

    // Event Listeners
    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
    });
});
