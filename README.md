# project1.1

## Showcase site (`site/`)

*Specimen No. 01*: a one-page type-specimen-style site where every section is a live demo of a design or engineering skill.

- **Wordmark**: a variable font (Anybody) whose letters swell in weight and width toward the cursor.
- **01 Type**: a modular type scale that recalculates from the ratio you pick.
- **02 Color**: one OKLCH hue becomes a ten-step ramp with WCAG contrast computed live; the hue repaints the whole page.
- **03 Motion**: an easing race comparing linear, ease-in and a custom ease-out curve.
- **04 Data**: deviation chart of `german_credit_data_biased_training.csv`, showing how the "Risk" label varies by sex, age, housing, checking account and loan purpose.
- **05 Interface**: one button drawn in every state, and an accessible form with validation and a strength meter.

Press **G** to overlay the 12-column layout grid. Plain HTML, CSS and vanilla JS, no build tools.

### Run it

```sh
cd site && python3 -m http.server 8000   # then open http://localhost:8000
```

Opening `site/index.html` directly also works.

### Regenerate chart data

```sh
python3 scripts/build_data.py   # writes site/data.js from the CSV
```
