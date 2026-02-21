# Leonte Denis — Portfolio

A dark, immersive personal portfolio website built with Astro, TailwindCSS, Three.js, and GSAP.

## Tech Stack

- **Framework:** Astro 4
- **Styling:** TailwindCSS 3
- **Animations:** GSAP (ScrollTrigger) + Framer Motion
- **3D:** Three.js (particle network hero background)
- **Contact:** EmailJS
- **Deployment:** GitHub Pages

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in your EmailJS credentials in `.env`:
- `PUBLIC_EMAILJS_SERVICE_ID` — from EmailJS dashboard
- `PUBLIC_EMAILJS_TEMPLATE_ID` — from EmailJS dashboard
- `PUBLIC_EMAILJS_PUBLIC_KEY` — from EmailJS dashboard

### 3. Update `astro.config.mjs`

Set your GitHub username:
```js
site: 'https://YOUR_GITHUB_USERNAME.github.io',
base: '/portfolio',   // or '/' if this is a user/org site
```

### 4. Fill in your content

All personal content lives in `src/data/`. Update these files:

| File | What to fill in |
|------|----------------|
| `src/data/profile.json` | Name, bio, social links, email, photo |
| `src/data/projects.json` | Project name, description, links, tech stack |
| `src/data/experience.json` | Start dates, university name, education dates |
| `src/data/skills.json` | Add/remove skills and categories |

### 5. Run locally

```bash
npm run dev
```

### 6. Build for production

```bash
npm run build
```

## Adding Content Later

**New project** — Edit `src/data/projects.json`, add a new object. Done.

**New job/education** — Edit `src/data/experience.json`, add a new object. Done.

**New skill** — Edit `src/data/skills.json`, add to the relevant category array. Done.

No component files need to be touched.

## Deployment

Push to the `main` branch. GitHub Actions automatically builds and deploys to GitHub Pages.

Make sure GitHub Pages is enabled in your repo settings, pointing to the `gh-pages` branch.
