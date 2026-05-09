#!/usr/bin/env bun
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..', '..', '..')
const endpoint = 'https://openrouter.ai/api/v1/audio/speech'
const model = 'openai/gpt-4o-mini-tts-2025-12-15'
const voice = 'nova'
const responseFormat = 'mp3'
const speed = 0.9
const defaultConcurrency = 3
const sampleOutputPath = '/private/tmp/word-garden-openrouter-sample.mp3'

const voiceInstructions = [
	'Speak in a warm, gentle, clear voice for toddlers.',
	'Use a calm pace, soft energy, and friendly pronunciation.',
	'Do not add extra words, sound effects, music, or explanations.',
	'For Simplified Chinese, use natural Mainland Mandarin pronunciation.',
].join(' ')

type JsonObject = Record<string, unknown>

type Mode = 'sample' | 'generate' | 'audit'
type AudioProperty = 'audio' | 'findPromptAudio' | 'successPhraseAudio'

type RunOptions = {
	concurrency: number
	mode: Mode
	packIds: Set<string>
	refresh: boolean
}

type PackRecord = {
	fileName: string
	filePath: string
	pack: JsonObject
}

type AudioEntry = {
	absolutePath: string
	audioProperty: AudioProperty
	input: string
	languageCode: string
	label: string
	objectId: string
	packId: string
	publicPath: string
	target: JsonObject
}

async function main() {
	const options = parseOptions(process.argv.slice(2))
	const { entries, packs } = await loadEntries(options.packIds)

	if (entries.length === 0) {
		throw new Error('No audio entries matched the requested filters.')
	}

	if (options.mode === 'audit') {
		await audit(entries)
		return
	}

	const key = await loadOpenRouterKey()

	if (options.mode === 'sample') {
		const first = entries[0]
		await synthesizeToFile(key, first.input, sampleOutputPath, 'sample')
		return
	}

	for (const entry of entries) {
		entry.target[entry.audioProperty] = {
			type: 'audio',
			path: entry.publicPath,
		}
	}

	await generateAll(key, entries, options)
	await writePackFiles(packs)
	await audit(entries)
}

function parseOptions(args: string[]): RunOptions {
	const mode = parseMode(args)
	const packIds = new Set<string>()
	let concurrency = defaultConcurrency
	let refresh = false

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index]
		if (arg === '--sample' || arg === '--generate' || arg === '--audit') {
			continue
		}
		if (arg === '--refresh') {
			refresh = true
		} else if (arg === '--pack') {
			const value = args[index + 1]
			if (!value || value.startsWith('--')) {
				throw new Error('--pack requires a pack id.')
			}
			packIds.add(value)
			index += 1
		} else if (arg === '--concurrency') {
			const value = Number(args[index + 1])
			if (!Number.isInteger(value) || value < 1 || value > 6) {
				throw new Error('--concurrency must be an integer from 1 to 6.')
			}
			concurrency = value
			index += 1
		} else {
			throw new Error(`Unknown option ${arg}.`)
		}
	}

	return {
		concurrency,
		mode,
		packIds,
		refresh,
	}
}

function parseMode(args: string[]): Mode {
	const modes = ['--sample', '--generate', '--audit'].filter((flag) =>
		args.includes(flag),
	)
	if (modes.length !== 1) {
		throw new Error('Expected exactly one of --sample, --generate, or --audit.')
	}
	return modes[0].slice(2) as Mode
}

async function loadOpenRouterKey(): Promise<string> {
	const envPath = path.join(repoRoot, '.env')
	const envText = await readFile(envPath, 'utf8').catch(() => '')
	const env = parseDotEnv(envText)
	if (process.env.VITE_OPENROUTER_API_KEY || env.VITE_OPENROUTER_API_KEY) {
		throw new Error('Refusing to use a client-exposed OpenRouter key name.')
	}
	const key = process.env.OPENROUTER_API_KEY ?? env.OPENROUTER_API_KEY
	if (!key) {
		throw new Error('OPENROUTER_API_KEY is missing from .env.')
	}
	return key
}

function parseDotEnv(source: string): Record<string, string> {
	const result: Record<string, string> = {}
	for (const rawLine of source.split(/\r?\n/)) {
		const line = rawLine.trim()
		if (!line || line.startsWith('#')) {
			continue
		}
		const withoutExport = line.startsWith('export ')
			? line.slice(7).trim()
			: line
		const equalsIndex = withoutExport.indexOf('=')
		if (equalsIndex < 1) {
			continue
		}
		const key = withoutExport.slice(0, equalsIndex).trim()
		let value = withoutExport.slice(equalsIndex + 1).trim()
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1)
		}
		result[key] = value
	}
	return result
}

async function loadEntries(
	packIds: Set<string>,
): Promise<{ entries: AudioEntry[]; packs: PackRecord[] }> {
	const packsDir = path.join(repoRoot, 'content', 'packs')
	const fileNames = (await readdir(packsDir))
		.filter((fileName) => fileName.endsWith('.json'))
		.sort()
	const entries: AudioEntry[] = []
	const packs: PackRecord[] = []

	for (const fileName of fileNames) {
		const filePath = path.join(packsDir, fileName)
		const pack = JSON.parse(await readFile(filePath, 'utf8')) as JsonObject
		const packId = readString(pack, 'id', fileName)
		if (packIds.size > 0 && !packIds.has(packId)) {
			continue
		}

		const packRecord = { fileName, filePath, pack }
		packs.push(packRecord)
		const objects = readArray(pack, 'objects', packId)

		for (const objectValue of objects) {
			const object = readObject(objectValue, `${packId} object`)
			const objectId = readString(object, 'id', packId)
			const content = readObject(
				object.content,
				`${packId}/${objectId}/content`,
			)

			for (const languageCode of Object.keys(content).sort()) {
				const language = readObject(
					content[languageCode],
					`${packId}/${objectId}/${languageCode}`,
				)
				const findPrompt = readString(
					language,
					'findPrompt',
					`${packId}/${objectId}/${languageCode}`,
				)
				entries.push({
					absolutePath: path.join(
						repoRoot,
						'public',
						`assets/generated/${packId}/audio/${objectId}-${languageCode}-find.mp3`,
					),
					audioProperty: 'findPromptAudio',
					input: findPrompt,
					languageCode,
					label: `${packId}/${objectId}/${languageCode}/find`,
					objectId,
					packId,
					publicPath: `/assets/generated/${packId}/audio/${objectId}-${languageCode}-find.mp3`,
					target: language,
				})

				const successPhrase = readString(
					language,
					'successPhrase',
					`${packId}/${objectId}/${languageCode}`,
				)
				entries.push({
					absolutePath: path.join(
						repoRoot,
						'public',
						`assets/generated/${packId}/audio/${objectId}-${languageCode}-success.mp3`,
					),
					audioProperty: 'successPhraseAudio',
					input: successPhrase,
					languageCode,
					label: `${packId}/${objectId}/${languageCode}/success`,
					objectId,
					packId,
					publicPath: `/assets/generated/${packId}/audio/${objectId}-${languageCode}-success.mp3`,
					target: language,
				})

				const levels = readObject(
					language.levels,
					`${packId}/${objectId}/${languageCode}/levels`,
				)

				for (const levelId of Object.keys(levels).sort()) {
					const level = readObject(
						levels[levelId],
						`${packId}/${objectId}/${languageCode}/${levelId}`,
					)
					const input = readString(
						level,
						'audioText',
						`${packId}/${objectId}/${languageCode}/${levelId}`,
					)
					const publicPath = `/assets/generated/${packId}/audio/${objectId}-${languageCode}-${levelId}.mp3`
					entries.push({
						absolutePath: path.join(repoRoot, 'public', publicPath.slice(1)),
						audioProperty: 'audio',
						input,
						languageCode,
						label: `${packId}/${objectId}/${languageCode}/${levelId}`,
						objectId,
						packId,
						publicPath,
						target: level,
					})
				}
			}
		}
	}

	return { entries, packs }
}

function getAudioPath(
	target: JsonObject,
	audioProperty: AudioProperty,
): string | undefined {
	const value = target[audioProperty]
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return undefined
	}
	const audio = value as JsonObject
	return typeof audio.path === 'string' ? audio.path : undefined
}

function readString(object: JsonObject, key: string, label: string): string {
	const value = object[key]
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`${label} is missing string field ${key}.`)
	}
	return value
}

function readArray(object: JsonObject, key: string, label: string): unknown[] {
	const value = object[key]
	if (!Array.isArray(value)) {
		throw new Error(`${label} is missing array field ${key}.`)
	}
	return value
}

function readObject(value: unknown, label: string): JsonObject {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${label} is not an object.`)
	}
	return value as JsonObject
}

async function generateAll(
	key: string,
	entries: AudioEntry[],
	options: RunOptions,
): Promise<void> {
	let cursor = 0
	let generated = 0
	let skipped = 0
	const failures: string[] = []

	async function worker() {
		for (;;) {
			const index = cursor
			cursor += 1
			const entry = entries[index]
			if (!entry) {
				return
			}

			try {
				if (!options.refresh && (await isValidAudioFile(entry.absolutePath))) {
					skipped += 1
					console.log(`skip ${entry.label} ${entry.publicPath}`)
					continue
				}
				await synthesizeToFile(
					key,
					entry.input,
					entry.absolutePath,
					entry.label,
				)
				generated += 1
			} catch (error) {
				failures.push(`${entry.label}: ${errorMessage(error)}`)
			}
		}
	}

	await Promise.all(
		Array.from({ length: options.concurrency }, async () => {
			await worker()
		}),
	)

	if (failures.length > 0) {
		throw new Error(`Audio generation failed:\n${failures.join('\n')}`)
	}

	console.log(
		`generated=${generated} skipped=${skipped} total=${entries.length}`,
	)
}

async function isValidAudioFile(filePath: string): Promise<boolean> {
	try {
		return isValidMp3Bytes(await readFile(filePath))
	} catch {
		return false
	}
}

function isValidMp3Bytes(bytes: Uint8Array): boolean {
	if (bytes.length <= 512) {
		return false
	}
	const hasId3Header =
		bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33
	const hasFrameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0
	return hasId3Header || hasFrameSync
}

async function synthesizeToFile(
	key: string,
	input: string,
	outputPath: string,
	label: string,
): Promise<void> {
	await mkdir(path.dirname(outputPath), { recursive: true })
	const partialPath = `${outputPath}.part`

	for (let attempt = 1; attempt <= 5; attempt += 1) {
		const response = await fetch(endpoint, {
			body: JSON.stringify({
				input,
				model,
				provider: {
					options: {
						openai: {
							instructions: voiceInstructions,
						},
					},
				},
				response_format: responseFormat,
				speed,
				voice,
			}),
			headers: {
				Authorization: `Bearer ${key}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': 'https://word-garden.local',
				'X-Title': 'Word Garden Static Audio Authoring',
			},
			method: 'POST',
		})

		const contentType = response.headers.get('content-type') ?? 'unknown'

		if (!response.ok) {
			const body = await response.text()
			if ((response.status === 429 || response.status >= 500) && attempt < 5) {
				await sleep(backoffMs(attempt))
				continue
			}
			throw new Error(
				`status=${response.status} contentType=${contentType} body=${body.slice(0, 500)}`,
			)
		}

		if (!contentType.startsWith('audio/')) {
			const body = await response.text()
			throw new Error(
				`non-audio response contentType=${contentType} body=${body.slice(0, 500)}`,
			)
		}

		const bytes = new Uint8Array(await response.arrayBuffer())
		if (!isValidMp3Bytes(bytes)) {
			throw new Error(
				`invalid mp3 contentType=${contentType} bytes=${bytes.length}`,
			)
		}

		await writeFile(partialPath, bytes)
		await rename(partialPath, outputPath)
		console.log(
			`ok ${label} ${displayOutputPath(outputPath)} status=${response.status} bytes=${bytes.length} contentType=${contentType}`,
		)
		return
	}

	throw new Error('exhausted retries')
}

function displayOutputPath(filePath: string): string {
	const publicRoot = path.join(repoRoot, 'public')
	return filePath.startsWith(publicRoot)
		? `/${path.relative(publicRoot, filePath)}`
		: filePath
}

function backoffMs(attempt: number): number {
	return (
		Math.min(10_000, 1_000 * 2 ** (attempt - 1)) +
		Math.floor(Math.random() * 500)
	)
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function writePackFiles(packs: PackRecord[]): Promise<void> {
	for (const pack of packs) {
		await writeFile(pack.filePath, `${JSON.stringify(pack.pack, null, '\t')}\n`)
		console.log(`wrote content/packs/${pack.fileName}`)
	}
}

async function audit(entries: AudioEntry[]): Promise<void> {
	const seen = new Set<string>()
	const failures: string[] = []

	for (const entry of entries) {
		if (getAudioPath(entry.target, entry.audioProperty) !== entry.publicPath) {
			failures.push(`${entry.label} should use ${entry.publicPath}`)
		}
		if (!entry.publicPath.startsWith('/assets/')) {
			failures.push(`${entry.publicPath} is not an /assets path`)
		}
		if (seen.has(entry.publicPath)) {
			failures.push(`duplicate target path ${entry.publicPath}`)
		}
		seen.add(entry.publicPath)
		if (!(await isValidAudioFile(entry.absolutePath))) {
			failures.push(`missing or invalid ${entry.publicPath}`)
		}
	}

	if (failures.length > 0) {
		throw new Error(`Audio audit failed:\n${failures.slice(0, 100).join('\n')}`)
	}

	console.log(`audit ok entries=${entries.length} uniquePaths=${seen.size}`)
}

function errorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}
	return String(error)
}

main().catch((error) => {
	console.error(errorMessage(error))
	process.exit(1)
})
