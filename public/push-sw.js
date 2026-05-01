// Service Worker dedicado a Web Push (Delle)
// Escopo independente para não conflitar com o SW do PWA (Workbox)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Delle', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Delle';
  const options = {
    body: data.body || '',
    icon: '/doka-logo.png',
    badge: '/doka-logo.png',
    tag: data.tag || `delle-${Date.now()}`,
    renotify: true,
    requireInteraction: true, // persistente
    silent: false,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/notificacoes',
      notification_id: data.notification_id || null,
      tipo: data.tipo || 'info',
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Dispensar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/notificacoes';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
