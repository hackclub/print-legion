// Print Legion — live data on top of server-rendered (cached) pages.
(() => {
  const page = document.body.dataset.live;
  const loader = document.getElementById("loader");
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const done = () => loader && loader.classList.add("is-done");
  const getJSON = async (url) => {
    const t0 = performance.now();
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    const data = await res.json();
    console.debug(`[live] ${url} in ${Math.round(performance.now() - t0)}ms`);
    return data;
  };
  const fmtKg = (grams) => (grams / 1000).toFixed(2);
  const isWide = (p) => p.w && p.h && p.w / p.h > 1.25;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- logo: hop to the next sprite every 15s ----------
  const logoCat = $(".logo-cat");
  const sprites = (logoCat?.dataset.cycle || "").split(" ").filter(Boolean);
  if (sprites.length > 1) {
    sprites.slice(1).forEach((src) => { new Image().src = src; }); // warm the cache
    let at = 0;
    setInterval(() => {
      if (document.hidden) return;
      at = (at + 1) % sprites.length;
      logoCat.src = sprites[at];
      logoCat.classList.remove("is-swapping");
      void logoCat.offsetWidth; // restart the pop animation
      logoCat.classList.add("is-swapping");
    }, 15000);
  }

  // ---------- home ----------
  const REEL_PRINTS = 14; // a multiple of 7 keeps the colour/tilt pattern seamless
  const REEL_SPEED = 40; // px per second

  // Each strip holds its prints twice and is moved by script (not CSS) so that
  // hovering can ease it to a stop and leaving eases it back up to speed.
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  const reels = [];

  function fillReel(reel, items, { direction }) {
    if (!reel || !items.length) return;
    const track = $(".reel-track", reel);
    const card = (p) => {
      const el = document.createElement("div");
      el.className = `reel-card${isWide(p) ? " is-wide" : ""}`;
      el.style.backgroundImage = `url("${p.src}")`;
      el.title = p.printer ? `printed by ${p.printer}` : "";
      return el;
    };
    // Repeat until one copy is wider than the strip, then add a second copy to loop into.
    let set = [...items];
    track.replaceChildren(...set.map(card));
    while (track.scrollWidth < reel.clientWidth && set.length < 70) {
      set = set.concat(items);
      track.replaceChildren(...set.map(card));
    }
    const width = track.scrollWidth;
    track.append(...set.map(card));

    let state = reels.find((r) => r.reel === reel);
    if (!state) {
      state = { reel, track, pos: 0, speed: REEL_SPEED, target: REEL_SPEED };
      reel.addEventListener("mouseenter", () => { state.target = 0; });
      reel.addEventListener("mouseleave", () => { state.target = REEL_SPEED; });
      reels.push(state);
    }
    Object.assign(state, { width, direction: direction() , directionFn: direction, pos: 0 });
    startReels();
  }

  let ticking = false;
  function startReels() {
    if (ticking || calm.matches) return;
    ticking = true;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      for (const r of reels) {
        r.direction = r.directionFn();
        r.speed += (r.target - r.speed) * Math.min(1, dt * 2.5); // ~1s glide to a stop / back
        r.pos += r.direction * r.speed * dt;
        if (r.pos <= -r.width) r.pos += r.width;
        if (r.pos > 0) r.pos -= r.width;
        r.track.style.transform = `translate3d(${r.pos}px, 0, 0)`;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  async function home() {
    try {
      const { stats, prints } = await getJSON(`/api/live?prints=${REEL_PRINTS}`);
      $("[data-stat=kgs]").textContent = stats.kgs.toFixed(2);
      $("[data-stat=spools]").textContent = stats.spools;
      $("[data-stat=projects]").textContent = stats.projects;
      // Desktop strip runs right-to-left. On phones the top strip runs left-to-right
      // and the second one (phones only, starting half-way through) right-to-left.
      const phone = matchMedia("(max-width: 640px)");
      fillReel($("#reel"), prints.items, { direction: () => (phone.matches ? 1 : -1) });
      const half = Math.ceil(prints.items.length / 2);
      const rotated = [...prints.items.slice(half), ...prints.items.slice(0, half)];
      const fillSecond = () => { if (phone.matches) fillReel($("#reel-2"), rotated, { direction: () => -1 }); };
      fillSecond();
      phone.addEventListener("change", () => { fillSecond(); fillReel($("#reel"), prints.items, { direction: () => (phone.matches ? 1 : -1) }); });
    } catch (e) {
      console.warn(e);
    } finally {
      done();
    }
  }

  // ---------- printers ----------
  function dropdown(root, onPick) {
    const button = $(".dropdown-button", root);
    const menu = $(".dropdown-menu", root);
    const options = () => $$("[role=option]", menu);
    let focus = -1;
    const setFocus = (i) => {
      const opts = options();
      focus = (i + opts.length) % opts.length;
      opts.forEach((o, j) => o.classList.toggle("is-focus", j === focus));
      opts[focus].scrollIntoView({ block: "nearest" });
    };
    const open = () => {
      root.classList.add("is-open"); menu.hidden = false; button.setAttribute("aria-expanded", "true");
      setFocus(Math.max(0, options().findIndex((o) => o.getAttribute("aria-selected") === "true")));
    };
    const close = () => { root.classList.remove("is-open"); menu.hidden = true; button.setAttribute("aria-expanded", "false"); };
    const pick = (opt, silent) => {
      options().forEach((o) => o.setAttribute("aria-selected", String(o === opt)));
      $(".dropdown-value", root).textContent = opt.textContent.trim();
      close();
      if (!silent) onPick(opt.dataset.value);
    };
    button.addEventListener("click", () => (menu.hidden ? open() : close()));
    menu.addEventListener("click", (e) => { const o = e.target.closest("[role=option]"); if (o) { pick(o); button.focus(); } });
    root.addEventListener("keydown", (e) => {
      if (menu.hidden) { if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); open(); } return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setFocus(focus + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFocus(focus - 1); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(options()[focus]); button.focus(); }
      else if (e.key === "Escape" || e.key === "Tab") close();
    });
    document.addEventListener("click", (e) => { if (!root.contains(e.target)) close(); });
    return { select: (value) => { const o = options().find((x) => x.dataset.value === value); if (o) pick(o, true); } };
  }

  async function printers() {
    const grid = $("#printer-grid");
    const cards = $$(".printer-card", grid);
    const params = new URLSearchParams(location.search);
    const state = {
      place: params.get("place") || "",
      sort: params.get("sort") || "count",
      reversed: params.get("dir") === "rev",
      q: params.get("q") || "",
    };
    const stats = new Map();

    const render = () => {
      const q = state.q.trim().toLowerCase();
      const visible = cards.filter((c) => {
        const show = (!state.place || c.dataset.country === state.place) && (!q || c.dataset.search.includes(q));
        c.classList.toggle("is-hidden", !show);
        return show;
      });
      const val = (c) => stats.get(c.dataset.id) || { prints: 0, grams: 0 };
      const byName = (a, b) => a.dataset.name.localeCompare(b.dataset.name);
      const cmp = {
        count: (a, b) => val(b).prints - val(a).prints || val(b).grams - val(a).grams || byName(a, b),
        weight: (a, b) => val(b).grams - val(a).grams || val(b).prints - val(a).prints || byName(a, b),
        alpha: byName,
      }[state.sort];
      const sorted = [...cards].sort(cmp);
      if (state.reversed) sorted.reverse();
      grid.append(...sorted);
      $("#printer-empty").hidden = visible.length > 0;

      const url = new URLSearchParams();
      if (state.place) url.set("place", state.place);
      if (state.sort !== "count") url.set("sort", state.sort);
      if (state.reversed) url.set("dir", "rev");
      if (q) url.set("q", state.q);
      history.replaceState(null, "", url.size ? `?${url}` : location.pathname);
    };

    const place = dropdown($("[data-dropdown=place]"), (v) => { state.place = v; render(); });
    const sort = dropdown($("[data-dropdown=sort]"), (v) => { state.sort = v; render(); });
    place.select(state.place);
    sort.select(state.sort);

    const flip = $(".sort-flip");
    flip.setAttribute("aria-pressed", String(state.reversed));
    flip.addEventListener("click", () => { state.reversed = !state.reversed; flip.setAttribute("aria-pressed", String(state.reversed)); render(); });

    const input = $("#printer-search");
    const clear = $(".search-clear");
    input.value = state.q;
    clear.hidden = !state.q;
    input.addEventListener("input", () => { state.q = input.value; clear.hidden = !input.value; render(); });
    clear.addEventListener("click", () => { input.value = ""; input.dispatchEvent(new Event("input")); input.focus(); });

    render(); // usable (filter/search) even before numbers arrive

    try {
      const { stats: live } = await getJSON("/api/live");
      Object.entries(live.printers).forEach(([id, s]) => stats.set(id, s));
      // Rank by prints shipped (ties broken by weight), as in the design.
      const ranked = [...stats.entries()].filter(([, s]) => s.prints > 0)
        .sort(([, a], [, b]) => b.prints - a.prints || b.grams - a.grams);
      const rank = new Map(ranked.map(([id], i) => [id, i + 1]));
      cards.forEach((c) => {
        const s = stats.get(c.dataset.id) || { prints: 0, grams: 0 };
        $("[data-prints]", c).textContent = s.prints;
        $("[data-kgs]", c).textContent = fmtKg(s.grams);
        const r = rank.get(c.dataset.id);
        const badge = $(".rank-badge", c);
        badge.hidden = !r;
        if (r) badge.textContent = `#${r}`;
        $(".medal", c).textContent = ["🥇", "🥈", "🥉"][r - 1] || "";
      });
      render();
    } catch (e) {
      console.warn(e);
    } finally {
      done();
    }
  }

  // ---------- prints ----------
  // No photo (or the photo fails to load): one of three "no image for print!"
  // cards. Picked from the print's ID, so a print keeps the same one each visit.
  const placeholders = ($("#print-grid")?.dataset.placeholders || "").split(" ").filter(Boolean);
  const placeholderFor = (id) => {
    let h = 0;
    for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return placeholders[h % placeholders.length];
  };

  function printCard(p) {
    const el = document.createElement("article");
    el.className = `print-card${isWide(p) ? " is-wide" : ""}`;
    // Inactive or unknown printers are anonymous: no name, no picture.
    const avatar = !p.printer ? "" : p.avatar
      ? `<img class="chip-avatar" src="${esc(p.avatar)}" alt="" loading="lazy">`
      : `<span class="chip-avatar"></span>`;
    const event = p.event ? `<div class="print-caption print-event"><span>for</span><span class="chip chip-cyan"><span>${esc(p.event)}</span></span></div>` : "";
    el.innerHTML = `
      <div class="print-photo">
        <img src="${esc(p.src || placeholderFor(p.id))}" alt="${p.src ? `3D print${p.printer ? ` by ${esc(p.printer)}` : ""}` : "no image for this print"}" loading="lazy" decoding="async" draggable="false">
      </div>
      <div class="print-caption"><span>printed by</span>
        <span class="chip">${avatar}<span>${esc(p.printer || "a legionnaire")}</span></span>
      </div>${event}`;
    const img = $("img", el);
    const show = () => img.classList.add("is-loaded");
    const usePlaceholder = () => { img.src = placeholderFor(p.id); img.alt = "no image for this print"; el.classList.add("is-placeholder"); };
    if (!p.src) el.classList.add("is-placeholder");
    img.complete ? show() : img.addEventListener("load", show, { once: true });
    img.addEventListener("error", () => { if (!el.classList.contains("is-placeholder")) usePlaceholder(); else show(); });
    return el;
  }

  async function prints() {
    const grid = $("#print-grid");
    const end = $("#feed-end");
    let next = null;
    let busy = false;

    const load = async (first) => {
      if (busy) return;
      busy = true;
      const skeletons = Array.from({ length: first ? 10 : 5 }, () => {
        const s = document.createElement("article");
        s.className = "print-card is-skeleton";
        s.innerHTML = `<div class="print-photo"></div><div class="print-caption"><span>printed by</span><span class="chip"></span></div>`;
        return s;
      });
      if (!first) grid.append(...skeletons);
      try {
        const data = await getJSON(`/api/prints?limit=20${next ? `&offset=${encodeURIComponent(next)}` : ""}`);
        skeletons.forEach((s) => s.remove());
        grid.append(...data.items.map(printCard));
        next = data.next;
        if (!next) observer.disconnect();
      } catch (e) {
        console.warn(e);
        skeletons.forEach((s) => s.remove());
      } finally {
        busy = false;
        if (first) done();
      }
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && next) load(false);
    }, { rootMargin: "600px 0px" });

    await load(true);
    if (next) observer.observe(end);
  }

  ({ home, printers, prints }[page] || done)();
})();
