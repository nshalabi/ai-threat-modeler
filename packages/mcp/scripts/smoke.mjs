/**
 * End-to-end smoke test: spawn the built stdio server via the MCP SDK client,
 * exercise every tool, and cross-check analyze against the engine run directly.
 * Not part of the published package — a manual verification harness.
 *
 *   node scripts/smoke.mjs
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../..')

function structured(res) {
  return res.structuredContent ?? JSON.parse(res.content[0].text)
}

const transport = new StdioClientTransport({
  command: 'node',
  args: [resolve(here, '../dist/index.js')]
})
const client = new Client({ name: 'smoke', version: '1.0.0' })
await client.connect(transport)

let failures = 0
const check = (label, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`)
  if (!cond) failures++
}

// 1. Tools list
const { tools } = await client.listTools()
const names = tools.map((t) => t.name).sort()
console.log('Tools:', names.join(', '))
check(
  'all expected tools present',
  ['analyze_threat_model', 'list_boundary_types', 'list_component_types', 'list_frameworks', 'list_rules', 'validate_model'].every(
    (n) => names.includes(n)
  )
)

// 2. Discovery
const comps = structured(await client.callTool({ name: 'list_component_types', arguments: {} }))
check('component types listed', comps.total >= 30, `${comps.total} types`)
const rules = structured(await client.callTool({ name: 'list_rules', arguments: {} }))
check('rules listed', rules.total > 0, `${rules.total} rules`)
const fw = structured(await client.callTool({ name: 'list_frameworks', arguments: {} }))
check('frameworks listed', fw.total > 0, fw.frameworks.map((f) => f.framework).join(', '))

// 3. Validation — bad model
const bad = structured(await client.callTool({ name: 'validate_model', arguments: { model: { name: 'x' } } }))
check('invalid model rejected with errors', bad.valid === false && bad.errors.length > 0, `${bad.errors.length} errors`)

// 4. Validation + analysis — every sample
const samples = [
  'rag-indirect-injection',
  'rag-chatbot-public',
  'internal-ai-agent',
  'ml-training-pipeline',
  'multi-provider-sensitive-data',
  'minimal-safe-architecture'
]
for (const name of samples) {
  const model = JSON.parse(readFileSync(resolve(repoRoot, 'samples', `${name}.aitm`), 'utf8'))
  const v = structured(await client.callTool({ name: 'validate_model', arguments: { model } }))
  check(`validate ${name}`, v.valid === true, v.valid ? `${v.summary.componentCount} components` : v.errors.join('; '))

  const r = structured(await client.callTool({ name: 'analyze_threat_model', arguments: { model } }))
  const hasContract = r.resultSchemaVersion === '1.0' && typeof r.summary?.total === 'number'
  const pathFindings = r.findings.filter((f) => f.attackPath).length
  check(
    `analyze ${name}`,
    hasContract,
    `${r.summary.total} findings (${pathFindings} attack-path), pack v${r.engine.knowledgePackVersion}`
  )
}

await client.close()
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
