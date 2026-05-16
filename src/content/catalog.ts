import {
	type StoryCatalog,
	StoryCatalogSchema,
	SUPPORTED_LANGUAGE_CODES,
} from './schema'
import { validateStoryPacks } from './validation'

const packModules = import.meta.glob('../../content/story-packs/*.json', {
	eager: true,
	import: 'default',
})

function createStoryCatalog(packs: unknown[]): StoryCatalog {
	const validatedPacks = validateStoryPacks(packs).sort((a, b) =>
		a.id.localeCompare(b.id),
	)

	return StoryCatalogSchema.parse({
		schemaVersion: 'story-pack-v1',
		supportedLanguages: [...SUPPORTED_LANGUAGE_CODES],
		packs: validatedPacks,
	})
}

export const catalog = createStoryCatalog(Object.values(packModules))
