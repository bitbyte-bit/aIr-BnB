const CACHE_NAME = 'vitu-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      // If not in cache, try to fetch from network
      return fetch(event.request).catch(() => {
        // If network fails, return a fallback response or undefined
        // For navigation requests, return the cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        // For other requests, just let it fail silently
        return undefined;
      });
    }).catch((err) => {
      console.error('[SW] Cache match error:', err);
      return undefined;
    })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Vitu', body: 'You have a new notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  // Enhanced vibration pattern for more noticeable alerts
  const notificationType = data.data?.type || 'default';

  let vibratePattern = [300, 150, 300, 150, 500];
  let sound = 'default';

  // Customize based on notification type
  switch (notificationType) {
    case 'new_item':
      // Item posted: sound and vibration
      vibratePattern = [300, 150, 300, 150, 500];
      sound = 'default';
      break;
    case 'chat':
      // Chat message: different sound and vibration
      vibratePattern = [200, 100, 200, 100, 400];
      sound = 'default'; // Different sound not supported in push notifications, this is the same
      break;
    case 'system':
    case 'success':
    case 'error':
      // System notifications: only vibration, no sound
      vibratePattern = [100, 50, 100, 50, 100];
      sound = undefined; // No sound
      break;
    default:
      // Default notification
      vibratePattern = [300, 150, 300, 150, 500];
      sound = 'default';
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    // Vibration pattern
    vibrate: vibratePattern,
    requireInteraction: true,
    // Sound - works on some platforms (Android Chrome)
    // Note: iOS Safari does not support custom sounds in push notifications
    ...(sound && { sound }),
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Handle notification click - navigate to the item or home
  const itemId = event.notification.data?.itemId;
  const urlToOpen = itemId ? `/?itemId=${itemId}` : '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});
