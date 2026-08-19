/* Crew Dispatch service worker — push notifications (admin + crew) */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Crew Dispatch",
    body: "You have a new update.",
    url: "/",
  };

  try {
    if (event.data) {
      const data = event.data.json();
      payload = {
        title: data.title || payload.title,
        body: data.body || payload.body,
        url: data.url || (data.data && data.data.url) || payload.url,
      };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) payload.body = text;
    } catch {
      /* keep defaults */
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/notification-icon-192.png",
      badge: "/notification-badge.png",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";
  const absolute = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(absolute);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(absolute);
        }
      }),
  );
});
