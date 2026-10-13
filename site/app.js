(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = new Intl.NumberFormat("en-US");

  root.classList.remove("no-js");

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  };

  /* ---------- Theme ---------- */
  const darkQuery = matchMedia("(prefers-color-scheme: dark)");
  function applyTheme(theme) {
    if (theme) root.dataset.theme = theme;
    const mode = theme || (darkQuery.matches ? "dark" : "light");
    root.dataset.mode = mode;
    $("#themeToggle").setAttribute("aria-pressed", String(mode === "dark"));
  }
  applyTheme(store.get("theme"));
  darkQuery.addEventListener("change", () => applyTheme(root.dataset.theme));
  $("#themeToggle").addEventListener("click", () => {
    const next = root.dataset.mode === "dark" ? "light" : "dark";
    store.set("theme", next);
    applyTheme(next);
  });

  /* ---------- Typed code sample ---------- */
  const codeLines = [
    ["c", "/* One hue drives the whole theme */"],
    ["k", ":root {"],
    ["", "  --hue: "], ["v", "250"], ["", ";\n"],
    ["", "  --accent: "], ["v", "oklch(0.56 0.19 var(--hue))"], ["", ";\n"],
    ["", "  --radius: "], ["v", "14px"], ["", ";\n"],
    ["", "  --space: "], ["v", "1"], ["", ";\n"],
    ["k", "}"],
    ["", "\n"],
    ["k", ".btn--primary {"],
    ["", "  background: "], ["v", "var(--accent)"], ["", ";\n"],
    ["", "  border-radius: "], ["v", "calc(var(--radius) * .75)"], ["", ";\n"],
    ["k", "}"],
  ];
  // Lines that close a statement get a trailing newline.
  const tokens = codeLines.map(([cls, text]) =>
    [cls, /[{}]$|\*\/$/.test(text) ? text + "\n" : text]);

  const typed = $("#typed");
  function renderTyped(chars) {
    typed.textContent = "";
    let left = chars;
    for (const [cls, text] of tokens) {
      if (left <= 0) break;
      const part = text.slice(0, left);
      left -= part.length;
      const span = document.createElement("span");
      if (cls) span.className = cls;
      span.textContent = part;
      typed.append(span);
    }
  }
  const totalChars = tokens.reduce((n, [, t]) => n + t.length, 0);
  if (reduceMotion) {
    renderTyped(totalChars);
  } else {
    let i = 0;
    const tick = () => {
      renderTyped(++i);
      if (i < totalChars) setTimeout(tick, typed.textContent.endsWith("\n") ? 140 : 22);
    };
    setTimeout(tick, 500);
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
    }
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- Design token playground ---------- */
  const DEFAULTS = { hue: 250, radius: 14, space: 1 };
  const hue = $("#hue"), radius = $("#radius"), space = $("#space");

  function applyTokens() {
    const h = Number(hue.value), r = Number(radius.value), s = Number(space.value);
    root.style.setProperty("--hue", h);
    root.style.setProperty("--radius", r + "px");
    root.style.setProperty("--space", s);
    $("#hueOut").value = h;
    $("#radiusOut").value = r;
    $("#spaceOut").value = s.toFixed(2);
    $$(".swatches button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.hue) === h)));
    $("#tokenDump").textContent =
      `:root {\n  --hue: ${h};\n  --radius: ${r}px;\n  --space: ${s.toFixed(2)};\n` +
      `  --accent: oklch(0.56 0.19 ${h});\n}`;
    store.set("tokens", JSON.stringify({ hue: h, radius: r, space: s }));
  }

  try {
    const saved = JSON.parse(store.get("tokens") || "null");
    if (saved) { hue.value = saved.hue; radius.value = saved.radius; space.value = saved.space; }
  } catch { /* ignore malformed */ }

  [hue, radius, space].forEach((el) => el.addEventListener("input", applyTokens));
  $$(".swatches button").forEach((b) => b.addEventListener("click", () => { hue.value = b.dataset.hue; applyTokens(); }));
  $("#resetTokens").addEventListener("click", () => {
    hue.value = DEFAULTS.hue; radius.value = DEFAULTS.radius; space.value = DEFAULTS.space;
    applyTokens();
  });
  applyTokens();

  /* ---------- Data chart ---------- */
  const data = window.CREDIT_DATA;
  const DIMS = [
    ["Sex", "Sex"],
    ["Age", "Age"],
    ["Housing", "Housing"],
    ["CheckingStatus", "Checking account"],
    ["LoanPurpose", "Loan purpose"],
  ];
  const chart = $("#chart"), tooltip = $("#tooltip"), tabs = $("#dimTabs"), sortToggle = $("#sortToggle");
  let currentDim = "Sex";

  if (data) {
    const overall = data.risk / data.total;
    $("#dataTotal").textContent = fmt.format(data.total);

    DIMS.forEach(([key, label], i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.role = "tab";
      b.id = "tab-" + key;
      b.textContent = label;
      b.dataset.dim = key;
      b.setAttribute("aria-selected", String(i === 0));
      b.tabIndex = i === 0 ? 0 : -1;
      tabs.append(b);
    });

    tabs.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (btn) selectDim(btn.dataset.dim);
    });
    tabs.addEventListener("keydown", (e) => {
      const btns = $$("button", tabs);
      const idx = btns.findIndex((b) => b.dataset.dim === currentDim);
      const map = { ArrowRight: 1, ArrowLeft: -1, Home: -idx, End: btns.length - 1 - idx };
      if (!(e.key in map)) return;
      e.preventDefault();
      const next = btns[(idx + map[e.key] + btns.length) % btns.length];
      selectDim(next.dataset.dim);
      next.focus();
    });
    sortToggle.addEventListener("change", () => drawChart());

    function selectDim(dim) {
      currentDim = dim;
      $$("button", tabs).forEach((b) => {
        const on = b.dataset.dim === dim;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
      });
      chart.setAttribute("aria-labelledby", "tab-" + dim);
      drawChart();
    }

    function drawChart() {
      let rows = data.dims[currentDim].map((g) => ({ ...g, rate: g.risk / g.n }));
      if (sortToggle.checked) rows.sort((a, b) => b.rate - a.rate);
      const max = Math.max(...rows.map((r) => r.rate), overall) * 1.08;

      chart.textContent = "";
      for (const r of rows) {
        const row = document.createElement("div");
        row.className = "bar-row";
        row.tabIndex = 0;
        row.setAttribute("aria-label", `${r.label}: ${(r.rate * 100).toFixed(1)}% flagged as risk, ${fmt.format(r.n)} applicants`);
        row.innerHTML = `
          <span class="bar-row__label"></span>
          <span class="bar-track"><span class="bar-fill"></span><span class="bar-avg"></span></span>
          <span class="bar-row__value">${(r.rate * 100).toFixed(1)}%</span>`;
        $(".bar-row__label", row).textContent = r.label;
        $(".bar-avg", row).style.left = (overall / max) * 100 + "%";
        const fill = $(".bar-fill", row);
        requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = (r.rate / max) * 100 + "%"; }));

        const show = () => {
          tooltip.innerHTML = `<strong></strong><br>${fmt.format(r.risk)} of ${fmt.format(r.n)} flagged · avg loan ${fmt.format(r.avgAmount)} DM`;
          tooltip.firstElementChild.textContent = r.label;
          const card = chart.parentElement.getBoundingClientRect();
          const track = $(".bar-track", row).getBoundingClientRect();
          tooltip.style.left = track.left - card.left + Math.min(track.width * (r.rate / max), track.width - 20) + "px";
          tooltip.style.top = track.top - card.top + "px";
          tooltip.hidden = false;
        };
        const hide = () => { tooltip.hidden = true; };
        row.addEventListener("mouseenter", show);
        row.addEventListener("mouseleave", hide);
        row.addEventListener("focus", show);
        row.addEventListener("blur", hide);
        chart.append(row);
      }

      const legend = document.createElement("div");
      legend.className = "chart-legend";
      legend.innerHTML = `<span><i></i>Share flagged “Risk”</span><span><i class="avg"></i>Overall average (${(overall * 100).toFixed(1)}%)</span>`;
      chart.append(legend);

      renderStats(rows, overall);
      renderInsight(rows, overall);
    }

    function renderStats(rows, overall) {
      const hi = rows.reduce((a, b) => (b.rate > a.rate ? b : a));
      const lo = rows.reduce((a, b) => (b.rate < a.rate ? b : a));
      const stats = [
        [fmt.format(data.total), "applications"],
        [(overall * 100).toFixed(1) + "%", "flagged overall"],
        [(hi.rate * 100).toFixed(1) + "%", `highest · ${hi.label}`],
        [(lo.rate * 100).toFixed(1) + "%", `lowest · ${lo.label}`],
      ];
      const el = $("#stats");
      el.textContent = "";
      for (const [value, label] of stats) {
        const d = document.createElement("div");
        d.className = "stat";
        d.innerHTML = "<b></b><span></span>";
        d.firstChild.textContent = value;
        d.lastChild.textContent = label;
        el.append(d);
      }
    }

    function renderInsight(rows, overall) {
      const hi = rows.reduce((a, b) => (b.rate > a.rate ? b : a));
      const lo = rows.reduce((a, b) => (b.rate < a.rate ? b : a));
      const ratio = (hi.rate / lo.rate).toFixed(1);
      const dimLabel = DIMS.find(([k]) => k === currentDim)[1].toLowerCase();
      const note = {
        Sex: " Sex is a protected attribute — a gap here is exactly what a fairness audit should catch before training a model.",
        Age: " Age is a protected attribute in many jurisdictions; a model trained on this label could inherit the pattern.",
      }[currentDim] || "";
      $("#insight").textContent =
        `By ${dimLabel}, “${hi.label}” applicants are flagged ${ratio}× as often as “${lo.label}” ` +
        `(${(hi.rate * 100).toFixed(1)}% vs ${(lo.rate * 100).toFixed(1)}%).${note}`;
    }

    selectDim(currentDim);
  } else {
    chart.textContent = "Data file not found — run scripts/build_data.py.";
  }

  /* ---------- Toasts ---------- */
  function toast(message) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = message;
    $("#toasts").append(t);
    setTimeout(() => {
      t.classList.add("out");
      t.addEventListener("animationend", () => t.remove(), { once: true });
      if (reduceMotion) t.remove();
    }, 2600);
  }
  $$("[data-toast]").forEach((b) => b.addEventListener("click", () => toast(b.dataset.toast)));

  $("#loadingBtn").addEventListener("click", (e) => {
    const b = e.currentTarget;
    b.classList.add("is-loading");
    b.setAttribute("aria-busy", "true");
    setTimeout(() => {
      b.classList.remove("is-loading");
      b.removeAttribute("aria-busy");
      toast("Loaded!");
    }, 1400);
  });

  /* ---------- Form validation ---------- */
  const form = $("#signup");
  const messages = {
    name: (el) => el.validity.valueMissing ? "Please enter your name." : el.validity.tooShort ? "Name needs at least 2 characters." : "",
    email: (el) => el.validity.valueMissing ? "Email is required." : el.validity.typeMismatch ? "That doesn't look like an email." : "",
    password: (el) => el.validity.valueMissing ? "Choose a password." : el.validity.tooShort ? "Use at least 8 characters." : "",
  };

  function validate(el, force) {
    if (!force && !el.dataset.touched) return el.checkValidity();
    const msg = messages[el.name](el);
    const err = $(".error", el.closest(".field"));
    err.textContent = msg;
    el.setAttribute("aria-invalid", String(Boolean(msg)));
    el.classList.toggle("is-valid", !msg);
    return !msg;
  }

  function passwordStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  $$("input", form).forEach((el) => {
    el.addEventListener("blur", () => { el.dataset.touched = "1"; validate(el); });
    el.addEventListener("input", () => {
      validate(el);
      if (el.name === "password") {
        const s = passwordStrength(el.value);
        const colors = ["var(--danger)", "var(--danger)", "oklch(0.75 0.15 70)", "oklch(0.75 0.15 70)", "var(--success)", "var(--success)"];
        const meter = $("#pwMeter");
        meter.style.width = (s / 5) * 100 + "%";
        meter.style.background = colors[s];
      }
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = $$("input", form);
    inputs.forEach((el) => { el.dataset.touched = "1"; });
    const ok = inputs.map((el) => validate(el, true)).every(Boolean);
    if (!ok) {
      inputs.find((el) => el.getAttribute("aria-invalid") === "true")?.focus();
      return;
    }
    toast(`Welcome aboard, ${$("input[name=name]", form).value.trim()}!`);
    form.reset();
    inputs.forEach((el) => { delete el.dataset.touched; el.classList.remove("is-valid"); el.removeAttribute("aria-invalid"); });
    $("#pwMeter").style.width = "0";
  });
})();
