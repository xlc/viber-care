import type { LanguageCode, StoryItem, StoryPack } from '../content/schema'
import { getAssetAlt, getText } from '../story/pack-selection'

type CardModeProps = {
	activeItem: StoryItem
	cardIndex: number
	items: StoryItem[]
	language: LanguageCode
	pack: StoryPack
	onBack: () => void
	onNext: () => void
	onPrevious: () => void
	onSpeak: () => void
}

export function CardMode({
	activeItem,
	cardIndex,
	items,
	language,
	pack,
	onBack,
	onNext,
	onPrevious,
	onSpeak,
}: CardModeProps) {
	return (
		<main className="mode-screen card-screen" data-testid="card-screen">
			<header className="mode-header">
				<button type="button" className="text-button" onClick={onBack}>
					Back
				</button>
				<div>
					<p className="kicker">{getText(pack.metadata.title, language)}</p>
					<h1>Card Mode</h1>
				</div>
				<span className="card-count" data-testid="card-count">
					{cardIndex + 1} / {items.length}
				</span>
			</header>

			<section className="card-stage" aria-label="Vocabulary card">
				<button
					type="button"
					className="nav-button"
					aria-label="Previous card"
					onClick={onPrevious}
					disabled={items.length < 2}
				>
					Previous
				</button>
				<button
					type="button"
					className="vocabulary-card"
					data-testid="vocabulary-card"
					onClick={onSpeak}
				>
					<img
						src={activeItem.image.path}
						alt={getAssetAlt(
							activeItem.image,
							getText(activeItem.name, language),
						)}
					/>
					<span lang="en">{getText(activeItem.name, 'en')}</span>
					<span lang="zh-Hans">{getText(activeItem.name, 'zh-Hans')}</span>
				</button>
				<button
					type="button"
					className="nav-button"
					aria-label="Next card"
					onClick={onNext}
					disabled={items.length < 2}
				>
					Next
				</button>
			</section>
		</main>
	)
}
