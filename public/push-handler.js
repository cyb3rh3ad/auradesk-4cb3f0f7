// Push notification handler for AuraDesk PWA/Web
// This file is imported by the Workbox-generated service worker

self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "AuraDesk", body: event.data ? event.data.text() : "New notification" };
  }

  const title = data.title || "AuraDesk";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: data.data || data,
    tag: data.tag || "auradesk-" + Date.now(),
    renotify: true,
    actions: [],
  };

  // Add actions based on notification type
  if (data.data?.type === "call") {
    options.actions = [
      { action: "accept", title: "Accept" },
      { action: "decline", title: "Decline" },
    ];
    options.requireInteraction = true;
    options.tag = "auradesk-call";
  } else if (data.data?.type === "message") {
    options.actions = [
      { action: "reply", title: "Open Chat" },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const data = event.notification.data || {};
  let url = "/";

  if (data.type === "message" && data.conversationId) {
    url = "/#/chat?conversation=" + data.conversationId;
  } else if (data.type === "call" && data.conversationId) {
    url = "/#/chat?conversation=" + data.conversationId;
  } else if (data.type === "meeting" && data.meetingId) {
    url = "/#/meetings?room=" + data.meetingId;
  } else if (data.type === "team") {
    url = "/#/teams";
  } else {
    url = "/#/dashboard";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // Focus existing window if available
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
