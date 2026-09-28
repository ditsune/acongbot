// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    initializeTheme();
    initializeCopyFunctionality();
    initializeSearchFunctionality();
    initializeQuickActions();
    initializeQRFunctionality();
    initializeKeyboardShortcuts();
    loadUsageCounts();

    console.log('ACONG BOT initialized!');
}

// ==================== THEME ====================
function initializeTheme() {
    document.documentElement.classList.remove('dark-preload');

    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = themeToggle.querySelector('i');
    const savedTheme = localStorage.getItem("theme");

    // Set class dark
    const isDark = savedTheme !== 'light';
    document.body.classList.toggle('dark', isDark);

    // Set icon (Font Awesome)
    themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';

    if (!savedTheme) {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // Toggle handler
    themeToggle.addEventListener('click', () => {
        const nowDark = !document.body.classList.contains('dark');
        document.body.classList.toggle('dark', nowDark);
        localStorage.setItem('theme', nowDark ? 'dark' : 'light');
        themeIcon.className = nowDark ? 'fas fa-sun' : 'fas fa-moon';
        showToast(`Mode ${nowDark ? 'Gelap' : 'Terang'} diaktifkan`);
    });
}

// ==================== COPY TEXT ====================
function initializeCopyFunctionality() {
    document.querySelectorAll('.card.copyable').forEach(card => {
        card.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const textElement = document.getElementById(targetId);

            if (!textElement) {
                showToast('Error: Element tidak ditemukan');
                return;
            }

            const text = textElement.innerText.trim();
            if (!text) {
                showToast('Tidak ada teks untuk disalin');
                return;
            }

            navigator.clipboard.writeText(text).then(() => {
                updateUsageCount(targetId);
                this.classList.add('copied');
                setTimeout(() => this.classList.remove('copied'), 500);
                showToast("✅ Teks berhasil disalin!");
            }).catch(err => {
                console.error(err);
                showToast('❌ Gagal menyalin teks');
            });
        });
    });
}

function updateUsageCount(targetId) {
    const countElement = document.getElementById(`count-${targetId}`);
    if (!countElement) return;

    let count = parseInt(countElement.textContent) || 0;
    count++;
    countElement.textContent = count;
    localStorage.setItem(`count-${targetId}`, count);
}

// ==================== SEARCH ====================
function initializeSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase().trim();

        // Reset semua dulu
        document.querySelectorAll('.card, .quick-action-btn, .quick-action-category, .section').forEach(el => {
            el.style.display = '';
        });

        if (searchTerm === '') return;

        let foundResults = false;

        // ===== 1. Filter CARDS (Text Box) =====
        document.querySelectorAll('.card').forEach(card => {
            // Ambil SEMUA teks dari card (judul + isi + footer)
            // Cara paling aman: pakai textContent seluruh card
            const fullText = (card.textContent || '').toLowerCase();
            const match = fullText.includes(searchTerm);

            card.style.display = match ? '' : 'none';
            if (match) foundResults = true;
        });

        // ===== 2. Filter QUICK ACTION BUTTONS =====
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            const text = (btn.querySelector('.quick-action-text')?.textContent || '').toLowerCase();
            const match = text.includes(searchTerm);
            btn.style.display = match ? '' : 'none';
            if (match) foundResults = true;
        });

        // ===== 3. Hide empty quick action categories =====
        document.querySelectorAll('.quick-action-category').forEach(cat => {
            const hasVisibleBtn = Array.from(cat.querySelectorAll('.quick-action-btn'))
                .some(btn => btn.style.display !== 'none');
            const hasVisibleCard = Array.from(cat.querySelectorAll('.card'))
                .some(card => card.style.display !== 'none');

            // category tetap tampil kalau ada isinya yang visible
            cat.style.display = (hasVisibleBtn || hasVisibleCard) ? '' : 'none';
        });

        // ===== 4. Hide empty sections =====
        document.querySelectorAll('.section').forEach(section => {
            const hasVisibleCards = Array.from(section.querySelectorAll('.card'))
                .some(c => c.style.display !== 'none');
            const hasVisibleQA = Array.from(section.querySelectorAll('.quick-action-btn'))
                .some(b => b.style.display !== 'none');

            section.style.display = (hasVisibleCards || hasVisibleQA) ? '' : 'none';
        });

        if (!foundResults) showToast('🔍 Tidak ada hasil ditemukan');
    });

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            this.value = '';
            this.dispatchEvent(new Event('input'));
            this.blur();
            showToast("🧹 Pencarian dibersihkan");
        }
    });
}
// ==================== QUICK ACTIONS ====================
function initializeQuickActions() {
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');

            if (targetId === 'qris') {
                // Ambil gambar dari <img class="qris-logo"> di dalam tombol ini
                const imgEl = this.querySelector('img.qris-logo') || this.querySelector('img');
                handleImageCopy(this, imgEl, 'QRIS');
            } else {
                copyFromQuickAction(targetId, this);
            }
        });
    });
}

function copyFromQuickAction(targetId, button) {
    const textElement = document.getElementById(targetId);
    if (!textElement) {
        showToast('Error: Element tidak ditemukan');
        return;
    }

    const text = textElement.innerText.trim();
    if (!text) {
        showToast('Tidak ada teks untuk disalin');
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        updateUsageCount(targetId);
        button.classList.add('copied');
        setTimeout(() => button.classList.remove('copied'), 1000);

        const actionNames = {
            'code1': 'Order',
            'code2': 'Kirim Username',
            'code3': 'Link GC',
        };
        showToast(`✅ ${actionNames[targetId] || 'Teks'} berhasil disalin!`);
    }).catch(err => {
        console.error(err);
        showToast('❌ Gagal menyalin teks');
    });
}

// ==================== COPY IMAGE (CORE) ====================
/**
 * Copy gambar ke clipboard. Menerima HTMLImageElement ATAU string URL.
 */
async function copyImageToClipboard(source) {
    // Support: HTMLImageElement atau string URL
    let url;
    if (source instanceof HTMLImageElement) {
        url = source.currentSrc || source.src;
    } else {
        url = String(source);
    }

    if (!url) throw new Error('Sumber gambar tidak valid');

    // Cek dukungan browser
    if (!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem === 'undefined') {
        throw new Error('Browser tidak mendukung copy gambar ke clipboard');
    }

    // ===== CARA 1: fetch blob langsung (paling reliable, no canvas) =====
    try {
        const response = await fetch(url, { cache: 'force-cache' });
        if (response.ok) {
            const blob = await response.blob();

            // Kalau sudah PNG, langsung pakai
            if (blob.type === 'image/png') {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                return;
            }

            // Kalau bukan PNG (misal JPEG), convert via canvas
            // Tapi konversi dari blob URL (same-origin) → nggak tainted
            const pngBlob = await convertBlobToPng(blob);
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': pngBlob })
            ]);
            return;
        }
    } catch (e) {
        console.warn('Fetch blob gagal, coba cara lain:', e);
    }

    // ===== CARA 2: fallback pakai <img> element di DOM =====
    const imgEl = (source instanceof HTMLImageElement) ? source : findImageBySrc(url);
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        const pngBlob = await imageElementToPngBlob(imgEl);
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': pngBlob })
        ]);
        return;
    }

    // ===== CARA 3: fallback terakhir — load image baru =====
    const img = await loadImage(url);
    const pngBlob = await imageElementToPngBlob(img);
    await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
    ]);
}

// Konversi blob (dari fetch, jadi same-origin) ke PNG
function convertBlobToPng(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob); // blob URL = same-origin
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((pngBlob) => {
                    if (pngBlob) resolve(pngBlob);
                    else reject(new Error('Gagal convert ke PNG'));
                }, 'image/png');
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Gagal load blob image'));
        };
        img.src = url;
    });
}

function findImageBySrc(src) {
    // Normalisasi path (hilangkan ./ di depan)
    const normalize = (s) => {
        try {
            return new URL(s, window.location.href).href;
        } catch {
            return s;
        }
    };
    const target = normalize(src);

    const imgs = document.querySelectorAll('img');
    for (const img of imgs) {
        if (normalize(img.getAttribute('src') || '') === target) {
            return img;
        }
    }
    return null;
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Hanya set crossOrigin kalau bukan same-origin (biar canvas nggak tainted)
        try {
            const isSameOrigin = new URL(src, window.location.href).origin === window.location.origin;
            if (!isSameOrigin) img.crossOrigin = 'anonymous';
        } catch { }

        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Gagal memuat gambar: ' + src));
        img.src = src;
    });
}

function imageElementToPngBlob(imgElement) {
    return new Promise((resolve, reject) => {
        try {
            const w = imgElement.naturalWidth || imgElement.width;
            const h = imgElement.naturalHeight || imgElement.height;
            if (!w || !h) {
                reject(new Error('Ukuran gambar tidak valid'));
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0, w, h);

            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Gagal konversi ke PNG'));
            }, 'image/png');
        } catch (err) {
            reject(err);
        }
    });
}

// ==================== HANDLE IMAGE COPY (dengan feedback) ====================
async function handleImageCopy(triggerEl, imgSource, label) {
    // Kalau imgSource adalah <img> element, ambil src-nya; kalau string, pakai langsung
    let source = imgSource;
    if (imgSource instanceof HTMLImageElement) {
        source = imgSource.currentSrc || imgSource.src;
    }

    if (!source) {
        showToast('❌ Sumber gambar tidak ditemukan');
        return;
    }

    try {
        await copyImageToClipboard(source);

        triggerEl.classList.add('copied');
        setTimeout(() => triggerEl.classList.remove('copied'), 1000);

        updateUsageCount(label === 'QRIS' ? 'qris-quick' : 'qr-code');
        showToast(`🖼️ Gambar ${label} berhasil disalin ke clipboard!`);
    } catch (err) {
        console.error('Copy image failed:', err);
        showToast(`❌ Gagal: ${err.message}`);
    }
}

// ==================== QR CARD ====================
function initializeQRFunctionality() {
    document.querySelectorAll('.qr-card').forEach(card => {
        card.addEventListener('click', function () {
            const img = this.querySelector('.qr-image');
            if (!img) {
                showToast('❌ Gambar QR Code tidak tersedia');
                return;
            }
            handleImageCopy(this, img, 'QR Code');
        });
    });

    // Handle error/load gambar
    document.querySelectorAll('.qr-image').forEach(img => {
        img.addEventListener('error', function () {
            const card = this.closest('.qr-card');
            const placeholder = card?.querySelector('.qr-placeholder');
            if (placeholder) {
                placeholder.style.display = 'flex';
                this.style.display = 'none';
            }
        });

        img.addEventListener('load', function () {
            const placeholder = this.closest('.qr-card')?.querySelector('.qr-placeholder');
            if (placeholder) placeholder.style.display = 'none';
        });
    });
}

// ==================== KEYBOARD SHORTCUTS ====================
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
                showToast("🔍 Tekan Escape untuk clear search");
            }
        }

        if (e.key === 'Escape') {
            const searchInput = document.getElementById('searchInput');
            if (document.activeElement === searchInput && searchInput.value.trim() !== '') {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                showToast("🧹 Search cleared");
            }
        }
    });
}

// ==================== USAGE COUNTS ====================
function loadUsageCounts() {
    document.querySelectorAll('.usage-count span').forEach(span => {
        const id = span.id.replace('count-', '');
        const count = localStorage.getItem(`count-${id}`) || '0';
        span.textContent = count;
    });
}

// ==================== TOAST ====================
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}