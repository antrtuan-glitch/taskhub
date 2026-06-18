// Service Worker - TaskHub PWA
// Xử lý cache offline và Web Push notifications

const CACHE_NAME = "taskhub-v1";
const STATIC_ASSETS = ["/", "/index.html"];

// Cài đặt: cache các file tĩnh
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Kích hoạt: xóa cache cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first, fallback cache
self.addEventListener("fetch", (event) => {
  // Bỏ qua Supabase API calls (không cache dữ liệu realtime)
  if (event.request.url.includes("supabase.co")) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notification nhận từ server
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "TaskHub", {
      body: data.body,
      icon: data.icon ?? "/icons/icon-192.png",
      badge: data.badge ?? "/icons/badge-72.png",
      tag: data.tag,
      data: data.data,
      vibrate: [200, 100, 200],
    })
  );
});

// Click vào notification → mở app và focus task
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const taskId = event.notification.data?.taskId;
  const url = taskId ? `/?task=${taskId}` : "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      const match = cs.find((c) => c.url.startsWith(self.location.origin));
      if (match) {
        match.focus();
        match.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
