import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const rootDir = process.cwd()
const scanRoots = ['src', 'dist', 'public/catalog.generated.json']
const patterns = [
	{ name: 'OpenAI-style secret key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
	{
		name: 'OpenAI runtime endpoint',
		regex:
			/api\.openai\.com|\/v1\/chat\/completions|\/v1\/responses|\/v1\/images/g,
	},
	{ name: 'Anthropic runtime endpoint', regex: /api\.anthropic\.com/g },
	{ name: 'Google API key', regex: /\bAIza[A-Za-z0-9_-]{20,}\b/g },
	{
		name: 'OpenAI key-like environment variable name',
		regex: /\b(?:VITE_)?OPENAI_[A-Z0-9_]*KEY\b/g,
	},
]

type Finding = {
	file: string
	name: string
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await readdir(path)
		return true
	} catch {
		try {
			await readFile(path)
			return true
		} catch {
			return false
		}
	}
}

async function collectFiles(path: string): Promise<string[]> {
	const fullPath = join(rootDir, path)
	if (!(await pathExists(fullPath))) {
		return []
	}

	try {
		const entries = await readdir(fullPath, { withFileTypes: true })
		const nested = await Promise.all(
			entries.map((entry) => {
				const childPath = join(path, entry.name)
				return entry.isDirectory() ? collectFiles(childPath) : [childPath]
			}),
		)
		return nested.flat()
	} catch {
		return [path]
	}
}

async function main() {
	for (const [key] of Object.entries(process.env)) {
		if (/^VITE_.*OPENAI.*KEY$/.test(key)) {
			throw new Error(`${key} must not be exposed to the client build.`)
		}
	}

	const files = (
		await Promise.all(scanRoots.map((root) => collectFiles(root)))
	).flat()
	const findings: Finding[] = []

	for (const file of files) {
		const text = await readFile(join(rootDir, file), 'utf8').catch(() => '')
		for (const pattern of patterns) {
			pattern.regex.lastIndex = 0
			if (pattern.regex.test(text)) {
				findings.push({ file, name: pattern.name })
			}
		}
	}

	if (findings.length > 0) {
		const detail = findings
			.map((finding) => `${finding.file}: ${finding.name}`)
			.join('\n')
		throw new Error(`Potential client secret exposure found:\n${detail}`)
	}

	console.log(
		`Scanned ${files.length} client file(s); no client secrets found.`,
	)
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
