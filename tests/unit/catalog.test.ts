import { describe, expect, it } from 'vitest'
import { catalog } from '../../src/content/catalog'
import { RuntimeCatalogSchema } from '../../src/content/schema'

describe('runtime catalog', () => {
	it('loads committed source content directly', () => {
		const parsed = RuntimeCatalogSchema.parse(catalog)

		expect(parsed.schemaVersion).toBe('1')
		expect(parsed.defaultLanguageOrder).toEqual(['en', 'zh-Hans'])
		expect(parsed.supportedLanguages).toContain('ko')
		expect(parsed.learningLevels).toEqual(['L0', 'L1', 'L2', 'L3', 'L4', 'L5'])
		expect(parsed.packs.map((pack) => pack.id)).toEqual([
			'garden',
			'ocean-animals',
			'dinosaurs',
		])
		expect(parsed.packs[0]?.objects.map((object) => object.id)).toContain('sun')
		expect(parsed.packs[1]?.objects.map((object) => object.id)).toContain(
			'whale',
		)
	})
})
