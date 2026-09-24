// AS THE NAME SUGGESTS, THIS JS SCRIPT CONTAINS GLOBAL FUNCTIONS ACCESSIBLE TO ALL OTHER JS SCRIPTS.
// THESE FUNCTIONS ARE COMMON, USEFUL, AND DESIGNED FOR GENERAL PURPOSES.

// ===== PROJECT TILES: touch hover-hold effect =====
// Same behavior as the homepage tiles (assets/js/homepage_script.js), for any
// project page (e.g. Games.html) that renders its own ".tiles" section
// directly in markup instead of through homepage_script.js. Touch devices
// can't hover, so a long-press on a tile normally just triggers the browser's
// default hold behavior (callout menu / text or image selection). Replace
// that with the same hover reveal desktop gets: toggle a "touch-hover" class
// while the finger is held down (see the body.is-touch.touch-hover rules in
// project_page_style.css). Delegated on the document so it covers every
// ".tiles" section on the page without needing per-page wiring.
//
// A touch only counts as a "hold" (and shows the preview) once it has been
// down for HOLD_DELAY without moving more than MOVE_TOLERANCE (a real finger
// never stays perfectly still, so small jitter is ignored). A touch released
// before that is a normal tap and is left alone so it still navigates into
// the project as usual; a touch that *did* cross into hold territory has its
// release preventDefault()-ed so lifting the finger off the preview closes it
// instead of also firing the link's navigation.
(function () {
    const HOLD_DELAY = 350; // ms
    const MOVE_TOLERANCE = 12; // px a real finger can drift without counting as a scroll
    const touchState = new WeakMap(); // article -> { timer, isHold, startX, startY }

    document.addEventListener("touchstart", (e) => {
        const article = e.target.closest(".tiles article");
        if (!article) return;
        const touch = e.changedTouches[0];
        const state = { isHold: false, timer: null, startX: touch.clientX, startY: touch.clientY };
        state.timer = window.setTimeout(() => {
            state.isHold = true;
            article.classList.add("touch-hover");
        }, HOLD_DELAY);
        touchState.set(article, state);
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
        const article = e.target.closest(".tiles article");
        const state = article && touchState.get(article);
        if (!state) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - state.startX;
        const dy = touch.clientY - state.startY;
        if (Math.hypot(dx, dy) <= MOVE_TOLERANCE) return;
        clearTimeout(state.timer);
        article.classList.remove("touch-hover");
        touchState.delete(article);
    }, { passive: true });

    document.addEventListener("touchend", (e) => {
        const article = e.target.closest(".tiles article");
        const state = article && touchState.get(article);
        if (!state) return;
        clearTimeout(state.timer);
        article.classList.remove("touch-hover");
        if (state.isHold) e.preventDefault();
        touchState.delete(article);
    });

    document.addEventListener("touchcancel", (e) => {
        const article = e.target.closest(".tiles article");
        const state = article && touchState.get(article);
        if (!state) return;
        clearTimeout(state.timer);
        article.classList.remove("touch-hover");
        touchState.delete(article);
    });

    // Suppress the native long-press callout (iOS "Open/Copy/Share" menu, etc.).
    document.addEventListener("contextmenu", (e) => {
        if (e.target.closest(".tiles article")) e.preventDefault();
    });
})();

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

// An open panel's max-height is fixed when it opens, so call this after its
// content changes size (e.g. a result appears) to grow it and avoid clipping.
function REFIT_CONTENT(contentId) {
    const content = document.getElementById(contentId);
    if (content.classList.contains('active'))
        content.style.maxHeight = content.scrollHeight + "px";
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


// ===== INFO NOTE POPUP =====
// Elements with class "info-note" carry their help text in `title`, which only shows
// on mouse hover. On touch screens (and via keyboard), tapping the note opens the text
// in a small popup instead; tapping anywhere else, Esc, or resizing closes it.
// Mouse users keep the normal hover tooltip.
(function () {
    let popup = null, owner = null, lastPointerType = 'mouse';

    function build() {
        popup = document.createElement('div');
        popup.className = 'info-note-popup';
        popup.id = 'info-note-popup';
        popup.setAttribute('role', 'tooltip');
        popup.hidden = true;
        document.body.appendChild(popup);
    }

    function close() {
        if (!owner) return;
        popup.hidden = true;
        owner.setAttribute('aria-expanded', 'false');
        owner = null;
    }

    // Place the popup under the note (or above it if there's no room), kept 16px inside the screen
    function position(note) {
        const GAP = 8, EDGE = 16;
        const rect = note.getBoundingClientRect();
        const width = popup.offsetWidth, height = popup.offsetHeight;
        const centered = rect.left + rect.width / 2 - width / 2;
        const left = Math.min(Math.max(centered, EDGE), window.innerWidth - EDGE - width);
        const fitsBelow = rect.bottom + GAP + height <= window.innerHeight;
        const top = fitsBelow ? rect.bottom + GAP : rect.top - GAP - height;
        popup.style.left = (left + window.scrollX) + 'px';
        popup.style.top = (top + window.scrollY) + 'px';
    }

    function open(note) {
        if (!popup) build();
        popup.textContent = note.title; // read now: some pages set the title from JS after load
        popup.hidden = false;
        position(note);
        owner = note;
        note.setAttribute('aria-expanded', 'true');
        note.setAttribute('aria-describedby', popup.id);
    }

    function toggle(note) {
        if (owner === note) close();
        else { close(); open(note); }
    }

    // Remember what kind of pointer is in use, and close when tapping away
    document.addEventListener('pointerdown', function (e) {
        lastPointerType = e.pointerType;
        if (owner && !owner.contains(e.target) && !popup.contains(e.target)) close();
    }, true);

    document.addEventListener('click', function (e) {
        const note = e.target.closest('.info-note');
        if (note && lastPointerType !== 'mouse') toggle(note);
    });

    document.addEventListener('keydown', function (e) {
        const note = e.target.closest && e.target.closest('.info-note');
        if (note && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggle(note);
        }
        else if (e.key === 'Escape') close();
    });

    window.addEventListener('resize', close);
})();
