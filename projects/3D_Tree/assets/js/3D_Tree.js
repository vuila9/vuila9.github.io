// 3D Tree — mounts the embedded model viewer and wires up fullscreen.

// Paste the embed link here. Leave empty to show the placeholder.
const TREE_EMBED_URL = "https://pole-display.3d-obj.workers.dev/";

(function () {
    const frame = document.getElementById("tree-frame");
    const placeholder = document.getElementById("tree-placeholder");
    const fullscreenBtn = document.getElementById("tree-fullscreen");
    const exitBtn = document.getElementById("tree-exit-fullscreen");

    if (TREE_EMBED_URL) {
        const iframe = document.createElement("iframe");
        iframe.id = "tree-embed";
        iframe.src = TREE_EMBED_URL;
        iframe.title = "3D Tree model viewer";
        iframe.loading = "lazy";
        iframe.allow = "fullscreen; autoplay; xr-spatial-tracking";
        iframe.allowFullscreen = true;
        frame.insertBefore(iframe, frame.firstChild);
        placeholder.remove();
    }

    const nativeFullscreen = !!(frame.requestFullscreen || frame.webkitRequestFullscreen);
    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;

    function setFakeFullscreen(on) {
        frame.classList.toggle("tree-fake-fullscreen", on);
        document.body.style.overflow = on ? "hidden" : "";
    }

    fullscreenBtn.addEventListener("click", function () {
        if (!nativeFullscreen) {
            setFakeFullscreen(!frame.classList.contains("tree-fake-fullscreen"));
            return;
        }
        if (fullscreenElement()) {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else {
            (frame.requestFullscreen || frame.webkitRequestFullscreen).call(frame);
        }
    });

    exitBtn.addEventListener("click", function () {
        setFakeFullscreen(false);
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") setFakeFullscreen(false);
    });
})();
