# Concept Lab — cognifypk.com

Marketing site for Concept Lab (formerly Cognify): live online Economics & Business classes for
Cambridge (O Level, IGCSE, A Level), Pearson Edexcel (IGCSE, A Level) and
IB Diploma students.

## Stack
- **Next.js 14** (App Router, static export) · **TypeScript** · **Tailwind CSS**
- **Framer Motion** — spring-physics animation
- **lucide-react** — icons

## Run
```bash
npm install
npm run dev      # http://localhost:3000 (or `npm run dev -- -p 3001`)
npm run build    # static site → ./out
```
> Requires Node.js 18.18+.

## Deploy
Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the static
export and publishes `./out` to GitHub Pages. `public/CNAME` maps it to
cognifypk.com. There is no server: the `/apply/` form posts straight to a
Google Form.

## Brand — strict three-color system
| Token     | Value     |
|-----------|-----------|
| White     | `#FFFFFF` |
| Navy      | `#1a2744` |
| Deep navy | `#0E1A33` |
| Gold      | `#D4B254` |

Defined in `tailwind.config.ts` (and as CSS variables in `src/app/globals.css`).
Use opacity modifiers for tints (`text-navy/70`, `bg-gold/15`), never new colors.

## Structure
```
src/
├── app/
│   ├── layout.tsx, page.tsx, globals.css
│   └── apply/page.tsx          # application form → Google Form
├── components/
│   ├── sections/               # navbar, hero, methodology, besties (tutors),
│   │                           # curriculum, ecosystem, terminal, pricing,
│   │                           # scholarships, testimonials, faq, footer
│   └── ui/                     # reveal, text-reveal, liquid-button, logo,
│                               # spotlight-grid, connecting-line
└── lib/utils.ts                # cn() + shared spring presets
```

## Notes
- Images in `public/` are pre-sized for how they're displayed (the export is
  unoptimised). Keep originals elsewhere and resize before adding new ones.
- All motion honours `prefers-reduced-motion`. Heavy effects (hero chart,
  backdrop blur) are skipped on phones to keep scrolling smooth.
