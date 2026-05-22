import nconf from 'nconf';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize nconf hierarchical config registry
nconf
  .argv()
  .env({
    separator: '__',
    parseValues: true,
  })
  .file({ file: path.join(__dirname, '../config.json') });

// Configure defaults
nconf.defaults({
  nfc: {
    mode: 'mock',
    vid: '0x0e6f', // Default Custom USB Vendor ID
    pid: '0x0241', // Default Custom USB Product ID
  },
  port: 3000,
  node_env: 'development',
});

export default nconf;
