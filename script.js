document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('gallery-container');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    let currentImages = [];
    let currentIndex = 0;

    // Store selected images: { [carIndex]: Set(imageIndices) }
    const selectedImages = {};

    // Fetch and Render Data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            data.forEach((car, index) => {
                selectedImages[index] = new Set();
                const section = createCarSection(car, index);
                container.appendChild(section);
            });
        })
        .catch(error => console.error('Error loading gallery data:', error));

    function createCarSection(car, carIndex) {
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

        // Controls
        const controls = document.createElement('div');
        controls.className = 'controls-bar';

        const downloadAllBtn = document.createElement('button');
        downloadAllBtn.className = 'btn btn-primary';
        downloadAllBtn.textContent = 'Download All';
        downloadAllBtn.onclick = () => downloadImages(car, car.images, `${car.brand}_${car.model}_All.zip`);

        const downloadSelectedBtn = document.createElement('button');
        downloadSelectedBtn.className = 'btn btn-secondary';
        downloadSelectedBtn.textContent = 'Download Selected (0)';
        downloadSelectedBtn.disabled = true;
        downloadSelectedBtn.onclick = () => {
            const selectedIndices = Array.from(selectedImages[carIndex]);
            const selectedImgs = selectedIndices.map(i => car.images[i]);
            downloadImages(car, selectedImgs, `${car.brand}_${car.model}_Selected.zip`);
        };

        controls.appendChild(downloadAllBtn);
        controls.appendChild(downloadSelectedBtn);

        // Grid
        const grid = document.createElement('div');
        grid.className = 'gallery-grid';

        car.images.forEach((img, imgIndex) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            const folder = car.brand === 'Chery' ? 'Chery' : 'DFSK';
            const imgPath = `${folder}/${img.filename}`;

            // Selection Checkbox
            const overlay = document.createElement('div');
            overlay.className = 'selection-overlay';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'image-checkbox';

            // Stop propagation to prevent opening lightbox when clicking checkbox
            overlay.addEventListener('click', (e) => e.stopPropagation());
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedImages[carIndex].add(imgIndex);
                    item.classList.add('selected');
                } else {
                    selectedImages[carIndex].delete(imgIndex);
                    item.classList.remove('selected');
                }
                updateDownloadSelectedBtn(downloadSelectedBtn, selectedImages[carIndex].size);
            });

            overlay.appendChild(checkbox);

            // Image content
            const imgEl = document.createElement('img');
            imgEl.src = imgPath;
            imgEl.alt = img.caption;
            imgEl.className = 'gallery-image';
            imgEl.loading = 'lazy';

            const caption = document.createElement('div');
            caption.className = 'gallery-caption';
            caption.textContent = img.caption;

            item.appendChild(overlay);
            item.appendChild(imgEl);
            item.appendChild(caption);

            item.addEventListener('click', (e) => {
                // Only open lightbox if we didn't click the checkbox/overlay (handled by stopPropagation above, but extra safety)
                openLightbox(car.images, imgIndex, folder);
            });

            grid.appendChild(item);
        });

        section.appendChild(header);
        section.appendChild(controls);
        section.appendChild(grid);
        return section;
    }

    function updateDownloadSelectedBtn(btn, count) {
        btn.textContent = `Download Selected (${count})`;
        btn.disabled = count === 0;
        if (count > 0) {
            btn.classList.replace('btn-secondary', 'btn-primary');
        } else {
            btn.classList.replace('btn-primary', 'btn-secondary');
        }
    }

    async function downloadImages(car, images, zipFilename) {
        if (!images || images.length === 0) return;

        const zip = new JSZip();
        const folderName = car.brand === 'Chery' ? 'Chery' : 'DFSK';
        let processed = 0;

        // Show loading state could be added here

        const promises = images.map(async (img) => {
            try {
                const response = await fetch(`${folderName}/${img.filename}`);
                const blob = await response.blob();
                zip.file(img.filename, blob);
            } catch (error) {
                console.error(`Failed to load ${img.filename}`, error);
            }
        });

        await Promise.all(promises);

        zip.generateAsync({ type: "blob" })
            .then(function (content) {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(content);
                link.download = zipFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
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
