/** Injected by tsup at build time from packages/mcp/package.json. */
declare const __SERVER_VERSION__: string

/**
 * Injected by the app's Vite builds; re-declared here because the @core barrel
 * re-exports the report modules (which read it). The MCP server never calls
 * those report functions, but the symbol must resolve for typecheck, and tsup
 * defines it for runtime safety in case the module is retained.
 */
declare const __APP_VERSION__: string
