// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    initializeTheme();
    initializeSearchFunctionality();
    initializeQuickActions();
    initializeKeyboardShortcuts();
    loadUsageCounts();

    // Templates
    loadTemplates();
    initializeTemplateControls();

    // Default tampilkan
    showTemplatesGrid();
}

function initializeTemplateControls() {
    const toggleBtn = document.getElementById('toggleAllBtn');
    const filterBar = document.getElementById('templateFilterBar');
    const inlineSearch = document.getElementById('templateSearchInline');
    const pillsWrap = document.getElementById('tmplCatPills');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
            toggleAllTemplates();
            const grid = document.getElementById('templatesGrid');
            const isNowVisible = !grid.classList.contains('hidden');
            if (filterBar) filterBar.style.display = isNowVisible ? 'flex' : 'none';
            if (isNowVisible) applyTemplateFilter();
        });
    }

    if (inlineSearch) {
        inlineSearch.addEventListener('input', () => applyTemplateFilter());
    }

    if (pillsWrap) {
        pillsWrap.addEventListener('click', function (e) {
            const pill = e.target.closest('.tmpl-pill');
            if (!pill) return;
            this.querySelectorAll('.tmpl-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            applyTemplateFilter();
        });
    }
}

function initializeQuickActions() {
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            handleQuickAction(this.getAttribute('data-template'));
        });
    });
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


function updateUsageCount(targetId) {
    const countElement = document.getElementById(`count-${targetId}`);
    if (!countElement) return;

    let count = parseInt(countElement.textContent) || 0;
    count++;
    countElement.textContent = count;
    localStorage.setItem(`count-${targetId}`, count);
}

// ==================== SEARCH ====================
// ==================== SEARCH ====================
function initializeSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', function (e) {
        const q = e.target.value.toLowerCase().trim();

        // Sync ke inline search
        const inlineInput = document.getElementById('templateSearchInline');
        if (inlineInput && inlineInput.value !== e.target.value) {
            inlineInput.value = e.target.value;
        }

        // Reset tampilan dulu
        document.querySelectorAll('.template-card, .quick-btn, .quick-group, .templates-section, .quick-actions-section')
            .forEach(el => el.style.display = '');

        if (q === '') {
            // Balikin filter bar ke state normal
            applyTemplateFilter();
            return;
        }

        let foundResults = false;

        // ===== 1. Filter TEMPLATE CARDS =====
        document.querySelectorAll('.template-card').forEach(card => {
            const fullText = (card.textContent || '').toLowerCase();
            const match = fullText.includes(q);
            card.style.display = match ? '' : 'none';
            if (match) foundResults = true;
        });

        // ===== 2. Filter QUICK ACTION BUTTONS =====
        document.querySelectorAll('.quick-btn').forEach(btn => {
            const fullText = (btn.textContent || '').toLowerCase();
            const match = fullText.includes(q);
            btn.style.display = match ? '' : 'none';
            if (match) foundResults = true;
        });

        // ===== 3. Hide empty quick groups =====
        document.querySelectorAll('.quick-group').forEach(group => {
            const hasVisibleBtn = Array.from(group.querySelectorAll('.quick-btn'))
                .some(btn => btn.style.display !== 'none');
            group.style.display = hasVisibleBtn ? '' : 'none';
        });

        // ===== 4. Hide empty sections =====
        document.querySelectorAll('.quick-actions-section, .templates-section').forEach(section => {
            const hasVisible = Array.from(section.querySelectorAll('.template-card, .quick-btn'))
                .some(el => el.style.display !== 'none');
            section.style.display = hasVisible ? '' : 'none';
        });

        // ===== 5. Tampilkan pesan empty state kalau nggak ada hasil =====
        const emptyEl = document.getElementById('tmplEmpty');
        if (emptyEl) emptyEl.style.display = foundResults ? 'none' : 'block';

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

function initializeQuickActions() {
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const templateKey = this.getAttribute('data-template');
            handleQuickAction(templateKey);
        });
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
async function handleImageCopy(triggerEl, imgSource, label, templateId = null) {
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

        // Flash trigger element (quick button / card)
        flashCopied(triggerEl);

        // Kalau dari template (ada ID) → update count + flash card template
        if (templateId !== null) {
            incrementTemplateCount(templateId);

            // Flash card template juga
            const card = document.querySelector(`.template-card[data-id="${templateId}"]`);
            if (card && card !== triggerEl) {
                flashCopied(card);
            }
        } else {
            updateUsageCount(label === 'QRIS' ? 'qris-quick' : 'qr-code');
        }

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

// ==================== TEMPLATES DATA ====================
// Ini tempat data template kamu. Ganti sesuai kebutuhan.
// Format: { id, name, category, content }
// category: "order" | "problem" | "status" | "other"

const templatesData = [
    {
        id: 1,
        name: "Order",
        category: "order",
        content: `*RANK VS BOT MAX 🌟75*

*3K PERMATCH*

> ⎋ FLEX ON 
> ⎋ LIMIT 5 GAME
> ⎋ MMR DERES N12+
> ⎋ BOT WARLIT JINAK


SUDAH PAYMENT SS + SEBUT NICKNAME DAN HERO APA`
    },
    {
        id: 2,
        name: "Kirim Username",
        category: "order",
        content: `Dana masuk, kirim username`
    },
    {
        id: 3,
        name: "Link Grup",
        category: "order",
        content: `https://chat.whatsapp.com/EAKgivEWKKzGU1kULniiuj`
    },
    {
        id: 4,
        name: "QRIS",
        category: "order",
        type: "image",
        image: "foto/qr.png",
        content: "Klik untuk copy gambar QRIS"
    },
    // Tambahkan template lain sesuai kebutuhan
];

// ==================== TEMPLATE STATE ====================
let templatesHidden = true;
let activeCategory = 'all';

function getCategoryName(cat) {
    return {
        order: 'Order',
        problem: 'Problem',
        status: 'Status',
        other: 'Lainnya'
    }[cat] || 'Lainnya';
}

function getCategoryIcon(cat) {
    return {
        order: 'fa-shopping-cart',
        problem: 'fa-exclamation-triangle',
        status: 'fa-info-circle',
        other: 'fa-ellipsis-h'
    }[cat] || 'fa-tag';
}

// ==================== LOAD TEMPLATES ====================
function loadTemplates() {
    const grid = document.getElementById('templatesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const countEl = document.getElementById('templateCount');
    if (countEl) countEl.textContent = templatesData.length;

    templatesData.forEach(t => {
        const used = localStorage.getItem(`template-${t.id}-used`) || 0;
        const card = document.createElement('div');
        card.className = 'template-card';
        card.setAttribute('data-id', t.id);
        card.setAttribute('data-category', t.category);
        card.setAttribute('data-name', t.name.toLowerCase());
        card.setAttribute('data-preview', (t.content || '').slice(0, 100).toLowerCase());
        card.setAttribute('data-type', t.type || 'text');

        // Body beda buat text vs image
        const bodyContent = t.type === 'image'
            ? `<div class="tc-image-wrap"><img src="${t.image}" alt="${t.name}" class="tc-image" loading="lazy"></div>`
            : `<div class="tc-preview">${t.content.trim().substring(0, 120)}${t.content.length > 120 ? '...' : ''}</div>
               <div class="tc-content hidden">${t.content}</div>`;

        card.innerHTML = `
            <div class="tc-accent-bar"></div>
            <div class="tc-body">
                <div class="tc-header">
                    <div class="tc-category-badge"><i class="fas ${getCategoryIcon(t.category)}"></i>${getCategoryName(t.category)}</div>
                    <span class="tc-used-badge">${used}×</span>
                </div>
                <h4 class="tc-name">${t.name}</h4>
                ${bodyContent}
            </div>
            <div class="tc-footer">
                <span class="tc-tap-hint"><i class="fas fa-${t.type === 'image' ? 'image' : 'hand-pointer'}"></i> ${t.type === 'image' ? 'Tap to copy image' : 'Tap to copy'}</span>
                <button class="tc-copy-btn" data-id="${t.id}"><i class="fas fa-copy"></i> Copy</button>
            </div>`;
        grid.appendChild(card);
    });

    addTemplateEventListeners();
}

function addTemplateEventListeners() {
    document.querySelectorAll('.tc-copy-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            copyTemplate(this.getAttribute('data-id'));
        });
    });

    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', function (e) {
            if (!e.target.closest('.tc-copy-btn')) {
                copyTemplate(this.getAttribute('data-id'));
            }
        });
    });
}

// ==================== COPY TEMPLATE ====================
function copyTemplate(id) {
    const t = templatesData.find(x => x.id == id);
    if (!t) return;

    // Kalau image → copy image
    if (t.type === 'image') {
        const img = document.querySelector(`.template-card[data-id="${id}"] .tc-image`);
        if (img) {
            handleImageCopy(
                document.querySelector(`.template-card[data-id="${id}"]`),
                img,
                t.name,
                t.id
            );
        } else {
            showToast('❌ Gambar tidak ditemukan');
        }
        return;
    }

    // Kalau text → copy text
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(t.content)
            .then(() => handleCopySuccess(id, t.name))
            .catch(() => fallbackCopy(t.content, id, t.name));
    } else {
        fallbackCopy(t.content, id, t.name);
    }
}

function handleCopySuccess(id, name) {
    incrementTemplateCount(id);

    const card = document.querySelector(`.template-card[data-id="${id}"]`);
    flashCopied(card);   // ← pakai helper

    showToast(`✅ "${name}" dicopy!`);
}

function flashCopied(el) {
    if (!el) return;
    el.classList.remove('copied');
    void el.offsetWidth;   // ← force reflow
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 1200);
}

function incrementTemplateCount(id) {
    const n = parseInt(localStorage.getItem(`template-${id}-used`) || 0) + 1;
    localStorage.setItem(`template-${id}-used`, n);

    const card = document.querySelector(`.template-card[data-id="${id}"]`);
    if (card) {
        const badge = card.querySelector('.tc-used-badge');
        if (badge) badge.textContent = n + '×';
    }
}

function fallbackCopy(text, id, name) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy') ? handleCopySuccess(id, name) : showToast('❌ Gagal copy');
    } catch {
        showToast('❌ Gagal copy');
    }
    document.body.removeChild(ta);
}

// ==================== TOGGLE TEMPLATES ====================
function showTemplatesGrid() {
    if (!templatesHidden) return;
    templatesHidden = false;
    document.getElementById('templatesGrid').classList.remove('hidden');
    document.getElementById('toggleAllBtn').innerHTML = '<i class="fas fa-eye-slash"></i><span>Sembunyikan</span>';

    document.querySelectorAll('.tc-preview').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tc-content').forEach(c => c.classList.remove('hidden'));
}

function hideTemplatesGrid() {
    if (templatesHidden) return;
    templatesHidden = true;
    document.getElementById('templatesGrid').classList.add('hidden');
    document.getElementById('toggleAllBtn').innerHTML = '<i class="fas fa-eye"></i><span>Tampilkan</span>';

    document.querySelectorAll('.tc-preview').forEach(c => c.classList.remove('hidden'));
    document.querySelectorAll('.tc-content').forEach(c => c.classList.add('hidden'));
}

function toggleAllTemplates() {
    templatesHidden ? showTemplatesGrid() : hideTemplatesGrid();
}

// ==================== FILTER ====================
function applyTemplateFilter(forceQ) {
    const q = forceQ !== undefined
        ? forceQ
        : (document.getElementById('templateSearchInline')?.value.toLowerCase().trim() || '');

    const activePill = document.querySelector('#tmplCatPills .tmpl-pill.active');
    const cat = activePill ? activePill.dataset.cat : 'all';

    const cards = document.querySelectorAll('#templatesGrid .template-card');
    let visible = 0;

    cards.forEach(card => {
        const name = card.getAttribute('data-name') || '';
        const preview = card.getAttribute('data-preview') || '';
        const cardCat = card.getAttribute('data-category') || '';

        const matchCat = cat === 'all' || cardCat === cat;
        const matchQ = q === '' || name.includes(q) || preview.includes(q);
        const show = matchCat && matchQ;

        card.style.display = show ? '' : 'none';
        if (show) visible++;
    });

    const emptyEl = document.getElementById('tmplEmpty');
    if (emptyEl) emptyEl.style.display = visible === 0 ? 'block' : 'none';
}

// ==================== QUICK ACTIONS HANDLER ====================
function handleQuickAction(templateKey) {
    // Cari template berdasarkan name (case-insensitive) atau ID
    const idMap = {
        'order': 1, 'kirimuser': 2, 'linkgc': 3, 'qris': 4
    };

    const templateId = idMap[templateKey];
    if (!templateId) {
        showToast(`⚠️ Template "${templateKey}" belum terdaftar`);
        return;
    }

    if (templateKey === 'qris') {
        const btn = document.querySelector('.qris-btn');
        const img = btn?.querySelector('.qris-logo');
        if (img) handleImageCopy(btn, img, 'QRIS', templateId);
        return;
    }

    copyTemplate(templateId);
}