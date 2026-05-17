self.addEventListener('push', function(e) {
    const data = e.data ? e.data.json() : { title: 'Loop-Landing', body: 'Nueva notificación' };
    e.waitUntil(
        self.registration.showNotification(data.title || 'Loop-Landing.com', {
            body: data.body || '',
            icon: '/logo-rflx.png',
            badge: '/logo-rflx.png',
            data: { url: data.url || '/dashboard' }
        })
    );
});

self.addEventListener('notificationclick', function(e) {
    e.notification.close();
    e.waitUntil(clients.openWindow(e.notification.data.url || '/dashboard'));
});
