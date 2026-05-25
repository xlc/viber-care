import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { speakSequence, stopSpeech } from './audio/speech'
import { CardMode } from './components/CardMode'
import { HomeScreen } from './components/HomeScreen'
import { ParentSettings } from './components/ParentSettings'
import { StoryMode } from './components/StoryMode'
import { catalog } from './content/catalog'
import type { LanguageCode, LocalizedAudio } from './content/schema'
import {
	loadSettings,
	type StoryAppSettings,
	saveSettings,
} from './state/settings'
import {
	getAudioPath,
	getCardAudioSequence,
	getInitialScene,
	getLearnableItems,
	getOrderedScenes,
	getPack,
	getSceneIndex,
	getStoryItem,
} from './story/pack-selection'

type Screen = 'home' | 'story' | 'cards'

export function App() {
	const [settings, setSettings] = useState<StoryAppSettings>(() =>
		loadSettings(
			typeof window === 'undefined' ? undefined : window.localStorage,
		),
	)
	const [screen, setScreen] = useState<Screen>('home')
	const [settingsOpen, setSettingsOpen] = useState(false)
	const [cardIndex, setCardIndex] = useState(0)
	const [activeStoryItemKey, setActiveStoryItemKey] = useState<string | null>(
		null,
	)
	const storyItemTimer = useRef<number | undefined>(undefined)

	const activePack = getPack(catalog, settings.selectedPackId)
	const scene = getInitialScene(activePack, settings.lastSceneId)
	const scenes = useMemo(() => getOrderedScenes(activePack), [activePack])
	const sceneIndex = Math.max(getSceneIndex(activePack, scene.id), 0)
	const cardItems = useMemo(() => getLearnableItems(activePack), [activePack])
	const activeCard = cardItems[cardIndex] ?? cardItems[0]

	useEffect(() => {
		saveSettings(
			typeof window === 'undefined' ? undefined : window.localStorage,
			settings,
		)
	}, [settings])

	useEffect(() => {
		if (activePack.id !== settings.selectedPackId) {
			updateSettings({ selectedPackId: activePack.id, lastSceneId: null })
		}
	}, [activePack.id, settings.selectedPackId])

	useEffect(() => {
		if (settings.muted) {
			stopSpeech()
		}
	}, [settings.muted])

	useEffect(() => {
		window.scrollTo({ top: 0 })
	}, [screen, scene.id, cardIndex])

	useEffect(() => {
		setActiveStoryItemKey(null)
		clearStoryItemTimer()
	}, [scene.id])

	useEffect(() => {
		return () => clearStoryItemTimer()
	}, [])

	function updateSettings(partial: Partial<StoryAppSettings>) {
		setSettings((current) => ({ ...current, ...partial }))
	}

	function selectPack(packId: string) {
		updateSettings({
			selectedPackId: packId,
			lastSceneId: null,
		})
		setCardIndex(0)
	}

	function startStory(packId: string) {
		const nextPack = getPack(catalog, packId)
		const nextScene = getInitialScene(nextPack, null)
		stopSpeech()
		selectPack(packId)
		setScreen('story')
		playSceneNarration(nextScene.narration)
	}

	function startCards(packId: string) {
		stopSpeech()
		selectPack(packId)
		setScreen('cards')
	}

	function changeLanguage(language: LanguageCode) {
		stopSpeech()
		updateSettings({ language })
	}

	function returnHome() {
		stopSpeech()
		setScreen('home')
	}

	function playSceneNarration(narration: LocalizedAudio) {
		speakSequence(
			[{ audioPath: getAudioPath(narration, settings.language) }],
			settings.muted,
		)
	}

	function replayScene() {
		playSceneNarration(scene.narration)
	}

	function speakStoryItem(sceneItemId: string) {
		const sceneItem = scene.items.find((item) => item.itemId === sceneItemId)
		if (!sceneItem) {
			return
		}

		const item = getStoryItem(activePack, sceneItem)
		if (!item) {
			return
		}

		const activeKey = `${scene.id}:${sceneItem.itemId}`
		clearStoryItemTimer()
		setActiveStoryItemKey(activeKey)
		storyItemTimer.current = window.setTimeout(() => {
			setActiveStoryItemKey((current) =>
				current === activeKey ? null : current,
			)
			storyItemTimer.current = undefined
		}, 900)
		speakSequence(
			[{ audioPath: getAudioPath(item.wordAudio, settings.language) }],
			settings.muted,
		)
	}

	function speakCard() {
		if (!activeCard) {
			return
		}
		speakSequence(getCardAudioSequence(activeCard), settings.muted)
	}

	function selectScene(offset: number) {
		const nextScene = scenes[sceneIndex + offset]
		if (!nextScene) {
			return
		}
		stopSpeech()
		updateSettings({ lastSceneId: nextScene.id })
		playSceneNarration(nextScene.narration)
	}

	function selectCard(offset: number) {
		if (cardItems.length === 0) {
			return
		}
		setCardIndex(
			(current) => (current + offset + cardItems.length) % cardItems.length,
		)
	}

	function clearStoryItemTimer() {
		if (storyItemTimer.current === undefined) {
			return
		}
		window.clearTimeout(storyItemTimer.current)
		storyItemTimer.current = undefined
	}

	return (
		<div className="app-shell" data-testid="app-shell" data-screen={screen}>
			<header className="top-bar">
				<button
					type="button"
					className="brand-button"
					data-testid="home-button"
					onClick={returnHome}
				>
					Word Garden
				</button>
				<div className="top-actions">
					<button
						type="button"
						className="icon-button"
						aria-label={settings.muted ? 'Unmute' : 'Mute'}
						aria-pressed={settings.muted}
						data-testid="mute-button"
						onClick={() => updateSettings({ muted: !settings.muted })}
					>
						{settings.muted ? 'Muted' : 'Sound'}
					</button>
					<button
						type="button"
						className="icon-button"
						aria-label="Parent settings"
						data-testid="settings-button"
						onClick={() => setSettingsOpen(true)}
					>
						Settings
					</button>
				</div>
			</header>

			{screen === 'home' ? (
				<HomeScreen
					language={settings.language}
					packs={catalog.packs}
					selectedPackId={activePack.id}
					onLanguageChange={changeLanguage}
					onSelectPack={selectPack}
					onStartCards={startCards}
					onStartStory={startStory}
				/>
			) : null}

			{screen === 'story' ? (
				<StoryMode
					activeItemKey={activeStoryItemKey}
					canGoNext={sceneIndex < scenes.length - 1}
					canGoPrevious={sceneIndex > 0}
					language={settings.language}
					pack={activePack}
					scene={scene}
					sceneCount={scenes.length}
					sceneIndex={sceneIndex}
					onBack={returnHome}
					onLanguageChange={changeLanguage}
					onNext={() => selectScene(1)}
					onPrevious={() => selectScene(-1)}
					onReplay={replayScene}
					onSpeakItem={speakStoryItem}
				/>
			) : null}

			{screen === 'cards' && activeCard ? (
				<CardMode
					activeItem={activeCard}
					cardIndex={cardIndex}
					items={cardItems}
					language={settings.language}
					pack={activePack}
					onBack={returnHome}
					onNext={() => selectCard(1)}
					onPrevious={() => selectCard(-1)}
					onSpeak={speakCard}
				/>
			) : null}

			{settingsOpen ? (
				<ParentSettings
					language={settings.language}
					muted={settings.muted}
					onClose={() => setSettingsOpen(false)}
					onLanguageChange={changeLanguage}
					onMutedChange={(muted) => updateSettings({ muted })}
				/>
			) : null}
		</div>
	)
}
