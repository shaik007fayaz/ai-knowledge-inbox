import { createApp } from './app';
import { loadConfig } from './config';
import { buildContainer } from './container';
import { sleep } from './utils/retry';

const config = loadConfig();
const container = buildContainer(config);
const { logger } = container;

const recovered = container.ingest.recoverPending();
if (recovered > 0) logger.info({ recovered }, 'Re-queued items left over from a previous run');

const server = createApp(container).listen(config.port, () => {
  logger.info(
    { port: config.port, provider: config.provider, embeddingModel: container.embedder.model, db: config.dbPath },
    `AI Knowledge Inbox API listening (provider: ${config.provider})`,
  );
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down: no new connections, draining jobs');
  server.close();
  await Promise.race([container.jobs.drain(), sleep(10_000)]);
  container.db.close();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
