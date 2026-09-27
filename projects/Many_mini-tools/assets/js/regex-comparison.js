// RegEx Comparison (REC)
// A small regular-expression matcher supporting:
//   .   any single character
//   *   zero or more of the preceding character (or ".")
//   \   escape, so "\." and "\*" match a literal "." or "*"
// The pattern must match the WHOLE string (like /^pattern$/).
// On a failed match it still reports how far the pattern got and where it broke.

const REC_STRING_INPUT = document.getElementById("REC-input-string");
const REC_PATTERN_INPUT = document.getElementById("REC-input-pattern");
const REC_RESULT = document.getElementById("REC-text-result");
const REC_REASON = document.getElementById("REC-text-reason");
const REC_BREAKDOWN = document.getElementById("REC-breakdown");
const REC_DETAILS = document.getElementById("REC-details");
const REC_DETAILS_SUMMARY = document.getElementById("REC-details-summary");

// Split a pattern into tokens: { text, char (null = any), star, pos }.
// Returns { tokens } or { error } for a malformed pattern.
function REC_tokenize(pattern) {
    const tokens = [];
    for (let i = 0; i < pattern.length; i++) {
        const ch = pattern[i];

        if (ch === "*") {
            const prev = tokens[tokens.length - 1];
            if (!prev || prev.star)
                return { error: `"*" at position ${i + 1} has nothing to repeat.` };
            prev.star = true;
            prev.text += "*";
        }
        else if (ch === "\\") {
            if (i === pattern.length - 1)
                return { error: `The pattern ends with "\\", which has nothing to escape.` };
            tokens.push({ text: "\\" + pattern[i + 1], char: pattern[i + 1], star: false, pos: i });
            i++;
        }
        else {
            tokens.push({ text: ch, char: ch === "." ? null : ch, star: false, pos: i });
        }
    }
    return { tokens };
}

// Does token `tok` accept the single character `ch`?
function REC_accepts(tok, ch) {
    return ch !== undefined && (tok.char === null || tok.char === ch);
}

// Dynamic programming over prefixes:
// dp[i][j] = true if the first i characters of the string are matched by the first j tokens.
// Working on prefixes (rather than suffixes) lets a failed match report how far it got.
function REC_buildTable(string, tokens) {
    const n = string.length, m = tokens.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(false));
    dp[0][0] = true; // empty string matches empty pattern

    for (let j = 1; j <= m; j++) {
        const tok = tokens[j - 1];
        for (let i = 0; i <= n; i++) {
            const last = i > 0 && REC_accepts(tok, string[i - 1]);
            dp[i][j] = tok.star
                ? dp[i][j - 1] || (last && dp[i - 1][j])  // token matches nothing, or eats one more char
                : last && dp[i - 1][j - 1];                // token eats exactly one char
        }
    }
    return dp;
}

// Walk back from cell (i, j) to recover what each of the first j tokens matched.
// Starred tokens stop as early as possible on the way back, so earlier stars take
// as much as they can (the usual "greedy" reading).
function REC_trace(string, tokens, dp, i, j) {
    const parts = [];
    for (; j > 0; j--) {
        const tok = tokens[j - 1];
        const end = i;
        if (tok.star) {
            while (!dp[i][j - 1]) i--;
        } else {
            i--;
        }
        parts.unshift({ token: tok.text, matched: string.slice(i, end) });
    }
    return parts;
}

// The furthest point a failed match reached: most tokens used, then most characters.
// dp[0][0] is always true, so this always finds a cell.
function REC_furthestReach(dp, n, m) {
    for (let j = m; j >= 0; j--)
        for (let i = n; i >= 0; i--)
            if (dp[i][j]) return { i, j };
}

// Returns:
//   { error }
//   { matched: true, parts }
//   { matched: false, parts, failure }  where failure is
//       { kind: "mismatch", token, index, found }  a token could not match the next char
//       { kind: "leftover", index, rest }          the pattern ran out before the string
function REC_match(string, pattern) {
    const { tokens, error } = REC_tokenize(pattern);
    if (error) return { error };

    const n = string.length, m = tokens.length;
    const dp = REC_buildTable(string, tokens);
    if (dp[n][m]) return { matched: true, parts: REC_trace(string, tokens, dp, n, m) };

    const { i, j } = REC_furthestReach(dp, n, m);
    const parts = REC_trace(string, tokens, dp, i, j);
    // tokens[j] is never starred here: a star could match empty and reach further.
    const failure = j === m
        ? { kind: "leftover", index: i, rest: string.slice(i) }
        : { kind: "mismatch", token: tokens[j], index: i, found: string[i] };
    return { matched: false, parts, failure };
}

// Plain-language explanation of where a failed match broke
function REC_describeFailure(failure) {
    if (failure.kind === "leftover")
        return `The whole pattern was used, but "${failure.rest}" is left over at the end of the string (from character ${failure.index + 1}).`;

    const { token, index, found } = failure;
    const expected = token.char === null ? "any character" : `"${token.char}"`;
    const actual = found === undefined
        ? "the string had already ended"
        : `found "${found}" (string character ${index + 1})`;
    return `Stopped at "${token.text}" (pattern character ${token.pos + 1}): expected ${expected}, but ${actual}.`;
}

// Build one "token → text" row. Text goes in via textContent so input is never parsed as HTML.
function REC_row(tokenText, matchedText, failed = false) {
    const row = document.createElement("li");
    const tokenEl = document.createElement("code");
    tokenEl.textContent = tokenText;
    const matchedEl = document.createElement("code");
    matchedEl.textContent = matchedText === "" ? "(empty)" : matchedText;
    if (matchedText === "") matchedEl.classList.add("REC-empty");
    if (failed) row.classList.add("REC-fail");
    row.append(tokenEl, failed ? " ✘ " : " → ", matchedEl);
    return row;
}

// Render the breakdown list: matched pieces, plus a highlighted row for where it broke.
function REC_renderBreakdown(parts, failure = null) {
    REC_BREAKDOWN.replaceChildren(...parts.map(p => REC_row(p.token, p.matched)));

    if (failure?.kind === "mismatch")
        REC_BREAKDOWN.appendChild(REC_row(failure.token.text, failure.found ?? "(end of string)", true));
    else if (failure?.kind === "leftover")
        REC_BREAKDOWN.appendChild(REC_row("(end of pattern)", failure.rest, true));

    // Collapsed by default: only the result message shows until the user expands it
    const count = `${parts.length} piece${parts.length === 1 ? "" : "s"}`;
    REC_DETAILS_SUMMARY.textContent = failure
        ? `Breakdown up to the mismatch (${count} matched)`
        : `Breakdown (${count})`;
    REC_DETAILS.open = false;
    // Nothing matched: the reason line already says it all
    REC_DETAILS.hidden = parts.length === 0;
}

function REC_submit() {
    const result = REC_match(REC_STRING_INPUT.value, REC_PATTERN_INPUT.value);

    REC_RESULT.classList.remove("REC-yes", "REC-no");
    REC_REASON.textContent = "";
    if (result.error) {
        REC_RESULT.textContent = `Invalid pattern: ${result.error}`;
        REC_renderBreakdown([]);
    } else if (result.matched) {
        REC_RESULT.textContent = "✔ Match: the pattern matches the whole string.";
        REC_RESULT.classList.add("REC-yes");
        REC_renderBreakdown(result.parts);
    } else {
        REC_RESULT.textContent = "✘ No match: the pattern does not match the whole string.";
        REC_RESULT.classList.add("REC-no");
        REC_REASON.textContent = REC_describeFailure(result.failure);
        REC_renderBreakdown(result.parts, result.failure);
    }
    REFIT_CONTENT("REC-body");
}

document.getElementById("REC-button-submit").onclick = REC_submit;

// Enter in either field submits
[REC_STRING_INPUT, REC_PATTERN_INPUT].forEach(input =>
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") REC_submit();
    })
);

// Expanding/collapsing the breakdown changes the panel's height
REC_DETAILS.addEventListener("toggle", () => REFIT_CONTENT("REC-body"));

window.addEventListener("resize", () => REFIT_CONTENT("REC-body"));
