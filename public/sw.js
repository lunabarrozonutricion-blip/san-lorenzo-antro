const CACHE_NAME = "san-lorenzo-antro-v2";

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/logo-san-lorenzo.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  // Páginas / navegación
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });

          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);

          if (cachedPage) {
            return cachedPage;
          }

          return caches.match("/");
        }),
    );

    return;
  }

  const destination = request.destination;

  const isStaticAsset = [
    "script",
    "style",
    "font",
    "image",
    "worker",
  ].includes(destination);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkResponse = fetch(request)
          .then((response) => {
            if (
              response.ok ||
              response.type === "opaque"
            ) {
              const copy = response.clone();

              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, copy);
              });
            }

            return response;
          });

        return cachedResponse || networkResponse;
      }),
    );

    return;
  }

  // Otros GET del mismo sitio
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }

          return response;
        })
        .catch(() => caches.match(request)),
    );
  }
});
