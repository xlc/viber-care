export type AudioCue = {
	audioPath?: string
}

let activeAudio: HTMLAudioElement | null = null
let playbackRun = 0

export function speakSequence(sequence: AudioCue[], muted: boolean): void {
	if (muted || typeof window === 'undefined') {
		return
	}

	const runId = ++playbackRun
	stopCurrentSpeech()

	void playSequence(sequence, runId)
}

export function stopSpeech(): void {
	playbackRun += 1
	stopCurrentSpeech()
}

function stopCurrentSpeech(): void {
	activeAudio?.pause()
	activeAudio = null
}

async function playSequence(
	sequence: AudioCue[],
	runId: number,
): Promise<void> {
	for (const item of sequence) {
		if (runId !== playbackRun) {
			return
		}

		await playStaticAudio(item)
	}
}

async function playStaticAudio(item: AudioCue): Promise<void> {
	if (!item.audioPath || typeof Audio === 'undefined') {
		return
	}

	const audio = new Audio(item.audioPath)
	audio.volume = 0.72
	activeAudio = audio

	try {
		await audio.play()
		await new Promise<void>((resolve) => {
			audio.addEventListener('ended', () => resolve(), { once: true })
			audio.addEventListener('error', () => resolve(), { once: true })
			audio.addEventListener('pause', () => resolve(), { once: true })
		})
	} catch {
		return
	} finally {
		if (activeAudio === audio) {
			activeAudio = null
		}
	}
}
