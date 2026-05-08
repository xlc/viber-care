const CACHE_NAME = 'word-garden-static-v2'
const CACHE_PREFIX = 'word-garden-static-'
const INDEX_URL = '/index.html'
const APP_SHELL = [
	'/',
	INDEX_URL,
	'/manifest.webmanifest',
	'/icons/word-garden.svg',
]

function isSameOriginGet(request) {
	return (
		request.method === 'GET' &&
		new URL(request.url).origin === self.location.origin
	)
}

function isNavigationRequest(request) {
	return (
		request.mode === 'navigate' ||
		request.destination === 'document' ||
		request.headers.get('accept')?.includes('text/html')
	)
}

function isCacheableResponse(response) {
	return response?.status === 200 && response.type === 'basic'
}

function isOutdatedWordGardenCache(key) {
	return key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME
}

async function fetchAndCache(request) {
	const response = await fetch(request)
	if (isCacheableResponse(response)) {
		const cache = await caches.open(CACHE_NAME)
		await cache.put(request, response.clone())
	}
	return response
}

async function cacheFirst(request) {
	const cached = await caches.match(request)
	if (cached) {
		return cached
	}
	return fetchAndCache(request)
}

async function navigationNetworkFirst(request) {
	try {
		return await fetchAndCache(request)
	} catch {
		const cached = await caches.match(request)
		if (cached) {
			return cached
		}
		return (await caches.match(INDEX_URL)) ?? Response.error()
	}
}

async function deleteOutdatedCaches() {
	const keys = await caches.keys()
	const shouldReloadClients = keys.some(isOutdatedWordGardenCache)
	await Promise.all(
		keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
	)
	return shouldReloadClients
}

async function reloadWindowClients() {
	const windowClients = await self.clients.matchAll({ type: 'window' })
	await Promise.all(
		windowClients.map((client) => {
			if (new URL(client.url).origin !== self.location.origin) {
				return undefined
			}

			return client.navigate(client.url).catch(() => undefined)
		}),
	)
}

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
		deleteOutdatedCaches()
			.then((shouldReloadClients) =>
				self.clients.claim().then(() => shouldReloadClients),
			)
			.then((shouldReloadClients) =>
				shouldReloadClients ? reloadWindowClients() : undefined,
			),
	)
})

self.addEventListener('fetch', (event) => {
	const request = event.request
	if (!isSameOriginGet(request)) {
		return
	}

	event.respondWith(
		isNavigationRequest(request)
			? navigationNetworkFirst(request)
			: cacheFirst(request),
	)
})
