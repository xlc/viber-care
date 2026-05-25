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
const doubleTapZoomDelayMs = 300

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
	let lastTouchEndAt = Number.NEGATIVE_INFINITY

	const preventDefault = (event: Event) => {
		if (event.cancelable !== false) {
			event.preventDefault()
		}
	}
	const preventMultiTouchZoom = (event: MultiTouchEvent) => {
		if ((event.touches?.length ?? 0) > 1) {
			preventDefault(event)
		}
	}
	const preventDoubleTapZoom = (event: Event) => {
		if (event.timeStamp - lastTouchEndAt <= doubleTapZoomDelayMs) {
			preventDefault(event)
		}
		lastTouchEndAt = event.timeStamp
	}

	target.addEventListener('gesturestart', preventDefault, options)
	target.addEventListener('gesturechange', preventDefault, options)
	target.addEventListener('gestureend', preventDefault, options)
	target.document.addEventListener('touchstart', preventMultiTouchZoom, options)
	target.document.addEventListener('touchmove', preventMultiTouchZoom, options)
	target.document.addEventListener('touchend', preventDoubleTapZoom, options)
}
