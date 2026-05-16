import type { LanguageCode } from '../content/schema'

type ParentSettingsProps = {
	language: LanguageCode
	muted: boolean
	onClose: () => void
	onLanguageChange: (language: LanguageCode) => void
	onMutedChange: (muted: boolean) => void
}

export function ParentSettings({
	language,
	muted,
	onClose,
	onLanguageChange,
	onMutedChange,
}: ParentSettingsProps) {
	return (
		<div className="settings-backdrop" role="presentation">
			<button
				type="button"
				className="settings-backdrop-button"
				aria-label="Close settings"
				onClick={onClose}
			/>
			<section
				className="settings-panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby="settings-title"
				data-testid="settings-panel"
			>
				<header>
					<h2 id="settings-title">Parent Settings</h2>
					<button type="button" className="text-button" onClick={onClose}>
						Close
					</button>
				</header>

				<div className="settings-section">
					<h3>Story Language</h3>
					<div
						className="language-toggle"
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
				</div>

				<label className="settings-check">
					<input
						type="checkbox"
						checked={muted}
						onChange={(event) => onMutedChange(event.currentTarget.checked)}
					/>
					Mute audio
				</label>
			</section>
		</div>
	)
}
