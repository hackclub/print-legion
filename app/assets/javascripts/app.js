// Print Legion — live data on top of server-rendered (cached) pages.
(() => {
  const page = document.body.dataset.live;
  const loader = document.getElementById("loader");
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const done = () => {
    if (!loader) return;
    loader.classList.remove("is-loading");
    loader.classList.add("is-done");
    try { sessionStorage.removeItem("pl-loading"); } catch (_) {}
  };
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

  // Show the loader the moment a nav link is clicked, so the wait happens under it
  // rather than on a blank page while the next page is being rendered.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || !loader || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    if (url.pathname.startsWith("/docs")) return; // docs are static, no loader on the way in
    try { sessionStorage.setItem("pl-loading", "1"); } catch (_) {}
    loader.classList.add("is-loading");
  });
  window.addEventListener("pageshow", (e) => { if (e.persisted && loader) loader.classList.remove("is-loading"); });

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
      $("[data-stat=countries]").textContent = stats.countries;
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

  // "today", "yesterday", "12 days ago", counted in calendar days in the viewer's timezone.
  const daysAgo = (iso) => {
    const then = new Date(iso);
    if (isNaN(then)) return null;
    const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const days = Math.max(0, Math.round((midnight(new Date()) - midnight(then)) / 86400000));
    return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  };

  function printCard(p) {
    const el = document.createElement("article");
    el.className = `print-card${isWide(p) ? " is-wide" : ""}`;
    // Inactive or unknown printers are anonymous: no name, no picture.
    const avatar = !p.printer ? "" : p.avatar
      ? `<img class="chip-avatar" src="${esc(p.avatar)}" alt="" loading="lazy">`
      : `<span class="chip-avatar"></span>`;
    const ago = p.created && daysAgo(p.created);
    const when = ago ? `<time class="print-when" datetime="${esc(p.created)}" title="${esc(new Date(p.created).toLocaleDateString())}">${ago}</time>` : "";
    const event = p.event ? `<div class="print-caption print-event"><span>for</span><span class="chip chip-cyan"><span>${esc(p.event)}</span></span></div>` : "";
    el.innerHTML = `
      <div class="print-photo">${when}
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
        // The end marker can still be on screen once this page lands. Re-observing
        // makes the observer report its current state, so the feed keeps going.
        if (next) { observer.unobserve(end); observer.observe(end); }
      }
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && next) load(false);
    }, { rootMargin: "600px 0px" });

    await load(true);
    if (next) observer.observe(end);
  }

  // ---------- dashboard: search, filter and sort the printer's own prints ----------
  function printFilters() {
    const list = $("#dash-prints");
    if (!list) return;
    const rows = $$(".dash-print", list);
    const params = new URLSearchParams(location.search);
    const state = {
      status: params.get("status") || "",
      event: params.get("event") || "",
      sort: params.get("sort") || "date",
      reversed: params.get("dir") === "rev",
      q: params.get("q") || "",
    };
    const num = (r, k) => Number(r.dataset[k]) || 0;
    const render = () => {
      const q = state.q.trim().toLowerCase();
      let shown = 0;
      rows.forEach((r) => {
        const show = (!state.status || r.dataset.status === state.status) &&
          (!state.event || r.dataset.event === state.event) && (!q || r.dataset.search.includes(q));
        r.hidden = !show;
        if (show) shown++;
      });
      const key = { date: "date", weight: "grams", shipping: "shipping" }[state.sort];
      const sorted = [...rows].sort((a, b) => num(b, key) - num(a, key) || num(b, "date") - num(a, "date"));
      if (state.reversed) sorted.reverse();
      list.append(...sorted);
      $("#dash-prints-empty").hidden = shown > 0;

      const url = new URLSearchParams();
      if (state.status) url.set("status", state.status);
      if (state.event) url.set("event", state.event);
      if (state.sort !== "date") url.set("sort", state.sort);
      if (state.reversed) url.set("dir", "rev");
      if (q) url.set("q", state.q);
      history.replaceState(null, "", url.size ? `?${url}` : location.pathname);
    };
    const status = dropdown($("[data-dropdown=status]"), (v) => { state.status = v; render(); });
    const event = dropdown($("[data-dropdown=event]"), (v) => { state.event = v; render(); });
    const sort = dropdown($("[data-dropdown=psort]"), (v) => { state.sort = v; render(); });
    status.select(state.status);
    event.select(state.event);
    sort.select(state.sort);

    const flip = $(".dash-controls .sort-flip");
    flip.setAttribute("aria-pressed", String(state.reversed));
    flip.addEventListener("click", () => { state.reversed = !state.reversed; flip.setAttribute("aria-pressed", String(state.reversed)); render(); });

    const input = $("#print-search");
    const clear = $(".dash-controls .search-clear");
    input.value = state.q;
    clear.hidden = !state.q;
    input.addEventListener("input", () => { state.q = input.value; clear.hidden = !input.value; render(); });
    clear.addEventListener("click", () => { input.value = ""; input.dispatchEvent(new Event("input")); input.focus(); });
    render();
  }

  // ---------- dashboard: filter grants by purpose ----------
  function grantFilter() {
    const list = $("#dash-grants");
    const root = $("[data-dropdown=purpose]");
    if (!list || !root) return;
    const rows = $$(".dash-grant", list);
    let purpose = new URLSearchParams(location.search).get("purpose") || "";
    const render = () => {
      rows.forEach((r) => { r.hidden = !!purpose && r.dataset.purpose !== purpose; });
      history.replaceState(null, "", purpose ? `?${new URLSearchParams({ purpose })}` : location.pathname);
    };
    dropdown(root, (v) => { purpose = v; render(); }).select(purpose);
    render();
  }

  // ---------- dashboard: the sent-print form ----------
  function sendForm() {
    const form = $("[data-send-form]");
    if (!form) return;

    // Recipient preview: Slack display name + avatar once the ID looks right.
    const input = $("[data-recipient-input]", form);
    const box = $("[data-recipient-preview]", form);
    let timer, last = "";
    const show = (html) => { box.innerHTML = html; box.hidden = !html; };
    const lookup = async () => {
      const id = input.value.trim().toUpperCase();
      if (id === last) return;
      last = id;
      if (!/^[UW][A-Z0-9]{8,10}$/.test(id)) return show("");
      show(`<span class="send-recipient-wait">looking them up…</span>`);
      try {
        const res = await fetch(`${input.dataset.previewUrl}?slack_id=${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
        if (id !== input.value.trim().toUpperCase()) return; // typed on meanwhile
        const who = res.ok ? await res.json() : { found: false };
        if (!who.found) return show(`<span class="send-recipient-miss">No Slack user with that ID. Double-check it?</span>`);
        const pic = who.avatar
          ? `<img class="dash-recipient-avatar" src="${esc(who.avatar)}" alt="" referrerpolicy="no-referrer">`
          : `<span class="dash-recipient-avatar is-blank">${esc(who.name.charAt(0).toUpperCase())}</span>`;
        show(`${pic}<span class="dash-recipient-name">${esc(who.name)}</span><span class="dash-mono">(${esc(who.id)})</span>`);
      } catch (_) {
        show("");
      }
    };
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(lookup, 350); });
    lookup();

    // Delivered in person: no tracking, cost or receipt to give. Hidden fields
    // are disabled so the browser doesn't require (or send) them.
    const inPerson = $("[data-in-person]", form);
    const shipOnly = $$("[data-ship-only]", form);
    const syncInPerson = () => shipOnly.forEach((field) => {
      field.hidden = inPerson.checked;
      $$("input, select, textarea", field).forEach((el) => { el.disabled = inPerson.checked; });
    });
    inPerson.addEventListener("change", syncInPerson);
    syncInPerson();

    // Files over 5 MB can't be uploaded: drop them from the picker and, for
    // photos and STLs, ask where they are instead.
    const alt = $("[data-alt-field]", form);
    const altInput = $("input", alt);
    const altReason = $("[data-alt-reason]", alt);
    const tooBig = {};
    $$("input[type=file][data-max-bytes]", form).forEach((picker) => {
      const note = document.createElement("p");
      note.className = "send-error";
      note.hidden = true;
      picker.after(note);
      picker.addEventListener("change", () => {
        const max = Number(picker.dataset.maxBytes);
        const keep = new DataTransfer();
        const big = [];
        [...picker.files].forEach((f) => (f.size > max ? big.push(f.name) : keep.items.add(f)));
        if (big.length) picker.files = keep.files;
        tooBig[picker.dataset.kind] = picker.dataset.kind === "proof" ? [] : big;
        note.hidden = !big.length;
        note.textContent = picker.dataset.kind === "proof"
          ? `${big.join(", ")} ${big.length === 1 ? "is" : "are"} over 5 MB. Upload a smaller copy (a screenshot works).`
          : `${big.join(", ")} ${big.length === 1 ? "is" : "are"} over 5 MB, so ${big.length === 1 ? "it" : "they"} won't be uploaded. Link ${big.length === 1 ? "it" : "them"} below instead.`;
        const all = [...(tooBig.images || []), ...(tooBig.stls || [])];
        if (all.length) {
          alt.hidden = false;
          altInput.required = true;
          altReason.textContent = `${all.join(", ")} ${all.length === 1 ? "is" : "are"} over 5 MB. Put ${all.length === 1 ? "it" : "them"} somewhere online (a GitHub folder works) and paste the link.`;
        } else if (!altInput.value) {
          alt.hidden = true;
          altInput.required = false;
        }
      });
    });
  }

  // ---------- dashboard ----------
  function dashboard() {
    done();
    const input = $("[data-avatar-input]");
    const name = $("[data-avatar-name]");
    if (input) {
      input.addEventListener("change", () => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          input.value = "";
          name.textContent = "That picture is over 5 MB. Try a smaller one.";
          return;
        }
        name.textContent = file.name;
        // Swap whatever is there (photo or initial) for a preview of the pick.
        const old = $("[data-avatar-preview]");
        const img = document.createElement("img");
        img.className = "dash-avatar";
        img.alt = "your new profile picture";
        img.dataset.avatarPreview = "";
        img.src = URL.createObjectURL(file);
        old.replaceWith(img);
      });
    }
    // Live character count for the bio.
    $$("[data-count-for]").forEach((out) => {
      const field = document.getElementById(out.dataset.countFor);
      if (!field) return;
      const show = () => { out.textContent = `${field.value.length}/${field.maxLength}`; };
      field.addEventListener("input", show);
      show();
    });
    printFilters();
    grantFilter();
    sendForm();

    // One click, one save: grey the button out while the form is sent.
    $$("form.dash-form, form.dash-hcb-form, form.send-form").forEach((form) => {
      form.addEventListener("submit", () => {
        const btn = $("[type=submit]", form);
        if (!btn) return;
        btn.disabled = true;
        btn.value = "saving…";
      });
    });
  }

  ({ home, printers, prints, dashboard }[page] || done)();
})();
