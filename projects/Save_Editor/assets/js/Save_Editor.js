/*
 * Save_Editor.js — UI of the "Save File Decoder" tool.
 * (Shown to visitors as Save File Decoder; files and the URL keep the
 * original Save_Editor name so existing links and search results still work.)
 *
 * Flow: a file is dropped / picked → SaveCodec.analyze() works out its layers
 * and payload → the payload is shown in the matching tabs:
 *   json   → Quick edit (flat list of values) + JSON (full text) + Hex (original bytes)
 *   text   → Text + Hex (original bytes)
 *   binary → Hex (editable bytes)
 * → "Download file" runs SaveCodec.build() to pack everything back the same way.
 *
 * Note: keys and values come from an untrusted file, so they are only ever
 * written to the page with textContent / .value, never innerHTML.
 */
(function () {
    "use strict";

    const PAGE_SIZE = 50;          // quick-edit rows per page
    const HEX_COLS = 16;
    const HEX_ROWS = 32;           // 512 bytes per hex page
    const MAX_FILE_BYTES = 64 * 1024 * 1024;

    const $ = id => document.getElementById(id);
    const el = {
        drop: $("se-drop"),
        file: $("se-file"),
        sample: $("se-sample"),
        sampleLine: document.querySelector(".se-sample-line"),
        error: $("se-error"),
        editor: $("se-editor"),
        filename: $("se-filename"),
        filesize: $("se-filesize"),
        chain: $("se-chain"),
        protect: $("se-protect"),
        download: $("se-download"),
        exportJson: $("se-export-json"),
        reset: $("se-reset"),
        open: $("se-open"),
        tabs: Array.from(document.querySelectorAll(".se-tab")),
        type: $("se-type"),
        search: $("se-search"),
        changedOnly: $("se-modified-only"),
        count: $("se-count"),
        list: $("se-list"),
        json: $("se-json"),
        jsonSearch: $("se-json-search"),
        jsonCount: $("se-json-count"),
        jsonHl: $("se-json-hl"),
        jsonPrev: $("se-json-prev"),
        jsonNext: $("se-json-next"),
        jsonApply: $("se-json-apply"),
        jsonStatus: $("se-json-status"),
        text: $("se-text"),
        hex: $("se-hex"),
        hexLabel: $("se-hex-label"),
        hexGoto: $("se-hex-goto")
    };

    const state = {
        fileName: "",
        original: null,        // Uint8Array of the file as loaded
        doc: null,             // SaveCodec.analyze() result, edited in place
        leaves: [],            // flat list of editable JSON values
        filtered: [],
        modified: new Set(),   // leaves whose value differs from the file
        structEdited: false,   // JSON tab changes were applied
        textEdited: false,
        hexEdited: new Set(),  // byte offsets changed in the hex view
        jsonDirty: false,      // JSON textarea differs from the tree
        tab: "quick",
        quickPage: 0,
        hexPage: 0,
        hexFocus: -1,          // byte offset to highlight after "go to"
        unsaved: false         // edited since loading / last download
    };

    const isDirty = () =>
        state.modified.size > 0 || state.structEdited || state.textEdited || state.hexEdited.size > 0 || state.jsonDirty;
    const touch = () => { state.unsaved = true; };

    // ================================================================ helpers

    function formatBytes(n) {
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / 1024 / 1024).toFixed(2)} MB`;
    }

    function make(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function showError(message) {
        el.error.textContent = message;
        el.error.hidden = !message;
    }

    function saveBlob(bytes, name, type = "application/octet-stream") {
        const url = URL.createObjectURL(new Blob([bytes], { type }));
        const a = make("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function valueText(node) {
        switch (node.t) {
            case "num": return node.raw;
            case "str": return node.v;
            case "bool": return String(node.v);
            case "bin": return `binary data · ${node.bytes.length} bytes`;
            case "ext": return `extension type ${node.type} · ${node.bytes.length} bytes`;
            default: return "null";
        }
    }

    const segmentText = seg => (typeof seg === "number" ? `[${seg}]` : seg);

    // ================================================================ loading

    async function loadFile(file) {
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) {
            showError(`That file is ${formatBytes(file.size)}. The decoder handles files up to ${formatBytes(MAX_FILE_BYTES)}.`);
            return;
        }
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            await loadBytes(bytes, file.name);
        } catch (err) {
            showError(`Couldn't read the file: ${err.message}`);
        }
    }

    async function loadBytes(bytes, name, { skipConfirm = false } = {}) {
        if (!skipConfirm && state.unsaved && !window.confirm("Discard your unsaved changes?")) return;
        showError("");
        if (!bytes.length) {
            showError("That file is empty.");
            return;
        }

        let doc;
        try {
            doc = await SaveCodec.analyze(bytes);
        } catch (err) {
            showError(`Couldn't decode the file: ${err.message}`);
            return;
        }

        Object.assign(state, {
            fileName: name,
            original: bytes,
            doc,
            modified: new Set(),
            structEdited: false,
            textEdited: false,
            hexEdited: new Set(),
            jsonDirty: false,
            quickPage: 0,
            hexPage: 0,
            hexFocus: -1,
            hexBytes: null,
            unsaved: false,
            protection: null,       // integrity field found in the save (see findIntegrityField)
            protectionAcked: false  // user already confirmed downloading an edited protected save
        });
        if (doc.kind === "json") {
            // Strings that hold a JSON document (e.g. "ab_data": "{\"…\"}") become real,
            // editable objects; SaveCodec.build() packs them back into strings.
            doc.root = SaveJson.unpackEmbedded(doc.root);
            rebuildLeaves();
        }

        renderFileInfo();
        el.drop.hidden = true;
        el.sampleLine.hidden = true;
        el.editor.hidden = false;
        el.json.value = "";
        el.jsonStatus.textContent = "";

        const firstTab = { json: "quick", text: "text", binary: "hex" }[doc.kind];
        el.tabs.forEach(tab => {
            const name = tab.dataset.tab;
            tab.hidden = !(name === "hex" || (doc.kind === "json" ? name === "quick" || name === "json" : name === doc.kind));
        });
        if (doc.kind === "text") el.text.value = doc.text;
        showTab(firstTab, { force: true });
    }

    function rebuildLeaves() {
        state.leaves = SaveJson.collectLeaves(state.doc.root).map(leaf => {
            leaf.search = leaf.path.map(segmentText).join(" ").toLowerCase();
            return leaf;
        });
        updateTypeOptions();
    }

    /** Filter-dropdown key for a node ("bin" covers both binary and extension values). */
    const filterType = node => (node.t === "ext" ? "bin" : node.t);

    /** Show how many values each type filter would match, and hide empty ones. */
    function updateTypeOptions() {
        const counts = { all: state.leaves.length };
        state.leaves.forEach(leaf => {
            const type = filterType(leaf.node);
            counts[type] = (counts[type] || 0) + 1;
        });
        Array.from(el.type.options).forEach(option => {
            const n = counts[option.value] || 0;
            option.textContent = `${option.dataset.label} (${n.toLocaleString()})`;
            option.hidden = option.value !== "all" && n === 0;
        });
        if (el.type.selectedOptions[0] && el.type.selectedOptions[0].hidden) el.type.value = "all";
    }

    function renderFileInfo() {
        const { doc, original } = state;
        el.filename.textContent = state.fileName;
        el.filesize.textContent = formatBytes(original.length);

        el.chain.replaceChildren(...SaveCodec.describe(doc).map(label => make("li", "se-chip", label)));

        state.protection = doc.kind === "json" ? findIntegrityField(doc.root) : null;
        renderProtectionWarning();

        el.exportJson.hidden = doc.kind !== "json";
    }

    // ---------------------------------------------------------------- integrity-protected saves
    //
    // Some games store a fingerprint of the save next to the data, e.g.
    //   { version, salt, time, data, hash: "45-B3-3D-…" }
    // and refuse to load the file if it no longer matches. The recipe usually
    // involves a secret inside the game, so this editor can't recalculate it —
    // edits download fine but the game reports the file as corrupted. Detect
    // such a field so the user is told up front instead of finding out in-game.

    const INTEGRITY_KEYS = new Set([
        "hash", "checksum", "check_sum", "crc", "crc32", "md5", "sha1", "sha256", "sha512",
        "signature", "sig", "digest", "hmac", "mac"
    ]);
    // Typical digest sizes in bytes: CRC32, MD5, SHA-1, SHA-256, SHA-512.
    const DIGEST_BYTES = new Set([4, 16, 20, 32, 64]);

    /** Does this value look like a digest (hex / Base64 text, raw bytes, or a CRC number)? */
    function looksLikeDigest(node, key) {
        if (node.t === "str") {
            const hex = node.v.replace(/[-:\s]/g, "");
            if (/^[0-9a-f]+$/i.test(hex) && DIGEST_BYTES.has(hex.length / 2)) return true;
            const b64 = node.v.trim();
            return /^[A-Za-z0-9+/]+={0,2}$/.test(b64) && DIGEST_BYTES.has(Math.floor((b64.replace(/=+$/, "").length * 3) / 4));
        }
        if (node.t === "bin") return DIGEST_BYTES.has(node.bytes.length);
        // A bare number only counts for CRC-style keys.
        return node.t === "num" && /^(crc|crc32|checksum|check_sum)$/i.test(key) && /^\d+$/.test(node.raw);
    }

    /** First top-level key that holds a save fingerprint, or null. */
    function findIntegrityField(root) {
        if (root.t !== "obj") return null;
        const entry = root.entries.find(e => INTEGRITY_KEYS.has(e.k.toLowerCase()) && looksLikeDigest(e.v, e.k));
        return entry ? { key: entry.k } : null;
    }

    function renderProtectionWarning() {
        const protection = state.protection;
        el.protect.hidden = !protection;
        if (!protection) return;
        const key = make("code", "", protection.key);
        el.protect.replaceChildren(
            make("b", "", "This save is protected by a checksum. "),
            document.createTextNode("Its top-level "), key,
            document.createTextNode(" field is a fingerprint of the data that the game checks when loading. " +
                "This decoder can't recalculate it, so the game will most likely report an edited copy as corrupted. " +
                "Keep a backup of the original.")
        );
    }

    // ================================================================ tabs

    function showTab(name, { force = false } = {}) {
        if (!force && name === state.tab) return;
        if (state.tab === "json" && state.jsonDirty && !applyJson()) return; // keep user on a broken edit
        state.tab = name;
        el.tabs.forEach(tab => {
            const active = tab.dataset.tab === name;
            tab.classList.toggle("is-active", active);
            tab.setAttribute("aria-selected", active ? "true" : "false");
        });
        ["quick", "json", "text", "hex"].forEach(p => { $(`se-panel-${p}`).hidden = p !== name; });

        if (name === "quick") renderQuick();
        if (name === "json") fillJson();
        if (name === "hex") showHex();
    }

    // ================================================================ quick edit

    function applyFilter() {
        const type = el.type.value;
        const query = el.search.value.trim().toLowerCase();
        const changedOnly = el.changedOnly.checked;
        state.filtered = state.leaves.filter(leaf => {
            if (type !== "all" && filterType(leaf.node) !== type) return false;
            if (changedOnly && !state.modified.has(leaf)) return false;
            if (!query) return true;
            return leaf.search.includes(query) || valueText(leaf.node).toLowerCase().includes(query);
        });
    }

    function renderQuick() {
        applyFilter();
        const pages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
        state.quickPage = Math.min(state.quickPage, pages - 1);
        updatePager("quick", state.quickPage, pages);
        updateCount();

        const start = state.quickPage * PAGE_SIZE;
        const rows = state.filtered.slice(start, start + PAGE_SIZE).map(buildRow);
        if (!rows.length) {
            rows.push(make("p", "se-empty", state.leaves.length ? "No values match." : "This document has no values yet. Add some in the JSON tab."));
        }
        el.list.replaceChildren(...rows);
    }

    function updateCount() {
        const total = state.leaves.length;
        const shown = state.filtered.length;
        let text = shown === total ? `${total.toLocaleString()} values` : `${shown.toLocaleString()} of ${total.toLocaleString()} values`;
        if (state.modified.size) text += ` · ${state.modified.size} changed`;
        el.count.textContent = text;
    }

    /** Update every pager for this view (Quick edit has one above and one below the list). */
    function updatePager(which, page, pages) {
        document.querySelectorAll(`.se-pager[data-pager="${which}"]`).forEach(pager => {
            pager.querySelector(".se-pagelabel").textContent = `${page + 1} / ${pages}`;
            pager.querySelector('[data-step="-1"]').disabled = page <= 0;
            pager.querySelector('[data-step="1"]').disabled = page >= pages - 1;
            // The bottom copy is only useful when there's more than one page.
            if (pager.dataset.pos === "bottom") pager.parentElement.hidden = pages <= 1;
        });
    }

    function buildRow(leaf) {
        const row = make("div", "se-row");
        row.classList.toggle("is-modified", state.modified.has(leaf));

        // Path: parent segments muted, the value's own key emphasised.
        const path = make("div", "se-path");
        const segments = leaf.path.length ? leaf.path : ["(root)"];
        segments.forEach((seg, n) => {
            const last = n === segments.length - 1;
            if (n) path.appendChild(make("span", "se-sep", "›"));
            path.appendChild(make("span", last ? "se-key" : "se-seg", segmentText(seg)));
        });
        path.title = segments.map(segmentText).join(" › ");

        const valueBox = make("div", "se-val");
        valueBox.appendChild(buildValueEditor(leaf, row));

        const revert = make("button", "se-revert", "↺");
        revert.type = "button";
        revert.title = "Undo this change";
        revert.setAttribute("aria-label", "Undo this change");
        revert.addEventListener("click", () => {
            revertLeaf(leaf);
            const fresh = buildRow(leaf);
            row.replaceWith(fresh);
        });
        valueBox.appendChild(revert);

        row.append(path, valueBox);
        return row;
    }

    function buildValueEditor(leaf, row) {
        const node = leaf.node;
        const label = leaf.path.map(segmentText).join(" › ") || "root value";

        if (node.t === "bool") {
            const select = make("select", "se-select se-select-sm se-type-bool");
            ["true", "false"].forEach(v => select.appendChild(new Option(v, v)));
            select.value = String(node.v);
            select.setAttribute("aria-label", label);
            select.addEventListener("change", () => editLeaf(leaf, row, n => { n.v = select.value === "true"; }));
            return select;
        }

        if (node.t === "null" || node.t === "bin" || node.t === "ext") {
            const span = make("span", "se-null", valueText(node));
            if (node.t !== "null") span.title = "Raw binary value. Edit it as Base64 in the JSON tab.";
            return span;
        }

        const isNum = node.t === "num";
        const multiline = !isNum && node.v.includes("\n");
        const input = make(multiline ? "textarea" : "input", `se-input se-value se-type-${node.t}`);
        if (!multiline) input.type = "text";
        if (isNum) input.inputMode = "decimal";
        input.value = valueText(node);
        input.spellcheck = false;
        input.setAttribute("aria-label", label);

        if (isNum) {
            input.addEventListener("input", () => {
                const raw = normalizeNumber(input.value, leaf.orig ? leaf.orig.raw : node.raw);
                input.classList.toggle("is-invalid", raw === null);
                if (raw !== null) editLeaf(leaf, row, n => { n.raw = raw; });
            });
            // Show the stored literal (e.g. "5" → "5.0") once the user is done typing.
            input.addEventListener("blur", () => {
                input.value = node.raw;
                input.classList.remove("is-invalid");
            });
        } else {
            input.addEventListener("input", () => editLeaf(leaf, row, n => {
                if (leaf.orig && input.value === leaf.orig.v) {
                    n.v = leaf.orig.v;                       // typed it back: restore the exact original literal
                    if (leaf.orig.raw) n.raw = leaf.orig.raw;
                } else {
                    n.v = input.value;
                    delete n.raw;                            // re-escaped on save
                }
            }));
        }
        return input;
    }

    /**
     * Validate a typed number. Returns the literal to store, or null if invalid.
     * A value that was a float in the file ("1520.0") stays a float when the
     * user types an integer, so typed languages don't see the type change.
     */
    function normalizeNumber(text, origRaw) {
        const t = text.trim();
        if (!SaveJson.isNumberLiteral(t)) return null;
        if (/[.eE]/.test(origRaw) && /^-?\d+$/.test(t)) return `${t}.0`;
        return t;
    }

    function editLeaf(leaf, row, change) {
        const node = leaf.node;
        if (!leaf.orig) leaf.orig = { raw: node.raw, v: node.v };
        change(node);
        touch();
        const same = node.raw === leaf.orig.raw && node.v === leaf.orig.v;
        if (same) state.modified.delete(leaf);
        else state.modified.add(leaf);
        row.classList.toggle("is-modified", !same);
        updateCount();
    }

    function revertLeaf(leaf) {
        if (!leaf.orig) return;
        const node = leaf.node;
        node.v = leaf.orig.v;
        if (leaf.orig.raw === undefined) delete node.raw;
        else node.raw = leaf.orig.raw;
        if (node.t === "null" || node.t === "num") delete node.v;
        state.modified.delete(leaf);
        updateCount();
    }

    // ================================================================ JSON tab

    function fillJson() {
        if (!state.jsonDirty) {
            el.json.value = SaveJson.serialize(state.doc.root, SaveJson.PRETTY_FMT);
            el.jsonApply.disabled = true;
            setJsonStatus("Add, remove or rename anything here, then press Apply changes.");
            find.lineStarts = null;
            find.current = -1;
        }
        // Text may have changed (or the tab was hidden): refresh matches + highlights.
        // If the search term changed in Quick edit meanwhile, jump to its nearest match.
        const termChanged = find.query !== el.jsonSearch.value;
        if (termChanged) {
            // Start from the first line in view (setting .value parks the caret at the end).
            find.current = -1;
            const m = textMetrics();
            const firstVisible = Math.min(lineStarts().length - 1, Math.max(0, Math.floor(el.json.scrollTop / m.lineHeight)));
            const at = lineStarts()[firstVisible];
            el.json.setSelectionRange(at, at);
        }
        runFind();
        if (termChanged && find.matches.length) revealMatch();
    }

    function setJsonStatus(message, kind = "") {
        el.jsonStatus.textContent = message;
        el.jsonStatus.className = "se-status" + (kind ? ` is-${kind}` : "");
    }

    /** Parse the JSON textarea back into the tree. Returns false on a syntax error. */
    function applyJson() {
        let parsed;
        try {
            parsed = SaveJson.parseDocument(el.json.value);
        } catch (err) {
            setJsonStatus(err.message, "error");
            if (typeof err.index === "number") selectInTextarea(el.json, err.index, err.index + 1);
            return false;
        }
        // Keep the file's own formatting style (doc.fmt). Re-mark values that were
        // unpacked JSON strings so they're packed back into text, and for
        // MessagePack carry each value's binary encoding (float vs int width, etc.).
        SaveJson.carryEmbedded(parsed.root, state.doc.root);
        state.doc.root = state.doc.container === "msgpack"
            ? SaveMsgpack.adopt(parsed.root, state.doc.root)
            : parsed.root;
        state.structEdited = true;
        state.jsonDirty = false;
        state.modified = new Set();
        rebuildLeaves();
        el.jsonApply.disabled = true;
        setJsonStatus("Changes applied.", "ok");
        return true;
    }

    /** Select a range in a no-wrap textarea and scroll it into view. */
    function selectInTextarea(ta, from, to) {
        ta.focus({ preventScroll: true });
        ta.setSelectionRange(from, to);
        let line = 0;
        let lineStart = 0;
        for (let i = ta.value.indexOf("\n"); i !== -1 && i < from; i = ta.value.indexOf("\n", i + 1)) {
            line++;
            lineStart = i + 1;
        }
        const style = getComputedStyle(ta);
        const lineHeight = parseFloat(style.lineHeight) || 18;
        const charWidth = (parseFloat(style.fontSize) || 14) * 0.6;
        ta.scrollTop = Math.max(0, line * lineHeight - ta.clientHeight / 3);
        ta.scrollLeft = Math.max(0, (from - lineStart) * charWidth - ta.clientWidth / 2);
    }

    // ---------------------------------------------------------------- find in JSON
    //
    // A <textarea> can't style part of its text, so matches are drawn as boxes in
    // #se-json-hl, a layer *behind* the transparent textarea, lined up using the
    // textarea's own font metrics. Only the visible lines are drawn, so it stays
    // fast on big saves. The native (blue) selection is never used for matches.

    const MAX_MATCHES = 20000;   // stop counting after this many (shown as "20000+")
    const MAX_MARKS = 400;       // most boxes drawn at once (only visible lines anyway)

    const find = {
        query: "",          // what the matches were computed for
        matches: [],        // start offsets, ascending
        lengths: [],        // match lengths (case-insensitive matches can differ in rare cases)
        current: -1,        // index into matches
        capped: false,
        lineStarts: null,   // offset of each line start, rebuilt lazily after edits
        timer: 0,
        frame: 0
    };
    let measureCtx = null;

    const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    /** First index in sorted `arr` whose value is >= v. */
    function lowerBound(arr, v) {
        let lo = 0;
        let hi = arr.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (arr[mid] < v) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }

    function lineStarts() {
        if (!find.lineStarts) {
            const text = el.json.value;
            const starts = [0];
            for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
            find.lineStarts = starts;
        }
        return find.lineStarts;
    }

    const lineOf = offset => lowerBound(lineStarts(), offset + 1) - 1;

    /** Recompute all matches, keeping the "current" one near where it was. */
    function runFind() {
        const query = el.jsonSearch.value;
        const anchor = find.current >= 0 ? find.matches[find.current] : el.json.selectionStart;
        find.query = query;
        find.matches = [];
        find.lengths = [];
        find.capped = false;
        if (query) {
            const re = new RegExp(escapeRegExp(query), "gi");
            const text = el.json.value;
            let m;
            while ((m = re.exec(text))) {
                if (find.matches.length >= MAX_MATCHES) { find.capped = true; break; }
                find.matches.push(m.index);
                find.lengths.push(m[0].length || 1);
                if (!m[0].length) re.lastIndex++;
            }
        }
        const n = find.matches.length;
        find.current = n ? Math.min(lowerBound(find.matches, anchor), n - 1) : -1;
        updateFindCount();
        scheduleHighlights();
    }

    function updateFindCount() {
        const n = find.matches.length;
        el.jsonCount.classList.toggle("is-none", !!find.query && !n);
        if (!find.query) el.jsonCount.textContent = "";
        else if (!n) el.jsonCount.textContent = "No results";
        else el.jsonCount.textContent = `${(find.current + 1).toLocaleString()} of ${n.toLocaleString()}${find.capped ? "+" : ""}`;
    }

    /** Move to the previous / next match (wrapping around). */
    function stepFind(direction) {
        if (find.query !== el.jsonSearch.value) runFind();
        const n = find.matches.length;
        if (!n) return;
        find.current = (find.current + direction + n) % n;
        revealMatch();
    }

    /** Scroll the current match into view and park the caret on it (no selection). */
    function revealMatch() {
        const ta = el.json;
        const offset = find.matches[find.current];
        ta.setSelectionRange(offset, offset);
        const m = textMetrics();
        const line = lineOf(offset);
        const x = textWidth(ta.value.slice(lineStarts()[line], offset), m);
        const top = line * m.lineHeight;
        if (top < ta.scrollTop || top + m.lineHeight > ta.scrollTop + ta.clientHeight - m.padTop * 2) {
            ta.scrollTop = Math.max(0, top - ta.clientHeight / 3);
        }
        if (x < ta.scrollLeft || x + 40 > ta.scrollLeft + ta.clientWidth - m.padLeft * 2) {
            ta.scrollLeft = Math.max(0, x - ta.clientWidth / 3);
        }
        updateFindCount();
        renderHighlights();
    }

    /** Font metrics of the textarea, so highlight boxes line up with its text. */
    function textMetrics() {
        const ta = el.json;
        const cs = getComputedStyle(ta);
        if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
        measureCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const padTop = parseFloat(cs.paddingTop) || 0;
        const padBottom = parseFloat(cs.paddingBottom) || 0;
        // Browsers snap line boxes to device pixels, so the CSS line-height can be
        // off by a hair — which adds up to whole lines deep in a long file. When the
        // text overflows, derive the real line height from the scroll height instead.
        let lineHeight = parseFloat(cs.lineHeight) || 20;
        const lines = lineStarts().length;
        if (ta.scrollHeight > ta.clientHeight + 1 && lines > 1) {
            lineHeight = (ta.scrollHeight - padTop - padBottom) / lines;
        }
        return {
            lineHeight,
            padTop,
            padLeft: parseFloat(cs.paddingLeft) || 0,
            letterSpacing: parseFloat(cs.letterSpacing) || 0,
            tabSize: parseInt(cs.tabSize, 10) || 8
        };
    }

    /** Rendered width of a piece of one line (expands tabs like the textarea does). */
    function textWidth(text, m) {
        if (text.includes("\t")) {
            let col = 0;
            text = text.replace(/[^\t]*\t/g, chunk => {
                col += chunk.length - 1;
                const pad = m.tabSize - (col % m.tabSize);
                col += pad;
                return chunk.slice(0, -1) + " ".repeat(pad);
            });
        }
        return measureCtx.measureText(text).width + m.letterSpacing * text.length;
    }

    function scheduleHighlights() {
        if (find.frame) return;
        find.frame = requestAnimationFrame(() => {
            find.frame = 0;
            renderHighlights();
        });
    }

    /** Draw match boxes for the visible lines (the current match in a different colour). */
    function renderHighlights() {
        const layer = el.jsonHl;
        const ta = el.json;
        if (!find.matches.length || state.tab !== "json" || !ta.clientHeight) {
            layer.replaceChildren();
            return;
        }
        const m = textMetrics();
        const starts = lineStarts();
        const originX = ta.clientLeft + m.padLeft - ta.scrollLeft;
        const originY = ta.clientTop + m.padTop - ta.scrollTop;
        const firstLine = Math.max(0, Math.floor((ta.scrollTop - m.padTop) / m.lineHeight));
        const lastLine = Math.min(starts.length - 1, Math.ceil((ta.scrollTop + ta.clientHeight) / m.lineHeight));
        const from = starts[firstLine];
        const to = lastLine + 1 < starts.length ? starts[lastLine + 1] : Infinity;

        const frag = document.createDocumentFragment();
        const text = ta.value;
        let drawn = 0;
        for (let k = lowerBound(find.matches, from); k < find.matches.length && find.matches[k] < to && drawn < MAX_MARKS; k++, drawn++) {
            const offset = find.matches[k];
            const line = lineOf(offset);
            const lineStart = starts[line];
            const x = textWidth(text.slice(lineStart, offset), m);
            const w = textWidth(text.slice(offset, offset + find.lengths[k]), m);
            const box = make("div", k === find.current ? "se-hl is-current" : "se-hl");
            box.style.left = `${originX + x}px`;
            box.style.top = `${originY + line * m.lineHeight}px`;
            box.style.width = `${w}px`;
            box.style.height = `${m.lineHeight}px`;
            frag.appendChild(box);
        }
        layer.replaceChildren(frag);
    }

    // ================================================================ hex view

    function hexSource() {
        return state.doc.kind === "binary" ? state.doc.bytes : (state.hexBytes || state.original);
    }

    /**
     * For decoded files the hex view shows the file as it would be downloaded
     * now, so edits made on the readable values show up as changed bytes.
     */
    async function showHex() {
        if (state.doc.kind !== "binary") {
            try {
                state.hexBytes = await SaveCodec.build(state.doc);
            } catch (err) {
                state.hexBytes = null;
                showError(`Couldn't rebuild the file: ${err.message}`);
            }
        }
        renderHex();
    }

    /** Byte-level comparison only makes sense when no compression is involved. */
    const canDiffBytes = () => !state.doc.layers.some(l => /gzip|zlib|deflate/.test(l.type));

    function renderHex() {
        const bytes = hexSource();
        const editable = state.doc.kind === "binary";
        const diff = !editable && canDiffBytes();
        const perPage = HEX_COLS * HEX_ROWS;
        const pages = Math.max(1, Math.ceil(bytes.length / perPage));
        state.hexPage = Math.min(state.hexPage, pages - 1);
        updatePager("hex", state.hexPage, pages);
        if (editable) {
            el.hexLabel.textContent = `Editing raw bytes · ${bytes.length.toLocaleString()} bytes`;
        } else {
            let label = `File bytes including your edits (read-only, edit the values instead) · ${bytes.length.toLocaleString()} bytes`;
            const delta = bytes.length - state.original.length;
            if (delta) label += ` (${delta > 0 ? "+" : ""}${delta})`;
            el.hexLabel.textContent = label;
        }

        const frag = document.createDocumentFragment();
        const start = state.hexPage * perPage;
        const end = Math.min(bytes.length, start + perPage);
        for (let rowStart = start; rowStart < end; rowStart += HEX_COLS) {
            const row = make("div", "se-hexrow");
            row.appendChild(make("span", "se-hexoff", rowStart.toString(16).padStart(8, "0").toUpperCase()));
            const cells = make("span", "se-hexcells");
            const ascii = make("span", "se-hexascii");
            for (let i = rowStart; i < rowStart + HEX_COLS; i++) {
                if (i >= bytes.length) {
                    cells.appendChild(make("span", "se-hexcell is-pad", "  "));
                    continue;
                }
                const text = bytes[i].toString(16).padStart(2, "0").toUpperCase();
                let cell;
                if (editable) {
                    cell = make("input", "se-hexcell");
                    cell.type = "text";
                    cell.maxLength = 2;
                    cell.value = text;
                    cell.spellcheck = false;
                    cell.setAttribute("aria-label", `Byte 0x${i.toString(16)}`);
                } else {
                    cell = make("span", "se-hexcell", text);
                }
                cell.dataset.offset = i;
                if (editable ? state.hexEdited.has(i) : diff && bytes[i] !== state.original[i]) {
                    cell.classList.add("is-modified");
                }
                if (i === state.hexFocus) cell.classList.add("is-target");
                cells.appendChild(cell);
                ascii.appendChild(make("span", "", printable(bytes[i])));
            }
            row.append(cells, ascii);
            frag.appendChild(row);
        }
        el.hex.replaceChildren(frag);

        const target = el.hex.querySelector(".is-target");
        if (target) {
            target.scrollIntoView({ block: "center" });
            if (editable) target.focus();
        }
    }

    const printable = b => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "·");

    function editHexCell(cell) {
        const value = cell.value.trim();
        const valid = /^[0-9a-fA-F]{1,2}$/.test(value);
        cell.classList.toggle("is-invalid", !valid);
        if (!valid) return;
        const offset = Number(cell.dataset.offset);
        const bytes = state.doc.bytes;
        bytes[offset] = parseInt(value, 16);
        touch();
        if (bytes[offset] === state.original[offset]) state.hexEdited.delete(offset);
        else state.hexEdited.add(offset);
        cell.classList.toggle("is-modified", state.hexEdited.has(offset));
        // Keep the ASCII column in sync.
        const column = offset % HEX_COLS;
        const ascii = cell.closest(".se-hexrow").querySelector(".se-hexascii").children[column];
        ascii.textContent = printable(bytes[offset]);
    }

    function gotoHex() {
        const text = el.hexGoto.value.trim().replace(/^0x/i, "");
        if (!/^[0-9a-fA-F]+$/.test(text)) return;
        const offset = parseInt(text, 16);
        const bytes = hexSource();
        if (offset >= bytes.length) {
            el.hexLabel.textContent = `Offset 0x${text.toUpperCase()} is past the end of the file (${bytes.length.toLocaleString()} bytes).`;
            return;
        }
        state.hexFocus = offset;
        state.hexPage = Math.floor(offset / (HEX_COLS * HEX_ROWS));
        renderHex();
    }

    // ================================================================ saving

    async function download() {
        if (state.jsonDirty && !applyJson()) {
            showTab("json");
            return;
        }
        // Edited + checksum-protected: make sure the user knows before they swap the file in.
        if (state.protection && isDirty() && !state.protectionAcked) {
            const ok = window.confirm(
                `This save has a "${state.protection.key}" checksum that this decoder can't update, ` +
                "so the game will most likely reject the edited file as corrupted.\n\nDownload it anyway?"
            );
            if (!ok) return;
            state.protectionAcked = true;
        }
        try {
            const bytes = await SaveCodec.build(state.doc);
            saveBlob(bytes, state.fileName);
            state.unsaved = false;
        } catch (err) {
            showError(`Couldn't build the file: ${err.message}`);
        }
    }

    function exportJson() {
        if (state.jsonDirty && !applyJson()) return;
        const text = SaveJson.serialize(state.doc.root, SaveJson.PRETTY_FMT);
        const base = state.fileName.replace(/\.[^.]+$/, "") || "save";
        saveBlob(new TextEncoder().encode(text), `${base}.json`, "application/json");
    }

    // ================================================================ sample file

    /**
     * A made-up save packed as Base64( GZip( JSON ) ), so visitors without a
     * save file can see the detection and editing in action. Written as text
     * (not JSON.stringify) so it keeps float literals like 1520.0 and a 64-bit ID.
     */
    async function loadSample() {
        const json = `{"version":3,"data":{"player":{"name":"Wanderer","level":27,"xp":18342,` +
            `"gold":1520.0,"gems":35,"hp":86.5,"max_hp":120.0,"account_id":76561198012345678,` +
            `"is_hardcore":false,"position":{"x":-412.75,"y":18.0,"z":933.125},"title":"Caf\\u00e9 Owner"},` +
            `"currency":{"balances":{"soul.common":3564472,"soul.elite":11514,"crystal.magic_dust":42094474.43603795,` +
            `"boss_tower.tickets":9,"quest.dynamite":0}},` +
            `"inventory":[{"id":"sword_iron","count":1,"equipped":true},{"id":"potion_health","count":12,"equipped":false},` +
            `{"id":"arrow","count":240,"equipped":false}],` +
            `"quests":[{"id":"q_intro","completed":true,"progress":1.0},{"id":"q_dragon","completed":false,"progress":0.35}],` +
            `"settings":{"music_volume":0.8,"sfx_volume":0.65,"language":"en","show_tutorial":true,"last_server":null},` +
            `"stats":{"deaths_count":340,"play_time_seconds":512345}}}`;
        try {
            const gz = await SaveCodec.pipeBytes(new TextEncoder().encode(json), new CompressionStream("gzip"));
            const b64 = SaveCodec.bytesToBase64(gz);
            await loadBytes(new TextEncoder().encode(b64), "sample_save.bin");
        } catch (err) {
            showError(`Couldn't create the sample: ${err.message}`);
        }
    }

    // ================================================================ events

    el.drop.addEventListener("click", () => el.file.click());
    el.drop.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            el.file.click();
        }
    });
    el.file.addEventListener("change", () => {
        loadFile(el.file.files[0]);
        el.file.value = ""; // allow re-opening the same file
    });
    el.sample.addEventListener("click", loadSample);

    // Drag-and-drop anywhere on the page (also stops the browser from opening the file itself).
    const overlay = make("div", "se-overlay", "Drop the file to open it");
    document.body.appendChild(overlay);
    let dragDepth = 0;
    const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
    document.addEventListener("dragenter", e => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth++;
        overlay.classList.add("is-visible");
        el.drop.classList.add("is-dragging");
    });
    document.addEventListener("dragover", e => {
        if (hasFiles(e)) e.preventDefault();
    });
    document.addEventListener("dragleave", e => {
        if (!hasFiles(e)) return;
        dragDepth = Math.max(0, dragDepth - 1);
        if (!dragDepth) {
            overlay.classList.remove("is-visible");
            el.drop.classList.remove("is-dragging");
        }
    });
    document.addEventListener("drop", e => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth = 0;
        overlay.classList.remove("is-visible");
        el.drop.classList.remove("is-dragging");
        loadFile(e.dataTransfer.files[0]);
    });

    el.download.addEventListener("click", download);
    el.exportJson.addEventListener("click", exportJson);
    el.open.addEventListener("click", () => el.file.click());
    el.reset.addEventListener("click", () => {
        if (!isDirty()) return;
        if (window.confirm("Undo every change and reload the original file?")) {
            loadBytes(state.original, state.fileName, { skipConfirm: true });
        }
    });

    el.tabs.forEach(tab => tab.addEventListener("click", () => showTab(tab.dataset.tab)));

    // Quick-edit filters.
    const refilter = () => { state.quickPage = 0; renderQuick(); };
    el.type.addEventListener("change", refilter);
    el.changedOnly.addEventListener("change", refilter);
    let searchTimer = 0;
    el.search.addEventListener("input", () => {
        el.jsonSearch.value = el.search.value; // one search term shared by both modes
        clearTimeout(searchTimer);
        searchTimer = setTimeout(refilter, 150);
    });

    // Pagers (quick edit + hex share the markup).
    document.querySelectorAll(".se-pager").forEach(pager => {
        pager.addEventListener("click", e => {
            const btn = e.target.closest("[data-step]");
            if (!btn || btn.disabled) return;
            const step = Number(btn.dataset.step);
            if (pager.dataset.pager === "quick") {
                state.quickPage += step;
                renderQuick();
                // From the bottom pager, jump back up so the new page is read from its first row.
                if (pager.dataset.pos === "bottom") el.list.scrollIntoView({ block: "start" });
                else el.list.scrollIntoView({ block: "nearest" });
            } else {
                state.hexPage += step;
                state.hexFocus = -1;
                renderHex();
            }
        });
    });

    // JSON tab.
    el.json.addEventListener("input", () => {
        state.jsonDirty = true;
        touch();
        el.jsonApply.disabled = false;
        setJsonStatus("Unapplied changes.", "warn");
        // Text moved: re-find (debounced) so highlights and the count stay correct.
        find.lineStarts = null;
        if (find.query) {
            clearTimeout(find.timer);
            find.timer = setTimeout(runFind, 200);
        }
    });
    el.json.addEventListener("scroll", scheduleHighlights);
    if (window.ResizeObserver) new ResizeObserver(scheduleHighlights).observe(el.json);

    // Ctrl/Cmd+F inside the JSON tab jumps to its find box instead of the browser's.
    el.editor.addEventListener("keydown", e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f" && state.tab === "json") {
            e.preventDefault();
            el.jsonSearch.focus();
            el.jsonSearch.select();
        }
    });
    el.json.addEventListener("keydown", e => {
        // Tab inserts indentation instead of leaving the editor.
        if (e.key === "Tab" && !e.shiftKey) {
            e.preventDefault();
            document.execCommand("insertText", false, "  ");
        }
    });
    el.jsonApply.addEventListener("click", applyJson);
    el.jsonNext.addEventListener("click", () => stepFind(1));
    el.jsonPrev.addEventListener("click", () => stepFind(-1));
    // Find as you type: count every match and jump to the nearest one.
    el.jsonSearch.addEventListener("input", () => {
        // Shared with Quick edit, which re-filters from page 1 when shown again.
        el.search.value = el.jsonSearch.value;
        state.quickPage = 0;
        clearTimeout(find.timer);
        find.timer = setTimeout(() => {
            runFind();
            if (find.matches.length) revealMatch();
        }, 120);
    });
    el.jsonSearch.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            stepFind(e.shiftKey ? -1 : 1);
        } else if (e.key === "Escape") {
            el.jsonSearch.value = "";
            el.search.value = "";
            state.quickPage = 0;
            runFind();
        }
    });

    // Text tab.
    el.text.addEventListener("input", () => {
        state.doc.text = el.text.value;
        state.textEdited = true;
        touch();
    });

    // Hex tab.
    el.hex.addEventListener("input", e => {
        const cell = e.target.closest("input.se-hexcell");
        if (!cell) return;
        editHexCell(cell);
        // Jump to the next byte after two hex digits, like a hex editor.
        if (cell.value.length === 2 && !cell.classList.contains("is-invalid")) {
            const next = el.hex.querySelector(`[data-offset="${Number(cell.dataset.offset) + 1}"]`);
            if (next) { next.focus(); next.select(); }
        }
    });
    el.hex.addEventListener("focusin", e => {
        if (e.target.matches("input.se-hexcell")) e.target.select();
    });
    el.hex.addEventListener("focusout", e => {
        const cell = e.target;
        if (!cell.matches("input.se-hexcell")) return;
        const value = state.doc.bytes[Number(cell.dataset.offset)];
        cell.value = value.toString(16).padStart(2, "0").toUpperCase();
        cell.classList.remove("is-invalid");
    });
    el.hexGoto.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            gotoHex();
        }
    });

    window.addEventListener("beforeunload", e => {
        if (state.unsaved) {
            e.preventDefault();
            e.returnValue = "";
        }
    });
})();
