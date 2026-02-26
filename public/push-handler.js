// Push notification handler for AuraDesk PWA/Web
// Handles both regular notifications and incoming calls

self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "AuraDesk", body: event.data ? event.data.text() : "New notification" };
  }

  const title = data.title || "AuraDesk";
  const isCall = data.data?.type === "call";

  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: data.data || data,
    tag: data.tag || (isCall ? "auradesk-call" : "auradesk-" + Date.now()),
    renotify: true,
    actions: [],
  };

  if (isCall) {
    // Call notifications: persistent, long vibration, require interaction
    options.vibrate = [300, 100, 300, 100, 300, 100, 300, 100, 300];
    options.requireInteraction = true;
    options.silent = false;
    options.actions = [
      { action: "accept", title: "✓ Accept" },
      { action: "decline", title: "✕ Decline" },
    ];
    // Override tag so repeated call pushes update the same notification
    options.tag = "auradesk-call-" + (data.data?.conversationId || "unknown");
  } else if (data.data?.type === "message") {
    options.vibrate = [100, 50, 100];
    options.actions = [
      { action: "reply", title: "Open Chat" },
    ];
  } else {
    options.vibrate = [100, 50, 100];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  const action = event.action;
  const data = event.notification.data || {};

  // If user declined the call, just close the notification
  if (action === "decline") {
    event.notification.close();
    return;
  }

  event.notification.close();

  let url = "/";

  if (data.type === "call" && data.conversationId) {
    // Accept or tap on call notification → open the chat with call flag
    url = "/#/chat?conversation=" + data.conversationId + "&incoming_call=true";
  } else if (data.type === "message" && data.conversationId) {
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
