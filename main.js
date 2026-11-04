// Projects come from projects.json. Each one: { title, url, year, description, image? }
// "image" is filled in by the GitHub Action / `npm run shoot`. Without it, a free
// screenshot service (Microlink) is used at page load, and if that fails
// the domain name is shown instead.

const SHOT_W = 1280;
const SHOT_H = 800;
const microlink = (url) =>
  `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=${SHOT_W}&viewport.height=${SHOT_H}`;

const $ = (id) => document.getElementById(id);
const canHover = window.matchMedia("(hover: hover) and (min-width: 720px)");

function domainOf(url) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "")).toLowerCase();
  } catch {
    return url;
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Fill a .screen element with the project's homepage thumbnail.
function renderThumb(screen, project) {
  const img = el("img");
  img.alt = "";
  img.decoding = "async";
  screen.append(img);

  const sources = [...(project.image ? [project.image] : []), microlink(project.url)];
  let i = 0;
  let timer = null;

  const fallback = () => {
    clearTimeout(timer);
    if (screen.querySelector(".screen-fallback")) return;
    img.onload = img.onerror = null;
    img.remove();
    screen.append(el("span", "screen-fallback", domainOf(project.url)));
  };
  const next = () => {
    clearTimeout(timer);
    if (i >= sources.length) return fallback();
    const src = sources[i++];
    // Only the remote screenshot service can hang; give it 10 seconds.
    if (/^https?:/.test(src)) timer = setTimeout(next, 10000);
    img.src = src;
  };

  img.onerror = next;
  img.onload = () => {
    // A real remote screenshot is 16:10. Anything else is an error image.
    const ratio = img.naturalWidth / img.naturalHeight;
    const remote = /^https?:/.test(img.getAttribute("src"));
    if (remote && Math.abs(ratio - SHOT_W / SHOT_H) > 0.05) return next();
    clearTimeout(timer);
    img.classList.add("ready");
  };
  next();
}

function buildCard(project) {
  const year = String(project.year ?? "");
  const domain = domainOf(project.url);

  const li = el("li", "slot");
  const a = el("a", "card");
  a.href = project.url;
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", `${project.title}, ${domain} (opens in a new tab)`);

  const windowEl = el("span", "window");
  const screen = el("span", "screen");
  windowEl.append(screen);
  renderThumb(screen, project);

  a.append(
    el("span", "corner", year),
    windowEl,
    el("span", "card-title", project.title),
    el("span", "card-domain", domain),
    el("span", "corner corner-end", year)
  );
  a.querySelectorAll(".corner").forEach((c) => c.setAttribute("aria-hidden", "true"));

  li.append(a, el("p", "slot-desc", project.description || ""));
  return li;
}

// Small deterministic jitter so the pile looks hand-stacked, not random each load.
const jitter = (i) => {
  const x = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5; // -0.5 .. 0.5
};

function layout(deck, slots) {
  const n = slots.length;
  const cw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cw")) || 248;
  const room = Math.max(0, Math.min(deck.parentElement.clientWidth, 1100) - cw - 48);
  const fanWidth = n > 1 ? Math.min(170 * (n - 1), room) : 0;
  const spread = n > 1 ? Math.min(11 * (n - 1), 60) : 0;

  // Only the area the fanned cards cover triggers the fan.
  deck.style.setProperty("--deck-w", `${fanWidth + cw + 48}px`);

  slots.forEach((slot, i) => {
    const t = n > 1 ? i / (n - 1) - 0.5 : 0; // -0.5 .. 0.5, left to right
    slot.style.setProperty("--sr", i === 0 ? "-1.5deg" : `${jitter(i) * 7}deg`);
    slot.style.setProperty("--sx", `${i === 0 ? 0 : jitter(i + 7) * 12}px`);
    slot.style.setProperty("--sy", `${i * 1.5}px`);
    slot.style.setProperty("--fr", `${t * spread}deg`);
    slot.style.setProperty("--fx", `${t * fanWidth}px`);
    slot.style.setProperty("--fy", `${(2 * t) ** 2 * 22}px`);
    slot.style.setProperty("--z", n - i); // pile: first site on top
    slot.style.setProperty("--fz", i + 1); // fan: each card over its left neighbour
  });
}

function build(projects) {
  const deck = $("deck");
  const slots = projects.map(buildCard);
  deck.append(...slots);

  const idle = `${projects.length} ${projects.length === 1 ? "site" : "sites"}. Point at the deck to spread it out, click a card to visit.`;
  $("caption-idle").textContent = idle;

  const show = (project) => {
    $("caption-title").textContent = project.title;
    $("caption-domain").textContent = domainOf(project.url);
    $("caption-desc").textContent = project.description || "";
    $("caption-idle").hidden = true;
    $("caption-card").hidden = false;
  };
  const reset = () => {
    $("caption-idle").hidden = false;
    $("caption-card").hidden = true;
  };

  slots.forEach((slot, i) => {
    slot.addEventListener("mouseenter", () => show(projects[i]));
    slot.addEventListener("focusin", () => show(projects[i]));
  });
  deck.addEventListener("mouseleave", () => { if (!deck.contains(document.activeElement)) reset(); });
  deck.addEventListener("focusout", (e) => { if (!deck.contains(e.relatedTarget)) reset(); });

  // Arrow keys move between cards.
  deck.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const cards = [...deck.querySelectorAll(".card")];
    const at = cards.indexOf(document.activeElement);
    if (at < 0) return;
    e.preventDefault();
    cards[Math.max(0, Math.min(cards.length - 1, at + (e.key === "ArrowRight" ? 1 : -1)))].focus();
  });

  const relayout = () => layout(deck, slots);
  relayout();
  window.addEventListener("resize", relayout);
  canHover.addEventListener("change", relayout);
}

fetch("projects.json", { cache: "no-cache" })
  .then((r) => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  })
  .then((projects) => {
    if (!Array.isArray(projects) || projects.length === 0) {
      $("caption-idle").textContent = "No sites yet.";
      return;
    }
    build(projects);
  })
  .catch(() => {
    $("caption-idle").textContent =
      "Couldn't load projects.json. Open the page through a local server (npm run dev) instead of double-clicking index.html.";
  });
