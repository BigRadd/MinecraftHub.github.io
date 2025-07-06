// sw.js (Service Worker)
const CACHE_NAME = 'minecraft-hub-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    // Tus archivos CSS, JS que quieras cachear estáticamente
    'styles.css', // Asumiendo que styles.css está en la raíz
    'script.js',  // Asumiendo que script.js está en la raíz
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    // Puedes añadir más rutas a tus imágenes, fuentes, etc. aquí para cachearlas:
    // Por ejemplo, si tu logo está en la raíz:
    // '/img/logo.jpg', 
    // Y tus avatares predefinidos, si quieres que estén siempre disponibles offline:
    'https://i.ibb.co/5WF3JMwB/IMG-20250626-WA0080.jpg', 
    'https://i.ibb.co/RT2rBhfq/IMG-20250626-WA0073.jpg',
    'https://i.ibb.co/7xr0HW79/IMG-20250626-WA0072.jpg',
    'https://i.ibb.co/Kx0XcWHj/IMG-20250626-WA0070.jpg',
    'https://i.ibb.co/239SGW4x/IMG-20250626-WA0068.jpg',
    // Asegúrate de que todas las URLs que están en urlsToCache sean accesibles y no den 403, 404, etc.
    // Si alguna de estas URLs de imágenes de avatars diera 403 en el futuro,
    // también tendrías que considerarlas en la exclusión de dominios si es un problema persistente de i.ibb.co.
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
                // Si la instalación falla debido a un archivo inaccesible, el Service Worker no se instalará.
                // Es crucial que urlsToCache solo contenga archivos que se puedan cachear.
            })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // IMPORTANTE: Excluir peticiones a dominios de Google Ads y otros servicios externos si dan problemas.
    // Esto evita que el Service Worker intente cachear o procesar respuestas de errores (como 403).
    if (
        url.hostname === 'pagead2.googlesyndication.com' ||
        url.hostname === 'googleads.g.doubleclick.net' ||
        url.hostname === 'tpc.googlesyndication.com' // Otro dominio común de Google Ads
        // Añade aquí cualquier otro dominio que esté dando errores 403 que no necesites cachear.
    ) {
        return fetch(event.request); // Simplemente pasa la petición directamente a la red.
    }

    // Estrategia de caché: Cache First, then Network
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
                // Aquí podrías servir una página de "offline" si quisieras,
                // por ejemplo, si la red no está disponible y no hay caché para la petición.
                // return caches.match('/offline.html');
            })
    );
});

self.addEventListener('activate', event => {
    console.log('[Service Worker] Activando Service Worker...');
    const cacheWhitelist = [CACHE_NAME]; // Asegúrate de que solo la caché actual esté en la lista blanca
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