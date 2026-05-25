# Lantana

Company landing page for **Lantana** — an electrical subcontractor providing skilled crews for **rough-in** and **trim** installation on behalf of larger electrical contractors.

## Stack

- [Next.js](https://nextjs.org/) (App Router)
- React 19
- Tailwind CSS v4
- TypeScript

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Customize

| What | Where |
|------|--------|
| Contact email & phone | `src/components/Contact.tsx` |
| Page title & SEO | `src/app/layout.tsx` |
| Copy & services | `src/components/*.tsx` |

## Deploy

Works on [Vercel](https://vercel.com), Netlify, or any Node host:

```bash
npm run build
npm start
```

## Contact form

The inquiry form is UI-only. Connect it to [Resend](https://resend.com), Formspree, or your own API route when you are ready to receive submissions.
