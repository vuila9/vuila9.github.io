/*
 * Save_Editor_json.js — a lossless JSON tree.
 *
 * JSON.parse() + JSON.stringify() is NOT safe for editing game saves:
 *   - "gems": 9931676.0  comes back as 9931676 (int vs float can matter to the game)
 *   - 64-bit IDs / timestamps above 2^53 silently lose precision
 *   - duplicate keys are collapsed, "é"-style escapes are rewritten
 *
 * This parser builds a small node tree instead, keeping every number as its
 * original text, every escaped string as its original literal, and every key
 * in order. Unchanged values are written back byte-for-byte; it also records
 * the file's formatting style (indent / separators) so the output looks like
 * the input.
 *
 * Node shapes:
 *   { t: "obj",  entries: [{ k, rawKey?, v: node }] }
 *   { t: "arr",  items:   [node] }
 *   { t: "str",  v: "text", raw?: "\"original literal\"" }   (raw only when it had escapes)
 *   { t: "num",  raw: "9931676.0" }
 *   { t: "bool", v: true }
 *   { t: "null" }
 */
(function (global) {
    "use strict";

    // JSON number grammar, plus the NaN / Infinity tokens Python's json module writes.
    const NUMBER_RE = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|-?Infinity|NaN/y;

    class JsonParseError extends Error {
        constructor(message, text, index) {
            const { line, col } = lineCol(text, index);
            super(`${message} (line ${line}, column ${col})`);
            this.index = index;
            this.line = line;
            this.col = col;
        }
    }

    /** 1-based line/column of a character index — used for error messages. */
    function lineCol(text, index) {
        let line = 1;
        let lastBreak = -1;
        for (let i = text.indexOf("\n"); i !== -1 && i < index; i = text.indexOf("\n", i + 1)) {
            line++;
            lastBreak = i;
        }
        return { line, col: index - lastBreak };
    }

    /**
     * Parse one JSON value starting at `start`.
     * Returns { root, end, fmt } where `end` is the index just past the value.
     */
    function parseValueAt(text, start = 0) {
        let i = start;
        let depth = 0;
        // Formatting style, filled in from the first occurrence of each token.
        const fmt = { indent: null, keySep: null, itemSep: null, escapeSlash: false, asciiOnly: false };

        const fail = (message, at = i) => { throw new JsonParseError(message, text, at); };

        function skipWs() {
            while (i < text.length) {
                const c = text.charCodeAt(i);
                if (c === 32 || c === 10 || c === 13 || c === 9) i++;
                else break;
            }
        }

        function value() {
            const c = text[i];
            if (c === "{") return container(true);
            if (c === "[") return container(false);
            if (c === '"') return string();
            if (c === "t" && text.startsWith("true", i)) { i += 4; return { t: "bool", v: true }; }
            if (c === "f" && text.startsWith("false", i)) { i += 5; return { t: "bool", v: false }; }
            if (c === "n" && text.startsWith("null", i)) { i += 4; return { t: "null" }; }
            NUMBER_RE.lastIndex = i;
            const m = NUMBER_RE.exec(text);
            if (m) { i += m[0].length; return { t: "num", raw: m[0] }; }
            return fail(i >= text.length ? "Unexpected end of file" : `Unexpected character '${text[i]}'`);
        }

        function string() {
            const s = i++;
            let hasEscape = false;
            for (;;) {
                const c = text.charCodeAt(i);
                if (c === 34) break;                                   // closing quote
                if (c === 92) { hasEscape = true; i += 2; continue; }  // backslash: skip escaped char
                if (Number.isNaN(c)) fail("Unterminated string", s);
                if (c < 32) fail("Raw control character inside a string");
                i++;
            }
            i++;
            const raw = text.slice(s, i);
            if (!hasEscape) return { t: "str", v: raw.slice(1, -1) };
            if (!fmt.escapeSlash && raw.includes("\\/")) fmt.escapeSlash = true;
            try {
                return { t: "str", v: JSON.parse(raw), raw };
            } catch (err) {
                return fail("Invalid escape sequence in string", s);
            }
        }

        function container(isObj) {
            const close = isObj ? "}" : "]";
            const node = isObj ? { t: "obj", entries: [] } : { t: "arr", items: [] };
            i++;
            depth++;

            const wsStart = i;
            skipWs();
            // The root's opening whitespace tells us whether the file is pretty-printed.
            if (depth === 1 && text[i] !== close) {
                const ws = text.slice(wsStart, i);
                const nl = ws.lastIndexOf("\n");
                if (nl !== -1) fmt.indent = ws.slice(nl + 1);
            }

            if (text[i] === close) { i++; depth--; return node; }

            for (;;) {
                if (isObj) {
                    if (text[i] !== '"') fail("Expected a quoted key");
                    const key = string();
                    const sepStart = i;
                    skipWs();
                    if (text[i] !== ":") fail("Expected ':' after key");
                    i++;
                    skipWs();
                    if (fmt.keySep === null) fmt.keySep = text.slice(sepStart, i);
                    const entry = { k: key.v, v: value() };
                    if (key.raw) entry.rawKey = key.raw;
                    node.entries.push(entry);
                } else {
                    node.items.push(value());
                }

                skipWs();
                if (text[i] === ",") {
                    const sepStart = i++;
                    skipWs();
                    if (fmt.itemSep === null) {
                        // Keep only what sits before the line break (pretty files use ",\n").
                        fmt.itemSep = text.slice(sepStart, i).split(/\r?\n/)[0];
                    }
                    continue;
                }
                if (text[i] === close) { i++; depth--; return node; }
                fail(`Expected ',' or '${close}'`);
            }
        }

        const root = value();
        return { root, end: i, fmt };
    }

    /**
     * Parse a whole document: optional leading/trailing whitespace (or NUL padding)
     * around a single object/array root. Throws JsonParseError on failure.
     */
    function parseDocument(text) {
        const lead = text.match(/^[\s\0]*/)[0];
        const first = text[lead.length];
        if (first !== "{" && first !== "[") {
            throw new JsonParseError("Expected '{' or '[' at the start", text, lead.length);
        }
        const { root, end, fmt } = parseValueAt(text, lead.length);
        const trail = text.slice(end);
        if (!/^[\s\0]*$/.test(trail)) {
            throw new JsonParseError("Unexpected content after the end of the JSON", text, end);
        }
        // A file written with only ASCII (e.g. Python's ensure_ascii) should stay that way.
        fmt.asciiOnly = !/[^\x00-\x7f]/.test(text);
        return { root, fmt, lead, trail };
    }

    /** JSON string literal for `str`, honouring the file's escaping style. */
    function quote(str, fmt) {
        let s = JSON.stringify(str);
        if (fmt && fmt.asciiOnly) {
            s = s.replace(/[\u0080-￿]/g, ch => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"));
        }
        if (fmt && fmt.escapeSlash) s = s.replace(/\//g, "\\/");
        return s;
    }

    function bytesToBase64(b) {
        let bin = "";
        for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
        return btoa(bin);
    }

    /** Write the tree back to text using the recorded formatting style. */
    function serialize(root, fmt) {
        const indent = fmt.indent;
        const pretty = indent !== null;
        const keySep = fmt.keySep !== null ? fmt.keySep : (pretty ? ": " : ":");
        const itemSep = fmt.itemSep !== null ? fmt.itemSep : ",";
        const out = [];

        const write = (node, depth) => {
            switch (node.t) {
                case "num": out.push(node.raw); return;
                case "str": out.push(node.raw || quote(node.v, fmt)); return;
                case "bool": out.push(node.v ? "true" : "false"); return;
                case "null": out.push("null"); return;
                // MessagePack-only types (see Save_Editor_msgpack.js), shown as tagged objects.
                case "bin": out.push(`{"$binary"${keySep}"${bytesToBase64(node.bytes)}"}`); return;
                case "ext": out.push(`{"$ext"${keySep}${node.type}${itemSep}"$data"${keySep}"${bytesToBase64(node.bytes)}"}`); return;
                default: {
                    const isObj = node.t === "obj";
                    const list = isObj ? node.entries : node.items;
                    out.push(isObj ? "{" : "[");
                    if (list.length) {
                        const lineStart = pretty ? "\n" + indent.repeat(depth + 1) : "";
                        for (let n = 0; n < list.length; n++) {
                            if (n) out.push(itemSep);
                            out.push(lineStart);
                            if (isObj) {
                                const e = list[n];
                                out.push(e.rawKey || quote(e.k, fmt), keySep);
                                write(e.v, depth + 1);
                            } else {
                                write(list[n], depth + 1);
                            }
                        }
                        if (pretty) out.push("\n" + indent.repeat(depth));
                    }
                    out.push(isObj ? "}" : "]");
                }
            }
        };

        write(root, 0);
        return out.join("");
    }

    /** Style used for the editable JSON view (always readable, 2-space indent). */
    const PRETTY_FMT = Object.freeze({ indent: "  ", keySep: ": ", itemSep: ",", escapeSlash: false, asciiOnly: false });

    /**
     * Flatten the tree into a list of editable leaves (numbers, strings,
     * booleans, nulls). Each leaf keeps a reference to its node, so editing
     * leaf.node edits the tree in place.
     */
    function collectLeaves(root) {
        const leaves = [];
        const walk = (node, path) => {
            if (node.t === "obj") {
                for (const e of node.entries) walk(e.v, path.concat(e.k));
            } else if (node.t === "arr") {
                node.items.forEach((child, idx) => walk(child, path.concat(idx)));
            } else {
                leaves.push({ path, node });
            }
        };
        walk(root, []);
        return leaves;
    }

    // ------------------------------------------------------------ JSON stored inside strings
    //
    // Some games store a whole JSON document as a *string* value, e.g.
    //   "ab_data": "{\"rpm_old_algorithm\":{\"A\":{\"enabled\":false}, …}}"
    // unpackEmbedded() turns such strings into real objects/arrays so they can be
    // browsed and edited like everything else; the container keeps an `emb`
    // record ({ fmt, lead, trail, str }) and packEmbedded() turns it back into a
    // string when the file is built. A string is only unpacked if packing it
    // again reproduces the original text exactly, so untouched saves stay identical.

    const isContainer = node => node.t === "obj" || node.t === "arr";
    const sizeOf = node => (node.t === "obj" ? node.entries.length : node.items.length);

    function tryUnpackString(str) {
        const v = str.v;
        const first = v.trimStart()[0];
        if (v.length < 2 || (first !== "{" && first !== "[")) return null;
        let doc;
        try { doc = parseDocument(v); } catch (err) { return null; }
        if (!sizeOf(doc.root)) return null;
        if (doc.lead + serialize(doc.root, doc.fmt) + doc.trail !== v) return null;
        const root = unpackEmbedded(doc.root);   // JSON strings inside JSON strings
        root.emb = { fmt: doc.fmt, lead: doc.lead, trail: doc.trail, str };
        return root;
    }

    /** Replace JSON-holding string values with real containers (in place). Returns the root. */
    function unpackEmbedded(node) {
        if (node.t === "obj") node.entries.forEach(e => { e.v = unpackEmbedded(e.v); });
        else if (node.t === "arr") node.items = node.items.map(unpackEmbedded);
        else if (node.t === "str") return tryUnpackString(node) || node;
        return node;
    }

    /**
     * Copy of the tree with every unpacked container turned back into its
     * string (unchanged ones reuse the original string node, so they re-encode
     * exactly). Untouched branches are shared, not copied.
     */
    function packEmbedded(node) {
        let out = node;
        if (node.t === "obj") {
            let changed = false;
            const entries = node.entries.map(e => {
                const v = packEmbedded(e.v);
                if (v === e.v) return e;
                changed = true;
                return Object.assign({}, e, { v });
            });
            if (changed) out = Object.assign({}, node, { entries });
        } else if (node.t === "arr") {
            let changed = false;
            const items = node.items.map(item => {
                const v = packEmbedded(item);
                if (v !== item) changed = true;
                return v;
            });
            if (changed) out = Object.assign({}, node, { items });
        }
        if (!node.emb) return out;
        const { fmt, lead, trail, str } = node.emb;
        const text = lead + serialize(out, fmt) + trail;
        if (text === str.v) return str;
        const packed = { t: "str", v: text };
        if (str.mp) packed.mp = str.mp;   // MessagePack string width
        return packed;
    }

    /** After a JSON-tab edit, mark containers that were unpacked strings before (matched by key/index). */
    function carryEmbedded(next, prev) {
        if (!prev) return;
        if (prev.emb && isContainer(next)) next.emb = prev.emb;
        if (next.t === "obj" && prev.t === "obj") {
            const before = new Map(prev.entries.map(e => [e.k, e.v]));
            next.entries.forEach(e => carryEmbedded(e.v, before.get(e.k)));
        } else if (next.t === "arr" && prev.t === "arr") {
            next.items.forEach((item, idx) => carryEmbedded(item, prev.items[idx]));
        }
    }

    /** Paths (as arrays) of every unpacked JSON string in the tree. */
    function findEmbedded(root) {
        const found = [];
        const walk = (node, path) => {
            if (node.emb) found.push(path);
            if (node.t === "obj") node.entries.forEach(e => walk(e.v, path.concat(e.k)));
            else if (node.t === "arr") node.items.forEach((item, idx) => walk(item, path.concat(idx)));
        };
        walk(root, []);
        return found;
    }

    /** Is `text` a valid JSON number literal (incl. NaN / Infinity)? */
    function isNumberLiteral(text) {
        NUMBER_RE.lastIndex = 0;
        const m = NUMBER_RE.exec(text);
        return !!m && m[0].length === text.length;
    }

    global.SaveJson = {
        JsonParseError,
        parseValueAt,
        parseDocument,
        serialize,
        quote,
        collectLeaves,
        unpackEmbedded,
        packEmbedded,
        carryEmbedded,
        findEmbedded,
        isNumberLiteral,
        PRETTY_FMT
    };
})(window);
