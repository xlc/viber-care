import type { LanguageCode, StoryPack, StoryScene } from '../content/schema'
import {
	getAssetAlt,
	getAudioPath,
	getStoryItem,
	getText,
} from '../story/pack-selection'

type StoryModeProps = {
	activeItemKey: string | null
	canGoNext: boolean
	canGoPrevious: boolean
	language: LanguageCode
	pack: StoryPack
	scene: StoryScene
	sceneCount: number
	sceneIndex: number
	onBack: () => void
	onLanguageChange: (language: LanguageCode) => void
	onNext: () => void
	onPrevious: () => void
	onReplay: () => void
	onSpeakItem: (itemId: string) => void
}

export function StoryMode({
	activeItemKey,
	canGoNext,
	canGoPrevious,
	language,
	pack,
	scene,
	sceneCount,
	sceneIndex,
	onBack,
	onLanguageChange,
	onNext,
	onPrevious,
	onReplay,
	onSpeakItem,
}: StoryModeProps) {
	const title = getText(pack.metadata.title, language)
	const storyText = getText(scene.text, language)

	return (
		<main className="mode-screen story-screen" data-testid="story-screen">
			<header className="mode-header">
				<button type="button" className="text-button" onClick={onBack}>
					Back
				</button>
				<div>
					<p className="kicker">{title}</p>
					<h1 data-testid="scene-text">{storyText}</h1>
				</div>
				<div
					className="language-toggle compact"
					role="group"
					aria-label="Story language"
				>
					<button
						type="button"
						className={language === 'en' ? 'is-selected' : ''}
						aria-pressed={language === 'en'}
						onClick={() => onLanguageChange('en')}
					>
						English
					</button>
					<button
						type="button"
						className={language === 'zh-Hans' ? 'is-selected' : ''}
						aria-pressed={language === 'zh-Hans'}
						onClick={() => onLanguageChange('zh-Hans')}
					>
						中文
					</button>
				</div>
			</header>

			<section className="story-layout">
				<div className="scene-frame">
					<img
						className="scene-image"
						src={scene.image.path}
						alt={getAssetAlt(scene.image, storyText)}
					/>
					{scene.items.map((sceneItem) => {
						const item = getStoryItem(pack, sceneItem)
						if (!item) {
							return null
						}

						const interaction = scene.interactions.find(
							(candidate) => candidate.id === sceneItem.interactionId,
						)
						const activeKey = `${scene.id}:${sceneItem.itemId}`

						return (
							<button
								key={activeKey}
								type="button"
								className={`scene-item-tap interaction-${
									interaction?.type ?? 'sound'
								}${activeItemKey === activeKey ? ' is-active' : ''}`}
								style={{
									left: `${sceneItem.x ?? 50}%`,
									top: `${sceneItem.y ?? 50}%`,
									'--item-scale': sceneItem.scale ?? 1,
								}}
								aria-label={getText(item.name, language)}
								data-testid={`scene-item-${item.id}`}
								onClick={() => onSpeakItem(sceneItem.itemId)}
							>
								<img src={item.image.path} alt="" aria-hidden="true" />
							</button>
						)
					})}
				</div>
				<footer className="story-controls">
					<button
						type="button"
						className="nav-button"
						aria-label="Previous scene"
						disabled={!canGoPrevious}
						onClick={onPrevious}
					>
						Previous
					</button>
					<button
						type="button"
						className="primary-action replay-action"
						data-testid="replay-scene"
						disabled={!getAudioPath(scene.narration, language)}
						onClick={onReplay}
					>
						Replay
					</button>
					<span className="scene-progress" data-testid="scene-progress">
						{sceneIndex + 1} / {sceneCount}
					</span>
					<button
						type="button"
						className="nav-button"
						aria-label="Next scene"
						disabled={!canGoNext}
						onClick={onNext}
					>
						Next
					</button>
				</footer>
			</section>
		</main>
	)
}
