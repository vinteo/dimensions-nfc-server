import dotenv from 'dotenv';
import pc from 'picocolors';
import app from './app.js';
import { NfcReaderService } from './services/nfc-reader.js';
import nconf from './config.js';

// Load environment variables
dotenv.config();

const PORT = nconf.get('port') || 3000;
const nfcReader = NfcReaderService.getInstance();

// Boot services
console.log(pc.bold(pc.green('\n🚀 Dimensions NFC Server is booting up...')));
console.log(pc.gray('----------------------------------------------------'));

try {
  await nfcReader.start();
} catch (err: unknown) {
  const errMsg = err instanceof Error ? err.message : String(err);
  console.error(pc.red(`⚠️ Failed to start NFC Reader Service: ${errMsg}`));
}

const server = app.listen(PORT, () => {
  console.log(pc.gray('----------------------------------------------------'));
  console.log(`${pc.cyan('● Environment:')}  ${process.env.NODE_ENV || 'development'}`);
  console.log(`${pc.cyan('● Port:')}         ${PORT}`);
  console.log(`${pc.cyan('● Health Check:')} http://localhost:${PORT}/api/health`);
  console.log(`${pc.cyan('● NFC Status:')}   http://localhost:${PORT}/api/nfc/status`);
  console.log(pc.gray('----------------------------------------------------'));
  console.log(pc.green('✔ Server is listening and ready for NFC scans!\n'));
});

// Handle graceful shutdown
const shutdown = async () => {
  console.log(pc.yellow('\nShutting down server gracefully...'));
  
  // Close Express server
  server.close(() => {
    console.log(pc.gray('HTTP server stopped.'));
  });

  // Stop NFC service
  await nfcReader.stop();
  
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
