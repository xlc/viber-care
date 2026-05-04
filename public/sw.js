const CACHE_NAME = 'word-garden-static-v1'
const APP_SHELL = [
	'/',
	'/index.html',
	'/manifest.webmanifest',
	'/catalog.generated.json',
	'/icons/word-garden.svg',
]

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(APP_SHELL))
			.then(() => self.skipWaiting()),
	)
})

self.addEventListener('activate', (event) => {
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
	)
})

self.addEventListener('fetch', (event) => {
	const request = event.request
	if (
		request.method !== 'GET' ||
		new URL(request.url).origin !== self.location.origin
	) {
		return
	}

	if (request.url.endsWith('/catalog.generated.json')) {
		event.respondWith(fetch(request).catch(() => caches.match(request)))
		return
	}

	event.respondWith(
		caches.match(request).then((cached) => cached ?? fetch(request)),
	)
})
