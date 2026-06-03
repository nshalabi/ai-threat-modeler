/**
 * Print the deterministic findings the MCP server returns for a given sample —
 * the reference ("answer key") for the parity test. Usage:
 *   node scripts/answer-key.mjs rag-chatbot-public
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../..')
const sample = process.argv[2] ?? 'rag-chatbot-public'

const transport = new StdioClientTransport({
  command: 'node',
  args: [resolve(here, '../dist/index.js')]
})
const client = new Client({ name: 'answer-key', version: '1.0.0' })
await client.connect(transport)

const model = JSON.parse(readFileSync(resolve(repoRoot, 'samples', `${sample}.aitm`), 'utf8'))
const res = await client.callTool({ name: 'analyze_threat_model', arguments: { model } })
const r = res.structuredContent ?? JSON.parse(res.content[0].text)

console.log(`\nSample: ${sample}`)
console.log(`Total findings: ${r.summary.total}`)
console.log(`By severity:`, JSON.stringify(r.summary.bySeverity))
const rules = [...new Set(r.findings.map((f) => f.ruleId))].sort()
console.log(`Distinct rules fired (${rules.length}): ${rules.join(', ')}`)
console.log('\nFindings (severity | ruleId | title | components):')
for (const f of r.findings) {
  const ap = f.attackPath ? `  [attack-path: ${f.attackPath.chain.join(' -> ')}]` : ''
  console.log(`  ${f.severity.padEnd(8)} ${f.ruleId.padEnd(9)} ${f.title}  <${f.affectedComponents.join(', ')}>${ap}`)
}

await client.close()
