document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('gallery-container');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');

    let currentImages = [];
    let currentIndex = 0;

    // Global Selection State
    // We'll treat all images as one big list for drag selection, 
    // but keep track of them by car section for "Download Selected"
    let allGalleryItems = []; // Array of { element, data, index, carIndex }
    const selectedImages = {}; // { [carIndex]: Set(imgIndices) }

    // Drag Selection Variables
    let isDragging = false;
    let startX, startY;
    const selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    document.body.appendChild(selectionBox);

    // Fetch and Render Data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            data.forEach((car, index) => {
                selectedImages[index] = new Set();
                const section = createCarSection(car, index);
                container.appendChild(section);
            });
            // Prepare drag selection items
            allGalleryItems = Array.from(document.querySelectorAll('.gallery-item')).map(item => {
                return {
                    element: item,
                    rect: item.getBoundingClientRect(),
                    carIndex: parseInt(item.dataset.carIndex),
                    imgIndex: parseInt(item.dataset.imgIndex)
                };
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
        downloadSelectedBtn.id = `btn-selected-${carIndex}`;
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
            item.dataset.carIndex = carIndex;
            item.dataset.imgIndex = imgIndex;

            const folder = car.brand === 'Chery' ? 'Chery' : 'DFSK';
            const imgPath = `${folder}/${img.filename}`;

            // Selection Checkbox (Custom Overlay)
            const overlay = document.createElement('div');
            overlay.className = 'selection-overlay';

            // We use the overlay as the visual checkbox. 
            // The click logic resides on the item itself for better UX.

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

            // Interaction Logic
            item.addEventListener('click', (e) => {
                // If any item is selected globally, or if we clicked the checkbox overlay directly
                const totalSelected = getTotalSelectedCount();
                const isOverlayClick = e.target.closest('.selection-overlay');

                if (totalSelected > 0 || isOverlayClick) {
                    toggleSelection(carIndex, imgIndex, item);
                } else {
                    openLightbox(car.images, imgIndex, folder);
                }
            });

            grid.appendChild(item);
        });

        section.appendChild(header);
        section.appendChild(controls);
        section.appendChild(grid);
        return section;
    }

    function toggleSelection(carIndex, imgIndex, itemElement) {
        const set = selectedImages[carIndex];
        if (set.has(imgIndex)) {
            set.delete(imgIndex);
            itemElement.classList.remove('selected');
        } else {
            set.add(imgIndex);
            itemElement.classList.add('selected');
        }

        updateDownloadSelectedBtn(carIndex);
    }

    function updateDownloadSelectedBtn(carIndex) {
        const count = selectedImages[carIndex].size;
        const btn = document.getElementById(`btn-selected-${carIndex}`);
        if (btn) {
            btn.textContent = `Download Selected (${count})`;
            btn.disabled = count === 0;
            if (count > 0) {
                btn.classList.replace('btn-secondary', 'btn-primary');
            } else {
                btn.classList.replace('btn-primary', 'btn-secondary');
            }
        }
    }

    function getTotalSelectedCount() {
        let total = 0;
        for (const key in selectedImages) {
            total += selectedImages[key].size;
        }
        return total;
    }

    function clearAllSelections() {
        allGalleryItems.forEach(item => {
            const { carIndex, imgIndex, element } = item;
            selectedImages[carIndex].delete(imgIndex);
            element.classList.remove('selected');
        });
        // Update all buttons
        for (const key in selectedImages) {
            updateDownloadSelectedBtn(key);
        }
    }

    // Drag Selection Logic
    document.addEventListener('mousedown', (e) => {
        // Start drag only if left click and not on specific interactive elements
        if (e.button !== 0 || e.target.closest('.btn') || e.target.closest('.lightbox')) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.display = 'block';

        // Re-calculate rects in case of scroll/layout changes
        allGalleryItems.forEach(item => {
            item.rect = item.element.getBoundingClientRect();
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        const minX = Math.min(startX, currentX);
        const minY = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        selectionBox.style.left = minX + 'px';
        selectionBox.style.top = minY + 'px';
        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';

        // Check intersections
        allGalleryItems.forEach(item => {
            const itemRect = item.rect;
            const intersect = !(itemRect.right < minX ||
                itemRect.left > minX + width ||
                itemRect.bottom < minY ||
                itemRect.top > minY + height);

            if (intersect) {
                // Determine logic: add to selection
                if (!selectedImages[item.carIndex].has(item.imgIndex)) {
                    selectedImages[item.carIndex].add(item.imgIndex);
                    item.element.classList.add('selected');
                    updateDownloadSelectedBtn(item.carIndex);
                }
            }
        });
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            selectionBox.style.display = 'none';
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (lightbox.classList.contains('active')) {
                closeLightbox();
            } else {
                clearAllSelections();
            }
        }
        // Lightbox nav
        if (lightbox.classList.contains('active')) {
            if (e.key === 'ArrowRight') showNext();
            if (e.key === 'ArrowLeft') showPrev();
        }
    });

    // Download Logic (same as before)
    async function downloadImages(car, images, zipFilename) {
        if (!images || images.length === 0) return;

        const zip = new JSZip();
        const folderName = car.brand === 'Chery' ? 'Chery' : 'DFSK';

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

    // Listeners
    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
});
