// 離線用：網站本身、字型、GSAP 都存進手機。網頁本身每次背景更新，下次打開就是新版。
const CACHE = "kyoto-20261021130510";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
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
  if (same && url.pathname.endsWith("/version.json")) return; // 版本號一定要問網路，不能用存在手機的
  if (same && req.mode === "navigate") {
    // 打開網站：有網路就先拿新版（打開一次就是最新的）；網路太慢（4 秒）或沒網路才用手機裡存的
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = c.match(req, { ignoreSearch: true }).then(h => h || c.match("./"));
      const net = fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; });
      const slow = new Promise(r => setTimeout(r, 4000)).then(() => hit).then(h => h || net);
      return Promise.race([net, slow]).catch(() => hit).then(res => res || hit);
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: same });
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => hit);
    return same ? (hit ? (net.catch(() => {}), hit) : net) : (hit || net);
  }));
});
