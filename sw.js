/* ============================================================
   Aman Study Point — ⚡ SPEED Service Worker (sw.js)
   ------------------------------------------------------------
   Maksad: "click krde hi page khul jave"
   1. Pages: network-first (400ms timeout) → network fast = fresh,
      network slow = CACHED page turant (phir background vich update)
   2. /assets/ (icons, banners): cache-first — kabhi dobara download nahi
   3. 🔒 KABHI NAHI chherde: /api/* (payment!), /pay.html, admin pages
   4. Sirf apni site (same-origin) — Firebase/CDN apne network cache ton
   5. Offline: cached page + nahin ta "internet nahi" message
   ============================================================ */

const VERSION = "asp-sw-v2";
const TIMEOUT_MS = 400;

/* Core pages — pehli visit te background vich cache (page load ton baad) */
const CORE = [
  "/",
  "/index.html",
  "/tests.html",
  "/login.html",
  "/jobs.html",
  "/progress.html",
  "/current-affairs.html",
  "/reader.html",
  "/privacy.html",
  "/terms.html",
  "/reset-password.html",
  "/app.js",
  "/manifest.json",
  "/assets/icon-192.png",
  "/assets/favicon.ico"
];

/* 🔒 Eh raahe SW di reach ton BAAHR (fresh hona zaroori):
   - /api/* → payment/quiz server calls (kabhi cache nahi)
   - /pay.html → live payment page (order id URL vich)
   - admin pages → hamesha fresh
*/
const SKIP = ["/api/", "/pay.html", "/admin.html", "/ca-admin.html", "/cleanup.html", "/debug.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.allSettled(CORE.map((u) => cache.add(u)))
    ).then(() => self.skipWaiting()).catch(() => {})
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .catch(() => {})
  );
});

function rejectAfter(ms) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error("sw-timeout")), ms));
}

/* Pages/JS: network-first (400ms) → cache fallback + background update */
async function networkFirst(request, cacheKey) {
  const cache = await caches.open(VERSION);
  const fetchPromise = fetch(request);
  try {
    const res = await Promise.race([fetchPromise, rejectAfter(TIMEOUT_MS)]);
    if (res && res.ok) {
      try { cache.put(cacheKey, res.clone()); } catch (e) {}
    }
    return res;
  } catch (err) {
    /* network slow/fail → cached page turant, background vich update */
    fetchPromise.then((r) => { if (r && r.ok) { try { cache.put(cacheKey, r.clone()); } catch (e) {} } }).catch(() => {});
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    /* cache vi nahi → network da intezaar (pehli vaar vargon) */
    return fetchPromise;
  }
}

/* Images/assets: cache-first (bg update) — dobara download nahi */
async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request).then((r) => { if (r && r.ok) { try { cache.put(request, r.clone()); } catch (e) {} } }).catch(() => {});
    return cached;
  }
  const res = await fetch(request);
  if (res && res.ok) { try { cache.put(request, res.clone()); } catch (e) {} }
  return res;
}

const OFFLINE_HTML = '<!DOCTYPE html><html lang="pa"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ਇੰਟਰਨੈੱਟ ਨਹੀਂ — Aman Study Point</title></head><body style="font-family:sans-serif; text-align:center; padding:60px 20px;"><div style="font-size:3rem;">📡</div><h2>ਇੰਟਰਨੈੱਟ ਕੁਨੈਕਸ਼ਨ ਨਹੀਂ ਹੈ</h2><p style="color:#888;">ਇੰਟਰਨੈੱਟ ਚਾਲੂ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ</p><button onclick="location.reload()" style="padding:12px 24px; background:#e8590c; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">🔄 ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼</button></body></html>';

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;      /* sirf apni site */
  if (SKIP.some((p) => url.pathname.startsWith(p))) return; /* 🔒 payment/admin fresh */
  if (url.pathname === "/sw.js") return;

  /* assets: cache-first */
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(cacheFirst(req).catch(() => fetch(req)));
    return;
  }

  /* pages + js: navigation da key = pathname (query hata ke — reader.html?id= wagaira) */
  const isNavigate = req.mode === "navigate";
  const cacheKey = isNavigate ? url.pathname : req;
  e.respondWith(
    networkFirst(req, cacheKey).catch(() => {
      if (isNavigate) {
        return new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      return fetch(req).catch(() => new Response("", { status: 504 }));
    })
  );
});
