import type { JSX } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { playSoftTap, speakSequence } from './audio/speech'
import { catalog } from './content/catalog'
import type {
	ContentPack,
	ContentSubPack,
	LearningLevel,
	ObjectConcept,
	RuntimeCatalog,
	Scene,
} from './content/schema'
import {
	createFindRound,
	type FindRound,
	handleFindTap,
} from './game/find-mode'
import {
	createPuzzleRound,
	getPuzzleTrayObjectIds,
	handlePuzzleDrop,
	type PuzzleRound,
} from './game/puzzle-mode'
import {
	buildLearningSequence,
	getDefaultScene,
	getFindPrompt,
	getPack,
	getPackSubPacks,
	getSelectedSubPack,
	getSubPackScenes,
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
	puzzle: 'Puzzle',
}

const wordDetailOptions: ReadonlyArray<{
	level: LearningLevel
	label: string
	hint: string
}> = [
	{ level: 'L0', label: 'Single word', hint: 'One clear name' },
	{ level: 'L1', label: 'Tiny phrase', hint: 'Name plus action' },
	{ level: 'L2', label: 'Short label', hint: 'Two or three words' },
	{ level: 'L3', label: 'Simple sentence', hint: 'One calm sentence' },
	{ level: 'L4', label: 'Question', hint: 'Prompt and answer' },
	{ level: 'L5', label: 'Little scene', hint: 'Short narrated line' },
]

type PlacementWithObject = Scene['objects'][number] & {
	object: ObjectConcept
}

type ToastKind = 'hello' | 'word' | 'find' | 'success' | 'puzzle'

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

function getSubPackObjectCount(
	pack: ContentPack,
	subPack: ContentSubPack,
): number {
	const sceneIds = new Set(subPack.sceneIds)
	const objectIds = new Set<string>()
	for (const scene of pack.scenes) {
		if (!sceneIds.has(scene.id)) {
			continue
		}
		for (const placement of scene.objects) {
			objectIds.add(placement.objectId)
		}
	}
	return objectIds.size
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

function getPlacementStyle(placement: PlacementWithObject): JSX.CSSProperties {
	return {
		left: `${placement.x}%`,
		top: `${placement.y}%`,
		zIndex: placement.zIndex ?? 1,
		'--object-scale': placement.scale,
	} as JSX.CSSProperties
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
	const style = getPlacementStyle(placement)

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

function PuzzleGapButton({
	placement,
	selectedObjectId,
	onPuzzleDrop,
}: {
	placement: PlacementWithObject
	selectedObjectId: string | null
	onPuzzleDrop: (objectId: string, targetObjectId: string) => void
}) {
	const style = getPlacementStyle(placement)
	const selected = selectedObjectId === placement.object.id

	return (
		<button
			className={`puzzle-gap ${selected ? 'is-selected' : ''}`}
			style={style}
			type="button"
			data-testid={`puzzle-gap-${placement.object.id}`}
			aria-label={`Puzzle spot for ${placement.object.image.alt ?? placement.object.id}`}
			onClick={() => {
				if (selectedObjectId) {
					onPuzzleDrop(selectedObjectId, placement.object.id)
				}
			}}
			onDragOver={(event) => event.preventDefault()}
			onDrop={(event) => {
				event.preventDefault()
				const transfer = event.dataTransfer
				if (!transfer) {
					return
				}
				const objectId =
					transfer.getData('application/x-word-garden-object-id') ||
					transfer.getData('text/plain')
				if (objectId) {
					onPuzzleDrop(objectId, placement.object.id)
				}
			}}
		>
			<img src={placement.object.image.path} alt="" draggable={false} />
		</button>
	)
}

function PuzzleTray({
	placements,
	selectedObjectId,
	settings,
	onSelect,
}: {
	placements: PlacementWithObject[]
	selectedObjectId: string | null
	settings: WordGardenSettings
	onSelect: (objectId: string) => void
}) {
	return (
		<section className="puzzle-tray" aria-label="Puzzle pieces">
			{placements.map((placement) => {
				const firstPresentation = buildLearningSequence(
					placement.object,
					settings,
				)[0]

				return (
					<button
						key={placement.object.id}
						type="button"
						className={`puzzle-piece ${
							selectedObjectId === placement.object.id ? 'is-selected' : ''
						}`}
						data-testid={`puzzle-piece-${placement.object.id}`}
						aria-pressed={selectedObjectId === placement.object.id}
						aria-label={firstPresentation?.text ?? placement.object.id}
						draggable
						onClick={() => onSelect(placement.object.id)}
						onDragStart={(event) => {
							const transfer = event.dataTransfer
							if (!transfer) {
								return
							}
							transfer.effectAllowed = 'move'
							transfer.setData(
								'application/x-word-garden-object-id',
								placement.object.id,
							)
							transfer.setData('text/plain', placement.object.id)
						}}
					>
						<img src={placement.object.image.path} alt="" draggable={false} />
					</button>
				)
			})}
		</section>
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
			{(['explore', 'find', 'puzzle'] as const).map((candidate) => (
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

	const selectedPack = getPack(catalog, settings.selectedPackId)
	const selectedPackSubPacks = getPackSubPacks(selectedPack)
	const selectedSubPack = getSelectedSubPack(
		selectedPack,
		settings.selectedSubPackId,
	)

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
					<h3>Pack</h3>
					<div className="pack-list" role="group" aria-label="Content pack">
						{catalog.packs.map((pack) => {
							const subPacks = getPackSubPacks(pack)
							const defaultSubPack = getSelectedSubPack(pack, null)
							const objectLabel =
								pack.objects.length === 1
									? '1 word'
									: `${pack.objects.length} words`
							const setLabel =
								subPacks.length === 1 ? '1 set' : `${subPacks.length} sets`

							return (
								<button
									key={pack.id}
									type="button"
									className="pack-card"
									aria-pressed={selectedPack.id === pack.id}
									data-testid={`pack-${pack.id}`}
									onClick={() =>
										update({
											selectedPackId: pack.id,
											selectedSubPackId: defaultSubPack.id,
											mode: 'explore',
										})
									}
								>
									<span className="pack-card-title">
										{pack.title.en ?? pack.id}
									</span>
									<span className="pack-card-subtitle">
										{pack.title['zh-Hans'] ?? ''}
									</span>
									<span className="pack-card-meta">
										{objectLabel} / {setLabel}
									</span>
								</button>
							)
						})}
					</div>
				</div>

				{selectedPackSubPacks.length > 1 ? (
					<div className="settings-section">
						<h3>Set</h3>
						<div className="set-grid" role="group" aria-label="Content set">
							{selectedPackSubPacks.map((subPack) => {
								const objectCount = getSubPackObjectCount(selectedPack, subPack)
								const objectLabel =
									objectCount === 1 ? '1 word' : `${objectCount} words`

								return (
									<button
										key={subPack.id}
										type="button"
										className="set-card"
										aria-pressed={selectedSubPack.id === subPack.id}
										data-testid={`set-${subPack.id}`}
										onClick={() =>
											update({
												selectedSubPackId: subPack.id,
												mode: 'explore',
											})
										}
									>
										<span className="set-card-title">
											{subPack.title.en ?? subPack.id}
										</span>
										<span className="set-card-subtitle">
											{subPack.title['zh-Hans'] ?? ''}
										</span>
										<span className="set-card-meta">{objectLabel}</span>
									</button>
								)
							})}
						</div>
					</div>
				) : null}

				<div className="settings-section">
					<h3>Mode</h3>
					<ModeSegment
						mode={settings.mode}
						onChange={(mode) => update({ mode })}
					/>
				</div>

				<div className="settings-section">
					<h3>Word Detail</h3>
					<div className="detail-list" role="group" aria-label="Word detail">
						{wordDetailOptions.map((option) => (
							<button
								key={option.level}
								type="button"
								className={
									settings.activeLevel === option.level ? 'is-selected' : ''
								}
								aria-pressed={settings.activeLevel === option.level}
								data-testid={`detail-${option.level}`}
								onClick={() => update({ activeLevel: option.level })}
							>
								<span className="detail-option-label">{option.label}</span>
								<small className="detail-option-hint">{option.hint}</small>
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
	const [puzzleRound, setPuzzleRound] = useState<PuzzleRound | null>(null)
	const [puzzleRoundIndex, setPuzzleRoundIndex] = useState(0)
	const [selectedPuzzleObjectId, setSelectedPuzzleObjectId] = useState<
		string | null
	>(null)
	const [toast, setToast] = useState<ToastState>({
		kind: 'hello',
		sequence: [],
	})
	const shouldSpeakPromptRef = useRef(false)
	const puzzleResetTimeoutRef = useRef<number | null>(null)

	const selectedPackId = catalog?.packs.some(
		(packOption) => packOption.id === settings.selectedPackId,
	)
		? settings.selectedPackId
		: DEFAULT_SETTINGS.selectedPackId
	const pack = catalog ? getPack(catalog, selectedPackId) : null
	const activeSubPackId = pack
		? getSelectedSubPack(pack, settings.selectedSubPackId).id
		: null
	const activeScenes = pack ? getSubPackScenes(pack, activeSubPackId) : []
	const normalizedSceneIndex =
		activeScenes.length > 0
			? Math.min(sceneIndex, Math.max(activeScenes.length - 1, 0))
			: 0
	const scene =
		activeScenes[normalizedSceneIndex] ??
		(catalog ? getDefaultScene(catalog, selectedPackId, activeSubPackId) : null)
	const placements = useMemo(
		() =>
			catalog && scene ? getPlacements(catalog, selectedPackId, scene.id) : [],
		[catalog, selectedPackId, scene],
	)
	const objects = useMemo(
		() => placements.map((placement) => placement.object),
		[placements],
	)
	const placementByObjectId = useMemo(
		() =>
			new Map(placements.map((placement) => [placement.object.id, placement])),
		[placements],
	)
	const objectById = useMemo(
		() => new Map(objects.map((object) => [object.id, object])),
		[objects],
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
	const puzzleTrayPlacements = useMemo(() => {
		if (!puzzleRound) {
			return []
		}

		return getPuzzleTrayObjectIds(puzzleRound)
			.map((objectId) => placementByObjectId.get(objectId))
			.filter((placement): placement is PlacementWithObject =>
				Boolean(placement),
			)
	}, [placementByObjectId, puzzleRound])
	const placedPuzzleObjectIds = puzzleRound?.placedObjectIds ?? []

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
		return () => clearPuzzleResetTimeout()
	}, [])

	useEffect(() => {
		if (settings.mode === 'find' && objects.length > 0 && !findRound) {
			setFindRound(createFindRound(objects))
		}
	}, [findRound, objects, settings.mode])

	useEffect(() => {
		clearPuzzleResetTimeout()
		setSceneIndex(0)
		setActiveObjectId(null)
		setFindRound(null)
		setPuzzleRound(null)
		setPuzzleRoundIndex(0)
		setSelectedPuzzleObjectId(null)
		setToast({ kind: 'hello', sequence: [] })
	}, [selectedPackId, activeSubPackId])

	useEffect(() => {
		clearPuzzleResetTimeout()
		setActiveObjectId(null)
		setFindRound(null)
		setPuzzleRound(null)
		setPuzzleRoundIndex(0)
		setSelectedPuzzleObjectId(null)
		setToast({ kind: 'hello', sequence: [] })
	}, [scene?.id])

	useEffect(() => {
		if (settings.mode === 'puzzle' && placements.length > 0 && !puzzleRound) {
			setPuzzleRound(createPuzzleRound(placements, puzzleRoundIndex))
		}
	}, [placements, puzzleRound, puzzleRoundIndex, settings.mode])

	useEffect(() => {
		let nextToast: ToastState | null = null
		if (settings.mode === 'find' && targetObject) {
			nextToast = {
				kind: 'find',
				sequence: getFindPrompt(targetObject, settings),
			}
		} else if (toast.kind === 'find' || toast.kind === 'puzzle') {
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
		if (settings.mode !== nextSettings.mode && nextSettings.mode === 'find') {
			shouldSpeakPromptRef.current = true
		}
		if (settings.mode !== nextSettings.mode) {
			clearPuzzleResetTimeout()
		}
		setSettings(nextSettings)
		if (nextSettings.mode === 'find' && objects.length > 0) {
			setFindRound((round) => round ?? createFindRound(objects))
		}
		if (nextSettings.mode === 'puzzle') {
			setSelectedPuzzleObjectId(null)
			setToast({ kind: 'puzzle', sequence: [] })
		}
	}

	function selectScene(nextSceneIndex: number) {
		if (!pack || activeScenes.length === 0) {
			return
		}

		const boundedIndex = Math.max(
			0,
			Math.min(nextSceneIndex, activeScenes.length - 1),
		)
		if (boundedIndex === normalizedSceneIndex) {
			return
		}

		clearPuzzleResetTimeout()
		shouldSpeakPromptRef.current = settings.mode === 'find'
		setSceneIndex(boundedIndex)
	}

	function handleObjectTap(object: ObjectConcept) {
		setActiveObjectId(object.id)
		playSoftTap(settings.muted)

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

	function handlePuzzleAttempt(objectId: string, targetObjectId: string) {
		if (!puzzleRound) {
			return
		}

		const object = objectById.get(objectId)
		if (!object) {
			setSelectedPuzzleObjectId(null)
			return
		}

		playSoftTap(settings.muted)
		setActiveObjectId(objectId)
		setSelectedPuzzleObjectId(null)

		const result = handlePuzzleDrop(puzzleRound, objectId, targetObjectId)
		if (!result.isMatch) {
			const sequence = buildLearningSequence(object, settings)
			setToast({ kind: 'word', sequence })
			speakSequence(sequence, settings.muted)
			return
		}

		const nextRound = {
			...puzzleRound,
			placedObjectIds: result.placedObjectIds,
		}
		setPuzzleRound(nextRound)

		const successSequence = getSuccessPhrase(object, settings)
		setToast({ kind: 'success', sequence: successSequence })
		speakSequence(successSequence, settings.muted)

		if (result.isComplete) {
			const nextRoundIndex = puzzleRoundIndex + 1
			clearPuzzleResetTimeout()
			puzzleResetTimeoutRef.current = window.setTimeout(() => {
				puzzleResetTimeoutRef.current = null
				setPuzzleRoundIndex(nextRoundIndex)
				setPuzzleRound(createPuzzleRound(placements, nextRoundIndex))
				setActiveObjectId(null)
				setSelectedPuzzleObjectId(null)
				setToast({ kind: 'puzzle', sequence: [] })
			}, 1400)
		}
	}

	function clearPuzzleResetTimeout() {
		if (puzzleResetTimeoutRef.current === null) {
			return
		}

		window.clearTimeout(puzzleResetTimeoutRef.current)
		puzzleResetTimeoutRef.current = null
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
	const hasSceneNavigation = activeScenes.length > 1
	const promptSequence =
		toast.sequence.length > 0
			? toast.sequence
			: settings.mode === 'find' && targetObject
				? getFindPrompt(targetObject, settings)
				: []
	const promptKind =
		promptSequence.length > 0
			? toast.kind
			: settings.mode === 'puzzle'
				? 'puzzle'
				: 'hello'
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
						<p data-testid="scene-title">{sceneTitle}</p>
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
				<div className={`prompt-ribbon is-${promptKind}`} data-testid="prompt">
					{promptSequence.length > 0 ? (
						<SequenceText sequence={promptSequence} />
					) : settings.mode === 'puzzle' ? (
						<strong>Puzzle garden.</strong>
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
						<span>{sceneTitle}</span>
						<button
							type="button"
							className="icon-button"
							aria-label="Next scene"
							data-testid="scene-next"
							disabled={normalizedSceneIndex === activeScenes.length - 1}
							onClick={() => selectScene(normalizedSceneIndex + 1)}
						>
							<Icon name="next" />
						</button>
					</nav>
				) : null}

				{settings.mode === 'puzzle' ? (
					<div className="puzzle-layout">
						<div className="garden-stage is-puzzle" style={backgroundStyle}>
							{placements.map((placement) =>
								placedPuzzleObjectIds.includes(placement.object.id) ? null : (
									<PuzzleGapButton
										key={placement.object.id}
										placement={placement}
										selectedObjectId={selectedPuzzleObjectId}
										onPuzzleDrop={handlePuzzleAttempt}
									/>
								),
							)}
							{placements.map((placement) =>
								placedPuzzleObjectIds.includes(placement.object.id) ? (
									<GardenObjectButton
										key={placement.object.id}
										placement={placement}
										active={activeObjectId === placement.object.id}
										onTap={handleObjectTap}
										settings={settings}
									/>
								) : null,
							)}
						</div>
						<PuzzleTray
							placements={puzzleTrayPlacements}
							selectedObjectId={selectedPuzzleObjectId}
							settings={settings}
							onSelect={setSelectedPuzzleObjectId}
						/>
					</div>
				) : (
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
				)}
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
