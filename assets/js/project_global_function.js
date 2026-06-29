// AS THE NAME SUGGESTS, THIS JS SCRIPT CONTAINS GLOBAL FUNCTIONS ACCESSIBLE TO ALL OTHER JS SCRIPTS. 
// THESE FUNCTIONS ARE COMMON, USEFUL, AND DESIGNED FOR GENERAL PURPOSES.

const buttons = document.querySelectorAll('.expand-collapse-button');
buttons.forEach(button => {
    let toggle = true;

    button.addEventListener('click', function() {
        if (toggle) {
            button.textContent = '▲';
        } else {
            button.textContent = '▼';
        }
        toggle = !toggle;
    });
});

// This function is made to expand or collapse "expandable-content" <div> element
function TOGGLE_CONTENT(contentId) {
    const content = document.getElementById(contentId);
    content.classList.toggle('active');
    if (getComputedStyle(content).maxHeight != '0px'){
        content.style.maxHeight = '0px';
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
    }
}

function PRINT_TO_HTML(contentID, textHTML) {
    document.getElementById(contentID).innerHTML = textHTML;
}

// ===== DOCUMENTATION IMAGE LIGHTBOX =====
// Click any <figure class="doc-img"><img>...</figure> to enlarge it in a
// full-screen overlay (with its caption). Click anywhere or press Esc to close.
// Works site-wide via event delegation, so it covers images added later too.
(function () {
    let overlay = null, imgEl = null, capEl = null;

    function build() {
        overlay = document.createElement('div');
        overlay.className = 'doc-lightbox';
        overlay.innerHTML =
            '<div class="doc-lightbox-inner">' +
                '<img class="doc-lightbox-img" alt="">' +
                '<div class="doc-lightbox-cap"></div>' +
            '</div>';
        document.body.appendChild(overlay);
        imgEl = overlay.querySelector('.doc-lightbox-img');
        capEl = overlay.querySelector('.doc-lightbox-cap');
        overlay.addEventListener('click', closeLightbox);
    }

    function openLightbox(src, caption) {
        if (!overlay) build();
        imgEl.src = src;
        capEl.textContent = caption || '';
        capEl.style.display = caption ? '' : 'none';
        overlay.classList.add('open');
    }
    function closeLightbox() {
        if (overlay) overlay.classList.remove('open');
    }

    document.addEventListener('click', function (e) {
        const t = e.target;
        if (t.tagName !== 'IMG' || !t.closest('.doc-img')) return;
        const fig = t.closest('.doc-img');
        const cap = fig.querySelector('figcaption');
        openLightbox(t.currentSrc || t.src, cap ? cap.textContent : '');
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLightbox();
    });
})();

