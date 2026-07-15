import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

export interface Frontmatter {
  id?: number | string
  contents?: Array<{
    id?: number | string
    label?: string
    language?: string
  }>
}

/**
 * Resolves the configured vault path. If empty, uses the default:
 * ~/massCode/markdown-vault
 */
export function resolveVaultPath(configuredPath: string | undefined): string {
  let resolved = (configuredPath || '').trim()
  if (!resolved) {
    resolved = path.join(os.homedir(), 'massCode', 'markdown-vault')
  }
  else if (resolved.startsWith('~')) {
    resolved = path.join(os.homedir(), resolved.slice(1))
  }
  return path.resolve(resolved)
}

/**
 * Parses the YAML frontmatter from a Markdown snippet.
 *
 * DESIGN TRADEOFFS:
 * - Why a custom parser?
 *   Using a custom handwritten parser keeps the extension extremely lightweight and
 *   self-contained. It avoids introducing large external dependencies like `js-yaml` or `yaml`,
 *   which reduces the extension VSIX bundle size, keeps runtime memory footprint minimal,
 *   and eliminates external security/dependency-vulnerability risks.
 * - Limitations:
 *   This is a simplified parser designed specifically for the well-defined frontmatter structure
 *   emitted by massCode. It only handles simple key-value pairs and the `contents` list block. It
 *   does not support the full YAML specification (e.g., aliases, anchors, complex nested structures,
 *   or multi-line strings).
 */
export function parseFrontmatter(text: string): Frontmatter {
  const lines = text.split(/\r?\n/)
  const result: Frontmatter = {}
  let inContents = false
  let currentContent: {
    id?: number | string
    label?: string
    language?: string
  } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed)
      continue

    if (trimmed.startsWith('contents:')) {
      inContents = true
      result.contents = []
      continue
    }

    if (
      inContents
      && !line.startsWith(' ')
      && !line.startsWith('\t')
      && !line.startsWith('-')
    ) {
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex !== -1) {
        inContents = false
      }
    }

    if (inContents) {
      if (trimmed.startsWith('-')) {
        currentContent = {}
        result.contents!.push(currentContent)
        const rest = trimmed.substring(1).trim()
        const colonIndex = rest.indexOf(':')
        if (colonIndex !== -1) {
          const key = rest.substring(0, colonIndex).trim()
          const val = rest.substring(colonIndex + 1).trim()
          if (key === 'id') {
            currentContent.id = Number.isNaN(Number(val)) ? val : Number(val)
          }
          else if (key === 'label') {
            currentContent.label = val.replace(/^['"]|['"]$/g, '')
          }
          else if (key === 'language') {
            currentContent.language = val.replace(/^['"]|['"]$/g, '')
          }
        }
      }
      else {
        const colonIndex = trimmed.indexOf(':')
        if (colonIndex !== -1 && currentContent) {
          const key = trimmed.substring(0, colonIndex).trim()
          const val = trimmed.substring(colonIndex + 1).trim()
          if (key === 'id') {
            currentContent.id = Number.isNaN(Number(val)) ? val : Number(val)
          }
          else if (key === 'label') {
            currentContent.label = val.replace(/^['"]|['"]$/g, '')
          }
          else if (key === 'language') {
            currentContent.language = val.replace(/^['"]|['"]$/g, '')
          }
        }
      }
    }
    else {
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex !== -1) {
        const key = trimmed.substring(0, colonIndex).trim()
        const val = trimmed.substring(colonIndex + 1).trim()
        if (key === 'id') {
          result.id = Number.isNaN(Number(val)) ? val : Number(val)
        }
      }
    }
  }

  return result
}

/**
 * Extracts a fenced code block matching the specified label.
 */
export function extractFencedCodeBlock(
  markdown: string,
  label: string,
): string | null {
  const lines = markdown.split(/\r?\n/)
  let headerIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.startsWith('## Fragment:')) {
      const headerLabel = trimmed.substring('## Fragment:'.length).trim()
      if (headerLabel === label) {
        headerIndex = i
        break
      }
    }
  }

  if (headerIndex === -1) {
    return null
  }

  let codeStart = -1
  let codeEnd = -1
  let fenceChar = ''

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('## Fragment:')) {
      break
    }

    if (codeStart === -1) {
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        codeStart = i + 1
        const nonFenceMatch = trimmed.match(/[^`~]/)
        const fenceLen = nonFenceMatch ? nonFenceMatch.index! : trimmed.length
        fenceChar = trimmed.substring(0, fenceLen)
      }
    }
    else {
      if (trimmed.startsWith(fenceChar)) {
        codeEnd = i
        break
      }
    }
  }

  if (codeStart !== -1 && codeEnd !== -1) {
    return lines.slice(codeStart, codeEnd).join('\n')
  }

  return null
}

/**
 * Recursively scans for all .md files in the given directory.
 */
async function getMdFiles(dir: string): Promise<string[]> {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const dirent of dirents) {
    const res = path.join(dir, dirent.name)
    if (dirent.isDirectory()) {
      try {
        files.push(...(await getMdFiles(res)))
      }
      catch {
        // Ignore errors for individual sub-directories
      }
    }
    else if (dirent.isFile() && dirent.name.endsWith('.md')) {
      files.push(res)
    }
  }
  return files
}

/**
 * Resolves a snippet fragment content from the vault.
 */
export async function findSnippetInVault(
  vaultPath: string,
  snippetId: number | string,
  contentId: number | string,
): Promise<string> {
  // Check if vault directory exists
  try {
    const stat = await fs.promises.stat(vaultPath)
    if (!stat.isDirectory()) {
      throw new Error(`Vault path is not a directory: ${vaultPath}`)
    }
  }
  catch (error: unknown) {
    const err = error as any
    throw new Error(
      `Markdown Vault directory not found or inaccessible: ${vaultPath}. Details: ${err?.message || err}`,
    )
  }

  const files = await getMdFiles(vaultPath)

  for (const file of files) {
    try {
      const content = await fs.promises.readFile(file, 'utf8')
      const parts = content.split(/^---\s*$/m)
      if (parts.length < 3)
        continue

      const frontmatter = parseFrontmatter(parts[1])
      if (String(frontmatter.id) === String(snippetId)) {
        const matchedContent = frontmatter.contents?.find(
          c => String(c.id) === String(contentId),
        )
        if (!matchedContent || !matchedContent.label) {
          throw new Error(
            `Snippet found, but fragment with content ID ${contentId} is missing or has no label.`,
          )
        }

        const body = parts.slice(2).join('---\n')
        const code = extractFencedCodeBlock(body, matchedContent.label)
        if (code === null) {
          throw new Error(
            `Snippet found, but fenced code block for fragment "${matchedContent.label}" is missing or malformed.`,
          )
        }

        return code
      }
    }
    catch (error: unknown) {
      const err = error as any
      // Handle malformed Markdown files safely and continue scanning other files
      // If we matched the snippet ID but failed within it, bubble that specific error
      if (err?.message && err.message.startsWith('Snippet found')) {
        throw err
      }
    }
  }

  throw new Error(
    `Snippet with ID ${snippetId} not found in the Markdown Vault.`,
  )
}
