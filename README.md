This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
## Deploying on Render

The repo includes everything needed for a Docker-based deploy on Render:

- `Dockerfile` — multi-stage production image (standalone Next.js server, non-root user).
- `render.yaml` — Render Blueprint that wires up the service and its environment variables.
- `.dockerignore` — keeps secrets and dev files out of the image.

### Via Blueprint (recommended)

1. Push this repo to GitHub/GitLab.
2. In the [Render Dashboard](https://dashboard.render.com), click **New + → Blueprint** and select the repo.
3. When prompted, set the three environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase dashboard → Project Settings → API
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the publishable (formerly "anon") key
   - `NEXT_PUBLIC_SITE_URL` — your production origin, e.g. `https://psycheon.onrender.com`

### Via Web Service (no blueprint)

1. **New + → Web Service**, connect the repo.
2. Set **Runtime** to **Docker** (Dockerfile path stays `./Dockerfile`).
3. Add the same three env vars under **Environment**.
4. Deploy. Render runs Supabase migrations manually in the Supabase dashboard if needed.

### Building the image locally

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  -t psycheon .

docker run --rm -p 3000:10000 \
  -e NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  -e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  psycheon
```
