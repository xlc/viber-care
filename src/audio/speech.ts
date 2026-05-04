import type { LearningPresentation } from '../learning/engine'

const speechLanguageMap: Record<string, string> = {
	en: 'en-US',
	'zh-Hans': 'zh-CN',
	'zh-Hant': 'zh-TW',
	es: 'es-ES',
	fr: 'fr-FR',
	ja: 'ja-JP',
	ko: 'ko-KR',
}

export function speakSequence(
	sequence: LearningPresentation[],
	muted: boolean,
): void {
	if (
		muted ||
		typeof window === 'undefined' ||
		!('speechSynthesis' in window)
	) {
		return
	}

	window.speechSynthesis.cancel()
	for (const item of sequence) {
		const utterance = new SpeechSynthesisUtterance(item.audioText)
		utterance.lang =
			speechLanguageMap[item.resolvedLanguage] ?? item.resolvedLanguage
		utterance.rate = 0.82
		utterance.pitch = 1.05
		utterance.volume = 0.72
		window.speechSynthesis.speak(utterance)
	}
}

export function playSoftTap(muted: boolean): void {
	if (muted || typeof window === 'undefined') {
		return
	}

	const browserWindow = window as typeof window & {
		webkitAudioContext?: typeof AudioContext
	}
	const AudioContextClass =
		browserWindow.AudioContext ?? browserWindow.webkitAudioContext
	if (!AudioContextClass) {
		return
	}

	const context = new AudioContextClass()
	const oscillator = context.createOscillator()
	const gain = context.createGain()

	oscillator.type = 'sine'
	oscillator.frequency.value = 523.25
	gain.gain.value = 0.025
	oscillator.connect(gain)
	gain.connect(context.destination)
	oscillator.start()
	oscillator.stop(context.currentTime + 0.09)
	oscillator.addEventListener('ended', () => {
		void context.close()
	})
}
