# Circe et Venus — visual style reference

Use this file to **align** another app, deck, or design system with the same look and feel. Values below mirror `app/globals.css` (OKLch). When matching something else, fill in **§ Target mapping** at the end.

---

## 1. Brand story (one line)

**Mythology-meets-creator platform:** **gold** (premium, action), **purple “Circe”** (night / depth / magic), **cream “Venus”** (day / clarity). Clarity and calm over noise.

---

## 2. Themes


| Mode      | Role            | Mood                                                                 |
| --------- | --------------- | -------------------------------------------------------------------- |
| **Light** | Day / “Venus”   | Soft warm background, dark purple-brown text, gold primary.          |
| **Dark**  | Night / “Circe” | Near-black background, light text, brighter gold and purple accents. |


Toggle is typically `class="dark"` on `html` or root; colors are **CSS variables**, not hard-coded hex in components.

---

## 3. Core tokens (OKLch)

### Light (`:root`)


| Token                  | OKLch                  | Role                           |
| ---------------------- | ---------------------- | ------------------------------ |
| `--background`         | `oklch(0.98 0.005 90)` | Page                           |
| `--foreground`         | `oklch(0.15 0.01 285)` | Body text                      |
| `--card`               | `oklch(1 0 0)`         | Surfaces                       |
| `--primary` / `--gold` | `oklch(0.65 0.16 85)`  | Buttons, key links, focus ring |
| `--primary-foreground` | `oklch(0.98 0 0)`      | On primary                     |
| `--circe`              | `oklch(0.45 0.22 295)` | Brand purple                   |
| `--circe-light`        | `oklch(0.55 0.2 295)`  | Highlights on purple           |
| `--muted-foreground`   | `oklch(0.45 0.01 285)` | Secondary text                 |
| `--border`             | `oklch(0.88 0.01 90)`  | Hairlines                      |
| `--radius`             | `0.5rem` (8px)         | Default corner                 |


### Dark (`.dark`)


| Token                       | OKLch                                         | Role                              |
| --------------------------- | --------------------------------------------- | --------------------------------- |
| `--background`              | `oklch(0.08 0 0)`                             | Page                              |
| `--foreground`              | `oklch(0.95 0 0)`                             | Body text                         |
| `--card`                    | `oklch(0.12 0.005 285)`                       | Surfaces                          |
| `--primary` / `--gold`      | `oklch(0.78 0.14 85)`                         | Primary / gold (brighter in dark) |
| `--circe` / `--circe-light` | `oklch(0.55 0.2 295)` / `oklch(0.7 0.18 295)` | Purple system                     |
| `--muted-foreground`        | `oklch(0.6 0 0)`                              | Secondary text                    |
| `--border`                  | `oklch(0.22 0.015 285)`                       | Hairlines                         |
| `--sidebar`                 | `oklch(0.06 0 0)`                             | Nav chrome (very dark)            |


**Semantic (both themes):** `--success` (green), `--warning` (gold-aligned), `--info` (purple), `--destructive` (red).

---

## 4. Typography


| Role                              | Stack                                               |
| --------------------------------- | --------------------------------------------------- |
| **UI / body**                     | `DM Sans` → `system-ui`, sans-serif (`--font-sans`) |
| **Display / headings** (optional) | `Cinzel` → Georgia, serif (`--font-serif`)          |
| **Code / data**                   | `JetBrains Mono` → monospace (`--font-mono`)        |


**Rules of thumb:** short headings, comfortable line height for long dashboard copy, avoid ALL CAPS except small labels. Prefer **one weight step** of contrast (e.g. semibold title + regular body), not many sizes.

---

## 5. Layout & components

- **Radius:** default `0.5rem`; cards and buttons follow theme radius.
- **Borders:** subtle; rely on `border` + `bg-card` rather than heavy shadows.
- **Density:** marketing = airy; **app shell** = slightly tighter, still readable at laptop width.
- **Pattern:** shadcn-style primitives (Button, Card, Input) with tokens above, not raw hex.

---

## 6. Motion

- **Marketing / login:** light motion (Framer or CSS), **gold/purple** tint can follow **light vs dark** (warmer gold in light, cooler purple in dark).
- **Dashboard:** keep transitions **short** (150–300ms); avoid animating large layout on every click.

---

## 7. Voice (UI copy)

- **Direct, calm, professional** — “Clarity sells.”
- Avoid fake urgency, fake metrics, and noisy punctuation in product UI.
- **Beta** features call it out in small, honest copy.

---

## 8. Checklist: match another product to this system

- Map their **background / surface / text** to `--background`, `--card`, `--foreground`, `--muted-foreground`.
- Map one **primary CTA** to `--primary` / gold hue ~**85** in OKLch LCh hue (warm gold).
- Map **secondary brand** to `--circe` purple (hue ~**295**).
- Align **border** and **radius**; if they are flatter, lower radius slightly but keep one scale.
- Align **light/dark** pairs; if they only have one mode, start from **light** table then derive dark by lowering L and nudging gold brighter.
- **Fonts:** if you cannot use DM Sans, pick **one neutral grotesk** (Inter, Geist, Source Sans 3) with similar weights.
- **Motion:** if their app is static, add only **hover/focus** states first.

---

## 9. Target mapping (fill in)

Use this table to align a **second product** (Figma, another repo, a client site).


| Our token          | Their name / value | Notes |
| ------------------ | ------------------ | ----- |
| Background         |                    |       |
| Primary / CTA      |                    |       |
| Secondary / purple |                    |       |
| Text primary       |                    |       |
| Text muted         |                    |       |
| Border             |                    |       |
| Font body          |                    |       |
| Font display       |                    |       |
| Corner radius      |                    |       |


**Screens to compare side-by-side:** marketing home, auth, dashboard shell, settings, empty state.

---

*Generated for Creatix; keep in sync when `app/globals.css` brand tokens change significantly.*