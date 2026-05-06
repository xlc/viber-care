import type { JSX } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { playSoftTap, speakSequence } from './audio/speech'
import { catalog } from './content/catalog'
import {
	LEARNING_LEVELS,
	type LearningLevel,
	type ObjectConcept,
	type RuntimeCatalog,
	type Scene,
} from './content/schema'
import {
	createFindRound,
	type FindRound,
	handleFindTap,
} from './game/find-mode'
import {
	buildLearningSequence,
	buildStorySequence,
	getDefaultScene,
	getFindPrompt,
	getPack,
	getSuccessPhrase,
	type LearningPresentation,
} from './learning/engine'
import {
	DEFAULT_SETTINGS,
	type GameMode,
	LANGUAGE_ORDER_PRESETS,
	type LanguageOrderPreset,
	loadSettings,
	saveSettings,
	type WordGardenSettings,
} from './state/settings'

const presetLabels: Record<LanguageOrderPreset, string> = {
	'en-only': 'English only',
	'zh-only': 'Chinese only',
	'en-then-zh': 'English then Chinese',
	'zh-then-en': 'Chinese then English',
}

const modeLabels: Record<GameMode, string> = {
	explore: 'Explore',
	find: 'Find',
	story: 'Story',
}

type PlacementWithObject = Scene['objects'][number] & {
	object: ObjectConcept
}

type ToastKind = 'hello' | 'word' | 'find' | 'success' | 'story'

type ToastState = {
	kind: ToastKind
	sequence: LearningPresentation[]
}

function useCatalog(): { catalog: RuntimeCatalog; error: null } {
	return { catalog, error: null }
}

function getPlacements(
	catalog: RuntimeCatalog,
	packId: string,
	sceneId?: string,
): PlacementWithObject[] {
	const pack = getPack(catalog, packId)
	const scene =
		pack.scenes.find((candidate) => candidate.id === sceneId) ??
		getDefaultScene(catalog, packId)
	const objectMap = new Map(pack.objects.map((object) => [object.id, object]))

	return scene.objects
		.map((placement) => {
			const object = objectMap.get(placement.objectId)
			return object ? { ...placement, object } : null
		})
		.filter((placement): placement is PlacementWithObject => Boolean(placement))
}

function preloadSceneAssets(scene: Scene, placements: PlacementWithObject[]) {
	const paths = [
		scene.background.asset?.path,
		...placements.map((placement) => placement.object.image.path),
	].filter((path): path is string => Boolean(path))

	for (const path of paths) {
		const image = new Image()
		image.decoding = 'async'
		image.src = path
	}
}

function Icon({
	name,
}: {
	name: 'gear' | 'volume' | 'muted' | 'close' | 'previous' | 'next'
}) {
	const common = {
		width: 22,
		height: 22,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 2.2,
		strokeLinecap: 'round',
		strokeLinejoin: 'round',
		'aria-hidden': true,
	} as const

	if (name === 'gear') {
		return (
			<svg {...common}>
				<title>Settings</title>
				<path d="M12 3v2" />
				<path d="M12 19v2" />
				<path d="m4.9 4.9 1.4 1.4" />
				<path d="m17.7 17.7 1.4 1.4" />
				<path d="M3 12h2" />
				<path d="M19 12h2" />
				<path d="m4.9 19.1 1.4-1.4" />
				<path d="m17.7 6.3 1.4-1.4" />
				<circle cx="12" cy="12" r="4" />
			</svg>
		)
	}

	if (name === 'volume') {
		return (
			<svg {...common}>
				<title>Volume</title>
				<path d="M4 10v4h4l5 4V6l-5 4H4Z" />
				<path d="M16 9.2a4 4 0 0 1 0 5.6" />
				<path d="M18.8 6.4a8 8 0 0 1 0 11.2" />
			</svg>
		)
	}

	if (name === 'muted') {
		return (
			<svg {...common}>
				<title>Muted</title>
				<path d="M4 10v4h4l5 4V6l-5 4H4Z" />
				<path d="m18 9-5 6" />
				<path d="m13 9 5 6" />
			</svg>
		)
	}

	if (name === 'close') {
		return (
			<svg {...common}>
				<title>Close</title>
				<path d="M6 6 18 18" />
				<path d="M18 6 6 18" />
			</svg>
		)
	}

	if (name === 'previous') {
		return (
			<svg {...common}>
				<title>Previous</title>
				<path d="M15 18 9 12l6-6" />
			</svg>
		)
	}

	if (name === 'next') {
		return (
			<svg {...common}>
				<title>Next</title>
				<path d="m9 18 6-6-6-6" />
			</svg>
		)
	}

	return null
}

function SequenceText({ sequence }: { sequence: LearningPresentation[] }) {
	return (
		<div className="sequence-text" data-testid="word-tray">
			{sequence.map((item) => (
				<div
					className="word-line"
					key={`${item.requestedLanguage}-${item.text}`}
				>
					<span lang={item.resolvedLanguage}>{item.text}</span>
				</div>
			))}
		</div>
	)
}

function GardenObjectButton({
	placement,
	active,
	onTap,
	settings,
}: {
	placement: PlacementWithObject
	active: boolean
	onTap: (object: ObjectConcept) => void
	settings: WordGardenSettings
}) {
	const firstPresentation = buildLearningSequence(placement.object, settings)[0]
	const style = {
		left: `${placement.x}%`,
		top: `${placement.y}%`,
		zIndex: placement.zIndex ?? 1,
		'--object-scale': placement.scale,
	} as JSX.CSSProperties

	return (
		<button
			className={`garden-object is-${placement.object.interaction.animation} ${
				active ? 'is-active' : ''
			}`}
			style={style}
			type="button"
			data-testid={`object-${placement.object.id}`}
			aria-label={firstPresentation?.text ?? placement.object.id}
			onClick={() => onTap(placement.object)}
		>
			<img src={placement.object.image.path} alt="" draggable={false} />
		</button>
	)
}

function ModeSegment({
	mode,
	onChange,
}: {
	mode: GameMode
	onChange: (mode: GameMode) => void
}) {
	return (
		<div className="mode-segment" role="group" aria-label="Game mode">
			{(['explore', 'find', 'story'] as const).map((candidate) => (
				<button
					key={candidate}
					type="button"
					className={mode === candidate ? 'is-selected' : ''}
					aria-pressed={mode === candidate}
					data-testid={`mode-${candidate}`}
					onClick={() => onChange(candidate)}
				>
					{modeLabels[candidate]}
				</button>
			))}
		</div>
	)
}

function ParentSettings({
	catalog,
	settings,
	onChange,
	onClose,
}: {
	catalog: RuntimeCatalog
	settings: WordGardenSettings
	onChange: (settings: WordGardenSettings) => void
	onClose: () => void
}) {
	function update(partial: Partial<WordGardenSettings>) {
		onChange({ ...settings, ...partial })
	}

	return (
		<div className="settings-backdrop" role="presentation">
			<section
				className="settings-panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby="settings-title"
			>
				<header>
					<h2 id="settings-title">Parent Settings</h2>
					<button
						type="button"
						className="icon-button"
						aria-label="Close settings"
						onClick={onClose}
					>
						<Icon name="close" />
					</button>
				</header>

				<div className="settings-section">
					<h3>Content Pack</h3>
					<div className="preset-list" role="group" aria-label="Content pack">
						{catalog.packs.map((pack) => (
							<button
								key={pack.id}
								type="button"
								className={
									settings.selectedPackId === pack.id ? 'is-selected' : ''
								}
								aria-pressed={settings.selectedPackId === pack.id}
								data-testid={`pack-${pack.id}`}
								onClick={() =>
									update({ selectedPackId: pack.id, mode: 'explore' })
								}
							>
								{pack.title.en ?? pack.id}
							</button>
						))}
					</div>
				</div>

				<div className="settings-section">
					<h3>Mode</h3>
					<ModeSegment
						mode={settings.mode}
						onChange={(mode) => update({ mode })}
					/>
				</div>

				<div className="settings-section">
					<h3>Level</h3>
					<div
						className="level-grid"
						role="radiogroup"
						aria-label="Learning level"
					>
						{LEARNING_LEVELS.map((level) => (
							<button
								key={level}
								type="button"
								className={settings.activeLevel === level ? 'is-selected' : ''}
								aria-pressed={settings.activeLevel === level}
								onClick={() => update({ activeLevel: level as LearningLevel })}
							>
								{level}
							</button>
						))}
					</div>
				</div>

				<div className="settings-section">
					<h3>Language Order</h3>
					<div className="preset-list">
						{LANGUAGE_ORDER_PRESETS.map((preset) => (
							<button
								key={preset}
								type="button"
								className={
									settings.languageOrderPreset === preset ? 'is-selected' : ''
								}
								aria-pressed={settings.languageOrderPreset === preset}
								data-testid={`preset-${preset}`}
								onClick={() => update({ languageOrderPreset: preset })}
							>
								{presetLabels[preset]}
							</button>
						))}
					</div>
				</div>

				<div className="settings-section compact">
					<label>
						<input
							type="checkbox"
							checked={settings.muted}
							onChange={(event) =>
								update({ muted: event.currentTarget.checked })
							}
						/>
						<span>Mute</span>
					</label>
				</div>
			</section>
		</div>
	)
}

export function App() {
	const { catalog, error } = useCatalog()
	const [settings, setSettings] = useState<WordGardenSettings>(() =>
		loadSettings(
			typeof window === 'undefined' ? undefined : window.localStorage,
		),
	)
	const [sceneIndex, setSceneIndex] = useState(0)
	const [settingsOpen, setSettingsOpen] = useState(false)
	const [activeObjectId, setActiveObjectId] = useState<string | null>(null)
	const [findRound, setFindRound] = useState<FindRound | null>(null)
	const [toast, setToast] = useState<ToastState>({
		kind: 'hello',
		sequence: [],
	})
	const shouldSpeakPromptRef = useRef(false)

	const selectedPackId = catalog?.packs.some(
		(packOption) => packOption.id === settings.selectedPackId,
	)
		? settings.selectedPackId
		: DEFAULT_SETTINGS.selectedPackId
	const pack = catalog ? getPack(catalog, selectedPackId) : null
	const normalizedSceneIndex = pack
		? Math.min(sceneIndex, Math.max(pack.scenes.length - 1, 0))
		: 0
	const scene =
		pack?.scenes[normalizedSceneIndex] ??
		(catalog ? getDefaultScene(catalog, selectedPackId) : null)
	const placements = useMemo(
		() =>
			catalog && scene ? getPlacements(catalog, selectedPackId, scene.id) : [],
		[catalog, selectedPackId, scene],
	)
	const objects = useMemo(
		() => placements.map((placement) => placement.object),
		[placements],
	)
	const targetObject = useMemo(() => {
		if (!findRound) {
			return objects[0] ?? null
		}
		return (
			objects.find((object) => object.id === findRound.targetObjectId) ??
			objects[0] ??
			null
		)
	}, [findRound, objects])

	useEffect(() => {
		saveSettings(
			typeof window === 'undefined' ? undefined : window.localStorage,
			settings,
		)
	}, [settings])

	useEffect(() => {
		if (scene && placements.length > 0) {
			preloadSceneAssets(scene, placements)
		}
	}, [scene, placements])

	useEffect(() => {
		if (settings.mode === 'find' && objects.length > 0 && !findRound) {
			setFindRound(createFindRound(objects))
		}
	}, [findRound, objects, settings.mode])

	useEffect(() => {
		setSceneIndex(0)
		setActiveObjectId(null)
		setFindRound(null)
		setToast({ kind: 'hello', sequence: [] })
	}, [selectedPackId])

	useEffect(() => {
		setActiveObjectId(null)
		setFindRound(null)
		setToast({ kind: 'hello', sequence: [] })
	}, [scene?.id])

	useEffect(() => {
		let nextToast: ToastState | null = null
		if (settings.mode === 'story' && targetObject) {
			nextToast = {
				kind: 'story',
				sequence: buildStorySequence(targetObject, settings),
			}
		} else if (settings.mode === 'find' && targetObject) {
			nextToast = {
				kind: 'find',
				sequence: getFindPrompt(targetObject, settings),
			}
		} else if (toast.kind === 'find' || toast.kind === 'story') {
			nextToast = { kind: 'hello', sequence: [] }
		}

		if (!nextToast) {
			return
		}

		setToast(nextToast)
		if (shouldSpeakPromptRef.current && nextToast.sequence.length > 0) {
			speakSequence(nextToast.sequence, settings.muted)
		}
		shouldSpeakPromptRef.current = false
	}, [
		settings.mode,
		settings.activeLevel,
		settings.languageOrderPreset,
		targetObject,
	])

	function updateSettings(nextSettings: WordGardenSettings) {
		if (
			settings.mode !== nextSettings.mode &&
			(nextSettings.mode === 'find' || nextSettings.mode === 'story')
		) {
			shouldSpeakPromptRef.current = true
		}
		setSettings(nextSettings)
		if (nextSettings.mode === 'find' && objects.length > 0) {
			setFindRound((round) => round ?? createFindRound(objects))
		}
	}

	function selectScene(nextSceneIndex: number) {
		if (!pack) {
			return
		}

		const boundedIndex = Math.max(
			0,
			Math.min(nextSceneIndex, pack.scenes.length - 1),
		)
		if (boundedIndex === normalizedSceneIndex) {
			return
		}

		shouldSpeakPromptRef.current =
			settings.mode === 'find' || settings.mode === 'story'
		setSceneIndex(boundedIndex)
	}

	function handleObjectTap(object: ObjectConcept) {
		setActiveObjectId(object.id)
		playSoftTap(settings.muted)

		if (settings.mode === 'story') {
			const sequence = buildStorySequence(object, settings)
			setToast({ kind: 'story', sequence })
			speakSequence(sequence, settings.muted)
			return
		}

		if (settings.mode === 'find' && targetObject && objects.length > 0) {
			const activeFindRound = findRound ?? createFindRound(objects)
			const activeTargetObject =
				objects.find(
					(candidate) => candidate.id === activeFindRound.targetObjectId,
				) ?? targetObject
			if (!findRound) {
				setFindRound(activeFindRound)
			}

			const result = handleFindTap(activeFindRound, object.id)
			if (result.isTarget) {
				const successSequence = getSuccessPhrase(object, settings)
				setToast({ kind: 'success', sequence: successSequence })
				speakSequence(successSequence, settings.muted)
				window.setTimeout(() => {
					const nextRound = createFindRound(objects, object.id)
					const nextTarget = objects.find(
						(candidate) => candidate.id === nextRound.targetObjectId,
					)
					setFindRound(nextRound)
					if (nextTarget) {
						const nextPrompt = getFindPrompt(nextTarget, settings)
						setToast({
							kind: 'find',
							sequence: nextPrompt,
						})
						speakSequence(nextPrompt, settings.muted)
					}
				}, 1400)
				return
			}

			const identifiedSequence = buildLearningSequence(object, settings)
			const promptSequence = getFindPrompt(activeTargetObject, settings)
			setToast({ kind: 'word', sequence: identifiedSequence })
			speakSequence([...identifiedSequence, ...promptSequence], settings.muted)
			window.setTimeout(() => {
				setToast({ kind: 'find', sequence: promptSequence })
			}, 1600)
			return
		}

		const sequence = buildLearningSequence(object, settings)
		setToast({ kind: 'word', sequence })
		speakSequence(sequence, settings.muted)
	}

	if (error) {
		return (
			<main className="loading-screen">
				<h1>Word Garden</h1>
				<p>{error}</p>
			</main>
		)
	}

	if (!catalog || !scene || !pack) {
		return (
			<main className="loading-screen">
				<h1>Word Garden</h1>
			</main>
		)
	}

	const title = pack.title.en
	const sceneTitle = scene.title.en
	const hasSceneNavigation = (pack.scenes.length ?? 0) > 1
	const promptSequence =
		toast.sequence.length > 0
			? toast.sequence
			: settings.mode === 'find' && targetObject
				? getFindPrompt(targetObject, settings)
				: []
	const backgroundStyle = scene.background.asset
		? ({
				backgroundImage: `url(${scene.background.asset.path})`,
			} as JSX.CSSProperties)
		: undefined

	return (
		<main className="app-shell" data-mode={settings.mode}>
			<header className="topbar">
				<div className="brand">
					<span className="brand-mark" aria-hidden="true">
						W
					</span>
					<div>
						<h1>{title}</h1>
						<p>{sceneTitle}</p>
					</div>
				</div>

				<ModeSegment
					mode={settings.mode}
					onChange={(mode) => updateSettings({ ...settings, mode })}
				/>

				<div className="topbar-actions">
					<button
						type="button"
						className="icon-button"
						aria-label={settings.muted ? 'Unmute' : 'Mute'}
						aria-pressed={settings.muted}
						data-testid="mute-button"
						onClick={() =>
							updateSettings({ ...settings, muted: !settings.muted })
						}
					>
						<Icon name={settings.muted ? 'muted' : 'volume'} />
					</button>
					<button
						type="button"
						className="icon-button"
						aria-label="Parent settings"
						data-testid="settings-button"
						onClick={() => setSettingsOpen(true)}
					>
						<Icon name="gear" />
					</button>
				</div>
			</header>

			<section
				className={`play-area ${hasSceneNavigation ? 'has-scene-nav' : ''}`}
				aria-label={sceneTitle}
			>
				<div className={`prompt-ribbon is-${toast.kind}`} data-testid="prompt">
					{settings.mode === 'story' ? <strong>Story garden</strong> : null}
					{promptSequence.length > 0 ? (
						<SequenceText sequence={promptSequence} />
					) : (
						<strong>Hello, garden.</strong>
					)}
				</div>

				{hasSceneNavigation ? (
					<nav className="scene-nav" aria-label="Scene">
						<button
							type="button"
							className="icon-button"
							aria-label="Previous scene"
							data-testid="scene-previous"
							disabled={normalizedSceneIndex === 0}
							onClick={() => selectScene(normalizedSceneIndex - 1)}
						>
							<Icon name="previous" />
						</button>
						<span data-testid="scene-title">{sceneTitle}</span>
						<button
							type="button"
							className="icon-button"
							aria-label="Next scene"
							data-testid="scene-next"
							disabled={normalizedSceneIndex === pack.scenes.length - 1}
							onClick={() => selectScene(normalizedSceneIndex + 1)}
						>
							<Icon name="next" />
						</button>
					</nav>
				) : null}

				<div className="garden-stage" style={backgroundStyle}>
					{placements.map((placement) => (
						<GardenObjectButton
							key={placement.object.id}
							placement={placement}
							active={activeObjectId === placement.object.id}
							onTap={handleObjectTap}
							settings={settings}
						/>
					))}
				</div>
			</section>

			{settingsOpen ? (
				<ParentSettings
					catalog={catalog}
					settings={settings}
					onChange={updateSettings}
					onClose={() => setSettingsOpen(false)}
				/>
			) : null}
		</main>
	)
}
