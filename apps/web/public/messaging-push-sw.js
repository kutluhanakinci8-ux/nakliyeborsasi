self.addEventListener("push", (event) => {
  let payload = { title: "Yeni mesaj", body: "", url: "/" };
  try {
    payload = { ...payload, ...event.data?.json() };
  } catch {
    payload.body = event.data?.text() ?? "";
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { url: payload.url },
      tag: "lerta-messaging",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (!url) {
    return;
  }
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
      return undefined;
    }),
  );
});
