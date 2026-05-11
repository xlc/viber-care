import {
	LEARNING_LEVELS,
	type RuntimeCatalog,
	RuntimeCatalogSchema,
	SUPPORTED_LANGUAGE_CODES,
} from './schema'
import { validateContentCatalog } from './validation'

const itemModules = import.meta.glob('../../content/items/*.json', {
	eager: true,
	import: 'default',
})

const packModules = import.meta.glob('../../content/packs/*.json', {
	eager: true,
	import: 'default',
})

export function createRuntimeCatalog(
	items: unknown[],
	packs: unknown[],
): RuntimeCatalog {
	const validated = validateContentCatalog(items, packs)

	return RuntimeCatalogSchema.parse({
		schemaVersion: '2',
		supportedLanguages: [...SUPPORTED_LANGUAGE_CODES],
		learningLevels: [...LEARNING_LEVELS],
		defaultLanguageOrder: ['en', 'zh-Hans'],
		items: validated.items,
		packs: validated.packs,
	})
}

export const catalog = createRuntimeCatalog(
	Object.values(itemModules),
	Object.values(packModules),
)
