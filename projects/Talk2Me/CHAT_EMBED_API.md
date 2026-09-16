# Talk2Me embed API (parent ⇄ chat app)

The portfolio page embeds the chat app from `website4u.vn` in an iframe. Mobile
keyboards break across that boundary because **neither side can see the whole
picture**:

| Side | Blind spot |
| --- | --- |
| Portfolio page (parent) | Can't detect focus inside a cross-origin iframe, so it can't tell when the keyboard is opening. |
| Chat app (child) | Can't measure the keyboard. CSS viewport units (`100dvh`, `100vh`) inside an iframe resolve to the **iframe's** box, not the browser viewport — which is why the app self-sizes correctly standalone but not when embedded. |

So each side posts the other what it alone can see.

The parent half is implemented in `assets/js/Talk2Me.js`. **The listener below
still needs adding to the `website4u.vn` codebase** — until then the parent's
messages are simply ignored and behaviour is unchanged.

## Messages

### Child → parent

| `type` | When | Purpose |
| --- | --- | --- |
| `talk2me:ready` | Once, after the chat UI mounts | The iframe is `loading="lazy"`, so the parent waits to be announced to rather than guessing. Triggers an immediate viewport reply. |
| `talk2me:input-focus` | Message input gains focus | Parent reveals the frame with a native `scrollIntoView`. |
| `talk2me:input-blur` | Message input loses focus | Parent restores the frame's normal height. |

### Parent → child

`talk2me:viewport`, sent on `visualViewport` resize/scroll, orientation change,
iframe load, and in reply to `talk2me:ready`:

```js
{
  type: "talk2me:viewport",
  frameHeight:   Number, // full iframe height in px
  visibleHeight: Number, // px of the iframe actually on screen (keyboard excluded)
  keyboardInset: Number  // px of viewport the keyboard is covering; 0 when closed
}
```

## Child-side implementation

```js
const PARENT_ORIGINS = ["https://vuila9.github.io"];
const embedded = window.parent !== window;

function postToParent(message) {
  if (!embedded) return;
  // Target each origin explicitly rather than "*".
  PARENT_ORIGINS.forEach((origin) => window.parent.postMessage(message, origin));
}

// --- Tell the parent what it can't see: our input's focus state ---
const input = document.querySelector("#message-input"); // <- your selector
input.addEventListener("focus", () => postToParent({ type: "talk2me:input-focus" }));
input.addEventListener("blur",  () => postToParent({ type: "talk2me:input-blur"  }));

// --- Listen for what we can't see: the real visible geometry ---
window.addEventListener("message", (e) => {
  if (!PARENT_ORIGINS.includes(e.origin)) return;
  const data = e.data;
  if (!data || data.type !== "talk2me:viewport") return;

  // Constrain the app to the part of the iframe that's actually on screen, so
  // the composer sits above the keyboard instead of behind it.
  document.documentElement.style.setProperty(
    "--chat-visible-height",
    data.visibleHeight + "px"
  );
});

// Announce once the UI is mounted.
postToParent({ type: "talk2me:ready" });
```

Then have the app's root container height follow that variable, falling back to
the current behaviour when standalone (where the variable is never set):

```css
.chat-root {
    height: var(--chat-visible-height, 100dvh);
}
```

## Security notes

- Both sides check `event.origin` against an allowlist and pass an explicit
  target origin to `postMessage` — never `"*"`. The payload describes the
  visitor's screen geometry and shouldn't leak to an arbitrary framer.
- This is independent of the existing framing allowlist on `website4u.vn`; that
  still governs whether the app renders in an iframe at all.

## Why not `position: fixed` on the parent side

An earlier attempt pinned the frame with `position: fixed` while the keyboard
was open. On iOS Safari this desynchronises hit-testing — the chat renders in
the right place but taps stop landing on it, so the input can't be focused at
all. The parent now only ever changes the frame's `height`, and relies on
native scrolling to reveal it.
