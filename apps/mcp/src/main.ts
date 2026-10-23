import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { HttpFiscalizaApi } from './infrastructure/http-fiscaliza-api.js';
import { createServer } from './server.js';

// The stdout belongs to the MCP protocol: everything else goes to the stderr
async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const api = new HttpFiscalizaApi(config.FISCALIZA_API_URL, config.FISCALIZA_API_TOKEN);
  await createServer(api).connect(new StdioServerTransport());
  console.error('Servidor MCP do Fiscaliza pronto (stdio).');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
