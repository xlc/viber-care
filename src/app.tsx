import {
	draggable,
	dropTargetForElements,
	monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import type { JSX } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { speakSequence, stopSpeech } from './audio/speech'
import { catalog } from './content/catalog'
import type {
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
	type ColorSortItem,
	createMathPlayRound,
	type DotMatchChoice,
	getAvailableMathFocuses,
	handleColorSort,
	handleDotMatch,
	handleMathCollect,
	type MathPlayPlacement,
	type MathPlayRound,
} from './game/math-play-mode'
import {
	createPuzzleRound,
	getPuzzleTrayObjectIds,
	handlePuzzleDrop,
	type PuzzleRound,
} from './game/puzzle-mode'
import {
	buildSceneLayout,
	createSceneLayoutSeed,
	type VisibleScenePlacement,
} from './game/scene-layout'
import {
	buildLearningSequence,
	getDefaultScene,
	getFindPrompt,
	getPack,
	getPackSets,
	getSelectedSet,
	getSetScenes,
	getSuccessPhrase,
	type LearningPresentation,
} from './learning/engine'
import {
	DEFAULT_SETTINGS,
	GAME_MODES,
	type GameMode,
	LANGUAGE_ORDER_PRESETS,
	type LanguageOrderPreset,
	loadSettings,
	MATH_FOCUS_OPTIONS,
	type MathFocus,
	resolveLanguageOrder,
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
	cards: 'Cards',
	math: 'Math Play',
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

const mathFocusLabels: Record<MathFocus, string> = {
	mixed: 'First Math Mix',
	'counting-1-3': 'Counting 1-3',
	colors: 'Color Sort',
}

type ToastKind = 'hello' | 'word' | 'find' | 'success' | 'puzzle' | 'math'

type ToastState = {
	kind: ToastKind
	sequence: LearningPresentation[]
}

const PUZZLE_DRAG_TYPE = 'word-garden-puzzle-piece'
const PUZZLE_GAP_TYPE = 'word-garden-puzzle-gap'

function getPuzzlePieceObjectId(data: Record<string, unknown>) {
	if (data.type !== PUZZLE_DRAG_TYPE || typeof data.objectId !== 'string') {
		return null
	}

	return data.objectId
}

function getPuzzleGapObjectId(data: Record<string | symbol, unknown>) {
	if (data.type !== PUZZLE_GAP_TYPE || typeof data.objectId !== 'string') {
		return null
	}

	return data.objectId
}

function useCatalog(): { catalog: RuntimeCatalog; error: null } {
	return { catalog, error: null }
}

function preloadSceneAssets(scene: Scene, placements: VisibleScenePlacement[]) {
	const paths = [
		scene.background.asset?.path,
		...placements.map((placement) => placement.variant.image.path),
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

function SequenceText({
	sequence,
	testId = 'word-tray',
}: {
	sequence: LearningPresentation[]
	testId?: string
}) {
	return (
		<span className="sequence-text" data-testid={testId}>
			{sequence.map((item) => (
				<span
					className="word-line"
					key={`${item.requestedLanguage}-${item.text}`}
				>
					<span lang={item.resolvedLanguage}>{item.text}</span>
				</span>
			))}
		</span>
	)
}

const englishCountWords = [
	'Zero',
	'One',
	'Two',
	'Three',
	'Four',
	'Five',
	'Six',
	'Seven',
	'Eight',
	'Nine',
	'Ten',
] as const

const chineseCountWords = [
	'零',
	'一',
	'二',
	'三',
	'四',
	'五',
	'六',
	'七',
	'八',
	'九',
	'十',
] as const

function getObjectName(object: ObjectConcept, language: 'en' | 'zh-Hans') {
	return (
		object.content[language]?.levels.L0?.text ??
		object.content[language]?.fallbackText ??
		object.id
	)
}

function getEnglishQuantityName(object: ObjectConcept, quantity: number) {
	return quantity === 1
		? getObjectName(object, 'en')
		: (object.math?.englishPlural ?? `${getObjectName(object, 'en')}s`)
}

function getEnglishCountWord(quantity: number, sentenceStart = false) {
	const word = englishCountWords[quantity] ?? `${quantity}`
	return sentenceStart || /^\d/.test(word) ? word : word.toLowerCase()
}

function getEnglishQuantityText(
	object: ObjectConcept,
	quantity: number,
	sentenceStart = false,
) {
	return `${getEnglishCountWord(quantity, sentenceStart)} ${getEnglishQuantityName(
		object,
		quantity,
	)}`
}

function getEnglishDotText(quantity: number) {
	return `${getEnglishCountWord(quantity)} ${quantity === 1 ? 'dot' : 'dots'}`
}

function capitalizeEnglish(text: string) {
	return text.length > 0 ? `${text[0]?.toUpperCase()}${text.slice(1)}` : text
}

function getChineseQuantityText(object: ObjectConcept, quantity: number) {
	const numberText =
		quantity === 2 ? '两' : (chineseCountWords[quantity] ?? `${quantity}`)
	const measureWord = object.math?.zhMeasureWord ?? '个'
	return `${numberText}${measureWord}${getObjectName(object, 'zh-Hans')}`
}

function createMathPresentation(
	settings: WordGardenSettings,
	textByLanguage: Record<'en' | 'zh-Hans', string>,
): LearningPresentation[] {
	return resolveLanguageOrder(settings).map((language) => ({
		requestedLanguage: language,
		resolvedLanguage: language,
		requestedLevel: settings.activeLevel,
		resolvedLevel: 'L0',
		text: textByLanguage[language],
		audioText: textByLanguage[language],
	}))
}

function getMathPrompt(
	round: MathPlayRound,
	objects: Map<string, ObjectConcept>,
	settings: WordGardenSettings,
): LearningPresentation[] {
	if (round.type === 'feed-the-friend') {
		const friend = objects.get(round.friendObjectId)
		const item = objects.get(round.itemObjectId)
		if (friend && item) {
			return createMathPresentation(settings, {
				en: `Give the ${getObjectName(friend, 'en')} ${getEnglishQuantityText(
					item,
					round.targetQuantity,
				)}.`,
				'zh-Hans': `给${getObjectName(friend, 'zh-Hans')}${getChineseQuantityText(item, round.targetQuantity)}。`,
			})
		}
		return getMathFallbackPrompt(settings)
	}

	if (round.type === 'dot-match') {
		const numberText =
			round.targetQuantity === 2
				? '两'
				: (chineseCountWords[round.targetQuantity] ?? `${round.targetQuantity}`)
		return createMathPresentation(settings, {
			en: `Match ${getEnglishDotText(round.targetQuantity)}.`,
			'zh-Hans': `找${numberText}个点。`,
		})
	}

	if (round.type === 'color-sort') {
		return createMathPresentation(settings, {
			en: 'Put each color in its basket.',
			'zh-Hans': '把颜色一样的物品放进篮子。',
		})
	}

	const object = objects.get(round.targetObjectId)
	if (!object) {
		return createMathPresentation(settings, {
			en: 'Let us count.',
			'zh-Hans': '我们来数一数。',
		})
	}
	return createMathPresentation(settings, {
		en: `Put ${getEnglishQuantityText(object, round.targetQuantity)} in.`,
		'zh-Hans': `放进${getChineseQuantityText(object, round.targetQuantity)}。`,
	})
}

function getMathFallbackPrompt(
	settings: WordGardenSettings,
): LearningPresentation[] {
	return createMathPresentation(settings, {
		en: 'Try another set for Math Play.',
		'zh-Hans': '换一个内容来玩数学吧。',
	})
}

function getChineseColorName(color: string) {
	const colorNames: Record<string, string> = {
		black: '黑色',
		blue: '蓝色',
		brown: '棕色',
		green: '绿色',
		orange: '橙色',
		pink: '粉色',
		purple: '紫色',
		red: '红色',
		white: '白色',
		yellow: '黄色',
	}
	return colorNames[color] ?? color
}

function getMathCountPresentation(
	countedNumber: number,
	settings: WordGardenSettings,
): LearningPresentation[] {
	return createMathPresentation(settings, {
		en: englishCountWords[countedNumber] ?? `${countedNumber}`,
		'zh-Hans': chineseCountWords[countedNumber] ?? `${countedNumber}`,
	})
}

function getMathTotalPresentation(
	quantity: number,
	object: ObjectConcept,
	settings: WordGardenSettings,
): LearningPresentation[] {
	return createMathPresentation(settings, {
		en: `${getEnglishQuantityText(object, quantity, true)}.`,
		'zh-Hans': `${getChineseQuantityText(object, quantity)}。`,
	})
}

function LanguageCard({
	object,
	cardIndex,
	totalCards,
	settings,
	onPrevious,
	onNext,
	onSpeak,
}: {
	object: ObjectConcept
	cardIndex: number
	totalCards: number
	settings: WordGardenSettings
	onPrevious: () => void
	onNext: () => void
	onSpeak: () => void
}) {
	const sequence = buildLearningSequence(object, settings)
	const variantIndex = cardIndex % object.variants.length
	const variant = object.variants[variantIndex]
	const firstPresentation = sequence[0]

	return (
		<section className="cards-stage" aria-label="Language cards">
			<article
				className="language-card"
				data-testid="language-card"
				data-object-id={object.id}
			>
				<button
					type="button"
					className="language-card-main"
					aria-label={`Hear ${firstPresentation?.text ?? object.id}`}
					data-testid="card-main"
					onClick={onSpeak}
				>
					<img src={variant.image.path} alt="" draggable={false} />
					<SequenceText sequence={sequence} testId="card-words" />
				</button>
				<div className="card-controls" role="group" aria-label="Card controls">
					<button
						type="button"
						className="icon-button"
						aria-label="Previous card"
						data-testid="card-previous"
						onClick={onPrevious}
					>
						<Icon name="previous" />
					</button>
					<span
						className="card-count"
						aria-live="polite"
						data-testid="card-count"
					>
						{cardIndex + 1} / {totalCards}
					</span>
					<button
						type="button"
						className="icon-button"
						aria-label="Hear card"
						data-testid="card-speak"
						onClick={onSpeak}
					>
						<Icon name="volume" />
					</button>
					<button
						type="button"
						className="icon-button"
						aria-label="Next card"
						data-testid="card-next"
						onClick={onNext}
					>
						<Icon name="next" />
					</button>
				</div>
			</article>
		</section>
	)
}

function getPlacementStyle(
	placement: VisibleScenePlacement,
): JSX.CSSProperties {
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
	placement: VisibleScenePlacement
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
			data-variant-id={placement.variant.id}
			aria-label={firstPresentation?.text ?? placement.object.id}
			onClick={() => onTap(placement.object)}
		>
			<img src={placement.variant.image.path} alt="" draggable={false} />
		</button>
	)
}

function PuzzleGapButton({
	placement,
	draggedObjectId,
	hoveredTargetObjectId,
	onHoverTargetChange,
}: {
	placement: VisibleScenePlacement
	draggedObjectId: string | null
	hoveredTargetObjectId: string | null
	onHoverTargetChange: (objectId: string | null) => void
}) {
	const style = getPlacementStyle(placement)
	const elementRef = useRef<HTMLButtonElement | null>(null)
	const targetObjectId = placement.object.id
	const active = hoveredTargetObjectId === targetObjectId
	const valid = active && draggedObjectId === targetObjectId

	useEffect(() => {
		const element = elementRef.current
		if (!element) {
			return
		}

		return dropTargetForElements({
			element,
			getData: () => ({
				type: PUZZLE_GAP_TYPE,
				objectId: targetObjectId,
			}),
			canDrop: ({ source }) => getPuzzlePieceObjectId(source.data) !== null,
			getDropEffect: () => 'move',
			onDragEnter: () => onHoverTargetChange(targetObjectId),
			onDragLeave: () => onHoverTargetChange(null),
			onDrop: () => onHoverTargetChange(null),
		})
	}, [onHoverTargetChange, targetObjectId])

	return (
		<button
			ref={elementRef}
			className={`puzzle-gap ${active ? 'is-drop-hover' : ''} ${
				valid ? 'is-valid-drop' : ''
			}`}
			style={style}
			type="button"
			data-testid={`puzzle-gap-${placement.object.id}`}
			aria-label={`Puzzle spot for ${
				placement.variant.image.alt ?? placement.object.id
			}`}
		>
			<img src={placement.variant.image.path} alt="" draggable={false} />
		</button>
	)
}

function PuzzleTray({
	placements,
	settings,
	onDraggingObjectChange,
}: {
	placements: VisibleScenePlacement[]
	settings: WordGardenSettings
	onDraggingObjectChange: (objectId: string | null) => void
}) {
	return (
		<section className="puzzle-tray" aria-label="Puzzle pieces">
			{placements.map((placement) => (
				<PuzzlePieceButton
					key={placement.object.id}
					placement={placement}
					settings={settings}
					onDraggingObjectChange={onDraggingObjectChange}
				/>
			))}
		</section>
	)
}

function PuzzlePieceButton({
	placement,
	settings,
	onDraggingObjectChange,
}: {
	placement: VisibleScenePlacement
	settings: WordGardenSettings
	onDraggingObjectChange: (objectId: string | null) => void
}) {
	const elementRef = useRef<HTMLButtonElement | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const objectId = placement.object.id
	const firstPresentation = buildLearningSequence(placement.object, settings)[0]

	useEffect(() => {
		const element = elementRef.current
		if (!element) {
			return
		}

		return draggable({
			element,
			getInitialData: () => ({
				type: PUZZLE_DRAG_TYPE,
				objectId,
			}),
			onDragStart: () => {
				setIsDragging(true)
				onDraggingObjectChange(objectId)
			},
			onDrop: () => {
				setIsDragging(false)
				onDraggingObjectChange(null)
			},
		})
	}, [objectId, onDraggingObjectChange])

	return (
		<button
			ref={elementRef}
			type="button"
			className={`puzzle-piece ${isDragging ? 'is-dragging' : ''}`}
			data-testid={`puzzle-piece-${objectId}`}
			aria-label={firstPresentation?.text ?? objectId}
		>
			<img src={placement.variant.image.path} alt="" draggable={false} />
		</button>
	)
}

function getMathVisual(
	objectId: string,
	objectById: Map<string, ObjectConcept>,
	placementByObjectId: Map<string, VisibleScenePlacement>,
) {
	const placement = placementByObjectId.get(objectId)
	const object = objectById.get(objectId) ?? placement?.object
	const variant = placement?.variant ?? object?.variants[0]
	if (!object || !variant) {
		return null
	}

	return {
		object,
		image: variant.image,
	}
}

function MathPlayStage({
	round,
	objectById,
	placementByObjectId,
	selectedSortItemId,
	onCollect,
	onDotChoice,
	onSelectSortItem,
	onColorSort,
}: {
	round: MathPlayRound
	objectById: Map<string, ObjectConcept>
	placementByObjectId: Map<string, VisibleScenePlacement>
	selectedSortItemId: string | null
	onCollect: (object: ObjectConcept) => void
	onDotChoice: (choice: DotMatchChoice) => void
	onSelectSortItem: (itemId: string) => void
	onColorSort: (item: ColorSortItem, basketColor: string) => void
}) {
	if (round.type === 'dot-match') {
		const targetVisual = getMathVisual(
			round.targetObjectId,
			objectById,
			placementByObjectId,
		)
		if (!targetVisual) {
			return null
		}

		return (
			<div
				className="math-stage is-dot-match"
				data-testid="math-stage"
				data-round-type={round.type}
			>
				<div
					className="dot-card"
					role="group"
					data-testid="dot-card"
					aria-label="Dot card"
				>
					{Array.from({ length: round.targetQuantity }, (_, index) => (
						<span key={index} className="dot" />
					))}
				</div>
				<div className="math-choice-grid" role="group" aria-label="Dot choices">
					{round.choices.map((choice) => (
						<button
							key={choice.id}
							type="button"
							className="math-choice"
							data-testid={`dot-choice-${choice.id}`}
							aria-label={getEnglishQuantityText(
								targetVisual.object,
								choice.quantity,
							)}
							onClick={() => onDotChoice(choice)}
						>
							{Array.from({ length: choice.quantity }, (_, index) => (
								<img
									key={index}
									src={targetVisual.image.path}
									alt=""
									draggable={false}
								/>
							))}
						</button>
					))}
				</div>
			</div>
		)
	}

	if (round.type === 'color-sort') {
		const selectedSortItem = round.items.find(
			(item) => item.id === selectedSortItemId && !item.placed,
		)
		return (
			<div
				className="math-stage is-color-sort"
				data-testid="math-stage"
				data-round-type={round.type}
			>
				<div className="sort-items" role="group" aria-label="Sorting objects">
					{round.items
						.filter((item) => !item.placed)
						.map((item) => {
							const visual = getMathVisual(
								item.objectId,
								objectById,
								placementByObjectId,
							)
							if (!visual) {
								return null
							}
							return (
								<button
									key={item.id}
									type="button"
									className={`math-object ${
										selectedSortItemId === item.id ? 'is-selected' : ''
									}`}
									data-testid={`sort-item-${item.id}`}
									aria-label={`Sort ${item.color} ${getObjectName(
										visual.object,
										'en',
									)}`}
									aria-pressed={selectedSortItemId === item.id}
									onClick={() => onSelectSortItem(item.id)}
								>
									<img src={visual.image.path} alt="" draggable={false} />
								</button>
							)
						})}
				</div>
				<div className="sort-baskets" role="group" aria-label="Color baskets">
					{round.basketColors.map((color) => (
						<button
							key={color}
							type="button"
							className="sort-basket"
							aria-label={`${color} basket`}
							data-testid={`sort-basket-${color}`}
							style={{ '--basket-color': color } as JSX.CSSProperties}
							onClick={() => {
								if (selectedSortItem) {
									onColorSort(selectedSortItem, color)
								}
							}}
						>
							<span className="color-swatch" aria-hidden="true" />
							<div className="sort-basket-items">
								{round.items
									.filter((item) => item.placed && item.color === color)
									.map((item) => {
										const visual = getMathVisual(
											item.objectId,
											objectById,
											placementByObjectId,
										)
										return visual ? (
											<img
												key={item.id}
												src={visual.image.path}
												alt=""
												draggable={false}
											/>
										) : null
									})}
							</div>
						</button>
					))}
				</div>
			</div>
		)
	}

	const objectId =
		round.type === 'feed-the-friend' ? round.itemObjectId : round.targetObjectId
	const visual = getMathVisual(objectId, objectById, placementByObjectId)
	if (!visual) {
		return null
	}
	const friendVisual =
		round.type === 'feed-the-friend'
			? getMathVisual(round.friendObjectId, objectById, placementByObjectId)
			: null
	const itemIndexes = Array.from(
		{ length: round.targetQuantity },
		(_, index) => index,
	)
	const collectedIndexes = itemIndexes.slice(0, round.collectedCount)
	const waitingIndexes = itemIndexes.slice(round.collectedCount)

	return (
		<div
			className={`math-stage ${
				round.type === 'feed-the-friend' ? 'is-feed' : 'is-count'
			}`}
			data-testid="math-stage"
			data-round-type={round.type}
		>
			{friendVisual ? (
				<div className="math-friend" data-testid="math-friend">
					<img src={friendVisual.image.path} alt="" draggable={false} />
				</div>
			) : null}
			<div className="math-targets" role="group" aria-label="Counting objects">
				{waitingIndexes.map((index) => (
					<button
						key={index}
						type="button"
						className="math-object"
						data-testid={`math-object-${visual.object.id}`}
						aria-label={`Collect ${getObjectName(visual.object, 'en')}`}
						onClick={() => onCollect(visual.object)}
					>
						<img src={visual.image.path} alt="" draggable={false} />
					</button>
				))}
			</div>
			<div
				className="math-basket"
				role="group"
				aria-label="Basket"
				data-testid="math-basket"
			>
				<div className="math-basket-items">
					{collectedIndexes.map((index) => (
						<img key={index} src={visual.image.path} alt="" draggable={false} />
					))}
				</div>
			</div>
		</div>
	)
}

function ModeSegment({
	mode,
	onChange,
	disabledModes = new Set<GameMode>(),
}: {
	mode: GameMode
	onChange: (mode: GameMode) => void
	disabledModes?: ReadonlySet<GameMode>
}) {
	return (
		<div className="mode-segment" role="group" aria-label="Game mode">
			{GAME_MODES.map((candidate) => {
				const isDisabled = disabledModes.has(candidate)
				return (
					<button
						key={candidate}
						type="button"
						className={mode === candidate ? 'is-selected' : ''}
						aria-pressed={mode === candidate}
						data-testid={`mode-${candidate}`}
						disabled={isDisabled}
						onClick={() => onChange(candidate)}
					>
						{modeLabels[candidate]}
					</button>
				)
			})}
		</div>
	)
}

function ParentSettings({
	catalog,
	settings,
	availableMathFocuses,
	onChange,
	onClose,
}: {
	catalog: RuntimeCatalog
	settings: WordGardenSettings
	availableMathFocuses: readonly MathFocus[]
	onChange: (settings: WordGardenSettings) => void
	onClose: () => void
}) {
	function update(partial: Partial<WordGardenSettings>) {
		onChange({ ...settings, ...partial })
	}
	const contentChangeMode = settings.mode === 'cards' ? 'cards' : 'explore'

	const selectedPack = getPack(catalog, settings.selectedPackId)
	const selectedPackSets = getPackSets(selectedPack)
	const selectedSet = getSelectedSet(selectedPack, settings.selectedSetId)
	const mathFocusOptions = MATH_FOCUS_OPTIONS.filter((focus) =>
		availableMathFocuses.includes(focus),
	)

	return (
		<div className="settings-backdrop" role="presentation">
			<button
				type="button"
				className="settings-backdrop-button"
				aria-label="Dismiss backdrop"
				tabIndex={-1}
				onClick={onClose}
			/>
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
							const sets = getPackSets(pack)
							const defaultSet = getSelectedSet(pack, null)
							const objectLabel =
								pack.objects.length === 1
									? '1 word'
									: `${pack.objects.length} words`
							const setLabel =
								sets.length === 1 ? '1 set' : `${sets.length} sets`

							return (
								<button
									key={pack.id}
									type="button"
									className={
										selectedPack.id === pack.id
											? 'pack-card is-selected'
											: 'pack-card'
									}
									aria-pressed={selectedPack.id === pack.id}
									data-testid={`pack-${pack.id}`}
									onClick={() =>
										update({
											selectedPackId: pack.id,
											selectedSetId: defaultSet.id,
											mode: contentChangeMode,
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

				{selectedPackSets.length > 1 ? (
					<div className="settings-section">
						<h3>Set</h3>
						<div className="set-grid" role="group" aria-label="Content set">
							{selectedPackSets.map((set) => {
								const objectCount = set.itemIds.length
								const objectLabel =
									objectCount === 1 ? '1 word' : `${objectCount} words`

								return (
									<button
										key={set.id}
										type="button"
										className={
											selectedSet.id === set.id
												? 'set-card is-selected'
												: 'set-card'
										}
										aria-pressed={selectedSet.id === set.id}
										data-testid={`set-${set.id}`}
										onClick={() =>
											update({
												selectedSetId: set.id,
												mode: contentChangeMode,
											})
										}
									>
										<span className="set-card-title">
											{set.title.en ?? set.id}
										</span>
										<span className="set-card-subtitle">
											{set.title['zh-Hans'] ?? ''}
										</span>
										<span className="set-card-meta">{objectLabel}</span>
									</button>
								)
							})}
						</div>
					</div>
				) : null}

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

				{mathFocusOptions.length > 1 ? (
					<div className="settings-section">
						<h3>Learning Focus</h3>
						<div
							className="preset-list"
							role="group"
							aria-label="Learning focus"
						>
							{mathFocusOptions.map((focus) => (
								<button
									key={focus}
									type="button"
									className={settings.mathFocus === focus ? 'is-selected' : ''}
									aria-pressed={settings.mathFocus === focus}
									data-testid={`math-focus-${focus}`}
									onClick={() => update({ mathFocus: focus })}
								>
									{mathFocusLabels[focus]}
								</button>
							))}
						</div>
					</div>
				) : null}

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
	const [layoutSeed, setLayoutSeed] = useState(() => createSceneLayoutSeed())
	const [settingsOpen, setSettingsOpen] = useState(false)
	const [activeObjectId, setActiveObjectId] = useState<string | null>(null)
	const [findRound, setFindRound] = useState<FindRound | null>(null)
	const [mathRound, setMathRound] = useState<MathPlayRound | null>(null)
	const [mathRoundIndex, setMathRoundIndex] = useState(0)
	const [selectedSortItemId, setSelectedSortItemId] = useState<string | null>(
		null,
	)
	const [puzzleRound, setPuzzleRound] = useState<PuzzleRound | null>(null)
	const [puzzleRoundIndex, setPuzzleRoundIndex] = useState(0)
	const [cardIndex, setCardIndex] = useState(0)
	const [draggedPuzzleObjectId, setDraggedPuzzleObjectId] = useState<
		string | null
	>(null)
	const [hoveredPuzzleTargetId, setHoveredPuzzleTargetId] = useState<
		string | null
	>(null)
	const [toast, setToast] = useState<ToastState>({
		kind: 'hello',
		sequence: [],
	})
	const shouldSpeakPromptRef = useRef(false)
	const puzzleResetTimeoutRef = useRef<number | null>(null)
	const mathResetTimeoutRef = useRef<number | null>(null)
	const puzzleDropRef = useRef<
		(objectId: string, targetObjectId: string) => void
	>(() => {})

	const selectedPackId = catalog?.packs.some(
		(packOption) => packOption.id === settings.selectedPackId,
	)
		? settings.selectedPackId
		: DEFAULT_SETTINGS.selectedPackId
	const pack = catalog ? getPack(catalog, selectedPackId) : null
	const cardObjects = pack?.objects ?? []
	const normalizedCardIndex =
		cardObjects.length > 0 ? Math.min(cardIndex, cardObjects.length - 1) : 0
	const activeCardObject = cardObjects[normalizedCardIndex] ?? null
	const activeSet = pack ? getSelectedSet(pack, settings.selectedSetId) : null
	const activeSetId = activeSet?.id ?? null
	const activeScenes = pack ? getSetScenes(pack, activeSetId) : []
	const normalizedSceneIndex =
		activeScenes.length > 0
			? Math.min(sceneIndex, Math.max(activeScenes.length - 1, 0))
			: 0
	const scene =
		activeScenes[normalizedSceneIndex] ??
		(catalog ? getDefaultScene(catalog, selectedPackId, activeSetId) : null)
	const placements = useMemo(
		() =>
			scene && pack ? buildSceneLayout(scene, pack.objects, layoutSeed) : [],
		[layoutSeed, pack, scene],
	)
	const objects = useMemo(
		() => placements.map((placement) => placement.object),
		[placements],
	)
	const mathObjects = useMemo(() => {
		if (!pack || !activeSet) {
			return []
		}
		const activeObjectIds = new Set(activeSet.itemIds)
		return pack.objects.filter((object) => activeObjectIds.has(object.id))
	}, [activeSet, pack])
	const mathPlacements = useMemo<MathPlayPlacement[]>(
		() => mathObjects.map((object) => ({ object })),
		[mathObjects],
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
	const mathObjectById = useMemo(
		() => new Map(mathObjects.map((object) => [object.id, object])),
		[mathObjects],
	)
	const availableMathFocuses = useMemo(
		() => getAvailableMathFocuses(mathPlacements),
		[mathPlacements],
	)
	const playableMathFocus = availableMathFocuses.includes(settings.mathFocus)
		? settings.mathFocus
		: (availableMathFocuses[0] ?? 'mixed')
	const disabledModes = useMemo(() => {
		const modes = new Set<GameMode>()
		if (availableMathFocuses.length === 0) {
			modes.add('math')
		}
		return modes
	}, [availableMathFocuses.length])
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
			.filter((placement): placement is VisibleScenePlacement =>
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
		if (settings.muted) {
			stopSpeech()
		}
	}, [settings.muted])

	useEffect(() => {
		if (scene && placements.length > 0) {
			preloadSceneAssets(scene, placements)
		}
	}, [scene, placements])

	useEffect(() => {
		const nextFocus = availableMathFocuses[0]
		if (!nextFocus || availableMathFocuses.includes(settings.mathFocus)) {
			return
		}
		setSettings((current) =>
			availableMathFocuses.includes(current.mathFocus)
				? current
				: { ...current, mathFocus: nextFocus },
		)
	}, [availableMathFocuses, settings.mathFocus])

	useEffect(() => {
		if (settings.mode !== 'math' || availableMathFocuses.length > 0) {
			return
		}
		clearMathResetTimeout()
		setMathRound(null)
		setMathRoundIndex(0)
		setSelectedSortItemId(null)
		setToast({ kind: 'hello', sequence: [] })
		setSettings((current) =>
			current.mode === 'math'
				? { ...current, mode: 'explore', mathFocus: 'mixed' }
				: current,
		)
	}, [availableMathFocuses.length, settings.mode])

	useEffect(() => {
		setCardIndex(0)
	}, [selectedPackId])

	useEffect(() => {
		return () => {
			clearPuzzleResetTimeout()
			clearMathResetTimeout()
		}
	}, [])

	useEffect(() => {
		return monitorForElements({
			canMonitor: ({ source }) => getPuzzlePieceObjectId(source.data) !== null,
			onDrop: ({ source, location }) => {
				const objectId = getPuzzlePieceObjectId(source.data)
				const targetObjectId =
					location.current.dropTargets
						.map((target) => getPuzzleGapObjectId(target.data))
						.find((target): target is string => Boolean(target)) ?? null
				if (objectId && targetObjectId) {
					puzzleDropRef.current(objectId, targetObjectId)
				}
				setDraggedPuzzleObjectId(null)
				setHoveredPuzzleTargetId(null)
			},
		})
	}, [])

	useEffect(() => {
		if (
			settings.mode === 'find' &&
			objects.length > 0 &&
			(!findRound ||
				!objects.some((object) => object.id === findRound.targetObjectId))
		) {
			setFindRound(createFindRound(objects))
		}
	}, [findRound, objects, settings.mode])

	useEffect(() => {
		clearPuzzleResetTimeout()
		clearMathResetTimeout()
		setSceneIndex(0)
		setLayoutSeed(createSceneLayoutSeed())
		setActiveObjectId(null)
		setFindRound(null)
		setMathRound(null)
		setMathRoundIndex(0)
		setSelectedSortItemId(null)
		setPuzzleRound(null)
		setPuzzleRoundIndex(0)
		setDraggedPuzzleObjectId(null)
		setHoveredPuzzleTargetId(null)
		setToast({ kind: 'hello', sequence: [] })
	}, [selectedPackId, activeSetId])

	useEffect(() => {
		clearPuzzleResetTimeout()
		clearMathResetTimeout()
		setActiveObjectId(null)
		setFindRound(null)
		setMathRound(null)
		setMathRoundIndex(0)
		setSelectedSortItemId(null)
		setPuzzleRound(null)
		setPuzzleRoundIndex(0)
		setDraggedPuzzleObjectId(null)
		setHoveredPuzzleTargetId(null)
		setToast({ kind: 'hello', sequence: [] })
	}, [scene?.id])

	useEffect(() => {
		clearMathResetTimeout()
		setMathRound(null)
		setMathRoundIndex(0)
		setSelectedSortItemId(null)
		if (settings.mode === 'math') {
			setToast({ kind: 'hello', sequence: [] })
		}
	}, [settings.mathFocus])

	useEffect(() => {
		if (settings.mode === 'puzzle' && placements.length > 0 && !puzzleRound) {
			setPuzzleRound(createPuzzleRound(placements, puzzleRoundIndex))
		}
	}, [placements, puzzleRound, puzzleRoundIndex, settings.mode])

	useEffect(() => {
		if (settings.mode === 'math' && mathPlacements.length > 0 && !mathRound) {
			setMathRound(
				createMathPlayRound(mathPlacements, {
					roundIndex: mathRoundIndex,
					focus: playableMathFocus,
				}),
			)
		}
	}, [
		mathPlacements,
		mathRound,
		mathRoundIndex,
		playableMathFocus,
		settings.mode,
	])

	useEffect(() => {
		let nextToast: ToastState | null = null
		if (settings.mode === 'find' && targetObject) {
			nextToast = {
				kind: 'find',
				sequence: getFindPrompt(targetObject, settings),
			}
		} else if (
			toast.kind === 'find' ||
			toast.kind === 'puzzle' ||
			toast.kind === 'math'
		) {
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
			clearMathResetTimeout()
		}
		setSettings(nextSettings)
		if (nextSettings.mode === 'find' && objects.length > 0) {
			setFindRound((round) => round ?? createFindRound(objects))
		}
		if (nextSettings.mode === 'puzzle') {
			setDraggedPuzzleObjectId(null)
			setHoveredPuzzleTargetId(null)
			setToast({ kind: 'puzzle', sequence: [] })
		}
		if (nextSettings.mode === 'math') {
			setDraggedPuzzleObjectId(null)
			setHoveredPuzzleTargetId(null)
			setMathRound(
				(round) =>
					round ??
					createMathPlayRound(mathPlacements, {
						roundIndex: mathRoundIndex,
						focus: availableMathFocuses.includes(nextSettings.mathFocus)
							? nextSettings.mathFocus
							: (availableMathFocuses[0] ?? 'mixed'),
					}),
			)
			setToast({ kind: 'hello', sequence: [] })
		}
		if (nextSettings.mode === 'cards') {
			setDraggedPuzzleObjectId(null)
			setHoveredPuzzleTargetId(null)
			setToast({ kind: 'hello', sequence: [] })
		}
	}

	function selectCard(offset: number) {
		if (cardObjects.length === 0) {
			return
		}

		setCardIndex((currentIndex) => {
			return (currentIndex + offset + cardObjects.length) % cardObjects.length
		})
	}

	function speakCard() {
		if (!activeCardObject) {
			return
		}

		speakSequence(
			buildLearningSequence(activeCardObject, settings),
			settings.muted,
		)
	}

	function selectScene(nextSceneIndex: number) {
		if (!pack || activeScenes.length === 0) {
			return
		}

		const wrappedIndex =
			((nextSceneIndex % activeScenes.length) + activeScenes.length) %
			activeScenes.length
		if (wrappedIndex === normalizedSceneIndex) {
			return
		}

		clearPuzzleResetTimeout()
		shouldSpeakPromptRef.current = settings.mode === 'find'
		setLayoutSeed(createSceneLayoutSeed())
		setSceneIndex(wrappedIndex)
	}

	function handleObjectTap(object: ObjectConcept) {
		setActiveObjectId(object.id)

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
			return
		}

		setActiveObjectId(objectId)

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
				setDraggedPuzzleObjectId(null)
				setHoveredPuzzleTargetId(null)
				setToast({ kind: 'puzzle', sequence: [] })
			}, 1400)
		}
	}
	puzzleDropRef.current = handlePuzzleAttempt

	function handleMathCollectObject(object: ObjectConcept) {
		if (
			!mathRound ||
			(mathRound.type !== 'count-and-collect' &&
				mathRound.type !== 'feed-the-friend')
		) {
			return
		}

		setActiveObjectId(object.id)
		const result = handleMathCollect(mathRound, object.id)
		if (!result.isTarget) {
			const sequence = buildLearningSequence(object, settings)
			setToast({ kind: 'word', sequence })
			speakSequence(sequence, settings.muted)
			return
		}

		const nextRound = {
			...mathRound,
			collectedCount: result.collectedCount,
		}
		setMathRound(nextRound)

		if (result.isComplete) {
			const totalSequence = getMathTotalPresentation(
				nextRound.targetQuantity,
				object,
				settings,
			)
			const countSequence = result.countedNumber
				? getMathCountPresentation(result.countedNumber, settings)
				: []
			setToast({ kind: 'math', sequence: totalSequence })
			speakSequence([...countSequence, ...totalSequence], settings.muted)

			const nextRoundIndex = mathRoundIndex + 1
			clearMathResetTimeout()
			mathResetTimeoutRef.current = window.setTimeout(() => {
				mathResetTimeoutRef.current = null
				setMathRoundIndex(nextRoundIndex)
				setMathRound(
					createMathPlayRound(mathPlacements, {
						roundIndex: nextRoundIndex,
						previousTargetId: object.id,
						focus: playableMathFocus,
					}),
				)
				setActiveObjectId(null)
				setSelectedSortItemId(null)
				setToast({ kind: 'hello', sequence: [] })
			}, 1400)
			return
		}

		const countSequence = result.countedNumber
			? getMathCountPresentation(result.countedNumber, settings)
			: []
		setToast({ kind: 'math', sequence: countSequence })
		speakSequence(countSequence, settings.muted)
	}

	function handleMathDotChoice(choice: DotMatchChoice) {
		if (!mathRound || mathRound.type !== 'dot-match') {
			return
		}

		const object = mathObjectById.get(choice.objectId)
		const result = handleDotMatch(mathRound, choice.id)
		const nextRound = {
			...mathRound,
			selectedChoiceId: result.selectedChoiceId,
			isComplete: result.isComplete,
		}
		setMathRound(nextRound)

		if (!result.isTarget) {
			const sequence = object
				? createMathPresentation(settings, {
						en: `${getEnglishQuantityText(object, choice.quantity, true)}.`,
						'zh-Hans': `${getChineseQuantityText(object, choice.quantity)}。`,
					})
				: getMathPrompt(mathRound, mathObjectById, settings)
			setToast({ kind: 'math', sequence })
			speakSequence(sequence, settings.muted)
			window.setTimeout(() => {
				setToast({
					kind: 'math',
					sequence: getMathPrompt(mathRound, mathObjectById, settings),
				})
			}, 1200)
			return
		}

		const successSequence = createMathPresentation(settings, {
			en: 'Same number.',
			'zh-Hans': '一样多。',
		})
		setToast({ kind: 'math', sequence: successSequence })
		speakSequence(successSequence, settings.muted)
		advanceMathRound(choice.objectId)
	}

	function handleMathColorSort(item: ColorSortItem, basketColor: string) {
		if (!mathRound || mathRound.type !== 'color-sort') {
			return
		}

		const result = handleColorSort(mathRound, item.id, basketColor)
		if (!result.isTarget) {
			const object = mathObjectById.get(item.objectId)
			const sequence = object
				? buildLearningSequence(object, settings)
				: getMathPrompt(mathRound, mathObjectById, settings)
			setToast({ kind: 'math', sequence })
			speakSequence(sequence, settings.muted)
			return
		}

		const nextRound = { ...mathRound, items: result.items }
		setMathRound(nextRound)
		setSelectedSortItemId(null)
		const object = mathObjectById.get(item.objectId)
		const placedSequence = createMathPresentation(settings, {
			en: object
				? `${capitalizeEnglish(item.color)} ${getObjectName(object, 'en')}.`
				: `${capitalizeEnglish(item.color)}.`,
			'zh-Hans': object
				? `${getChineseColorName(item.color)}${getObjectName(object, 'zh-Hans')}。`
				: `${getChineseColorName(item.color)}。`,
		})
		setToast({ kind: 'math', sequence: placedSequence })
		speakSequence(placedSequence, settings.muted)

		if (result.isComplete) {
			advanceMathRound(item.objectId)
		}
	}

	function advanceMathRound(previousTargetId: string) {
		const nextRoundIndex = mathRoundIndex + 1
		clearMathResetTimeout()
		mathResetTimeoutRef.current = window.setTimeout(() => {
			mathResetTimeoutRef.current = null
			setMathRoundIndex(nextRoundIndex)
			setSelectedSortItemId(null)
			setMathRound(
				createMathPlayRound(mathPlacements, {
					roundIndex: nextRoundIndex,
					previousTargetId,
					focus: playableMathFocus,
				}),
			)
			setActiveObjectId(null)
			setToast({ kind: 'hello', sequence: [] })
		}, 1400)
	}

	function clearPuzzleResetTimeout() {
		if (puzzleResetTimeoutRef.current === null) {
			return
		}

		window.clearTimeout(puzzleResetTimeoutRef.current)
		puzzleResetTimeoutRef.current = null
	}

	function clearMathResetTimeout() {
		if (mathResetTimeoutRef.current === null) {
			return
		}

		window.clearTimeout(mathResetTimeoutRef.current)
		mathResetTimeoutRef.current = null
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

	const sceneTitle = scene.title.en
	const deckTitle = pack.title.en ?? pack.id
	const isCardsMode = settings.mode === 'cards'
	const isMathMode = settings.mode === 'math'
	const hasSceneNavigation = activeScenes.length > 1
	const promptSequence =
		toast.sequence.length > 0
			? toast.sequence
			: settings.mode === 'find' && targetObject
				? getFindPrompt(targetObject, settings)
				: isMathMode && mathRound
					? getMathPrompt(mathRound, mathObjectById, settings)
					: isMathMode
						? getMathFallbackPrompt(settings)
						: []
	const promptKind =
		promptSequence.length > 0
			? toast.kind
			: settings.mode === 'puzzle'
				? 'puzzle'
				: isMathMode
					? 'math'
					: 'hello'
	const backgroundStyle = scene.background.asset
		? ({
				backgroundImage: `url(${scene.background.asset.path})`,
			} as JSX.CSSProperties)
		: undefined

	return (
		<main
			className="app-shell"
			data-mode={settings.mode}
			aria-label="Word Garden"
		>
			<header className="topbar">
				<ModeSegment
					mode={settings.mode}
					disabledModes={disabledModes}
					onChange={(mode) => updateSettings({ ...settings, mode })}
				/>

				{isCardsMode ? (
					<div className="scene-nav is-single-scene">
						<span data-testid="deck-title">{deckTitle}</span>
					</div>
				) : (
					<nav
						className={
							hasSceneNavigation ? 'scene-nav' : 'scene-nav is-single-scene'
						}
						aria-label="Scene"
					>
						{hasSceneNavigation ? (
							<button
								type="button"
								className="icon-button"
								aria-label="Previous scene"
								data-testid="scene-previous"
								onClick={() => selectScene(normalizedSceneIndex - 1)}
							>
								<Icon name="previous" />
							</button>
						) : null}
						<span data-testid="scene-title">{sceneTitle}</span>
						{hasSceneNavigation ? (
							<button
								type="button"
								className="icon-button"
								aria-label="Next scene"
								data-testid="scene-next"
								onClick={() => selectScene(normalizedSceneIndex + 1)}
							>
								<Icon name="next" />
							</button>
						) : null}
					</nav>
				)}

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
				className={`play-area ${isCardsMode ? 'is-cards' : ''}`}
				aria-label={isCardsMode ? deckTitle : sceneTitle}
			>
				{isCardsMode && activeCardObject ? (
					<LanguageCard
						object={activeCardObject}
						cardIndex={normalizedCardIndex}
						totalCards={cardObjects.length}
						settings={settings}
						onPrevious={() => selectCard(-1)}
						onNext={() => selectCard(1)}
						onSpeak={speakCard}
					/>
				) : (
					<>
						<div
							className={`prompt-ribbon is-${promptKind}`}
							data-testid="prompt"
						>
							{promptSequence.length > 0 ? (
								<SequenceText sequence={promptSequence} />
							) : settings.mode === 'puzzle' ? (
								<strong>Puzzle garden.</strong>
							) : (
								<strong>Hello, garden.</strong>
							)}
						</div>

						{isMathMode && mathRound ? (
							<div className="garden-stage is-math" style={backgroundStyle}>
								<MathPlayStage
									round={mathRound}
									objectById={mathObjectById}
									placementByObjectId={placementByObjectId}
									selectedSortItemId={selectedSortItemId}
									onCollect={handleMathCollectObject}
									onDotChoice={handleMathDotChoice}
									onSelectSortItem={setSelectedSortItemId}
									onColorSort={handleMathColorSort}
								/>
							</div>
						) : isMathMode ? (
							<div className="garden-stage is-math" style={backgroundStyle}>
								<div className="math-stage" data-testid="math-stage">
									<strong>Try another set for Math Play.</strong>
								</div>
							</div>
						) : settings.mode === 'puzzle' ? (
							<div className="puzzle-layout">
								<div className="garden-stage is-puzzle" style={backgroundStyle}>
									{placements.map((placement) =>
										placedPuzzleObjectIds.includes(
											placement.object.id,
										) ? null : (
											<PuzzleGapButton
												key={placement.object.id}
												placement={placement}
												draggedObjectId={draggedPuzzleObjectId}
												hoveredTargetObjectId={hoveredPuzzleTargetId}
												onHoverTargetChange={setHoveredPuzzleTargetId}
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
									settings={settings}
									onDraggingObjectChange={setDraggedPuzzleObjectId}
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
					</>
				)}
			</section>

			{settingsOpen ? (
				<ParentSettings
					catalog={catalog}
					settings={settings}
					availableMathFocuses={availableMathFocuses}
					onChange={updateSettings}
					onClose={() => setSettingsOpen(false)}
				/>
			) : null}
		</main>
	)
}
