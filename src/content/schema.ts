import { z } from 'zod'

export const SUPPORTED_LANGUAGE_CODES = ['en', 'zh-Hans'] as const

export const LEARNING_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as const

export const REQUIRED_MVP_LANGUAGES = ['en', 'zh-Hans'] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number]
export type LearningLevel = (typeof LEARNING_LEVELS)[number]

export const LanguageCodeSchema = z.enum(SUPPORTED_LANGUAGE_CODES)
export const LearningLevelSchema = z.enum(LEARNING_LEVELS)

const languageMapSchema = <Value extends z.ZodType>(valueSchema: Value) =>
	z.record(z.string(), valueSchema).superRefine((value, ctx) => {
		for (const key of Object.keys(value)) {
			if (!LanguageCodeSchema.safeParse(key).success) {
				ctx.addIssue({
					code: 'custom',
					message: `Unsupported language code "${key}".`,
				})
			}
		}
	})

export const AssetReferenceSchema = z.object({
	type: z.enum(['image', 'audio', 'sound', 'background', 'music']),
	path: z.string().min(1),
	alt: z.string().min(1).optional(),
	generationPrompt: z.string().min(1).optional(),
	generationText: z.string().min(1).optional(),
	placeholder: z
		.object({
			label: z.string().min(1),
			emoji: z.string().min(1).optional(),
		})
		.optional(),
})

export const InteractionSchema = z.object({
	id: z.string().min(1),
	animation: z.enum(['bob', 'bounce', 'glow', 'sway', 'wiggle']),
})

export const ObjectVariantSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	image: AssetReferenceSchema,
	visualPrompt: z.string().min(1),
	scaleMultiplier: z.number().min(0.6).max(1.6).default(1),
	color: z.string().min(1).optional(),
	colors: z.array(z.string().min(1)).min(1).optional(),
	size: z.enum(['small', 'medium', 'large']).optional(),
	style: z.string().min(1).optional(),
	tags: z.array(z.string().min(1)).min(1).optional(),
})

export const MathSkillSchema = z.enum([
	'counting',
	'one-to-one',
	'dot-match',
	'color-sort',
	'shape-sort',
	'more-less',
	'spatial',
	'size',
])

export const MathMetadataSchema = z.object({
	countable: z.boolean(),
	quantityRange: z.object({
		min: z.literal(1),
		max: z.union([z.literal(3), z.literal(5), z.literal(10)]),
	}),
	skills: z.array(MathSkillSchema).min(1),
	colors: z.array(z.string().min(1)).min(1).optional(),
	sizes: z
		.array(z.enum(['big', 'small']))
		.min(1)
		.optional(),
	sceneZones: z.array(z.string().min(1)).min(1).optional(),
	zhMeasureWord: z.string().min(1).optional(),
	englishPlural: z.string().min(1).optional(),
})

export const LevelContentSchema = z.object({
	text: z.string().min(1),
	audioText: z.string().min(1),
	fallbackText: z.string().min(1).optional(),
	audio: AssetReferenceSchema.optional(),
})

export const LanguageContentSchema = z.object({
	language: LanguageCodeSchema,
	displayName: z.string().min(1),
	findPrompt: z.string().min(1),
	findPromptAudio: AssetReferenceSchema.optional(),
	successPhrase: z.string().min(1),
	successPhraseAudio: AssetReferenceSchema.optional(),
	fallbackText: z.string().min(1),
	levels: z.record(z.string(), LevelContentSchema).superRefine((value, ctx) => {
		for (const key of Object.keys(value)) {
			if (!LearningLevelSchema.safeParse(key).success) {
				ctx.addIssue({
					code: 'custom',
					message: `Unsupported learning level "${key}".`,
				})
			}
		}
	}),
})

export const ObjectConceptSchema = z.object({
	id: z.string().min(1),
	category: z.string().min(1),
	tags: z.array(z.string().min(1)).min(1),
	visualPrompt: z.string().min(1),
	variants: z.array(ObjectVariantSchema).min(2),
	interaction: InteractionSchema,
	content: languageMapSchema(LanguageContentSchema),
	math: MathMetadataSchema.optional(),
})

export const SceneRegionRectSchema = z.object({
	x: z.number().min(0).max(100),
	y: z.number().min(0).max(100),
	width: z.number().min(1).max(100),
	height: z.number().min(1).max(100),
})

export const SceneRegionSchema = z.object({
	id: z.string().min(1),
	tags: z.array(z.string().min(1)).min(1),
	rects: z.array(SceneRegionRectSchema).min(1),
})

export const SceneObjectPlacementSchema = z.object({
	itemId: z.string().min(1),
	x: z.number().min(0).max(100),
	y: z.number().min(0).max(100),
	scale: z.number().min(0.4).max(2),
	zIndex: z.number().int().optional(),
	regionTags: z.array(z.string().min(1)).min(1),
	jitter: z
		.object({
			x: z.number().min(0).max(40),
			y: z.number().min(0).max(40),
		})
		.optional(),
	scaleRange: z
		.object({
			min: z.number().min(0.4).max(2),
			max: z.number().min(0.4).max(2),
		})
		.optional(),
})

export const SceneSchema = z.object({
	id: z.string().min(1),
	packId: z.string().min(1),
	title: languageMapSchema(z.string().min(1)),
	background: z.object({
		prompt: z.string().min(1).optional(),
		asset: AssetReferenceSchema.optional(),
	}),
	regions: z.array(SceneRegionSchema).min(1),
	visibleObjectCount: z.object({
		min: z.number().int().min(1),
		max: z.number().int().min(1),
	}),
	objects: z.array(SceneObjectPlacementSchema).min(1),
	music: z
		.object({
			enabledByDefault: z.literal(false),
			asset: AssetReferenceSchema.optional(),
		})
		.optional(),
})

export const ContentSetSchema = z.object({
	id: z.string().min(1),
	title: languageMapSchema(z.string().min(1)),
	itemIds: z.array(z.string().min(1)).min(1),
	sceneIds: z.array(z.string().min(1)).min(1),
})

export const SourceContentPackSchema = z.object({
	id: z.string().min(1),
	version: z.string().min(1),
	title: languageMapSchema(z.string().min(1)),
	languages: z.array(LanguageCodeSchema).min(1),
	defaultSceneId: z.string().min(1),
	sets: z.array(ContentSetSchema).min(1),
	scenes: z.array(SceneSchema).min(1),
})

export const ContentPackSchema = SourceContentPackSchema.extend({
	objects: z.array(ObjectConceptSchema).min(1),
})

export const RuntimeCatalogSchema = z.object({
	schemaVersion: z.literal('2'),
	supportedLanguages: z.array(LanguageCodeSchema).min(1),
	learningLevels: z.array(LearningLevelSchema).length(6),
	defaultLanguageOrder: z.array(LanguageCodeSchema).min(1),
	items: z.array(ObjectConceptSchema).min(1),
	packs: z.array(ContentPackSchema).min(1),
})

export type AssetReference = z.infer<typeof AssetReferenceSchema>
export type Interaction = z.infer<typeof InteractionSchema>
export type ObjectVariant = z.infer<typeof ObjectVariantSchema>
export type MathSkill = z.infer<typeof MathSkillSchema>
export type MathMetadata = z.infer<typeof MathMetadataSchema>
export type LevelContent = z.infer<typeof LevelContentSchema>
export type LanguageContent = z.infer<typeof LanguageContentSchema>
export type ObjectConcept = z.infer<typeof ObjectConceptSchema>
export type SceneRegion = z.infer<typeof SceneRegionSchema>
export type SceneRegionRect = z.infer<typeof SceneRegionRectSchema>
export type Scene = z.infer<typeof SceneSchema>
export type ContentSet = z.infer<typeof ContentSetSchema>
export type SourceContentPack = z.infer<typeof SourceContentPackSchema>
export type ContentPack = z.infer<typeof ContentPackSchema>
export type RuntimeCatalog = z.infer<typeof RuntimeCatalogSchema>
