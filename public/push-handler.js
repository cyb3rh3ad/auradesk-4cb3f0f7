// AuraDesk Push Notification Handler (Service Worker)
// Handles messages, calls, and other notifications

self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "AuraDesk", body: event.data ? event.data.text() : "New notification" };
  }

  console.log("[SW] Push received:", JSON.stringify(data));

  const title = data.title || "AuraDesk";
  const isCall = data.isCall === true || data.data?.type === "call";

  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: data.data || data,
    renotify: true,
    actions: [],
  };

  if (isCall) {
    // ── INCOMING CALL ──
    // Persistent, vibrating, requires user action
    options.tag = "auradesk-call-" + (data.data?.conversationId || "active");
    options.vibrate = [400, 100, 400, 100, 400, 100, 400, 100, 400, 100, 400];
    options.requireInteraction = true;
    options.silent = false;
    options.urgency = "high";
    options.actions = [
      { action: "accept", title: "✅ Answer" },
      { action: "decline", title: "❌ Decline" },
    ];
  } else if (data.data?.type === "message") {
    // ── NEW MESSAGE ──
    options.tag = "auradesk-msg-" + (data.data?.conversationId || Date.now());
    options.vibrate = [100, 50, 100];
    options.actions = [
      { action: "open", title: "Open Chat" },
    ];
  } else {
    // ── GENERIC NOTIFICATION ──
    options.tag = "auradesk-" + Date.now();
    options.vibrate = [100, 50, 100];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  const action = event.action;
  const data = event.notification.data || {};

  console.log("[SW] Notification click, action:", action, "data:", JSON.stringify(data));

  // Decline = just close
  if (action === "decline") {
    event.notification.close();
    return;
  }

  event.notification.close();

  let url = "/";

  if (data.type === "call" && data.conversationId) {
    // Accept or tap → open chat with incoming call flag
    url = "/chat?conversation=" + data.conversationId + "&incoming_call=true";
  } else if (data.type === "message" && data.conversationId) {
    url = "/chat?conversation=" + data.conversationId;
  } else if (data.type === "meeting" && data.meetingId) {
    url = "/meetings?room=" + data.meetingId;
  } else if (data.type === "team") {
    url = "/teams";
  } else {
    url = "/dashboard";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // Try to focus an existing window
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ("focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window if none exist
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Keep service worker alive for push events
self.addEventListener("pushsubscriptionchange", function (event) {
  console.log("[SW] Push subscription changed");
});
