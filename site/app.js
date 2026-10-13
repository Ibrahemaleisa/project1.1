(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const html = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = new Intl.NumberFormat("en-US");
  const pct = (x) => (x * 100).toFixed(1) + "%";

  html.classList.remove("no-js");

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  };

  /* =======================================================
     Theme + grid overlay
     ======================================================= */
  const darkQuery = matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => (html.dataset.theme || (darkQuery.matches ? "dark" : "light")) === "dark";

  function syncThemeButton() {
    const btn = $("#themeToggle");
    btn.textContent = isDark() ? "Light" : "Dark";
    btn.setAttribute("aria-label", `Switch to ${isDark() ? "light" : "dark"} mode`);
  }
  if (store.get("theme")) html.dataset.theme = store.get("theme");
  syncThemeButton();
  darkQuery.addEventListener("change", () => { syncThemeButton(); renderRamp(); });
  $("#themeToggle").addEventListener("click", () => {
    html.dataset.theme = isDark() ? "light" : "dark";
    store.set("theme", html.dataset.theme);
    syncThemeButton();
    renderRamp();
  });

  const gridBtn = $("#gridToggle");
  function toggleGrid() {
    const on = html.classList.toggle("show-grid");
    gridBtn.setAttribute("aria-pressed", String(on));
  }
  gridBtn.addEventListener("click", toggleGrid);
  addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "g" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("input, textarea, [contenteditable]")) return;
    toggleGrid();
  });

  /* =======================================================
     00 Wordmark: letters swell toward the cursor
     ======================================================= */
  const hero = $(".hero");
  const letters = $$(".wordmark span");
  const state = letters.map(() => ({ t: 0, target: 0 }));
  let pointer = null;           // {x, y} while the cursor is over the hero
  let introStart = performance.now();
  const canHover = matchMedia("(hover: hover)").matches;

  function setTargets(now) {
    if (pointer) {
      const radius = Math.max(innerWidth * 0.16, 140);
      letters.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const dx = pointer.x - (r.left + r.width / 2);
        const dy = Math.max(0, Math.abs(pointer.y - (r.top + r.height / 2)) - r.height / 2);
        const d = Math.hypot(dx, dy);
        state[i].target = Math.max(0, 1 - d / radius) ** 1.4;
      });
      return;
    }
    const elapsed = (now - introStart) / 1000;
    if (!canHover || elapsed < 2.4) {
      // A slow wave travels through the word: the intro on desktop, the idle state on touch.
      const phase = elapsed * 2.2;
      letters.forEach((_, i) => {
        const wave = Math.sin(phase - i * 0.55);
        state[i].target = canHover ? Math.max(0, wave) * Math.max(0, 1 - elapsed / 2.4) : 0.85 * Math.max(0, wave) ** 6;
      });
    } else {
      state.forEach((s) => { s.target = 0; });
    }
  }

  function frame(now) {
    setTargets(now);
    for (let i = 0; i < letters.length; i++) {
      const s = state[i];
      s.t += (s.target - s.t) * 0.14;
      if (Math.abs(s.target - s.t) < 0.001) s.t = s.target;
      letters[i].style.setProperty("--t", s.t.toFixed(3));
    }
    requestAnimationFrame(frame);
  }

  // Size the word so that, at rest, it spans most of the hero width without
  // outgrowing the space above the footer. Letters swell into the slack.
  const wordmark = $(".wordmark");
  function fitWordmark() {
    const probe = wordmark.cloneNode(true);
    probe.removeAttribute("id");
    Object.assign(probe.style, { position: "absolute", visibility: "hidden", fontSize: "100px", justifyContent: "flex-start", flex: "none", width: "max-content" });
    $$("span", probe).forEach((s) => s.style.setProperty("--t", "0"));
    hero.append(probe);
    const per100 = probe.getBoundingClientRect().width;
    probe.remove();
    const byWidth = (wordmark.clientWidth * (canHover ? 0.74 : 0.56) / per100) * 100;
    const footH = $(".hero__foot").offsetHeight;
    const avail = innerWidth > 860 ? hero.clientHeight - footH - 72 : Infinity;
    wordmark.style.fontSize = Math.max(48, Math.min(byWidth, avail / 0.74)) + "px";
  }
  fitWordmark();
  document.fonts?.ready.then(fitWordmark);
  let fitTimer;
  addEventListener("resize", () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitWordmark, 100); });

  if (reduceMotion) {
    letters.forEach((el, i) => el.style.setProperty("--t", i % 3 === 0 ? "1" : "0.35"));
  } else {
    hero.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") pointer = { x: e.clientX, y: e.clientY }; });
    hero.addEventListener("pointerleave", () => { pointer = null; });
    requestAnimationFrame(frame);
  }

  /* =======================================================
     01 Type scale
     ======================================================= */
  const scaleEl = $("#scale");
  const sample = $("#sampleText");
  let ratio = 1.25;

  function renderScale() {
    const text = sample.value.trim() || "Taste is trained, not innate.";
    scaleEl.textContent = "";
    for (let step = 6; step >= 0; step--) {
      const px = 16 * ratio ** step;
      const li = document.createElement("li");
      if (step === 0) li.className = "is-body";
      const meta = document.createElement("code");
      meta.innerHTML = `<b>${step === 0 ? "body" : "step " + step}</b>${px.toFixed(1)}px`;
      const span = document.createElement("span");
      span.textContent = text;
      span.style.fontSize = `min(${px.toFixed(2)}px, ${(px / 16 * 2.2).toFixed(2)}vw + 0.5rem)`;
      li.append(meta, span);
      scaleEl.append(li);
    }
  }

  function wireRadioGroup(group, onPick) {
    const radios = $$("[role=radio]", group);
    const pick = (btn, focus) => {
      radios.forEach((r) => {
        const on = r === btn;
        r.setAttribute("aria-checked", String(on));
        r.tabIndex = on ? 0 : -1;
      });
      if (focus) btn.focus();
      onPick(btn);
    };
    radios.forEach((r) => {
      r.tabIndex = r.getAttribute("aria-checked") === "true" ? 0 : -1;
      r.addEventListener("click", () => pick(r));
    });
    group.addEventListener("keydown", (e) => {
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const i = radios.indexOf(document.activeElement);
      pick(radios[(i + dir + radios.length) % radios.length], true);
    });
  }

  wireRadioGroup($("#ratioGroup"), (btn) => { ratio = Number(btn.dataset.ratio); renderScale(); });
  sample.addEventListener("input", renderScale);
  renderScale();

  /* =======================================================
     02 Color: OKLCH ramp with live WCAG contrast
     ======================================================= */
  function oklchToLinearRgb(L, C, H) {
    const h = (H * Math.PI) / 180;
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
  }
  const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

  // Reduce chroma until the color fits in sRGB, so hex values and ratios are honest.
  function toColor(L, C, H) {
    let c = C, rgb = oklchToLinearRgb(L, c, H);
    while (!inGamut(rgb) && c > 0) { c = Math.max(0, c - 0.004); rgb = oklchToLinearRgb(L, c, H); }
    rgb = rgb.map((v) => Math.min(1, Math.max(0, v)));
    const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    const hex = "#" + rgb.map((v) => {
      const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
      return Math.round(srgb * 255).toString(16).padStart(2, "0");
    }).join("");
    return { hex, lum, css: `oklch(${L} ${c.toFixed(3)} ${H})` };
  }
  const contrast = (a, b) => (Math.max(a.lum, b.lum) + 0.05) / (Math.min(a.lum, b.lum) + 0.05);

  const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  const LIGHTNESS = [0.97, 0.93, 0.87, 0.79, 0.71, 0.63, 0.55, 0.47, 0.39, 0.3];
  const hueInput = $("#hue");
  const rampEl = $("#ramp");

  function renderRamp() {
    const hue = Number(hueInput.value);
    const page = isDark() ? toColor(0.165, 0.01, hue) : toColor(0.972, 0.005, hue);
    const ink = isDark() ? toColor(0.95, 0.006, hue) : toColor(0.2, 0.012, hue);
    rampEl.textContent = "";
    STEPS.forEach((step, i) => {
      const L = LIGHTNESS[i];
      const C = 0.21 * Math.max(0.25, 1 - Math.abs(L - 0.62) * 1.7);
      const col = toColor(L, C, hue);
      const vsPage = contrast(col, page);
      const textOn = contrast(col, ink) >= contrast(col, page) ? ink : page;
      const grade = vsPage >= 4.5 ? "AA" : vsPage >= 3 ? "AA Large" : "Fails";
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="chip-swatch" style="background:${col.hex};color:${textOn.hex}">
          <span>${step}</span><b>Aa</b>
        </div>
        <dl>
          <dt>${col.hex}</dt>
          <dd class="${grade === "Fails" ? "fail" : "pass"}">${vsPage.toFixed(2)}:1</dd>
          <dd>${grade}</dd>
        </dl>`;
      li.setAttribute("aria-label", `Step ${step}, ${col.hex}, contrast ${vsPage.toFixed(2)} to 1 against the page, ${grade}`);
      rampEl.append(li);
    });
  }

  function setHue(h) {
    hueInput.value = h;
    $("#hueOut").value = h;
    html.style.setProperty("--hue", h);
    store.set("hue", String(h));
    renderRamp();
  }
  hueInput.addEventListener("input", () => setHue(Number(hueInput.value)));
  $("#hueReset").addEventListener("click", () => setHue(33));
  setHue(Number(store.get("hue") ?? 33) || 0);

  /* =======================================================
     03 Motion: easing race
     ======================================================= */
  let duration = 600;
  let raced = false;
  wireRadioGroup($("#durGroup"), (btn) => { duration = Number(btn.dataset.dur); });

  $("#racePlay").addEventListener("click", (e) => {
    const rows = $$("#race li");
    const pucks = rows.map((li) => $(".puck", li));
    // Snap back to the start without animating, then run.
    pucks.forEach((p) => { p.style.transition = "none"; p.style.transform = "translateX(0)"; });
    void document.body.offsetWidth;
    rows.forEach((li, i) => {
      const lane = $(".lane", li);
      const dist = lane.clientWidth - pucks[i].offsetWidth;
      pucks[i].style.transition = `transform ${duration}ms ${li.dataset.ease}`;
      pucks[i].style.transform = `translateX(${dist}px)`;
    });
    raced = true;
    e.currentTarget.textContent = "Run it again";
  });
  addEventListener("resize", () => {
    if (!raced) return;
    $$("#race li").forEach((li) => {
      const p = $(".puck", li);
      p.style.transition = "none";
      p.style.transform = `translateX(${$(".lane", li).clientWidth - p.offsetWidth}px)`;
    });
  });

  /* =======================================================
     04 Data: deviation from the overall risk rate
     ======================================================= */
  const data = window.CREDIT_DATA;
  const DIMS = [
    { key: "Sex", label: "Sex", who: (l) => (l === "Male" ? "Men" : "Women") },
    { key: "Age", label: "Age", who: (l) => `Applicants aged ${l}` },
    { key: "Housing", label: "Housing", who: (l) => ({ Own: "Homeowners", Rent: "Renters", Free: "Applicants housed for free" }[l] || l) },
    { key: "CheckingStatus", label: "Checking", who: (l) => (l === "No account" ? "Applicants with no checking account" : `Applicants with ${l} in checking`) },
    { key: "LoanPurpose", label: "Purpose", who: (l) => `${l} loans` },
  ];
  const NOTES = {
    Sex: "Sex is a protected attribute. A model trained on this label would learn the gap unless someone audits for it first.",
    Age: "Age is protected in many jurisdictions, so this pattern deserves the same scrutiny before any model is trained.",
  };
  const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  if (data) {
    const overall = data.risk / data.total;
    // One shared scale across every grouping, so bar lengths compare honestly between tabs.
    const maxDelta = Math.max(...Object.values(data.dims).flat().map((g) => Math.abs(g.risk / g.n - overall)));
    const tabs = $("#dimTabs");
    const chart = $("#chart");
    let current = "Sex";

    $("#dataTotal").textContent = fmt.format(data.total);
    $("#avgLabel").textContent = `Average ${pct(overall)}`;

    DIMS.forEach((d, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.id = "tab-" + d.key;
      b.dataset.dim = d.key;
      b.textContent = d.label;
      b.setAttribute("aria-controls", "chart");
      b.setAttribute("aria-selected", String(i === 0));
      b.tabIndex = i === 0 ? 0 : -1;
      tabs.append(b);
    });
    chart.setAttribute("role", "tabpanel");

    tabs.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) select(b.dataset.dim);
    });
    tabs.addEventListener("keydown", (e) => {
      const btns = $$("button", tabs);
      const i = btns.findIndex((b) => b.dataset.dim === current);
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: btns.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      const b = btns[(next + btns.length) % btns.length];
      select(b.dataset.dim);
      b.focus();
    });

    function select(key) {
      current = key;
      $$("button", tabs).forEach((b) => {
        const on = b.dataset.dim === key;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      chart.setAttribute("aria-labelledby", "tab-" + key);
      draw();
    }

    function draw() {
      const dim = DIMS.find((d) => d.key === current);
      const rows = data.dims[current].map((g) => ({ ...g, rate: g.risk / g.n })).sort((a, b) => b.rate - a.rate);
      const hi = rows[0], lo = rows[rows.length - 1];

      $("#headline").innerHTML = "";
      $("#headline").append(
        `${dim.who(hi.label)} are flagged `,
        Object.assign(document.createElement("em"), { textContent: `${(hi.rate / lo.rate).toFixed(1)}×` }),
        ` as often as ${lowerFirst(dim.who(lo.label))}.`
      );

      chart.textContent = "";
      rows.forEach((r, i) => {
        const delta = r.rate - overall;
        const li = document.createElement("li");
        li.className = "dev-row" + (i === 0 ? " is-max" : "");
        li.innerHTML = `
          <span class="dev-row__label"></span>
          <span class="dev-row__track"><span class="dev-row__bar ${delta >= 0 ? "is-up" : "is-down"}"></span></span>
          <span class="dev-row__value">${pct(r.rate)}<small>n = ${fmt.format(r.n)}</small></span>`;
        $(".dev-row__label", li).textContent = r.label;
        li.setAttribute("aria-label",
          `${r.label}: ${pct(r.rate)} flagged, ${Math.abs(delta * 100).toFixed(1)} points ${delta >= 0 ? "above" : "below"} average, ${fmt.format(r.n)} applicants`);
        const bar = $(".dev-row__bar", li);
        chart.append(li);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          bar.style.transform = `scaleX(${(Math.abs(delta) / maxDelta).toFixed(4)})`;
        }));
      });

      $("#chartNote").textContent =
        (NOTES[current] ? NOTES[current] + " " : "") +
        "Bars share one scale across every grouping, so a short bar here really is a small gap.";
    }

    select(current);
  } else {
    $("#chart").textContent = "Chart data missing. Run scripts/build_data.py.";
  }

  /* =======================================================
     05 Interface: form
     ======================================================= */
  function toast(message) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = message;
    $("#toasts").append(t);
    setTimeout(() => {
      t.classList.add("is-leaving");
      setTimeout(() => t.remove(), 200);
    }, 3200);
  }

  const form = $("#signup");
  const MESSAGES = {
    name: (v) => (v.valueMissing ? "Enter your name." : v.tooShort ? "Use at least 2 characters." : ""),
    email: (v) => (v.valueMissing ? "Enter your email." : v.typeMismatch ? "This needs an @ and a domain, like ada@example.com." : ""),
    password: (v) => (v.valueMissing ? "Choose a password." : v.tooShort ? "Use at least 8 characters." : ""),
  };

  function validate(input) {
    const msg = MESSAGES[input.name](input.validity);
    $("#" + input.getAttribute("aria-describedby").split(" ").pop()).textContent = msg;
    input.setAttribute("aria-invalid", String(Boolean(msg)));
    input.classList.toggle("is-valid", !msg);
    return !msg;
  }

  function strength(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 10) s++;
    return s;
  }

  $$("input[name]:not([type=checkbox])", form).forEach((input) => {
    input.addEventListener("blur", () => { if (input.value || input.dataset.touched) { input.dataset.touched = "1"; validate(input); } });
    input.addEventListener("input", () => {
      if (input.dataset.touched) validate(input);
      if (input.name === "password") $("#meter").dataset.score = strength(input.value);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = $$("input[name]:not([type=checkbox])", form);
    inputs.forEach((i) => { i.dataset.touched = "1"; });
    const results = inputs.map(validate);
    if (!results.every(Boolean)) {
      inputs[results.indexOf(false)].focus();
      return;
    }
    const btn = $("#submitBtn");
    btn.classList.add("is-loading");
    btn.setAttribute("aria-busy", "true");
    setTimeout(() => {
      btn.classList.remove("is-loading");
      btn.removeAttribute("aria-busy");
      toast(`Account created for ${form.elements.name.value.trim()}. (Demo only, nothing was sent.)`);
      form.reset();
      inputs.forEach((i) => { delete i.dataset.touched; i.classList.remove("is-valid"); i.removeAttribute("aria-invalid"); });
      $("#meter").dataset.score = 0;
    }, 900);
  });

  /* =======================================================
     Colophon: measure what this page actually cost to load
     ======================================================= */
  addEventListener("load", () => {
    setTimeout(() => {
      const entries = [...performance.getEntriesByType("navigation"), ...performance.getEntriesByType("resource")];
      const size = (e) => e.transferSize || e.encodedBodySize || 0;
      const own = entries.filter((e) => e.name.startsWith(location.origin)).reduce((n, e) => n + size(e), 0);
      $("#weight").textContent = own
        ? `${(own / 1024).toFixed(1)} KB of HTML, CSS, JS and data, plus Google Fonts. Measured live by this page.`
        : "Serve the page over HTTP and this line measures its own size.";
    }, 300);
  });
})();
