import { z } from 'zod'

export const SUPPORTED_LANGUAGE_CODES = ['en', 'zh-Hans'] as const
export const REQUIRED_STORY_LANGUAGES = ['en', 'zh-Hans'] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number]

const LanguageCodeSchema = z.enum(SUPPORTED_LANGUAGE_CODES)

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

const AssetReferenceSchema = z.object({
	type: z.enum(['image', 'audio', 'sound']),
	path: z.string().min(1),
	alt: z.string().min(1).optional(),
})

const LocalizedTextSchema = languageMapSchema(z.string().min(1))
const LocalizedAudioSchema = languageMapSchema(AssetReferenceSchema)

const StoryPackMetadataSchema = z.object({
	title: LocalizedTextSchema,
	description: LocalizedTextSchema,
	ageRange: z.string().min(1),
	theme: z.string().min(1),
	sceneCount: z.number().int().min(1),
})

const PlotPlanSchema = z.object({
	mainCharacter: z.string().min(1),
	setting: z.string().min(1),
	goal: z.string().min(1),
	beginning: z.string().min(1),
	middle: z.string().min(1),
	ending: z.string().min(1),
	emotionalTone: z.string().min(1),
	learningGoals: z.array(z.string().min(1)).min(1),
	vocabulary: z.array(z.string().min(1)).min(1),
	interactionIdeas: z.array(z.string().min(1)).default([]),
})

const StoryInteractionSchema = z.object({
	id: z.string().min(1),
	type: z.enum(['move', 'bounce', 'float', 'glow', 'sound']),
})

const StorySceneItemSchema = z.object({
	itemId: z.string().min(1),
	x: z.number().min(0).max(100).optional(),
	y: z.number().min(0).max(100).optional(),
	scale: z.number().min(0.4).max(2).optional(),
	interactionId: z.string().min(1).optional(),
})

const StorySceneSchema = z.object({
	id: z.string().min(1),
	order: z.number().int().min(1),
	purpose: z.string().min(1),
	text: LocalizedTextSchema,
	narration: LocalizedAudioSchema,
	image: AssetReferenceSchema,
	imagePrompt: z.string().min(1).optional(),
	items: z.array(StorySceneItemSchema).min(1),
	interactions: z.array(StoryInteractionSchema).default([]),
})

const StoryItemSchema = z.object({
	id: z.string().min(1),
	name: LocalizedTextSchema,
	phrase: LocalizedTextSchema.optional(),
	image: AssetReferenceSchema,
	imagePrompt: z.string().min(1).optional(),
	wordAudio: LocalizedAudioSchema,
	card: z.boolean().default(true),
	sceneIds: z.array(z.string().min(1)).default([]),
})

export const StoryPackSchema = z.object({
	id: z.string().min(1),
	version: z.string().min(1),
	metadata: StoryPackMetadataSchema,
	plotPlan: PlotPlanSchema,
	languages: z.array(LanguageCodeSchema).min(1),
	coverImage: AssetReferenceSchema,
	scenes: z.array(StorySceneSchema).min(2),
	items: z.array(StoryItemSchema).min(1),
})

export const StoryCatalogSchema = z.object({
	schemaVersion: z.literal('story-pack-v1'),
	supportedLanguages: z.array(LanguageCodeSchema).min(1),
	packs: z.array(StoryPackSchema).min(1),
})

export type AssetReference = z.infer<typeof AssetReferenceSchema>
export type LocalizedText = z.infer<typeof LocalizedTextSchema>
export type LocalizedAudio = z.infer<typeof LocalizedAudioSchema>
export type StorySceneItem = z.infer<typeof StorySceneItemSchema>
export type StoryScene = z.infer<typeof StorySceneSchema>
export type StoryItem = z.infer<typeof StoryItemSchema>
export type StoryPack = z.infer<typeof StoryPackSchema>
export type StoryCatalog = z.infer<typeof StoryCatalogSchema>
