# iamanantshukla — Pebble Training Journal (published site)

This repository hosts the **built static frontend** of a personal 10m air-pistol
training journal ("Pebble"), served via GitHub Pages from `docs/` at
`https://iamanantshukla.github.io/iamanantshukla/`.

It is a **publish/artifact repository**: it contains only the compiled app
(`docs/`), not source. The app is a client-side PWA that stores its data in the
user's own Google Drive (authenticated per-user via Google OAuth); there is no
backend and no data in this repo.

The canonical source lives in a separate private monorepo and is built with
`VITE_BUILD_TARGET=pages` (base path `/iamanantshukla/`). To update the site,
rebuild there and copy the resulting `docs/` here.
