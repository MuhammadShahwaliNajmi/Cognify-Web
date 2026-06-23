# Cognify — cognifypk.com

Ultra-minimalist, premium marketing site for Cognify: an elite, data-driven
incubator for Economics, Business & Data Analytics.

## Stack
- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS**
- **Framer Motion** — spring-physics micro-interactions
- **GSAP** — available for advanced timelines
- **lucide-react** — icons

## Run
```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start   # production
```
> Requires Node.js 18.18+ (install via `brew install node` or nodejs.org).

## Brand tokens (traced from existing assets)
| Token      | Value     |
|------------|-----------|
| Navy       | `#1a2744` |
| Gold       | `#C9A94B` |
| Parchment  | `#F0EDE6` |
| Ink (body) | `#888888` |

Defined as CSS variables in `src/app/globals.css` and mapped in
`tailwind.config.ts`. Change them in one place to re-skin the whole site.

## Structure
```
src/
├── app/                # layout, page, globals
├── components/
│   ├── sections/       # navbar, hero, usps, curriculum, terminal, ecosystem, faq, footer
│   └── ui/             # reveal, magnetic-button, section-label, data-stream-canvas
└── lib/utils.ts        # cn() + shared spring presets
```

## Animation system
All motion is physics-backed (spring presets in `src/lib/utils.ts`), not linear
eases. The hero canvas (`data-stream-canvas.tsx`) caps DPR at 2, pauses when
off-screen via IntersectionObserver, and disables for `prefers-reduced-motion`.
Reveals use blur+lift+settle springs to stay readable, never distracting.
