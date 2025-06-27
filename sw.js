// sw.js (Service Worker)
const CACHE_NAME = 'minecraft-hub-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    // Puedes añadir más rutas a tus imágenes, fuentes, etc. aquí para cachearlas:
    // Por ejemplo, si tu logo está en la raíz:
    // '/img/logo.jpg', 
    // Y tus avatares predefinidos, si quieres que estén siempre disponibles offline:
    // 'https://i.ibb.co/5WF3JMwB/IMG-20250626-WA0080.jpg', 
    // 'https://i.ibb.co/RT2rBhfq/IMG-20250626-WA0073.jpg',
    // 'https://i.ibb.co/7xr0HW79/IMG-20250626-WA0072.jpg',
    // 'https://i.ibb.co/Kx0XcWHj/IMG-20250626-WA0070.jpg',
    // 'https://i.ibb.co/239SGW4x/IMG-20250626-WA0068.jpg',
];

self.addEventListener('install', event => {
    console.log('[Service Worker] Instalando Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Cache abierta');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('[Service Worker] Error al cachear archivos durante la instalación:', error);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si encontramos una respuesta en la caché, la devolvemos
                if (response) {
                    // console.log(`[Service Worker] Sirviendo desde caché: ${event.request.url}`);
                    return response;
                }
                // Si no está en caché, intentamos obtenerla de la red
                // console.log(`[Service Worker] Obteniendo de la red: ${event.request.url}`);
                return fetch(event.request);
            })
            .catch(error => {
                console.error('[Service Worker] Error de fetch:', error);
                // Aquí podrías servir una página de "offline" si quisieras
                // return caches.match('/offline.html');
            })
    );
});

self.addEventListener('activate', event => {
    console.log('[Service Worker] Activando Service Worker...');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log(`[Service Worker] Eliminando caché antigua: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    console.log('[Service Worker] Service Worker activado y caché antigua limpiada.');
});
