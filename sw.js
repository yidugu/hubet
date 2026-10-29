/* ንባብ Hub — Service Worker (Vercel + GitHub Pages ላይ ይሰራል፤ ሁሉም መንገዶች ከ sw.js አካባቢ አንጻራዊ ናቸው)
   ስሪቱን ለማደስ VERSION ቀይር። */
var VERSION = "nibab-v1";
var SHELL = VERSION + "-shell";
var LIBS = VERSION + "-libs";
var ROOT = new URL("./", self.location).href;

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      return c.add(new Request(ROOT, { cache: "reload" })).catch(function () {});
    })
  );
  /* አዲስ ስሪት እስከ ተጠቃሚው "አድስ" እስኪል ይጠብቃል (index.html SKIP_WAITING ይልካል) */
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf(VERSION) !== 0; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

function isLib(url) {
  return /(^|\.)cdnjs\.cloudflare\.com$|(^|\.)cdn\.jsdelivr\.net$|(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (req.headers.has("range")) return;

  /* ገጽ (navigation): መጀመሪያ ኔትወርክ፣ ከሌለ የተቀመጠው */
  if (req.mode === "navigate" && url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) { var cp = res.clone(); caches.open(SHELL).then(function (c) { c.put(ROOT, cp); }); }
        return res;
      }).catch(function () {
        return caches.match(ROOT).then(function (r) { return r || caches.match(req); }).then(function (r) { return r || Response.error(); });
      })
    );
    return;
  }

  /* /api/pdf፣ Firebase፣ EmailJS፣ ሰዓት API ወዘተ — በጭራሽ አይነካም */
  if (url.origin === self.location.origin && url.pathname.indexOf("/api/") !== -1) return;

  /* PDF.js እና ፎንቶች (CDN): አስቀድሞ የተቀመጠ + ጀርባ ላይ ማደስ */
  if (isLib(url) || (url.origin === self.location.origin && /\.(?:png|jpe?g|svg|webp|ico|woff2?|css|js)$/i.test(url.pathname))) {
    e.respondWith(
      caches.open(LIBS).then(function (c) {
        return c.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) {
            if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
  }
});
