self.addEventListener("push", (event) => {
  let data = { title: "MAVERICK", body: "You have a new message.", url: "/admin/inquiries", tag: "maverick-message" };
  try { data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/brand/maverick-m.jpg",
    badge: "/brand/maverick-m.jpg",
    tag: data.tag,
    data: { url: data.url },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const open = windows.find((w) => w.url === target);
    return open ? open.focus() : clients.openWindow(target);
  }));
});
