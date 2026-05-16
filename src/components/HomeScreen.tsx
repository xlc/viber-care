import type { LanguageCode, StoryPack } from '../content/schema'
import { getAssetAlt, getText } from '../story/pack-selection'

type HomeScreenProps = {
	language: LanguageCode
	packs: StoryPack[]
	selectedPackId: string
	onLanguageChange: (language: LanguageCode) => void
	onSelectPack: (packId: string) => void
	onStartCards: (packId: string) => void
	onStartStory: (packId: string) => void
}

export function HomeScreen({
	language,
	packs,
	selectedPackId,
	onLanguageChange,
	onSelectPack,
	onStartCards,
	onStartStory,
}: HomeScreenProps) {
	return (
		<main className="home-screen" data-testid="home-screen">
			<header className="home-intro">
				<div>
					<p className="kicker">Word Garden</p>
					<h1>Story Time</h1>
				</div>
				<LanguageToggle
					language={language}
					onLanguageChange={onLanguageChange}
				/>
			</header>

			<section className="pack-list" aria-label="Story packs">
				{packs.map((pack) => {
					const isSelected = pack.id === selectedPackId
					return (
						<article
							className={`pack-card ${isSelected ? 'is-selected' : ''}`}
							data-testid={`pack-card-${pack.id}`}
							key={pack.id}
						>
							<button
								type="button"
								className="pack-select"
								aria-pressed={isSelected}
								onClick={() => onSelectPack(pack.id)}
							>
								<img
									src={pack.coverImage.path}
									alt={getAssetAlt(
										pack.coverImage,
										getText(pack.metadata.title, language),
									)}
								/>
								<span className="pack-copy">
									<strong>{getText(pack.metadata.title, language)}</strong>
									<span>{getText(pack.metadata.description, language)}</span>
								</span>
							</button>
							<div className="pack-actions">
								<button
									type="button"
									className="primary-action"
									data-testid={`start-story-${pack.id}`}
									onClick={() => onStartStory(pack.id)}
								>
									Story Mode
								</button>
								<button
									type="button"
									className="secondary-action"
									data-testid={`start-cards-${pack.id}`}
									onClick={() => onStartCards(pack.id)}
								>
									Card Mode
								</button>
							</div>
						</article>
					)
				})}
			</section>
		</main>
	)
}

function LanguageToggle({
	language,
	onLanguageChange,
}: {
	language: LanguageCode
	onLanguageChange: (language: LanguageCode) => void
}) {
	return (
		<div className="language-toggle" role="group" aria-label="Story language">
			<button
				type="button"
				className={language === 'en' ? 'is-selected' : ''}
				aria-pressed={language === 'en'}
				data-testid="language-en"
				onClick={() => onLanguageChange('en')}
			>
				English
			</button>
			<button
				type="button"
				className={language === 'zh-Hans' ? 'is-selected' : ''}
				aria-pressed={language === 'zh-Hans'}
				data-testid="language-zh-Hans"
				onClick={() => onLanguageChange('zh-Hans')}
			>
				中文
			</button>
		</div>
	)
}
