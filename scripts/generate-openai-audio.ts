import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'

type AudioFormat = 'aac' | 'flac' | 'mp3' | 'opus' | 'pcm' | 'wav'

type AssetReference = {
	path?: string
	generationText?: string
}

type LevelContent = {
	text?: string
	audioText?: string
	audio?: AssetReference
}

type LanguageContent = {
	levels?: Record<string, LevelContent>
}

type ObjectConcept = {
	id?: string
	content?: Record<string, LanguageContent>
}

type ContentPack = {
	id?: string
	objects?: ObjectConcept[]
}

type Options = {
	dryRun: boolean
	force: boolean
	instructions: string
	languages?: Set<string>
	levels?: Set<string>
	limit?: number
	model: string
	objectIds?: Set<string>
	packIds?: Set<string>
	voice: string
}

type AudioTask = {
	format: AudioFormat
	input: string
	label: string
	language: string
	outputPath: string
}

const rootDir = process.cwd()
const publicDir = resolve(rootDir, 'public')
const defaultInstructions = [
	'Speak softly and warmly, like a calm preschool teacher.',
	'Use a gentle, friendly, reassuring tone with slow clear pronunciation, natural pauses, and soft energy.',
	'Do not sound loud, sharp, dramatic, rushed, robotic, scary, or overly excited.',
	'Keep the delivery soothing and toddler-safe.',
].join(' ')

const formatByExtension: Record<string, AudioFormat> = {
	'.aac': 'aac',
	'.flac': 'flac',
	'.mp3': 'mp3',
	'.opus': 'opus',
	'.pcm': 'pcm',
	'.wav': 'wav',
}

function printHelp(): void {
	console.log(`Generate static Word Garden audio with OpenAI text to speech.

Usage:
  bun scripts/generate-openai-audio.ts [options]

Examples:
  bun scripts/generate-openai-audio.ts --dry-run --pack garden --levels L0,L1
  bun scripts/generate-openai-audio.ts --pack dinosaurs --languages en,zh-Hans --levels L0,L1
  bun scripts/generate-openai-audio.ts --pack ocean-animals --object dolphin --force

Options:
  --pack <ids>          Comma-separated pack ids. Defaults to all packs.
  --object <ids>        Comma-separated object ids. Defaults to all objects.
  --languages <codes>   Comma-separated language codes. Defaults to all languages.
  --levels <levels>     Comma-separated levels, for example L0,L1. Defaults to all levels with audio paths.
  --voice <voice>       Built-in OpenAI voice. Defaults to marin.
  --model <model>       OpenAI TTS model. Defaults to gpt-4o-mini-tts.
  --instructions <text> Override the toddler-soft voice instructions.
  --limit <n>           Generate at most n matching files.
  --force               Overwrite existing audio files.
  --dry-run             Print matching tasks without calling OpenAI or writing files.
  --help                Show this help.
`)
}

function parseArgs(argv: string[]): Options {
	const options: Options = {
		dryRun: false,
		force: false,
		instructions: defaultInstructions,
		model: 'gpt-4o-mini-tts',
		voice: 'marin',
	}

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		if (arg === '--help' || arg === '-h') {
			printHelp()
			process.exit(0)
		}
		if (arg === '--dry-run') {
			options.dryRun = true
			continue
		}
		if (arg === '--force') {
			options.force = true
			continue
		}

		const value = argv[index + 1]
		if (!value || value.startsWith('--')) {
			throw new Error(`Missing value for ${arg}.`)
		}
		index++

		switch (arg) {
			case '--pack':
				options.packIds = parseList(value)
				break
			case '--object':
				options.objectIds = parseList(value)
				break
			case '--languages':
			case '--language':
				options.languages = parseList(value)
				break
			case '--levels':
			case '--level':
				options.levels = parseList(value)
				break
			case '--voice':
				options.voice = value
				break
			case '--model':
				options.model = value
				break
			case '--instructions':
				options.instructions = value
				break
			case '--limit':
				options.limit = parseLimit(value)
				break
			default:
				throw new Error(`Unknown option: ${arg}. Use --help for usage.`)
		}
	}

	return options
}

function parseList(value: string): Set<string> {
	const values = value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
	if (values.length === 0) {
		throw new Error(`Expected at least one value in "${value}".`)
	}
	return new Set(values)
}

function parseLimit(value: string): number {
	const limit = Number(value)
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error('--limit must be a positive integer.')
	}
	return limit
}

async function loadDotEnv(): Promise<void> {
	if (process.env.OPENAI_API_KEY) {
		return
	}

	const envText = await readFile(join(rootDir, '.env'), 'utf8').catch(() => '')
	for (const line of envText.split(/\r?\n/)) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) {
			continue
		}

		const separatorIndex = trimmed.indexOf('=')
		if (separatorIndex === -1) {
			continue
		}

		const key = trimmed.slice(0, separatorIndex).trim()
		if (key !== 'OPENAI_API_KEY') {
			continue
		}

		process.env.OPENAI_API_KEY = stripEnvQuotes(
			trimmed.slice(separatorIndex + 1).trim(),
		)
		return
	}
}

function stripEnvQuotes(value: string): string {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1)
	}
	return value
}

async function collectTasks(options: Options): Promise<AudioTask[]> {
	const packFiles = await readdir(join(rootDir, 'content/packs'))
	const tasks: AudioTask[] = []

	for (const packFile of packFiles.sort()) {
		if (!packFile.endsWith('.json')) {
			continue
		}

		const pack = JSON.parse(
			await readFile(join(rootDir, 'content/packs', packFile), 'utf8'),
		) as ContentPack
		if (!pack.id || (options.packIds && !options.packIds.has(pack.id))) {
			continue
		}

		for (const object of pack.objects ?? []) {
			if (!object.id) {
				continue
			}
			if (options.objectIds && !options.objectIds.has(object.id)) {
				continue
			}

			for (const [language, languageContent] of Object.entries(
				object.content ?? {},
			)) {
				if (options.languages && !options.languages.has(language)) {
					continue
				}

				for (const [level, levelContent] of Object.entries(
					languageContent.levels ?? {},
				)) {
					if (options.levels && !options.levels.has(level)) {
						continue
					}

					const assetPath = levelContent.audio?.path
					if (!assetPath) {
						continue
					}

					const input =
						levelContent.audio?.generationText ??
						levelContent.audioText ??
						levelContent.text
					if (!input) {
						throw new Error(
							`${pack.id}/${object.id}/${language}/${level} has an audio path but no text.`,
						)
					}

					tasks.push({
						format: getAudioFormat(assetPath),
						input,
						label: `${pack.id}/${object.id}/${language}/${level}`,
						language,
						outputPath: resolveAssetOutputPath(assetPath),
					})
				}
			}
		}
	}

	return tasks
}

function getAudioFormat(assetPath: string): AudioFormat {
	const extension = extname(assetPath).toLowerCase()
	const format = formatByExtension[extension]
	if (!format) {
		throw new Error(
			`Unsupported audio extension "${extension}" in ${assetPath}.`,
		)
	}
	return format
}

function resolveAssetOutputPath(assetPath: string): string {
	if (!assetPath.startsWith('/assets/')) {
		throw new Error(`Audio asset path must start with /assets/: ${assetPath}`)
	}

	const outputPath = resolve(publicDir, assetPath.slice(1))
	if (
		outputPath !== publicDir &&
		!outputPath.startsWith(`${publicDir}${sep}`)
	) {
		throw new Error(`Audio asset path escapes public/: ${assetPath}`)
	}
	return outputPath
}

async function pathExists(path: string): Promise<boolean> {
	return stat(path)
		.then(() => true)
		.catch(() => false)
}

function taskInstructions(task: AudioTask, baseInstructions: string): string {
	if (task.language === 'zh-Hans') {
		return `${baseInstructions} The input is Simplified Chinese; use natural Mandarin pronunciation.`
	}
	return `${baseInstructions} The input is English; pronounce it clearly for a toddler.`
}

async function generateSpeech(
	task: AudioTask,
	options: Options,
	apiKey: string,
): Promise<void> {
	const response = await fetch('https://api.openai.com/v1/audio/speech', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			input: task.input,
			instructions: taskInstructions(task, options.instructions),
			model: options.model,
			response_format: task.format,
			voice: options.voice,
		}),
	})

	if (!response.ok) {
		const detail = await response.text().catch(() => '')
		throw new Error(
			`OpenAI speech request failed for ${task.label}: ${response.status} ${response.statusText}\n${detail}`,
		)
	}

	await mkdir(dirname(task.outputPath), { recursive: true })
	await writeFile(task.outputPath, Buffer.from(await response.arrayBuffer()))
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2))
	const tasks = await collectTasks(options)
	let generatedCount = 0
	let skippedCount = 0

	if (tasks.length === 0) {
		console.log('No matching audio tasks found.')
		return
	}

	if (options.dryRun) {
		for (const task of tasks.slice(0, options.limit ?? tasks.length)) {
			console.log(`[dry-run] ${task.label} -> ${task.outputPath}`)
		}
		console.log(`Matched ${tasks.length} audio task(s).`)
		return
	}

	await loadDotEnv()
	const apiKey = process.env.OPENAI_API_KEY
	if (!apiKey) {
		throw new Error('OPENAI_API_KEY must be set in the environment or .env.')
	}

	for (const task of tasks) {
		if (options.limit && generatedCount >= options.limit) {
			break
		}

		if (!options.force && (await pathExists(task.outputPath))) {
			skippedCount++
			console.log(`[skip] ${task.label} already exists`)
			continue
		}

		console.log(`[generate] ${task.label}`)
		await generateSpeech(task, options, apiKey)
		generatedCount++
	}

	console.log(
		`Done. Generated ${generatedCount} file(s), skipped ${skippedCount} existing file(s).`,
	)
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
