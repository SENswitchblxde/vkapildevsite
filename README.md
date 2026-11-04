# vkapil.dev

Plain HTML/CSS/JS. No framework, no build step.

## Run it

```
npm install
npx playwright install chromium   # once, for screenshots
npm run dev                       # opens a local server
```

Don't double-click index.html; it has to be served so it can read projects.json.

## Add a site

Easiest: edit `projects.json` on github.com and commit. The "Refresh thumbnails" action screenshots the new site and commits the image a minute or two later. It also re-shoots every site each Monday, and you can run it by hand from the Actions tab.

Locally:

```
npm run add
```

Asks for the URL, name, year and description, puts it at the top of the list, and screenshots the homepage into `thumbs/`.

Or edit `projects.json` by hand:

```json
{ "title": "Site name", "url": "https://...", "year": 2026, "description": "..." }
```

then `npm run shoot` to screenshot anything missing a thumbnail (`npm run shoot:all` redoes every one, e.g. after a site redesign).

If a project has no screenshot, the page asks Microlink (free screenshot service) at load time, and shows the domain name if that fails. That works but is slower and rate-limited, so commit the `thumbs/` images for the live site.

To use your own image instead, set `"image": "thumbs/whatever.jpg"`.

## Deploy

Upload the folder as is to Netlify, Vercel, Cloudflare Pages or GitHub Pages. `node_modules`, `scripts` and `package.json` aren't needed on the server.

## Things to change

Search for `TODO` in index.html: intro line, links, email.
