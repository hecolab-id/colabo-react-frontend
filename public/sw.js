const SW_VERSION = "colabo-pwa-v2";
const STATIC_CACHE = `${SW_VERSION}-static`;
const ASSET_CACHE = `${SW_VERSION}-assets`;
const API_CACHE = `${SW_VERSION}-api`;
const API_CACHE_TTL_MS = 15 * 60 * 1000;
const OFFLINE_URL = "/offline";
const OFFLINE_FALLBACK_URL = "/offline.html";
const OFFLINE_SUPPORTED_PATHS = new Set([
    "/dashboard",
    "/my-tasks",
    OFFLINE_URL,
]);
const PRECACHE_URLS = [
    OFFLINE_FALLBACK_URL,
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-maskable-512.png",
    "/favicon.ico",
];

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(PRECACHE_URLS);
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter((cacheName) => ![STATIC_CACHE, ASSET_CACHE, API_CACHE].includes(cacheName))
                .map((cacheName) => caches.delete(cacheName))
        );
        await self.clients.claim();
    })());
});

self.addEventListener("message", (event) => {
    if (event.data?.type !== "CLEAR_AUTH_CACHE") {
        return;
    }

    event.waitUntil((async () => {
        await caches.delete(API_CACHE);
    })());
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (request.mode === "navigate") {
        event.respondWith(handleNavigationRequest(request));
        return;
    }

    if (url.origin !== self.location.origin) {
        return;
    }

    if (isStaticAssetRequest(request, url)) {
        event.respondWith(handleStaticAssetRequest(request));
        return;
    }

    if (isCacheableApiRequest(url)) {
        event.respondWith(handleApiRequest(request));
    }
});

self.addEventListener("push", (event) => {
    const payload = parsePushPayload(event.data);
    const title = payload.title || "Colabo";
    const body = payload.body || "You have a new notification.";
    const data = payload.data || {};

    event.waitUntil(self.registration.showNotification(title, {
        body,
        tag: payload.tag || "colabo-browser-push",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: {
            ...data,
            link: payload.link || data.link || "/notifications",
        },
    }));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const link = event.notification.data?.link || "/notifications";
    const targetUrl = new URL(link, self.location.origin).toString();

    event.waitUntil((async () => {
        const clientsList = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true,
        });

        for (const client of clientsList) {
            if ("navigate" in client) {
                await client.navigate(targetUrl);
                await client.focus();
                return;
            }
        }

        await self.clients.openWindow(targetUrl);
    })());
});

async function handleNavigationRequest(request) {
    const url = new URL(request.url);
    const cache = await caches.open(STATIC_CACHE);

    try {
        const response = await fetch(request);

        if (response.ok && OFFLINE_SUPPORTED_PATHS.has(url.pathname)) {
            await cache.put(request, response.clone());
        }

        return response;
    } catch {
        if (OFFLINE_SUPPORTED_PATHS.has(url.pathname)) {
            const cachedResponse = await cache.match(request, { ignoreSearch: true });
            if (cachedResponse) {
                return cachedResponse;
            }
        }

        const offlineResponse = await cache.match(OFFLINE_FALLBACK_URL);
        return offlineResponse || Response.error();
    }
}

async function handleStaticAssetRequest(request) {
    const cache = await caches.open(ASSET_CACHE);
    const cachedResponse = await cache.match(request);

    const networkPromise = fetch(request).then((response) => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    });

    return cachedResponse || networkPromise.catch(() => Response.error());
}

async function handleApiRequest(request) {
    try {
        const response = await fetch(request);

        if (response.ok) {
            await putApiCache(request, response.clone());
        }

        return response;
    } catch (error) {
        const cachedResponse = await matchFreshApiCache(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

function isCacheableApiRequest(url) {
    return url.pathname.startsWith("/v1/")
        && !url.pathname.includes("/auth/refresh")
        && !url.pathname.includes("/logout");
}

function isStaticAssetRequest(request, url) {
    if (request.destination && ["script", "style", "image", "font", "manifest"].includes(request.destination)) {
        return true;
    }

    return /^\/assets\//.test(url.pathname)
        || /^\/icons\//.test(url.pathname)
        || ["/favicon.ico", "/manifest.webmanifest", "/logo.webp"].includes(url.pathname);
}

function parsePushPayload(data) {
    if (!data) {
        return {};
    }

    try {
        return data.json();
    } catch {
        return { body: data.text() };
    }
}

function getMetadataRequest(request) {
    const separator = request.url.includes("?") ? "&" : "?";
    return new Request(`${request.url}${separator}__colabo_sw_meta=1`);
}

async function putApiCache(request, response) {
    const cache = await caches.open(API_CACHE);
    await cache.put(request, response);
    await cache.put(getMetadataRequest(request), new Response(String(Date.now())));
}

async function matchFreshApiCache(request) {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);

    if (!cachedResponse) {
        return null;
    }

    const metadataResponse = await cache.match(getMetadataRequest(request));
    const cachedAt = metadataResponse ? Number(await metadataResponse.text()) : 0;

    if (!cachedAt || Date.now() - cachedAt > API_CACHE_TTL_MS) {
        await cache.delete(request);
        await cache.delete(getMetadataRequest(request));
        return null;
    }

    return cachedResponse;
}
