import type { LearningPresentation } from '../learning/engine'

const speechLanguageMap: Record<string, string> = {
	en: 'en-US',
	'zh-Hans': 'zh-CN',
}

let activeAudio: HTMLAudioElement | null = null
let playbackRun = 0

export function speakSequence(
	sequence: LearningPresentation[],
	muted: boolean,
): void {
	if (muted || typeof window === 'undefined') {
		return
	}

	const runId = ++playbackRun
	stopCurrentSpeech()

	void playSequence(sequence, runId)
}

function stopCurrentSpeech(): void {
	activeAudio?.pause()
	activeAudio = null

	if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
		window.speechSynthesis.cancel()
	}
}

async function playSequence(
	sequence: LearningPresentation[],
	runId: number,
): Promise<void> {
	for (const item of sequence) {
		if (runId !== playbackRun) {
			return
		}

		const playedAudio = await playStaticAudio(item, runId)
		if (!playedAudio && runId === playbackRun) {
			await speakWithBrowserVoice(item, runId)
		}
	}
}

async function playStaticAudio(
	item: LearningPresentation,
	runId: number,
): Promise<boolean> {
	if (!item.audioPath || typeof Audio === 'undefined') {
		return false
	}

	const audio = new Audio(item.audioPath)
	audio.volume = 0.72
	activeAudio = audio

	try {
		await audio.play()
		let completed = false
		await new Promise<void>((resolve) => {
			audio.addEventListener(
				'ended',
				() => {
					completed = true
					resolve()
				},
				{ once: true },
			)
			audio.addEventListener('error', () => resolve(), { once: true })
			audio.addEventListener('pause', () => resolve(), { once: true })
		})
		return completed && runId === playbackRun
	} catch {
		return false
	} finally {
		if (activeAudio === audio) {
			activeAudio = null
		}
	}
}

async function speakWithBrowserVoice(
	item: LearningPresentation,
	runId: number,
): Promise<void> {
	if (
		typeof window === 'undefined' ||
		!('speechSynthesis' in window) ||
		typeof SpeechSynthesisUtterance === 'undefined'
	) {
		return
	}

	const utterance = new SpeechSynthesisUtterance(item.audioText)
	utterance.lang =
		speechLanguageMap[item.resolvedLanguage] ?? item.resolvedLanguage
	utterance.rate = 0.82
	utterance.pitch = 1.05
	utterance.volume = 0.72

	await new Promise<void>((resolve) => {
		utterance.addEventListener('end', () => resolve(), { once: true })
		utterance.addEventListener('error', () => resolve(), { once: true })
		if (runId !== playbackRun) {
			resolve()
			return
		}
		window.speechSynthesis.speak(utterance)
	})
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
