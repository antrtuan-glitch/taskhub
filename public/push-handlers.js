// Được nạp vào service worker tự sinh (vite-plugin-pwa generateSW) qua workbox.importScripts
// Xử lý Web Push notification - generateSW không tự xử lý phần này

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Emerald Task", {
      body: data.body,
      icon: data.icon ?? "/icons/icon-192.png",
      badge: data.badge ?? "/icons/badge-72.png",
      tag: data.tag,
      data: data.data,
      vibrate: [200, 100, 200],
    })
  );
});

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
