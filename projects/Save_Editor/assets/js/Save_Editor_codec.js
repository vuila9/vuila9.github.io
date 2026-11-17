/*
 * Save_Editor_codec.js — figures out how a save file is packed, and packs it back.
 *
 * A save is modelled as a stack of "layers" wrapped around a payload:
 *
 *     file bytes ─► [xor] ─► [gzip | zlib | raw deflate] ─► [hex | base64 text] ─► … ─► payload
 *
 * where the payload ("kind") is one of:
 *   json   — a JSON document (UTF-8 / UTF-16, optional BOM), possibly sitting
 *            between a binary header and footer (with a length field we keep in sync)
 *   text   — any other readable text (XML, INI, CSV…), edited as plain text
 *   binary — nothing recognised; edited byte-by-byte in the hex view
 *
 * analyze() peels the layers off; build() re-applies them in reverse after
 * editing, so the downloaded file is packed exactly like the original.
 * Everything runs locally — no bytes ever leave the browser.
 */
(function (global) {
    "use strict";

    const MAX_DEPTH = 6;               // how many layers deep we are willing to look
    const MIN_EMBEDDED_SHARE = 0.5;    // embedded JSON must be at least half the file

    // ---------------------------------------------------------------- helpers

    function concatBytes(...parts) {
        const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
        let at = 0;
        for (const p of parts) { out.set(p, at); at += p.length; }
        return out;
    }

    function bytesEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return true;
    }

    /** Run bytes through a (De)CompressionStream. */
    async function pipeBytes(bytes, transform) {
        const stream = new Blob([bytes]).stream().pipeThrough(transform);
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function tryInflate(bytes, format) {
        if (typeof DecompressionStream === "undefined") return null;
        try {
            return await pipeBytes(bytes, new DecompressionStream(format));
        } catch (err) {
            return null; // not compressed with this format (or corrupt)
        }
    }

    const isGzip = b => b.length > 10 && b[0] === 0x1f && b[1] === 0x8b && b[2] === 0x08;
    // zlib header: deflate method (low nibble 8) and a header checksum divisible by 31.
    const isZlib = b => b.length > 2 && (b[0] & 0x0f) === 8 && (b[0] >> 4) <= 7 && ((b[0] << 8) | b[1]) % 31 === 0;

    // ---------------------------------------------------------------- text encodings

    const BOMS = {
        "utf-8": [0xef, 0xbb, 0xbf],
        "utf-16le": [0xff, 0xfe],
        "utf-16be": [0xfe, 0xff]
    };

    /** Guess the text encoding from a BOM or the NUL-byte pattern of UTF-16. */
    function detectEncoding(b) {
        for (const [encoding, bom] of Object.entries(BOMS)) {
            if (bom.every((v, i) => b[i] === v)) return { encoding, bom: true };
        }
        if (b.length >= 4 && b[0] && !b[1] && b[2] && !b[3]) return { encoding: "utf-16le", bom: false };
        if (b.length >= 4 && !b[0] && b[1] && !b[2] && b[3]) return { encoding: "utf-16be", bom: false };
        return { encoding: "utf-8", bom: false };
    }

    /** Strict decode — returns null if the bytes are not valid in that encoding. */
    function decodeText(b, enc) {
        const skip = enc.bom ? BOMS[enc.encoding].length : 0;
        if (enc.encoding !== "utf-8" && (b.length - skip) % 2) return null;
        try {
            return new TextDecoder(enc.encoding, { fatal: true, ignoreBOM: true }).decode(b.subarray(skip));
        } catch (err) {
            return null;
        }
    }

    function encodeText(text, enc) {
        let body;
        if (enc.encoding === "utf-8") {
            body = new TextEncoder().encode(text);
        } else {
            const le = enc.encoding === "utf-16le";
            body = new Uint8Array(text.length * 2);
            for (let i = 0; i < text.length; i++) {
                const c = text.charCodeAt(i);
                body[2 * i + (le ? 0 : 1)] = c & 0xff;
                body[2 * i + (le ? 1 : 0)] = c >> 8;
            }
        }
        return enc.bom ? concatBytes(Uint8Array.from(BOMS[enc.encoding]), body) : body;
    }

    /** Mostly printable? (allows tabs/newlines, rejects NULs and binary noise) */
    function looksLikeText(text) {
        if (!text.length) return false;
        const n = Math.min(text.length, 65536);
        let bad = 0;
        for (let i = 0; i < n; i++) {
            const c = text.charCodeAt(i);
            if ((c < 32 && c !== 9 && c !== 10 && c !== 13) || c === 0xfffd) bad++;
        }
        return bad / n < 0.005;
    }

    // ---------------------------------------------------------------- hex / base64 text layers

    /** Split surrounding whitespace off, and un-wrap fixed-width lines. */
    function unwrapText(text) {
        const lead = text.match(/^\s*/)[0];
        const trail = text.slice(lead.length).match(/\s*$/)[0];
        const core = text.slice(lead.length, text.length - trail.length);
        const lines = core.split(/\r?\n/);
        const wrap = lines.length > 1 ? lines[0].length : 0;
        const eol = core.includes("\r\n") ? "\r\n" : "\n";
        return { lead, trail, wrap, eol, body: lines.join("") };
    }

    function rewrap(body, layer) {
        if (!layer.wrap) return body;
        const lines = [];
        for (let i = 0; i < body.length; i += layer.wrap) lines.push(body.slice(i, i + layer.wrap));
        return lines.join(layer.eol);
    }

    function tryHexText(text, enc) {
        const t = unwrapText(text);
        if (t.body.length < 16 || t.body.length % 2 || !/^[0-9a-fA-F]+$/.test(t.body)) return null;
        const bytes = new Uint8Array(t.body.length / 2);
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(t.body.substr(i * 2, 2), 16);
        const upper = /[A-F]/.test(t.body) && !/[a-f]/.test(t.body);
        return { bytes, layer: { type: "hex", enc, upper, lead: t.lead, trail: t.trail, wrap: t.wrap, eol: t.eol } };
    }

    function tryBase64Text(text, enc) {
        const t = unwrapText(text);
        if (t.body.length < 16 || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(t.body)) return null;
        const urlSafe = /[-_]/.test(t.body);
        const pad = t.body.endsWith("=");
        let std = t.body.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
        if (std.length % 4 === 1) return null;
        std += "=".repeat((4 - (std.length % 4)) % 4);
        let bin;
        try { bin = atob(std); } catch (err) { return null; }
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return { bytes, layer: { type: "base64", enc, urlSafe, pad, lead: t.lead, trail: t.trail, wrap: t.wrap, eol: t.eol } };
    }

    function bytesToBase64(b) {
        let bin = "";
        for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
        return btoa(bin);
    }

    // ---------------------------------------------------------------- length fields

    /**
     * Binary saves often store the JSON's byte length right before it — as a
     * uint32/uint16 (either endian) or as C#'s BinaryWriter 7-bit varint.
     * If the header ends with such a value, remember it so it can be updated.
     */
    function detectLengthField(prefix, len) {
        const p = prefix.length;
        const view = new DataView(prefix.buffer, prefix.byteOffset, prefix.byteLength);
        if (p >= 4 && view.getUint32(p - 4, true) === len) return { type: "u32le" };
        if (p >= 4 && view.getUint32(p - 4, false) === len) return { type: "u32be" };
        // 7-bit varint (LEB128): continuation bits set on all but the last byte.
        for (let size = 1; size <= 5 && size <= p; size++) {
            const start = p - size;
            let value = 0;
            let ok = true;
            for (let k = 0; k < size; k++) {
                const byte = prefix[start + k];
                const last = k === size - 1;
                if (last === !!(byte & 0x80)) { ok = false; break; }
                value += (byte & 0x7f) * 2 ** (7 * k);
            }
            if (ok && value === len) return { type: "varint", size };
        }
        if (p >= 2 && view.getUint16(p - 2, true) === len) return { type: "u16le" };
        if (p >= 2 && view.getUint16(p - 2, false) === len) return { type: "u16be" };
        return null;
    }

    function encodeVarint(n) {
        const out = [];
        do {
            let byte = n % 128;
            n = Math.floor(n / 128);
            if (n) byte |= 0x80;
            out.push(byte);
        } while (n);
        return Uint8Array.from(out);
    }

    /** Copy of the header with its length field rewritten for a new JSON length. */
    function writeLengthField(prefix, field, len) {
        if (!field) return prefix;
        if (field.type === "varint") {
            return concatBytes(prefix.subarray(0, prefix.length - field.size), encodeVarint(len));
        }
        const out = prefix.slice();
        const view = new DataView(out.buffer);
        const p = out.length;
        if (field.type === "u32le") view.setUint32(p - 4, len, true);
        if (field.type === "u32be") view.setUint32(p - 4, len, false);
        if (field.type === "u16le") view.setUint16(p - 2, Math.min(len, 0xffff), true);
        if (field.type === "u16be") view.setUint16(p - 2, Math.min(len, 0xffff), false);
        return out;
    }

    // ---------------------------------------------------------------- payload detection

    function tryJsonText(text) {
        const first = text.match(/^[\s\0]*/)[0].length;
        if (text[first] !== "{" && text[first] !== "[") return null;
        try {
            return global.SaveJson.parseDocument(text);
        } catch (err) {
            return null;
        }
    }

    /** Find a JSON object/array sitting inside otherwise-binary bytes. */
    function tryEmbeddedJson(bytes) {
        const limit = Math.min(bytes.length, 4096);
        let attempts = 0;
        for (let start = 0; start < limit && attempts < 8; start++) {
            if (bytes[start] !== 0x7b && bytes[start] !== 0x5b) continue; // '{' or '['
            attempts++;
            const text = new TextDecoder("utf-8").decode(bytes.subarray(start));
            let parsed;
            try { parsed = global.SaveJson.parseValueAt(text, 0); } catch (err) { continue; }
            const jsonText = text.slice(0, parsed.end);
            const jsonBytes = new TextEncoder().encode(jsonText);
            // Must be a real slice of the file (no replacement chars) and most of it.
            if (jsonBytes.length < bytes.length * MIN_EMBEDDED_SHARE) continue;
            if (!bytesEqual(jsonBytes, bytes.subarray(start, start + jsonBytes.length))) continue;
            const prefix = bytes.slice(0, start);
            parsed.fmt.asciiOnly = !/[^\x00-\x7f]/.test(jsonText);
            return {
                kind: "json",
                layers: [],
                enc: { encoding: "utf-8", bom: false },
                root: parsed.root,
                fmt: parsed.fmt,
                lead: "",
                trail: "",
                embed: {
                    prefix,
                    suffix: bytes.slice(start + jsonBytes.length),
                    lengthField: detectLengthField(prefix, jsonBytes.length)
                },
                source: bytes
            };
        }
        return null;
    }

    /** MessagePack ("binary JSON") — decoded into the same editable tree as JSON. */
    function tryMsgpack(bytes) {
        const found = global.SaveMsgpack.detect(bytes);
        if (!found) return null;
        const prefix = bytes.slice(0, found.start);
        const doc = {
            kind: "json",
            container: "msgpack",
            layers: [],
            root: found.root,
            fmt: global.SaveJson.PRETTY_FMT,
            lead: "",
            trail: "",
            source: bytes
        };
        if (found.start || found.end < bytes.length) {
            doc.embed = {
                prefix,
                suffix: bytes.slice(found.end),
                lengthField: detectLengthField(prefix, found.end - found.start)
            };
        }
        return doc;
    }

    /** Single-byte XOR "encryption" — guess the key from the first byte. */
    async function tryXor(bytes, depth) {
        if (bytes.length < 16) return null;
        const keys = new Set([bytes[0] ^ 0x7b, bytes[0] ^ 0x5b, bytes[0] ^ 0x1f]);
        keys.delete(0);
        for (const key of keys) {
            const x = bytes.map(v => v ^ key);
            if (x[0] === 0x1f && x[1] !== 0x8b) continue;
            const res = await analyze(x, depth + 1, { noXor: true });
            if (res.kind === "json") {
                res.layers.unshift({ type: "xor", key });
                return res;
            }
        }
        return null;
    }

    function wrapLayer(result, layer) {
        result.layers.unshift(layer);
        return result;
    }

    /**
     * Peel layers off `bytes` until a payload is recognised.
     * Returns { kind, layers, ... } — see the header comment.
     */
    async function analyze(bytes, depth = 0, opts = {}) {
        if (depth < MAX_DEPTH) {
            const compressions = [[isGzip, "gzip", "gzip"], [isZlib, "deflate", "zlib"]];
            for (const [test, format, type] of compressions) {
                if (!test(bytes)) continue;
                const inner = await tryInflate(bytes, format);
                if (inner) return wrapLayer(await analyze(inner, depth + 1, opts), { type });
            }
        }

        const enc = detectEncoding(bytes);
        const text = decodeText(bytes, enc);
        if (text !== null) {
            const json = tryJsonText(text);
            if (json) return { kind: "json", layers: [], enc, ...json, source: bytes };

            if (depth < MAX_DEPTH) {
                for (const tryText of [tryHexText, tryBase64Text]) {
                    const found = tryText(text, enc);
                    if (!found) continue;
                    const inner = await analyze(found.bytes, depth + 1, opts);
                    if (inner.kind !== "binary") return wrapLayer(inner, found.layer);
                }
            }
        }

        // Binary JSON (MessagePack): the whole file is one map/array.
        const mp = tryMsgpack(bytes);
        if (mp) return mp;

        // XOR-ed ASCII is still valid ASCII, so check for it before settling on "text".
        if (depth < MAX_DEPTH && !opts.noXor) {
            const xored = await tryXor(bytes, depth);
            if (xored) return xored;
        }
        if (text !== null && looksLikeText(text)) return { kind: "text", layers: [], enc, text, source: bytes };

        if (depth < MAX_DEPTH) {
            const raw = await tryInflate(bytes, "deflate-raw");
            if (raw && raw.length) {
                const inner = await analyze(raw, depth + 1, opts);
                if (inner.kind !== "binary") return wrapLayer(inner, { type: "deflate-raw" });
            }
        }

        return tryEmbeddedJson(bytes) || { kind: "binary", layers: [], bytes: bytes.slice(), source: bytes };
    }

    // ---------------------------------------------------------------- re-packing

    /** Bytes of the innermost payload (before any layer is applied). */
    function buildPayload(doc) {
        if (doc.kind === "binary") return doc.bytes;
        if (doc.kind === "text") return encodeText(doc.text, doc.enc);

        let body;
        if (doc.container === "msgpack") {
            body = global.SaveMsgpack.encode(doc.root);
        } else {
            const text = doc.lead + global.SaveJson.serialize(doc.root, doc.fmt) + doc.trail;
            if (!doc.embed) return encodeText(text, doc.enc);
            body = new TextEncoder().encode(text);
        }
        if (!doc.embed) return body;
        const prefix = writeLengthField(doc.embed.prefix, doc.embed.lengthField, body.length);
        return concatBytes(prefix, body, doc.embed.suffix);
    }

    async function applyLayer(bytes, layer) {
        switch (layer.type) {
            case "xor": return bytes.map(v => v ^ layer.key);
            case "gzip": return pipeBytes(bytes, new CompressionStream("gzip"));
            case "zlib": return pipeBytes(bytes, new CompressionStream("deflate"));
            case "deflate-raw": return pipeBytes(bytes, new CompressionStream("deflate-raw"));
            case "hex": {
                let hex = Array.from(bytes, v => v.toString(16).padStart(2, "0")).join("");
                if (layer.upper) hex = hex.toUpperCase();
                return encodeText(layer.lead + rewrap(hex, layer) + layer.trail, layer.enc);
            }
            case "base64": {
                let b64 = bytesToBase64(bytes);
                if (layer.urlSafe) b64 = b64.replace(/\+/g, "-").replace(/\//g, "_");
                if (!layer.pad) b64 = b64.replace(/=+$/, "");
                return encodeText(layer.lead + rewrap(b64, layer) + layer.trail, layer.enc);
            }
            default: throw new Error(`Unknown layer type: ${layer.type}`);
        }
    }

    /** Re-pack the (possibly edited) document into file bytes. */
    async function build(doc) {
        let bytes = buildPayload(doc);
        for (let n = doc.layers.length - 1; n >= 0; n--) bytes = await applyLayer(bytes, doc.layers[n]);
        return bytes;
    }

    /** Human-readable labels for the detected layer chain, outermost first. */
    function describe(doc) {
        const labels = {
            xor: l => `XOR 0x${l.key.toString(16).padStart(2, "0").toUpperCase()}`,
            gzip: () => "GZip",
            zlib: () => "zlib",
            "deflate-raw": () => "Deflate",
            hex: () => "Hex text",
            base64: l => (l.urlSafe ? "Base64 (URL-safe)" : "Base64")
        };
        const chain = doc.layers.map(l => labels[l.type](l));
        const msgpack = doc.container === "msgpack";
        if (doc.kind !== "binary" && !msgpack) {
            chain.push(doc.enc.encoding.toUpperCase() + (doc.enc.bom ? " + BOM" : ""));
        }
        if (doc.embed) chain.push(`Binary wrapper (${doc.embed.prefix.length} B header, ${doc.embed.suffix.length} B footer)`);
        chain.push(msgpack ? "MessagePack" : { json: "JSON", text: "Plain text", binary: "Unknown binary" }[doc.kind]);
        return chain;
    }

    global.SaveCodec = {
        analyze,
        build,
        buildPayload,
        describe,
        bytesEqual,
        encodeText,
        bytesToBase64,
        pipeBytes
    };
})(window);
