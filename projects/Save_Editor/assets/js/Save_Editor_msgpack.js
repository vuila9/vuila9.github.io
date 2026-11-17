/*
 * Save_Editor_msgpack.js — lossless MessagePack <-> editable tree.
 *
 * MessagePack is "binary JSON": maps, arrays, strings, numbers, booleans and
 * null, each prefixed with a type byte (e.g. 0xB4 = a 20-byte string,
 * 0xCB = a float64). Many games (and anything using MessagePack-CSharp) save
 * this way, which looks like noise in a hex viewer.
 *
 * Decoding produces the same node tree Save_Editor_json.js uses, so the UI
 * can edit it like JSON. Each node also remembers its exact MessagePack
 * encoding (`mp`: "f64", "u16", "str8", "fixmap"…), and the encoder reuses it,
 * so an untouched save re-encodes byte-for-byte and a float stays a float.
 *
 * Extra node types that JSON doesn't have:
 *   { t: "bin", bytes, mp }        raw binary blob
 *   { t: "ext", type, bytes, mp }  extension type (e.g. timestamps)
 * In the JSON view they appear as {"$binary": "<base64>"} and
 * {"$ext": <type>, "$data": "<base64>"}, and are converted back on apply.
 */
(function (global) {
    "use strict";

    const MAX_DEPTH = 500;

    class MsgpackError extends Error {}

    // Value ranges of each integer encoding.
    const INT_RANGES = {
        fixint: [0n, 127n],
        negfixint: [-32n, -1n],
        u8: [0n, 0xffn],
        u16: [0n, 0xffffn],
        u32: [0n, 0xffffffffn],
        u64: [0n, 0xffffffffffffffffn],
        i8: [-0x80n, 0x7fn],
        i16: [-0x8000n, 0x7fffn],
        i32: [-0x80000000n, 0x7fffffffn],
        i64: [-0x8000000000000000n, 0x7fffffffffffffffn]
    };
    const UNSIGNED_ORDER = ["fixint", "u8", "u16", "u32", "u64"];
    const SIGNED_ORDER = ["negfixint", "i8", "i16", "i32", "i64"];

    // [format, max length] for length-prefixed types, smallest first.
    const STR_FMTS = [["fixstr", 31], ["str8", 0xff], ["str16", 0xffff], ["str32", 0xffffffff]];
    const BIN_FMTS = [["bin8", 0xff], ["bin16", 0xffff], ["bin32", 0xffffffff]];
    const ARR_FMTS = [["fixarray", 15], ["array16", 0xffff], ["array32", 0xffffffff]];
    const MAP_FMTS = [["fixmap", 15], ["map16", 0xffff], ["map32", 0xffffffff]];
    const EXT_FMTS = [["ext8", 0xff], ["ext16", 0xffff], ["ext32", 0xffffffff]];
    const FIXEXT = { 1: "fixext1", 2: "fixext2", 4: "fixext4", 8: "fixext8", 16: "fixext16" };

    /** Keep the original format if the new length still fits, else the smallest that does. */
    function pickFormat(table, len, preferred) {
        const pref = table.find(f => f[0] === preferred);
        if (pref && len <= pref[1]) return pref[0];
        const fit = table.find(f => len <= f[1]);
        if (!fit) throw new MsgpackError("Value is too large for MessagePack");
        return fit[0];
    }

    /** Shortest text that reads back as exactly this float (always visibly a float). */
    function floatText(v, mp) {
        if (Number.isNaN(v)) return "NaN";
        if (v === Infinity) return "Infinity";
        if (v === -Infinity) return "-Infinity";
        let s = String(v);
        if (mp === "f32") {
            for (let p = 1; p <= 9; p++) {
                const t = Number(v.toPrecision(p));
                if (Math.fround(t) === v) { s = String(t); break; }
            }
        }
        if (Object.is(v, -0)) s = "-0";
        if (!/[.eE]/.test(s)) s += ".0";
        return s;
    }

    /** Text used as an object key when a map key isn't a string (ints, etc.). */
    function keyText(node) {
        if (node.t === "str") return node.v;
        if (node.t === "num") return node.raw;
        if (node.t === "bool") return String(node.v);
        if (node.t === "null") return "null";
        return global.SaveJson.serialize(node, global.SaveJson.PRETTY_FMT);
    }

    // ================================================================ decode

    /**
     * Decode one MessagePack value starting at `start`.
     * Returns { root, end } where `end` is the offset just past the value.
     */
    function decode(bytes, start = 0) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const strict = new TextDecoder("utf-8", { fatal: true });
        const lossy = new TextDecoder("utf-8");
        let i = start;

        const need = n => {
            if (i + n > bytes.length) throw new MsgpackError(`Unexpected end of data at offset ${i}`);
        };
        const take = n => { need(n); const s = bytes.subarray(i, i + n); i += n; return s; };
        const u8 = () => { need(1); return bytes[i++]; };
        const u16 = () => { need(2); const v = view.getUint16(i); i += 2; return v; };
        const u32 = () => { need(4); const v = view.getUint32(i); i += 4; return v; };

        const int = (v, mp) => ({ t: "num", raw: String(v), mp });
        const float = (v, mp) => ({ t: "num", raw: floatText(v, mp), mp });

        function str(len, mp) {
            const slice = take(len);
            try {
                return { t: "str", v: strict.decode(slice), mp };
            } catch (err) {
                // Not valid UTF-8: show a best-effort version, but keep the exact bytes.
                const v = lossy.decode(slice);
                return { t: "str", v, mp, mpRaw: slice.slice(), mpV: v };
            }
        }

        function array(n, mp, depth) {
            const node = { t: "arr", items: [], mp };
            for (let k = 0; k < n; k++) node.items.push(value(depth + 1));
            return node;
        }

        function map(n, mp, depth) {
            const node = { t: "obj", entries: [], mp };
            for (let k = 0; k < n; k++) {
                const key = value(depth + 1);
                const v = value(depth + 1);
                node.entries.push({ k: keyText(key), keyNode: key, v });
            }
            return node;
        }

        function ext(len, mp) {
            need(1);
            const type = view.getInt8(i++);
            return { t: "ext", type, bytes: take(len).slice(), mp };
        }

        function value(depth = 0) {
            if (depth > MAX_DEPTH) throw new MsgpackError("Data is nested too deeply");
            const at = i;
            const b = u8();
            if (b <= 0x7f) return int(b, "fixint");
            if (b <= 0x8f) return map(b & 0x0f, "fixmap", depth);
            if (b <= 0x9f) return array(b & 0x0f, "fixarray", depth);
            if (b <= 0xbf) return str(b & 0x1f, "fixstr");
            if (b >= 0xe0) return int(b - 0x100, "negfixint");
            switch (b) {
                case 0xc0: return { t: "null" };
                case 0xc2: return { t: "bool", v: false };
                case 0xc3: return { t: "bool", v: true };
                case 0xc4: return { t: "bin", bytes: take(u8()).slice(), mp: "bin8" };
                case 0xc5: return { t: "bin", bytes: take(u16()).slice(), mp: "bin16" };
                case 0xc6: return { t: "bin", bytes: take(u32()).slice(), mp: "bin32" };
                case 0xc7: return ext(u8(), "ext8");
                case 0xc8: return ext(u16(), "ext16");
                case 0xc9: return ext(u32(), "ext32");
                case 0xca: { need(4); const v = view.getFloat32(i); i += 4; return float(v, "f32"); }
                case 0xcb: { need(8); const v = view.getFloat64(i); i += 8; return float(v, "f64"); }
                case 0xcc: return int(u8(), "u8");
                case 0xcd: return int(u16(), "u16");
                case 0xce: return int(u32(), "u32");
                case 0xcf: { need(8); const v = view.getBigUint64(i); i += 8; return int(v, "u64"); }
                case 0xd0: { need(1); const v = view.getInt8(i); i += 1; return int(v, "i8"); }
                case 0xd1: { need(2); const v = view.getInt16(i); i += 2; return int(v, "i16"); }
                case 0xd2: { need(4); const v = view.getInt32(i); i += 4; return int(v, "i32"); }
                case 0xd3: { need(8); const v = view.getBigInt64(i); i += 8; return int(v, "i64"); }
                case 0xd4: return ext(1, "fixext1");
                case 0xd5: return ext(2, "fixext2");
                case 0xd6: return ext(4, "fixext4");
                case 0xd7: return ext(8, "fixext8");
                case 0xd8: return ext(16, "fixext16");
                case 0xd9: return str(u8(), "str8");
                case 0xda: return str(u16(), "str16");
                case 0xdb: return str(u32(), "str32");
                case 0xdc: return array(u16(), "array16", depth);
                case 0xdd: return array(u32(), "array32", depth);
                case 0xde: return map(u16(), "map16", depth);
                case 0xdf: return map(u32(), "map32", depth);
                default: throw new MsgpackError(`Invalid type byte 0x${b.toString(16)} at offset ${at}`);
            }
        }

        const root = value();
        return { root, end: i };
    }

    const isContainerByte = b => (b >= 0x80 && b <= 0x9f) || (b >= 0xdc && b <= 0xdf);

    /**
     * Is this whole file one MessagePack map/array? Allows a short binary
     * header before it and zero padding after it. Returns null if not.
     */
    function detect(bytes) {
        if (bytes.length < 4) return null;
        const limit = Math.min(bytes.length, 64);
        let attempts = 0;
        for (let start = 0; start < limit && attempts < 8; start++) {
            if (!isContainerByte(bytes[start])) continue;
            attempts++;
            let result;
            try { result = decode(bytes, start); } catch (err) { continue; }
            const root = result.root;
            const size = root.t === "obj" ? root.entries.length : root.items.length;
            if (!size) continue;
            const rest = bytes.subarray(result.end);
            if (rest.some(b => b !== 0)) continue;
            return { root, start, end: result.end };
        }
        return null;
    }

    // ================================================================ encode

    class Writer {
        constructor() {
            this.buf = new Uint8Array(4096);
            this.view = new DataView(this.buf.buffer);
            this.len = 0;
        }
        ensure(n) {
            if (this.len + n <= this.buf.length) return;
            let cap = this.buf.length * 2;
            while (cap < this.len + n) cap *= 2;
            const next = new Uint8Array(cap);
            next.set(this.buf.subarray(0, this.len));
            this.buf = next;
            this.view = new DataView(next.buffer);
        }
        u8(v) { this.ensure(1); this.buf[this.len++] = v & 0xff; }
        num(setter, size, v) { this.ensure(size); this.view[setter](this.len, v); this.len += size; }
        bytes(b) { this.ensure(b.length); this.buf.set(b, this.len); this.len += b.length; }
        result() { return this.buf.slice(0, this.len); }
    }

    function writeInt(w, fmt, big) {
        switch (fmt) {
            case "fixint": return w.u8(Number(big));
            case "negfixint": return w.u8(Number(big) & 0xff);
            case "u8": w.u8(0xcc); return w.u8(Number(big));
            case "u16": w.u8(0xcd); return w.num("setUint16", 2, Number(big));
            case "u32": w.u8(0xce); return w.num("setUint32", 4, Number(big));
            case "u64": w.u8(0xcf); return w.num("setBigUint64", 8, big);
            case "i8": w.u8(0xd0); return w.num("setInt8", 1, Number(big));
            case "i16": w.u8(0xd1); return w.num("setInt16", 2, Number(big));
            case "i32": w.u8(0xd2); return w.num("setInt32", 4, Number(big));
            case "i64": w.u8(0xd3); return w.num("setBigInt64", 8, big);
            default: throw new MsgpackError(`Unknown integer format ${fmt}`);
        }
    }

    const fitsInt = (fmt, big) => !!INT_RANGES[fmt] && big >= INT_RANGES[fmt][0] && big <= INT_RANGES[fmt][1];

    function writeNumber(w, node) {
        const raw = node.raw.trim();
        const mp = node.mp;
        // Floats stay floats (and keep their width), even if the user typed "5".
        if (mp === "f32" || mp === "f64" || !/^-?\d+$/.test(raw)) {
            if (mp === "f32") { w.u8(0xca); return w.num("setFloat32", 4, Number(raw)); }
            w.u8(0xcb);
            return w.num("setFloat64", 8, Number(raw));
        }
        const big = BigInt(raw);
        if (fitsInt(mp, big)) return writeInt(w, mp, big);
        const order = big < 0n ? SIGNED_ORDER : UNSIGNED_ORDER;
        const fmt = order.find(f => fitsInt(f, big));
        if (fmt) return writeInt(w, fmt, big);
        w.u8(0xcb); // beyond 64-bit: store as a float
        return w.num("setFloat64", 8, Number(raw));
    }

    function writeLength(w, kind, fmt, len) {
        const codes = {
            fixstr: 0xa0, str8: 0xd9, str16: 0xda, str32: 0xdb,
            bin8: 0xc4, bin16: 0xc5, bin32: 0xc6,
            fixarray: 0x90, array16: 0xdc, array32: 0xdd,
            fixmap: 0x80, map16: 0xde, map32: 0xdf,
            ext8: 0xc7, ext16: 0xc8, ext32: 0xc9
        };
        if (fmt.startsWith("fix")) return w.u8(codes[fmt] | len);
        w.u8(codes[fmt]);
        if (fmt.endsWith("8")) w.u8(len);
        else if (fmt.endsWith("16")) w.num("setUint16", 2, len);
        else w.num("setUint32", 4, len);
    }

    const utf8 = new TextEncoder();

    function writeString(w, node) {
        const data = node.mpRaw && node.v === node.mpV ? node.mpRaw : utf8.encode(node.v);
        writeLength(w, "str", pickFormat(STR_FMTS, data.length, node.mp), data.length);
        w.bytes(data);
    }

    function writeKey(w, entry) {
        const key = entry.keyNode;
        // Reuse the original key (keeps int keys as ints) unless it was renamed.
        if (key && keyText(key) === entry.k) return writeValue(w, key);
        return writeString(w, { t: "str", v: entry.k, mp: key && key.t === "str" ? key.mp : undefined });
    }

    function writeExt(w, node) {
        const len = node.bytes.length;
        if (FIXEXT[len] && (!node.mp || node.mp.startsWith("fixext"))) {
            w.u8(0xd4 + [1, 2, 4, 8, 16].indexOf(len));
        } else {
            writeLength(w, "ext", pickFormat(EXT_FMTS, len, node.mp), len);
        }
        w.num("setInt8", 1, node.type);
        w.bytes(node.bytes);
    }

    function writeValue(w, node) {
        switch (node.t) {
            case "null": return w.u8(0xc0);
            case "bool": return w.u8(node.v ? 0xc3 : 0xc2);
            case "num": return writeNumber(w, node);
            case "str": return writeString(w, node);
            case "bin":
                writeLength(w, "bin", pickFormat(BIN_FMTS, node.bytes.length, node.mp), node.bytes.length);
                return w.bytes(node.bytes);
            case "ext": return writeExt(w, node);
            case "arr":
                writeLength(w, "arr", pickFormat(ARR_FMTS, node.items.length, node.mp), node.items.length);
                return node.items.forEach(item => writeValue(w, item));
            case "obj":
                writeLength(w, "map", pickFormat(MAP_FMTS, node.entries.length, node.mp), node.entries.length);
                return node.entries.forEach(entry => { writeKey(w, entry); writeValue(w, entry.v); });
            default: throw new MsgpackError(`Can't encode node type ${node.t}`);
        }
    }

    function encode(root) {
        const w = new Writer();
        writeValue(w, root);
        return w.result();
    }

    // ================================================================ JSON tab -> MessagePack

    function base64ToBytes(text) {
        const bin = atob(text);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }

    /** {"$binary": "..."} / {"$ext": n, "$data": "..."} back into bin / ext nodes. */
    function specialNode(node) {
        const e = node.entries;
        try {
            if (e.length === 1 && e[0].k === "$binary" && e[0].v.t === "str") {
                return { t: "bin", bytes: base64ToBytes(e[0].v.v) };
            }
            if (e.length === 2 && e[0].k === "$ext" && e[0].v.t === "num" && e[1].k === "$data" && e[1].v.t === "str") {
                return { t: "ext", type: Number(e[0].v.raw), bytes: base64ToBytes(e[1].v.v) };
            }
        } catch (err) {
            return null; // invalid base64: leave it as a normal object
        }
        return null;
    }

    /**
     * After the JSON tab is applied, copy each value's MessagePack encoding
     * from the old tree onto the new one (matching by key / index), so
     * unchanged values are encoded exactly as before.
     */
    function adopt(next, prev) {
        if (next.t === "obj") {
            const special = specialNode(next);
            if (special) {
                if (prev && prev.t === special.t) special.mp = prev.mp;
                return special;
            }
        }
        const same = prev && prev.t === next.t;
        if (same && prev.mp) next.mp = prev.mp;
        if (same && next.t === "str" && prev.mpRaw && next.v === prev.mpV) {
            next.mpRaw = prev.mpRaw;
            next.mpV = prev.mpV;
        }
        if (next.t === "obj") {
            const before = same ? new Map(prev.entries.map(e => [e.k, e])) : new Map();
            next.entries.forEach(entry => {
                const old = before.get(entry.k);
                if (old && old.keyNode) entry.keyNode = old.keyNode;
                entry.v = adopt(entry.v, old && old.v);
            });
        } else if (next.t === "arr") {
            next.items = next.items.map((item, idx) => adopt(item, same ? prev.items[idx] : undefined));
        }
        return next;
    }

    global.SaveMsgpack = { decode, detect, encode, adopt, MsgpackError };
})(window);
