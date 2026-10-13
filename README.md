# project1.1

## Showcase site (`site/`)

A lightweight, dependency-free one-page site demonstrating front-end development and design:

- **Live design system** — sliders rewrite CSS custom properties (hue, radius, spacing); the whole page restyles, in light and dark mode.
- **Data story** — an interactive chart of `german_credit_data_biased_training.csv`, showing how the "Risk" label varies by sex, age, housing, checking account and loan purpose.
- **Accessible components** — keyboard-navigable tabs, switch, form with live validation and password meter, accordion, toasts, loading button.

Plain HTML, CSS and vanilla JS — under 50 KB, no build tools.

### Run it

```sh
cd site && python3 -m http.server 8000   # then open http://localhost:8000
```

Opening `site/index.html` directly also works.

### Regenerate chart data

```sh
python3 scripts/build_data.py   # writes site/data.js from the CSV
```
