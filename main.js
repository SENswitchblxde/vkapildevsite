// Projects come from projects.json. Each one: { title, url, year, description, image? }
// "image" is filled in by `npm run add` / `npm run shoot`. Without it, a free
// screenshot service (Microlink) is used at page load, and if that fails
// the domain name is shown instead.

const SHOT_W = 1280;
const SHOT_H = 800;

const remoteProviders = [
  (url) =>
    `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=${SHOT_W}&viewport.height=${SHOT_H}`,
];

const $ = (id) => document.getElementById(id);
const wide = window.matchMedia("(min-width: 900px)");
const resolved = new Map(); // url -> working image src (or null if none)

function domainOf(url) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "")).toLowerCase();
  } catch {
    return url;
  }
}

function fallback(screen, project) {
  screen.querySelector("img")?.remove();
  if (screen.querySelector(".screen-fallback")) return;
  const div = document.createElement("div");
  div.className = "screen-fallback";
  div.textContent = domainOf(project.url);
  screen.append(div);
}

// Fill a .screen element with the project's homepage thumbnail.
function renderThumb(screen, project, { lazy = false } = {}) {
  screen.replaceChildren();
  const img = document.createElement("img");
  img.alt = `Homepage of ${project.title}`;
  img.decoding = "async";
  if (lazy) img.loading = "lazy";
  screen.append(img);

  const known = resolved.get(project.url);
  if (known === null) return fallback(screen, project);

  const sources = known
    ? [known]
    : [...(project.image ? [project.image] : []), ...remoteProviders.map((p) => p(project.url))];

  let i = 0;

  const tryNext = () => {
    if (i >= sources.length) {
      resolved.set(project.url, null);
      return fallback(screen, project);
    }
    img.src = sources[i++];
  };

  img.onerror = tryNext;
  img.onload = () => {
    // A real remote screenshot has our 16:10 ratio. Anything else is an
    // error or placeholder image from the service, so move on.
    const ratio = img.naturalWidth / img.naturalHeight;
    const isRemote = /^https?:/.test(img.getAttribute("src"));
    if (isRemote && Math.abs(ratio - SHOT_W / SHOT_H) > 0.05) return tryNext();
    resolved.set(project.url, img.src);
    img.classList.add("ready");
  };

  tryNext();
}

function select(project, button) {
  document.querySelectorAll(".row[aria-pressed]").forEach((b) => b.setAttribute("aria-pressed", "false"));
  button.setAttribute("aria-pressed", "true");

  const link = $("viewer-link");
  link.href = project.url;
  link.textContent = project.title;
  $("viewer-domain").textContent = domainOf(project.url);
  $("viewer-desc").textContent = project.description || "";
  renderThumb($("viewer-screen"), project);
}

function build(projects) {
  const list = $("list");
  let current = null;

  projects.forEach((project, index) => {
    const li = document.createElement("li");

    const row = document.createElement("button");
    row.className = "row";
    row.type = "button";
    row.setAttribute("aria-pressed", "false");
    row.innerHTML = `<span class="year"></span><span class="title"></span><span class="domain"></span>`;
    row.querySelector(".year").textContent = project.year ?? "";
    row.querySelector(".title").textContent = project.title;
    row.querySelector(".domain").textContent = domainOf(project.url);

    const choose = () => {
      if (!wide.matches || current === index) return;
      current = index;
      select(project, row);
    };
    row.addEventListener("mouseenter", choose);
    row.addEventListener("focus", choose);
    row.addEventListener("click", () => {
      if (wide.matches) choose();
      else window.open(project.url, "_blank", "noopener");
    });
    row.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const rows = [...list.querySelectorAll(".row")];
      rows[Math.max(0, Math.min(rows.length - 1, index + (e.key === "ArrowDown" ? 1 : -1)))].focus();
    });

    // Inline version for small screens
    const detail = document.createElement("div");
    detail.className = "detail";
    detail.innerHTML = `
      <div class="frame"><div class="frame-bar"></div><div class="screen"></div></div>
      <p></p>
      <a target="_blank" rel="noopener"></a>`;
    detail.querySelector(".frame-bar").textContent = domainOf(project.url);
    detail.querySelector("p").textContent = project.description || "";
    const a = detail.querySelector("a");
    a.href = project.url;
    a.textContent = `Open ${domainOf(project.url)}`;

    li.append(row, detail);
    list.append(li);
  });

  // Only load the thumbnails the current layout shows.
  let mobileLoaded = false;
  const layout = () => {
    const rows = list.querySelectorAll(".row");
    if (wide.matches) {
      if (current === null && rows[0]) { current = 0; select(projects[0], rows[0]); }
    } else if (!mobileLoaded) {
      mobileLoaded = true;
      list.querySelectorAll(".detail .screen").forEach((s, i) => renderThumb(s, projects[i], { lazy: true }));
    }
  };
  wide.addEventListener("change", layout);
  layout();
}

function status(text) {
  const el = $("status");
  el.textContent = text;
  el.hidden = false;
  $("viewer").hidden = true;
}

fetch("projects.json", { cache: "no-cache" })
  .then((r) => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  })
  .then((projects) => {
    if (!Array.isArray(projects) || projects.length === 0) {
      return status("No sites yet. Add one with npm run add.");
    }
    build(projects);
  })
  .catch(() =>
    status("Couldn't load projects.json. Open the page through a local server (npm run dev) instead of double-clicking index.html.")
  );
