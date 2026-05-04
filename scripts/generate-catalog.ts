import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import {
	buildRuntimeCatalog,
	validateContentPacks,
} from '../src/content/build-catalog'
import type { ContentPack } from '../src/content/schema'

const rootDir = process.cwd()
const contentDir = join(rootDir, 'content', 'packs')
const publicDir = join(rootDir, 'public')
const catalogPath = join(publicDir, 'catalog.generated.json')
const validateOnly = process.argv.includes('--validate-only')

async function readContentPacks(): Promise<unknown[]> {
	const entries = await readdir(contentDir, { withFileTypes: true })
	const packFiles = entries
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.filter((name) => ['.json', '.yaml', '.yml'].includes(extname(name)))
		.sort()

	if (packFiles.length === 0) {
		throw new Error('No content packs found in content/packs.')
	}

	const packs: unknown[] = []
	for (const fileName of packFiles) {
		const filePath = join(contentDir, fileName)
		const raw = await readFile(filePath, 'utf8')
		const ext = extname(fileName)
		packs.push(ext === '.json' ? JSON.parse(raw) : parseYaml(raw))
	}

	return packs
}

async function main() {
	const rawPacks = await readContentPacks()
	const packs = validateContentPacks(rawPacks) as ContentPack[]
	const catalog = buildRuntimeCatalog(packs)

	if (validateOnly) {
		console.log(`Validated ${packs.length} content pack(s).`)
		return
	}

	await mkdir(publicDir, { recursive: true })
	await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
	console.log(`Generated ${catalogPath}`)
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
