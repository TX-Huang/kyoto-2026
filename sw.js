// 離線用：網站本身、字型、GSAP 都存進手機。網頁本身每次背景更新，下次打開就是新版。
const CACHE = "kyoto-20261014170816";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  // 同一個網域可能還有別的專案，只清自己的舊版
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("kyoto-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  const allowed = same || /fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(url.hostname);
  if (!allowed) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: same });
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => hit);
    return same ? (hit ? (net.catch(() => {}), hit) : net) : (hit || net);
  }));
});
