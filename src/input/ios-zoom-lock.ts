type ZoomLockNavigator = Pick<
	Navigator,
	'maxTouchPoints' | 'platform' | 'userAgent'
>

type ZoomLockTarget = Pick<Window, 'addEventListener'> & {
	document: Pick<Document, 'addEventListener'>
	navigator: ZoomLockNavigator
}

type MultiTouchEvent = Event & {
	touches?: { length: number }
}

const installedTargets = new WeakSet<object>()

export function isIosTouchDevice(navigatorLike: ZoomLockNavigator): boolean {
	const userAgent = navigatorLike.userAgent
	const platform = navigatorLike.platform
	const maxTouchPoints = navigatorLike.maxTouchPoints

	return (
		/iPad|iPhone|iPod/.test(userAgent) ||
		(platform === 'MacIntel' && maxTouchPoints > 1)
	)
}

export function installIosZoomLock(target: ZoomLockTarget = window): void {
	if (installedTargets.has(target) || !isIosTouchDevice(target.navigator)) {
		return
	}

	installedTargets.add(target)

	const options = { passive: false }
	const preventGestureZoom = (event: Event) => {
		event.preventDefault()
	}
	const preventMultiTouchZoom = (event: MultiTouchEvent) => {
		if ((event.touches?.length ?? 0) > 1) {
			event.preventDefault()
		}
	}

	target.addEventListener('gesturestart', preventGestureZoom, options)
	target.addEventListener('gesturechange', preventGestureZoom, options)
	target.addEventListener('gestureend', preventGestureZoom, options)
	target.document.addEventListener('touchmove', preventMultiTouchZoom, options)
}
