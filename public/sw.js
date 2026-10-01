/* ReadFluent service worker.

   It keeps the app SHELL working offline, and nothing else. The owner's rule
   (CLAUDE.md, "Offline"): nothing persists unless the reader explicitly
   downloads it. A downloaded version is its own bucket, added in M9 under the
   DOWNLOAD_PREFIX namespace below; until then there is none, and this file
   never writes anything but the shell.

   What that means in practice:
   - Only the paths in SHELL, and the build's static files, are ever stored. A
     book page the reader visits is fetched from the network and left at that.
   - Books, photos and audio come from storage on another origin (SPEC.md §9).
     This worker does not touch cross-origin requests at all, so reading
     online leaves nothing behind by construction, not by cleanup.
   - /api is never cached — a sign-in or a purchase is never something to serve
     from yesterday.

   The shell is precached on install. The build's static files are
   content-hashed, so they are served from the cache and never revalidated; a
   NAVIGATION goes to the network first and only falls back to the cache when
   the network does not answer. That order matters: served stale-first, a phone
   opened the previous deploy for a whole visit and a change looked like it had
   not shipped.

   The cache is named after the build that filled it. The page registers this
   worker as /sw.js?v=<commit>, so a deploy is a different script URL, a new
   worker, and — because `activate` drops every shell cache that is not the
   current one — a shell that cannot be yesterday's. */
const BUILD = new URL(self.location.href).searchParams.get("v") || "dev";
const PREFIX = "readfluent-";
const VERSION = `${PREFIX}${BUILD}`;
/* Reserved for downloaded versions (M9). `activate` leaves these alone; only
   removing a download, or finding it orphaned, deletes one. */
const DOWNLOAD_PREFIX = `${PREFIX}dl-`;
/* How long a navigation waits for the network before the cached copy is shown.
   Long enough for a slow connection, short enough not to look broken. */
const NAV_TIMEOUT_MS = 3500;
/* The pages that must open with no network. Everything else is the network's. */
const SHELL = ["/", "/welcome", "/offline", "/manifest.webmanifest", "/icon.svg"];

const origin = self.location.origin;
const abs = (path) => new URL(path, origin).href;
const inShell = (pathname) => SHELL.includes(pathname);

const offlineText = () => new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.allSettled(SHELL.map((url) => addShell(cache, url)))
        .then(() => precacheAssetsOf(cache, "/offline")),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(tidy().then(() => self.clients.claim()));
});

/* Adds one shell page — but never a REDIRECTED response. A visitor who has not
   seen the first screen is sent from "/" to "/welcome" by the server; storing
   that under "/" would later be refused as a navigation response (a redirect
   used where none is followed), and "/" would be broken offline. */
async function addShell(cache, url) {
  const res = await fetch(new Request(url, { cache: "reload" }));
  if (res.ok && !res.redirected) await cache.put(url, res);
}

/* Drops every shell cache that is not this build's. Downloaded versions are not
   shell caches and are never dropped here. */
async function tidy() {
  await Promise.all((await caches.keys()).map((name) => {
    if (!name.startsWith(PREFIX) || name === VERSION || name.startsWith(DOWNLOAD_PREFIX)) return undefined;
    return caches.delete(name);
  }));
}

/* The build files a stored page names, so the offline screen opens with its
   styles and scripts and no connection. */
async function precacheAssetsOf(cache, path) {
  const res = await cache.match(path);
  if (!res) return;
  const html = await res.text();
  const files = new Set();
  for (const m of html.matchAll(/(?:\/_next\/)?static\/(?:chunks|media|css)\/[A-Za-z0-9._~\/-]+?\.(?:js|css|woff2?)(?![A-Za-z0-9])/g)) {
    files.add(`/_next/${m[0].replace(/^\/_next\//, "")}`);
  }
  await Promise.allSettled([...files].map(async (p) => {
    const key = abs(p);
    if (await caches.match(key)) return;
    const got = await fetch(key);
    if (got.ok) await cache.put(key, got);
  }));
}

/* The page that registers the worker has already loaded its scripts before the
   worker controls anything, so it sends their URLs across once the worker is
   ready and they are added to the cache — a first visit is enough. */
async function precache(urls) {
  const cache = await caches.open(VERSION);
  await Promise.allSettled(
    urls
      .filter((u) => typeof u === "string")
      .map((u) => new URL(u, origin))
      .filter((url) => url.origin === origin && !url.pathname.startsWith("/api/")
        && (url.pathname.startsWith("/_next/static/") || inShell(url.pathname)))
      .map((url) => {
        const key = url.pathname.startsWith("/_next/static/") ? url.origin + url.pathname : url.href;
        return cache.match(key).then((hit) => hit || fetch(url.href).then((res) => { if (res.ok && !res.redirected) return cache.put(key, res); }));
      }),
  );
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "precache" && Array.isArray(data.urls)) event.waitUntil(precache(data.urls));
  else if (data.type === "tidy") event.waitUntil(tidy());
});

function cacheable(req, url) {
  if (req.method !== "GET" || url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return false;
  // Navigations, the router's own payloads (`?_rsc=`, keyed by build so an old
  // one is simply never asked for again), the build's static files and assets.
  return req.mode === "navigate" || url.searchParams.has("_rsc") || url.pathname.startsWith("/_next/static/")
    || /\.(svg|png|webp|avif|jpe?g|ico|webmanifest|woff2?)$/.test(url.pathname);
}

/* A page, or the router's payload for one. The network wins if it answers in
   time; otherwise the cache, with the fresh copy still landing for next time.
   Only the shell's own pages are ever written. */
async function page(event, url) {
  const req = event.request;
  const navigate = req.mode === "navigate";
  const cache = await caches.open(VERSION);
  const store = inShell(url.pathname);
  const cached = await cache.match(navigate ? url.pathname : req);
  const fresh = fetch(req)
    .then((res) => {
      if (store && res && res.ok && res.type === "basic" && !res.redirected) {
        event.waitUntil(cache.put(navigate ? url.pathname : req, res.clone()));
      }
      return res;
    })
    .catch(() => null);

  const raced = cached
    ? await Promise.race([fresh, new Promise((r) => setTimeout(() => r(null), NAV_TIMEOUT_MS))])
    : await fresh;
  if (raced) return raced;
  if (cached) { event.waitUntil(fresh); return cached; }
  /* A navigation with nothing cached for it: a redirect says what actually
     happened — there is nothing here offline, here is the page that says so —
     where serving "/" under the requested URL would hand that page's document
     to a route it does not belong to. */
  if (navigate && await cache.match("/offline")) {
    return Response.redirect(abs(`/offline?from=${encodeURIComponent(url.pathname + url.search)}`), 302);
  }
  return offlineText();
}

/* A build file, an icon or a font. Content-hashed files never change under
   their own name, so they are cache-first; the rest is cache-first with a
   newer copy fetched behind it. */
async function asset(event, url) {
  const req = event.request;
  const hashed = url.pathname.startsWith("/_next/static/");
  // The `?v=` the dev server adds is noise: the same path is the same file.
  const key = hashed ? url.origin + url.pathname : req;
  const cached = await caches.match(key);
  if (cached) {
    if (!hashed) {
      event.waitUntil(fetch(req).then(async (res) => {
        if (res && res.ok && res.type === "basic") await (await caches.open(VERSION)).put(key, res);
      }).catch(() => {}));
    }
    return cached;
  }
  const res = await fetch(req).catch(() => null);
  // Only the build's own files are stored. A picture that is not part of the
  // shell is the network's, and nothing is kept (a download keeps its own).
  if (res && res.ok && res.type === "basic" && (hashed || inShell(url.pathname))) {
    const copy = res.clone();
    event.waitUntil(caches.open(VERSION).then((c) => c.put(key, copy)).catch(() => {}));
  }
  return res || offlineText();
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!cacheable(event.request, url)) return;
  event.respondWith(
    event.request.mode === "navigate" || url.searchParams.has("_rsc") ? page(event, url) : asset(event, url),
  );
});
