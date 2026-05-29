/**
 * AI Threat Modeler — MCP server (stdio).
 *
 * A thin, STATELESS adapter over the headless analysis core (@core). AI agents
 * (VS Code agent mode, Codex, Cursor, Claude — any MCP host) use it to:
 *   1. discover the modeling vocabulary (component/boundary types, rules,
 *      frameworks),
 *   2. validate a threat model they extracted from arbitrary input, and
 *   3. analyze it with the deterministic engine.
 *
 * The server holds NO session. The agent keeps the model in its own context
 * and passes it on every call — iteration (build → validate → fix → analyze →
 * revise) happens in the agent, not in server state. No mutation tools, no
 * canvas, no governance surface (notes / disposition / risk acceptance live in
 * the desktop app, not here).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  SERVER_NAME,
  SERVER_VERSION,
  KNOWLEDGE_PACK_VERSION,
  engine
} from './common'
import { registerDiscoveryTools } from './tools/discovery'
import { registerValidateTool } from './tools/validate'
import { registerAnalyzeTool } from './tools/analyze'

async function main(): Promise<void> {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  })

  registerDiscoveryTools(server)
  registerValidateTool(server)
  registerAnalyzeTool(server)

  const transport = new StdioServerTransport()
  await server.connect(transport)

  // stdout is the protocol channel — all diagnostics go to stderr.
  console.error(
    `${SERVER_NAME} v${SERVER_VERSION} ready ` +
      `(knowledge pack v${KNOWLEDGE_PACK_VERSION}, ${engine.rules.length} rules) — stdio`
  )
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error)
  process.exit(1)
})
