import dinosaursPack from '../../content/packs/dinosaurs.json'
import englishAlphabetPack from '../../content/packs/english-alphabet.json'
import farmFriendsPack from '../../content/packs/farm-friends.json'
import gardenPack from '../../content/packs/garden.json'
import numbersPack from '../../content/packs/numbers.json'
import oceanAnimalsPack from '../../content/packs/ocean-animals.json'
import transportationPack from '../../content/packs/transportation.json'
import {
	LEARNING_LEVELS,
	type RuntimeCatalog,
	RuntimeCatalogSchema,
	SUPPORTED_LANGUAGE_CODES,
} from './schema'
import { validateContentPacks } from './validation'

export function createRuntimeCatalog(packs: unknown[]): RuntimeCatalog {
	return RuntimeCatalogSchema.parse({
		schemaVersion: '1',
		supportedLanguages: [...SUPPORTED_LANGUAGE_CODES],
		learningLevels: [...LEARNING_LEVELS],
		defaultLanguageOrder: ['en', 'zh-Hans'],
		packs: validateContentPacks(packs),
	})
}

export const catalog = createRuntimeCatalog([
	gardenPack,
	oceanAnimalsPack,
	dinosaursPack,
	farmFriendsPack,
	numbersPack,
	englishAlphabetPack,
	transportationPack,
])
