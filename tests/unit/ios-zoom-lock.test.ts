import { describe, expect, it } from 'vitest'
import {
	installIosZoomLock,
	isIosTouchDevice,
} from '../../src/input/ios-zoom-lock'

type Listener = (event: Event) => void

type ListenerRecord = {
	listener: Listener
	options?: AddEventListenerOptions | boolean
}

function createTarget(navigator: Navigator) {
	const windowListeners = new Map<string, ListenerRecord>()
	const documentListeners = new Map<string, ListenerRecord>()
	const target = {
		navigator,
		addEventListener(
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: AddEventListenerOptions | boolean,
		) {
			windowListeners.set(type, {
				listener: listener as Listener,
				options,
			})
		},
		document: {
			addEventListener(
				type: string,
				listener: EventListenerOrEventListenerObject,
				options?: AddEventListenerOptions | boolean,
			) {
				documentListeners.set(type, {
					listener: listener as Listener,
					options,
				})
			},
		},
	}

	return {
		documentListeners,
		target: target as Parameters<typeof installIosZoomLock>[0],
		windowListeners,
	}
}

function createNavigator(
	partial: Partial<
		Pick<Navigator, 'maxTouchPoints' | 'platform' | 'userAgent'>
	>,
): Navigator {
	return {
		maxTouchPoints: 0,
		platform: 'MacIntel',
		userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
		...partial,
	} as Navigator
}

function createPreventableEvent(touchesLength?: number) {
	return {
		defaultPrevented: false,
		preventDefault() {
			this.defaultPrevented = true
		},
		touches:
			touchesLength === undefined
				? undefined
				: {
						length: touchesLength,
					},
	} as Event & { defaultPrevented: boolean; touches?: { length: number } }
}

describe('iOS zoom lock', () => {
	it('detects iPhone and iPadOS touch devices', () => {
		expect(
			isIosTouchDevice(
				createNavigator({
					userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
				}),
			),
		).toBe(true)
		expect(
			isIosTouchDevice(
				createNavigator({
					maxTouchPoints: 5,
					platform: 'MacIntel',
				}),
			),
		).toBe(true)
		expect(isIosTouchDevice(createNavigator({ maxTouchPoints: 0 }))).toBe(false)
	})

	it('prevents iOS gesture and multi-touch zoom without blocking one finger', () => {
		const { documentListeners, target, windowListeners } = createTarget(
			createNavigator({
				userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
			}),
		)

		installIosZoomLock(target)

		expect([...windowListeners.keys()].sort()).toEqual([
			'gesturechange',
			'gestureend',
			'gesturestart',
		])
		expect(documentListeners.has('touchmove')).toBe(true)
		expect(windowListeners.get('gesturestart')?.options).toEqual({
			passive: false,
		})

		const gestureEvent = createPreventableEvent()
		windowListeners.get('gesturestart')?.listener(gestureEvent)
		expect(gestureEvent.defaultPrevented).toBe(true)

		const oneFingerTouch = createPreventableEvent(1)
		documentListeners.get('touchmove')?.listener(oneFingerTouch)
		expect(oneFingerTouch.defaultPrevented).toBe(false)

		const twoFingerTouch = createPreventableEvent(2)
		documentListeners.get('touchmove')?.listener(twoFingerTouch)
		expect(twoFingerTouch.defaultPrevented).toBe(true)
	})

	it('does not install zoom guards on non-iOS devices', () => {
		const { documentListeners, target, windowListeners } = createTarget(
			createNavigator({
				maxTouchPoints: 5,
				platform: 'Linux x86_64',
				userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
			}),
		)

		installIosZoomLock(target)

		expect(windowListeners.size).toBe(0)
		expect(documentListeners.size).toBe(0)
	})
})
