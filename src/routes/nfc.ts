import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NfcReaderService } from '../services/nfc-reader.js';
import {
  getLatestScan,
  getScanHistory,
  getActiveTags,
  clearState,
  broadcastFullState,
} from '../state/nfc-store.js';
import { hexToRgb } from '../helpers/color.js';
import { addSseClient, removeSseClient } from '../helpers/sse.js';
import { Database } from '../db/database.js';

const router = Router();
const nfcReader = NfcReaderService.getInstance();

// Get NFC Reader connection and driver status
router.get('/status', (_req: Request, res: Response) => {
  res.status(200).json(nfcReader.getStatus());
});

// Get the full system state (status, active tags, history)
router.get('/state', (_req: Request, res: Response) => {
  res.status(200).json({
    status: nfcReader.getStatus(),
    activeTags: getActiveTags(),
    history: getScanHistory(),
  });
});

// Clear scan history and active tags
router.post('/clear', (_req: Request, res: Response) => {
  clearState();
  res.status(200).json({
    success: true,
    message: 'Scan history and active tags cleared successfully',
  });
});

// Server-Sent Events (SSE) endpoint for real-time streaming
router.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial state connection payload
  const initialPayload = {
    type: 'init',
    status: nfcReader.getStatus(),
    activeTags: getActiveTags(),
    history: getScanHistory(),
  };
  res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);

  const client = { id: Date.now(), res };
  addSseClient(client);

  req.on('close', () => {
    removeSseClient(client.id);
  });
});

// Get the latest scanned NFC tag details
router.get('/latest', (_req: Request, res: Response) => {
  const latest = getLatestScan();
  if (!latest) {
    res.status(404).json({
      message: 'No NFC cards have been scanned yet',
    });
    return;
  }
  res.status(200).json(latest);
});

// Trigger a mock NFC scan (available only in mock mode)
router.post('/mock', (req: Request, res: Response) => {
  const { cardId, readerId, pad, direction } = req.body;
  if (!cardId) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing cardId in request body',
    });
    return;
  }

  const status = nfcReader.getStatus();
  if (status.mode !== 'mock') {
    res.status(400).json({
      error: 'Invalid Operation',
      message: 'Mock scanning is only available when NFC_MODE is set to mock',
    });
    return;
  }

  // Determine target pad or reader ID
  const targetReaderOrPad = pad !== undefined ? Number(pad) : (readerId || 'mock-usb-reader');

  // Determine direction (1 = Arrival/Scan, 0 = Departure/Remove)
  let dir = 1;
  if (direction !== undefined) {
    if (direction === 0 || direction === '0' || direction === 'departure' || direction === 'remove') {
      dir = 0;
    }
  }

  const success = nfcReader.mockScan(cardId, targetReaderOrPad, dir);
  if (success) {
    res.status(200).json({
      success: true,
      message: `Simulated NFC card ${dir === 1 ? 'arrival' : 'departure'} triggered successfully`,
      simulatedCard: cardId.toUpperCase(),
      pad: typeof targetReaderOrPad === 'number' ? targetReaderOrPad : 1,
      direction: dir === 1 ? 'arrival' : 'departure',
    });
  } else {
    res.status(500).json({
      error: 'Internal Error',
      message: 'Failed to trigger simulated scan',
    });
  }
});

// Set physical Toypad Pad LEDs
router.post('/light', async (req: Request, res: Response) => {
  const { pad, color } = req.body;
  if (pad === undefined || color === undefined) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing pad or color in request body',
    });
    return;
  }

  // Parse color hex to RGB
  const rgb = hexToRgb(color);

  // If pad is "all" or [1,2,3], set all colors
  const pads = pad === 'all' ? [1, 2, 3] : [Number(pad)];

  try {
    for (const p of pads) {
      if (p === 1 || p === 2 || p === 3) {
        await nfcReader.setPadColor(p, rgb.r, rgb.g, rgb.b);
      }
    }
    res.status(200).json({
      success: true,
      message: `Set pad ${pad} light to R:${rgb.r} G:${rgb.g} B:${rgb.b} successfully`,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: 'Internal Error',
      message: errMsg || 'Failed to set physical light',
    });
  }
});

// Legacy POST /api/nfc/scan endpoint (maintained for API compatibility)
router.post('/scan', (req: Request, res: Response) => {
  const { cardId, readerId } = req.body;
  if (!cardId || !readerId) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing cardId or readerId in request body',
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Legacy NFC scan payload received',
    data: {
      cardId,
      readerId,
      processedAt: new Date().toISOString(),
    },
  });
});

// Get all customized tag profiles
router.get('/tags', (_req: Request, res: Response) => {
  const db = Database.getInstance();
  res.status(200).json(db.getAllTagSettings());
});

// Get settings for a single tag
router.get('/tags/:cardId', (req: Request, res: Response) => {
  const { cardId } = req.params;
  const db = Database.getInstance();
  res.status(200).json(db.getTagSettings(cardId));
});

// Update settings for a single tag
router.post('/tags/:cardId', async (req: Request, res: Response) => {
  const { cardId } = req.params;
  const { name, arrivalColor, departureColor, icon, iconType, webhooks } = req.body;

  const db = Database.getInstance();
  try {
    const settings = await db.setTagSettings(cardId, {
      name,
      arrivalColor,
      departureColor,
      icon,
      iconType,
      webhooks,
    });

    // Notify all connected clients to reload/repaint tag details
    broadcastFullState();

    res.status(200).json({
      success: true,
      message: 'Tag settings updated successfully',
      settings,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: 'Internal Error',
      message: errMsg,
    });
  }
});

// Upload custom PNG icon for a tag
router.post('/tags/:cardId/icon-upload', async (req: Request, res: Response) => {
  const { cardId } = req.params;
  const { base64Image } = req.body; // e.g. "data:image/png;base64,iVBORw..."

  if (!base64Image) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing base64Image inside request body',
    });
    return;
  }

  try {
    const matches = base64Image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid base64 image data URI format',
      });
      return;
    }

    const mimeType = matches[1];
    if (mimeType !== 'image/png') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Only PNG image format is supported for custom icons',
      });
      return;
    }

    const buffer = Buffer.from(matches[2], 'base64');
    
    // Save image to the uploads directory in the root
    const filename = `${cardId.toUpperCase()}-${Date.now()}.png`;
    const filename__filename = fileURLToPath(import.meta.url);
    const filename__dirname = path.dirname(filename__filename);
    const uploadsDir = path.join(filename__dirname, '../../uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/${filename}`;

    // Update settings to use the custom icon
    const db = Database.getInstance();
    const settings = await db.setTagSettings(cardId, {
      icon: relativeUrl,
      iconType: 'custom',
    });

    // Notify all connected clients to reload/repaint tag details
    broadcastFullState();

    res.status(200).json({
      success: true,
      message: 'PNG icon uploaded and saved successfully',
      iconUrl: relativeUrl,
      settings,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: 'Internal Error',
      message: errMsg,
    });
  }
});

export default router;
