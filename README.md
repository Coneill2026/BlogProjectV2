# Astro Starter Kit: Blog

```sh
npm create astro@latest -- --template blog
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and Open Graph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## API routes

The SSR runtime exposes a small set of JSON endpoints for operational and content use:

- `GET /api/health` — returns service health data.
- `GET /api/posts` — returns the blog post metadata from the content collection.
- `GET /api/feedback` — returns stored feedback submissions.
- `POST /api/feedback` — accepts `name`, `email`, and `message` JSON or form data and stores the submission in memory for the current running instance.

## Spotify Listening Stats

The `/listening-stats` page publicly shows the site owner's top artists and tracks.
Visitors do not need Spotify accounts. Spotify's `short_term` top-items range is
approximately four weeks; Spotify does not provide a seven-day top-items range.

To configure it:

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add the exact callback URL as a redirect URI: `http://127.0.0.1:4321/api/spotify/callback`
   for local setup, or `<SiteUrl>/api/spotify/callback` on the deployed site. The
   deployment `SiteUrl` is a CloudFront HTTPS address; register the complete callback
   address exactly before starting Spotify authorization.
3. Set the app credentials in the server environment (never use `PUBLIC_` variables):

```text
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

4. Start the site and open `http://127.0.0.1:4321/api/spotify/authorize` while signed in
   to the Spotify account whose listening stats should appear. Use `127.0.0.1` (not
   `localhost`) in the browser too, so it matches the registered redirect URI. Approve
   the `user-top-read` and `user-read-recently-played` permissions.
5. Copy the refresh token shown by the callback page into the server environment as
   `SPOTIFY_REFRESH_TOKEN`, then restart or redeploy the app.

If you already authorized this app before adding recent-play stats, visit the authorize
URL again, approve the added permission on Spotify's consent screen, and replace
`SPOTIFY_REFRESH_TOKEN` with the new token shown by the callback. The authorize route
forces Spotify to display consent again so newly requested permissions can be granted.

The site uses the refresh token server-side and caches the public stats for five minutes.
For ECS, store all three Spotify values in AWS Secrets Manager using the secret names and
deployment steps in [the ECS deployment guide](./cdk/README.md). Do not commit them to
source control.

The seven-day track count comes from Spotify's recent-play history. Listening minutes
are estimated from each track's full duration because Spotify does not return the
precise amount of each track that was played.

## Docker

Build and run the production container locally on port 4321:

```sh
docker compose up --build
```

The container health check polls `/api/health`. Check its status with:

```sh
docker compose ps
```

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
