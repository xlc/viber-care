import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const defaultOptions = {
	maxAnyKib: 1024,
	maxBackgroundKib: 768,
	maxBackgroundPx: 1440,
	maxItemKib: 256,
	maxItemPx: 800,
}

type AssetReference = {
	path: string
	source: string
	type: string
}

type ImageRole = 'background' | 'item'

type ImageMetadata = {
	format: string
	hasAlpha: boolean
	height: number
	width: number
}

type Options = typeof defaultOptions & {
	allowUnreferenced: boolean
	packId: string | null
	requireItemAlpha: boolean
}

function parseArgs(argv: string[]): Options {
	const options: Options = {
		...defaultOptions,
		allowUnreferenced: false,
		packId: null,
		requireItemAlpha: false,
	}

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		const next = argv[index + 1]

		if (arg === '--help' || arg === '-h') {
			printHelp()
			process.exit(0)
		}
		if (arg === '--allow-unreferenced') {
			options.allowUnreferenced = true
			continue
		}
		if (arg === '--require-item-alpha') {
			options.requireItemAlpha = true
			continue
		}
		if (arg === '--pack' && next) {
			options.packId = next
			index += 1
			continue
		}
		if (arg === '--max-item-kib' && next) {
			options.maxItemKib = parsePositiveInteger(arg, next)
			index += 1
			continue
		}
		if (arg === '--max-background-kib' && next) {
			options.maxBackgroundKib = parsePositiveInteger(arg, next)
			index += 1
			continue
		}
		if (arg === '--max-any-kib' && next) {
			options.maxAnyKib = parsePositiveInteger(arg, next)
			index += 1
			continue
		}
		if (arg === '--max-item-px' && next) {
			options.maxItemPx = parsePositiveInteger(arg, next)
			index += 1
			continue
		}
		if (arg === '--max-background-px' && next) {
			options.maxBackgroundPx = parsePositiveInteger(arg, next)
			index += 1
			continue
		}

		throw new Error(`Unknown or incomplete argument: ${arg}`)
	}

	return options
}

function parsePositiveInteger(name: string, value: string): number {
	const numberValue = Number(value)
	if (!Number.isInteger(numberValue) || numberValue <= 0) {
		throw new Error(`${name} must be a positive integer.`)
	}
	return numberValue
}

function printHelp() {
	console.log(`Validate Word Garden generated image assets.

Usage:
  bun .agents/skills/content-generation/scripts/validate-image-assets.ts [options]

Options:
  --pack <pack-id>              Validate images referenced by one content pack.
  --allow-unreferenced          Do not fail on unreferenced image files.
  --require-item-alpha          Fail item PNG/WebP files without alpha.
  --max-item-kib <number>       Max item image size. Default ${defaultOptions.maxItemKib}.
  --max-background-kib <number> Max background image size. Default ${defaultOptions.maxBackgroundKib}.
  --max-any-kib <number>        Hard max for any image. Default ${defaultOptions.maxAnyKib}.
  --max-item-px <number>        Max item width/height. Default ${defaultOptions.maxItemPx}.
  --max-background-px <number>  Max background width/height. Default ${defaultOptions.maxBackgroundPx}.
`)
}

function readJson(filePath: string): unknown {
	return JSON.parse(readFileSync(filePath, 'utf8'))
}

function walkFiles(root: string): string[] {
	if (!existsSync(root)) {
		return []
	}

	return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = path.join(root, entry.name)
		return entry.isDirectory() ? walkFiles(entryPath) : [entryPath]
	})
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isImagePath(value: string) {
	return imageExtensions.has(path.extname(value).toLowerCase())
}

function collectImageReferences(
	value: unknown,
	source: string,
	references: AssetReference[],
) {
	if (Array.isArray(value)) {
		for (const item of value) {
			collectImageReferences(item, source, references)
		}
		return
	}
	if (!isRecord(value)) {
		return
	}

	if (
		typeof value.type === 'string' &&
		typeof value.path === 'string' &&
		isImagePath(value.path)
	) {
		references.push({
			path: value.path,
			source,
			type: value.type,
		})
	}

	for (const child of Object.values(value)) {
		collectImageReferences(child, source, references)
	}
}

function collectItemIds(value: unknown, itemIds: Set<string>) {
	if (Array.isArray(value)) {
		for (const item of value) {
			collectItemIds(item, itemIds)
		}
		return
	}
	if (!isRecord(value)) {
		return
	}

	if (typeof value.itemId === 'string') {
		itemIds.add(value.itemId)
	}
	if (Array.isArray(value.itemIds)) {
		for (const itemId of value.itemIds) {
			if (typeof itemId === 'string') {
				itemIds.add(itemId)
			}
		}
	}

	for (const child of Object.values(value)) {
		collectItemIds(child, itemIds)
	}
}

function getReferences(options: Options): AssetReference[] {
	if (!options.packId) {
		const references: AssetReference[] = []
		for (const dir of ['content/items', 'content/packs']) {
			for (const filePath of walkFiles(dir).filter((file) =>
				file.endsWith('.json'),
			)) {
				collectImageReferences(readJson(filePath), filePath, references)
			}
		}
		return references
	}

	const packPath = path.join('content', 'packs', `${options.packId}.json`)
	if (!existsSync(packPath)) {
		throw new Error(`Pack not found: ${packPath}`)
	}

	const packJson = readJson(packPath)
	const references: AssetReference[] = []
	const itemIds = new Set<string>()
	collectImageReferences(packJson, packPath, references)
	collectItemIds(packJson, itemIds)

	const itemFileById = new Map<string, string>()
	for (const filePath of walkFiles('content/items').filter((file) =>
		file.endsWith('.json'),
	)) {
		const itemJson = readJson(filePath)
		if (isRecord(itemJson) && typeof itemJson.id === 'string') {
			itemFileById.set(itemJson.id, filePath)
		}
	}

	for (const itemId of [...itemIds].sort()) {
		const itemPath = itemFileById.get(itemId)
		if (!itemPath) {
			throw new Error(
				`Pack ${options.packId} references missing item ${itemId}`,
			)
		}
		collectImageReferences(readJson(itemPath), itemPath, references)
	}

	return references
}

function publicAssetPathToFilePath(assetPath: string): string {
	if (!assetPath.startsWith('/assets/')) {
		throw new Error(`Expected public asset path under /assets/: ${assetPath}`)
	}
	return path.join('public', assetPath.slice(1))
}

function getRole(types: Set<string>): ImageRole {
	return types.has('background') ? 'background' : 'item'
}

function parseImageMetadata(filePath: string): ImageMetadata {
	const buffer = readFileSync(filePath)
	if (isPng(buffer)) {
		return parsePng(buffer)
	}
	if (isWebp(buffer)) {
		return parseWebp(buffer)
	}
	if (isJpeg(buffer)) {
		return parseJpeg(buffer)
	}
	throw new Error(`Unsupported image format: ${filePath}`)
}

function isPng(buffer: Buffer): boolean {
	return (
		buffer.length >= 33 &&
		buffer[0] === 0x89 &&
		buffer.toString('ascii', 1, 4) === 'PNG' &&
		buffer.toString('ascii', 12, 16) === 'IHDR'
	)
}

function parsePng(buffer: Buffer): ImageMetadata {
	const colorType = buffer[25]
	return {
		format: 'png',
		hasAlpha: colorType === 4 || colorType === 6,
		height: buffer.readUInt32BE(20),
		width: buffer.readUInt32BE(16),
	}
}

function isWebp(buffer: Buffer): boolean {
	return (
		buffer.length >= 20 &&
		buffer.toString('ascii', 0, 4) === 'RIFF' &&
		buffer.toString('ascii', 8, 12) === 'WEBP'
	)
}

function readUInt24LE(buffer: Buffer, offset: number): number {
	return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16)
}

function parseWebp(buffer: Buffer): ImageMetadata {
	let offset = 12
	while (offset + 8 <= buffer.length) {
		const chunkType = buffer.toString('ascii', offset, offset + 4)
		const chunkSize = buffer.readUInt32LE(offset + 4)
		const dataOffset = offset + 8

		if (dataOffset + chunkSize > buffer.length) {
			throw new Error('Truncated WebP chunk.')
		}

		if (chunkType === 'VP8X') {
			const flags = buffer[dataOffset]
			return {
				format: 'webp',
				hasAlpha: Boolean(flags & 0x10),
				height: readUInt24LE(buffer, dataOffset + 7) + 1,
				width: readUInt24LE(buffer, dataOffset + 4) + 1,
			}
		}
		if (chunkType === 'VP8L') {
			const byte1 = buffer[dataOffset + 1]
			const byte2 = buffer[dataOffset + 2]
			const byte3 = buffer[dataOffset + 3]
			const byte4 = buffer[dataOffset + 4]
			return {
				format: 'webp',
				hasAlpha: true,
				height: 1 + (((byte4 & 0x0f) << 10) | (byte3 << 2) | (byte2 >> 6)),
				width: 1 + (((byte2 & 0x3f) << 8) | byte1),
			}
		}
		if (chunkType === 'VP8 ') {
			return {
				format: 'webp',
				hasAlpha: false,
				height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
				width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
			}
		}

		offset = dataOffset + chunkSize + (chunkSize % 2)
	}

	throw new Error('Could not read WebP dimensions.')
}

function isJpeg(buffer: Buffer): boolean {
	return buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8
}

function parseJpeg(buffer: Buffer): ImageMetadata {
	let offset = 2
	while (offset + 9 < buffer.length) {
		if (buffer[offset] !== 0xff) {
			offset += 1
			continue
		}
		const marker = buffer[offset + 1]
		const length = buffer.readUInt16BE(offset + 2)
		if (
			(marker >= 0xc0 && marker <= 0xc3) ||
			(marker >= 0xc5 && marker <= 0xc7) ||
			(marker >= 0xc9 && marker <= 0xcb) ||
			(marker >= 0xcd && marker <= 0xcf)
		) {
			return {
				format: 'jpeg',
				hasAlpha: false,
				height: buffer.readUInt16BE(offset + 5),
				width: buffer.readUInt16BE(offset + 7),
			}
		}
		offset += 2 + length
	}

	throw new Error('Could not read JPEG dimensions.')
}

function getImageFiles(root: string): Set<string> {
	return new Set(
		walkFiles(root)
			.filter((filePath) =>
				imageExtensions.has(path.extname(filePath).toLowerCase()),
			)
			.map((filePath) => `/${path.relative('public', filePath)}`),
	)
}

function formatKib(bytes: number): string {
	return `${Math.ceil(bytes / 1024)} KiB`
}

function formatSources(refs: AssetReference[]): string {
	const sources = [...new Set(refs.map((reference) => reference.source))].sort()
	const visible = sources.slice(0, 3).join(', ')
	return sources.length > 3 ? `${visible}, ...` : visible
}

function main() {
	const options = parseArgs(Bun.argv.slice(2))
	const references = getReferences(options)
	const refsByPath = new Map<string, AssetReference[]>()
	for (const reference of references) {
		const existing = refsByPath.get(reference.path) ?? []
		existing.push(reference)
		refsByPath.set(reference.path, existing)
	}

	const errors: string[] = []
	const summaries: Array<{
		bytes: number
		height: number
		path: string
		role: ImageRole
		width: number
	}> = []

	for (const [assetPath, refs] of [...refsByPath.entries()].sort()) {
		let filePath = ''
		try {
			filePath = publicAssetPathToFilePath(assetPath)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			errors.push(`${message} (referenced by ${formatSources(refs)})`)
			continue
		}

		if (!existsSync(filePath)) {
			errors.push(
				`Missing image asset: ${assetPath} (referenced by ${formatSources(refs)})`,
			)
			continue
		}

		const types = new Set(refs.map((reference) => reference.type))
		const role = getRole(types)
		const stats = statSync(filePath)
		let metadata: ImageMetadata
		try {
			metadata = parseImageMetadata(filePath)
		} catch (error) {
			errors.push(
				`${assetPath}: ${error instanceof Error ? error.message : String(error)} (referenced by ${formatSources(refs)})`,
			)
			continue
		}

		const maxDimension =
			role === 'background' ? options.maxBackgroundPx : options.maxItemPx
		const maxRoleKib =
			role === 'background' ? options.maxBackgroundKib : options.maxItemKib
		const maxActualDimension = Math.max(metadata.width, metadata.height)
		const actualKib = Math.ceil(stats.size / 1024)

		if (maxActualDimension > maxDimension) {
			errors.push(
				`${assetPath}: ${metadata.width}x${metadata.height} exceeds ${role} max ${maxDimension}px.`,
			)
		}
		if (actualKib > maxRoleKib) {
			errors.push(
				`${assetPath}: ${formatKib(stats.size)} exceeds ${role} max ${maxRoleKib} KiB.`,
			)
		}
		if (actualKib > options.maxAnyKib) {
			errors.push(
				`${assetPath}: ${formatKib(stats.size)} exceeds hard max ${options.maxAnyKib} KiB.`,
			)
		}
		if (
			options.requireItemAlpha &&
			role === 'item' &&
			(metadata.format === 'png' || metadata.format === 'webp') &&
			!metadata.hasAlpha
		) {
			errors.push(`${assetPath}: item image must keep transparency.`)
		}

		summaries.push({
			bytes: stats.size,
			height: metadata.height,
			path: assetPath,
			role,
			width: metadata.width,
		})
	}

	if (!options.packId && !options.allowUnreferenced) {
		const referencedPaths = new Set(refsByPath.keys())
		for (const assetPath of getImageFiles('public/assets')) {
			if (!referencedPaths.has(assetPath)) {
				errors.push(`Unreferenced image asset: ${assetPath}`)
			}
		}
	}

	const totalBytes = summaries.reduce((sum, item) => sum + item.bytes, 0)
	const largest = [...summaries]
		.sort((left, right) => right.bytes - left.bytes)
		.slice(0, 10)

	console.log(
		`Image assets checked: ${summaries.length} (${(totalBytes / 1024 / 1024).toFixed(2)} MiB)`,
	)
	for (const item of largest) {
		console.log(
			`${formatKib(item.bytes).padStart(8)} ${item.role.padEnd(10)} ${`${item.width}x${item.height}`.padEnd(11)} ${item.path}`,
		)
	}

	if (errors.length > 0) {
		console.error(
			`\nImage asset validation failed with ${errors.length} issue(s):`,
		)
		for (const error of errors) {
			console.error(`- ${error}`)
		}
		process.exitCode = 1
		return
	}

	console.log('\nImage asset validation passed.')
}

try {
	main()
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error))
	process.exitCode = 1
}
