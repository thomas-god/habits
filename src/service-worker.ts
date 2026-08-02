/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE = `cache-${version}`;

// Only the versioned build output and static files are cached, so the app
// shell installs and loads instantly. Pages, form actions and any other
// request are left untouched and always go straight to the network — the
// service worker never serves habit data offline.
const ASSETS = new Set([...build, ...files]);

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll([...ASSETS]))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (!ASSETS.has(url.pathname)) return;

	event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});
