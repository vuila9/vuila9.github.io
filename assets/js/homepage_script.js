// A script made to add project dynamically with ease. Only need to add to 'articlesData' for this to work.
// Title/description text lives in i18n.js (assets/js/i18n.js), keyed by titleKey/descKey,
// so the tiles re-render whenever the site language changes.
document.addEventListener("DOMContentLoaded", function() {
    // Get the section where the articles will be added
    const section = document.querySelector("#main .inner .tiles");

    // Data for the articles. `titleKey`/`descKey` reference entries in the i18n
    // dictionary; the actual text is resolved at render time for the active language.
    const articlesData = [
        // {
        //     imageSrc: "assets/img/pic08.jpg",
        //     titleKey: "proj.wip.title",
        //     descKey: "proj.wip.desc",
        //     link: "projects/Project_name/Project_name.html"
        // },
        {
            imageSrc: "assets/img/program_icons/stream_simulator_tile.jpg",
            titleKey: "proj.stream.title",
            descKey: "proj.stream.desc",
            link: "projects/Stream_Simulator/Stream_Simulator.html"
        },
        {
            imageSrc: "assets/img/program_icons/snake_tile.jpg",
            titleKey: "proj.snake.title",
            descKey: "proj.snake.desc",
            link: "projects/Snake/Snake.html"
        },
        {
            imageSrc: "projects/Games/Games_icon.svg",
            titleKey: "proj.games.title",
            descKey: "proj.games.desc",
            link: "projects/Games/Games.html"
        },
        {
            imageSrc: "assets/img/program_icons/paint_tile.jpg",
            titleKey: "proj.paint.title",
            descKey: "proj.paint.desc",
            link: "projects/MS_Paint/MS_Paint.html"
        },
        {
            imageSrc: "assets/img/program_icons/cube_tile.jpg",
            titleKey: "proj.cube.title",
            descKey: "proj.cube.desc",
            link: "projects/Cube/Cube.html"
        },
        {
            imageSrc: "assets/img/program_icons/terminal_tile.jpg",
            titleKey: "proj.terminal.title",
            descKey: "proj.terminal.desc",
            link: "projects/CMD_Terminal_Simulator/CMD_Terminal_Simulator.html"
        },
        {
            imageSrc: "assets/img/program_icons/manytools_tile.jpg",
            titleKey: "proj.manytools.title",
            descKey: "proj.manytools.desc",
            link: "projects/Many_mini-tools/Many_mini-tools.html"
        },
        {
            imageSrc: "assets/img/program_icons/sudoku_tile.jpg",
            titleKey: "proj.sudoku.title",
            descKey: "proj.sudoku.desc",
            link: "projects/Sudoku_JS/Sudoku_JS.html"
        },
        // {
        //     imageSrc: "assets/img/pic03.jpg",
        //     titleKey: "proj.sudokuPy.title",
        //     descKey: "proj.sudokuPy.desc",
        //     link: "projects/Sudoku_Solver/Sudoku_Solver.html"
        // },
        {
            imageSrc: "assets/img/program_icons/restaurant_tile.jpg",
            titleKey: "proj.restaurant.title",
            descKey: "proj.restaurant.desc",
            link: "projects/Web-based_Restaurant/Web-based_Restaurant.html"
        },
        {
            imageSrc: "assets/img/program_icons/storeapp_tile.jpg",
            titleKey: "proj.store.title",
            descKey: "proj.store.desc",
            link: "projects/Store_Application/Store_Application.html"
        }
    ];

    // Resolve a translation key via the i18n helper, falling back to the key itself.
    const tr = (key) => (window.i18n && window.i18n.t ? window.i18n.t(key) : key);

    // (Re)build all the project tiles in the current language.
    function renderTiles() {
        section.innerHTML = "";
        articlesData.forEach(data => {
            const tile_size = '225px';

            // Create the article element
            const article = document.createElement("article");
            article.style.width = tile_size;
            article.style.height = tile_size;
            //article.className = "style8";

            // Create the span with the image
            const span = document.createElement("span");
            span.className = "image";
            span.style.width = tile_size;
            span.style.height = tile_size;
            //span.style.overflow = 'hidden';

            const img = document.createElement("img");
            img.src = data.imageSrc;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'fill';
            span.appendChild(img);

            // Create the anchor tag
            const anchor = document.createElement("a");
            anchor.href = data.link;
            // The ".content" description overlay's hover max-height (15em, from
            // main.css) is taller than this fixed 225px tile, so on hover it used
            // to bleed a sliver of text past the tile's actual box — visible, but
            // outside the real hoverable area, which flickered the hover state
            // on/off right at/below the edge. Clipping just this anchor (not the
            // whole article) fixes that without hard-cutting the ".image" blur
            // bloom, which still needs to bleed past its own box for a soft edge.
            anchor.style.overflow = "hidden";

            // Create the h2 element for the title
            const h2 = document.createElement("h2");
            h2.className = 'program_title';
            h2.textContent = tr(data.titleKey);

            // Create the div with the paragraph for the description
            const contentDiv = document.createElement("div");
            contentDiv.className = "content";

            const paragraph = document.createElement("p");
            paragraph.textContent = tr(data.descKey);
            contentDiv.appendChild(h2);
            contentDiv.appendChild(paragraph);

            // Append everything together
            anchor.appendChild(contentDiv);
            article.appendChild(span);
            article.appendChild(anchor);

            // Append the article to the section
            section.appendChild(article);
        });
    }

    // Initial render, plus a re-render whenever the language toggle fires.
    renderTiles();
    document.addEventListener("languagechange", renderTiles);

    // Touch devices can't hover, so a long-press on a tile normally just
    // triggers the browser's default hold behavior (callout menu / text or
    // image selection). Replace that with the same hover reveal desktop gets:
    // toggle a "touch-hover" class while the finger is held down (see the
    // body.is-touch.touch-hover rules in home_page_style.css). Delegated on
    // the section so it keeps working after renderTiles() rebuilds the tiles.
    //
    // A touch only counts as a "hold" (and shows the preview) once it has
    // been down for HOLD_DELAY without moving. A touch released before that
    // is a normal tap and is left alone so it still navigates into the
    // project as usual; a touch that *did* cross into hold territory has its
    // release preventDefault()-ed so lifting the finger off the preview
    // closes it instead of also firing the link's navigation.
    const HOLD_DELAY = 350; // ms
    const MOVE_TOLERANCE = 12; // px a real finger can drift without counting as a scroll
    const touchState = new WeakMap(); // article -> { timer, isHold, startX, startY }

    section.addEventListener("touchstart", (e) => {
        const article = e.target.closest("article");
        if (!article) return;
        const touch = e.changedTouches[0];
        const state = { isHold: false, timer: null, startX: touch.clientX, startY: touch.clientY };
        state.timer = window.setTimeout(() => {
            state.isHold = true;
            article.classList.add("touch-hover");
        }, HOLD_DELAY);
        touchState.set(article, state);
    }, { passive: true });

    section.addEventListener("touchmove", (e) => {
        const article = e.target.closest("article");
        const state = article && touchState.get(article);
        if (!state) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - state.startX;
        const dy = touch.clientY - state.startY;
        // A real finger never stays perfectly still, so ignore small jitter and
        // only treat this as an actual scroll/drag past MOVE_TOLERANCE.
        if (Math.hypot(dx, dy) <= MOVE_TOLERANCE) return;
        clearTimeout(state.timer);
        article.classList.remove("touch-hover");
        touchState.delete(article);
    }, { passive: true });

    section.addEventListener("touchend", (e) => {
        const article = e.target.closest("article");
        const state = article && touchState.get(article);
        if (!state) return;
        clearTimeout(state.timer);
        article.classList.remove("touch-hover");
        if (state.isHold) e.preventDefault();
        touchState.delete(article);
    });

    section.addEventListener("touchcancel", (e) => {
        const article = e.target.closest("article");
        const state = article && touchState.get(article);
        if (!state) return;
        clearTimeout(state.timer);
        article.classList.remove("touch-hover");
        touchState.delete(article);
    });

    // Suppress the native long-press callout (iOS "Open/Copy/Share" menu, etc.).
    section.addEventListener("contextmenu", (e) => {
        if (e.target.closest("article")) e.preventDefault();
    });
});

// ---------------------------------------------------------------------------
// Experience notes: collapsible "letter" behaviour.
// Each .exp-note starts collapsed; clicking (or pressing Enter/Space on) its
// header toggles .exp-open, which the CSS animates open/closed. Notes open
// independently of one another.
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".exp-note .exp-header").forEach(header => {
        const note = header.closest(".exp-note");
        const body = note.querySelector(".exp-body");

        // Open state is driven by an explicit max-height (the content's real
        // height) so the CSS transition slides smoothly to any content size.
        const setOpen = (open) => {
            note.classList.toggle("exp-open", open);
            header.setAttribute("aria-expanded", open ? "true" : "false");
            body.style.maxHeight = open ? body.scrollHeight + "px" : "";
        };

        header.addEventListener("click", () => setOpen(!note.classList.contains("exp-open")));
        header.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(!note.classList.contains("exp-open"));
            }
        });
    });

    // Text length differs between languages; recompute open notes' heights.
    document.addEventListener("languagechange", () => {
        document.querySelectorAll(".exp-note.exp-open .exp-body").forEach(body => {
            body.style.maxHeight = body.scrollHeight + "px";
        });
    });
});

// Disable right-click for the container
document.getElementById('cmd-body').addEventListener('contextmenu', function(e) {
    e.preventDefault(); // Prevent the context menu from appearing
});

window.onbeforeunload = function() {
    localStorage.setItem("scrollPosition", window.scrollY);
};

// Restore scroll position on page load
window.onload = function() {
    const scrollPosition = localStorage.getItem("scrollPosition");
    if (scrollPosition) {
        window.scrollTo(0, 0);
    }
};
