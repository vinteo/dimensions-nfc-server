import { NfcReaderService, NfcScanEvent } from '../services/nfc-reader.js';
import { broadcast } from '../helpers/sse.js';
import { Database } from '../db/database.js';

const nfcReader = NfcReaderService.getInstance();

export interface EnrichedActiveTag {
  cardId: string;
  readerId: string;
  scannedAt: string;
  name: string;
  arrivalColor: string;
  departureColor: string;
  icon: string;
  iconType: 'lucide' | 'custom';
}

export interface EnrichedHistoryEvent {
  id: string;
  type: string;
  cardId: string;
  pad: number;
  readerId: string;
  scannedAt: string;
  name: string;
  arrivalColor: string;
  departureColor: string;
  icon: string;
  iconType: 'lucide' | 'custom';
  webhookUrl?: string;
  webhookStatus?: 'pending' | 'success' | 'failed';
}

export let latestScan: NfcScanEvent | null = null;
export let scanHistory: Array<EnrichedHistoryEvent> = [];
export let activeTags: Record<number, Array<EnrichedActiveTag>> = {
  1: [],
  2: [],
  3: [],
};

export const getLatestScan = () => latestScan;
export const getScanHistory = () => scanHistory;
export const getActiveTags = () => activeTags;

export const clearState = () => {
  scanHistory = [];
  activeTags = { 1: [], 2: [], 3: [] };
  broadcast({
    type: 'clear',
    activeTags,
    history: scanHistory,
  });
};

/**
 * Dispatches webhooks asynchronously in a non-blocking background task
 */
const dispatchWebhook = async (
  eventId: string,
  url: string,
  payload: { tagId: string; name: string; padNumber: number; type: 'arrival' | 'departure'; payload?: string },
) => {
  if (!url || !url.trim()) return;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const status = response.ok ? 'success' : 'failed';
    if (!response.ok) {
      console.warn(`[Webhook] Target responded with status ${response.status} for URL: ${url}`);
    }

    // Update state
    const historyItem = scanHistory.find((h) => h.id === eventId);
    if (historyItem) {
      historyItem.webhookStatus = status;
    }

    broadcast({
      type: 'webhook-update',
      eventId,
      status,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Webhook] Failed to dispatch to URL ${url}: ${errMsg}`);

    // Update state
    const historyItem = scanHistory.find((h) => h.id === eventId);
    if (historyItem) {
      historyItem.webhookStatus = 'failed';
    }

    broadcast({
      type: 'webhook-update',
      eventId,
      status: 'failed',
    });
  }
};

/**
 * Re-resolves and broadcasts the full state to all connected clients
 */
export const broadcastFullState = () => {
  const db = Database.getInstance();

  // Re-resolve active tags
  const updatedActiveTags: typeof activeTags = { 1: [], 2: [], 3: [] };
  for (const padKey of [1, 2, 3]) {
    updatedActiveTags[padKey] = activeTags[padKey].map((tag) => {
      const settings = db.getTagSettings(tag.cardId);
      return {
        ...tag,
        name: settings.name,
        arrivalColor: settings.arrivalColor,
        departureColor: settings.departureColor,
        icon: settings.icon,
        iconType: settings.iconType,
      };
    });
  }
  activeTags = updatedActiveTags;

  // Re-resolve history
  scanHistory = scanHistory.map((event) => {
    const settings = db.getTagSettings(event.cardId);
    return {
      ...event,
      name: settings.name,
      arrivalColor: settings.arrivalColor,
      departureColor: settings.departureColor,
      icon: settings.icon,
      iconType: settings.iconType,
    };
  });

  // Send an init broadcast to trigger a full repaint on the client side
  broadcast({
    type: 'init',
    status: nfcReader.getStatus(),
    activeTags,
    history: scanHistory,
  });
};

// Initialize event subscriptions
export const initNfcSubscriptions = () => {
  nfcReader.on('scan', (event: NfcScanEvent) => {
    latestScan = event;
    
    // Extract pad index from readerId (e.g. "usb-...-pad1" or "mock-usb-reader-pad1")
    const match = event.readerId.match(/pad(\d+)/i);
    const pad = match ? parseInt(match[1], 10) : 1;

    const db = Database.getInstance();
    const settings = db.getTagSettings(event.cardId);
    const defaultWebhooks = db.getDefaultWebhooks();
    
    const tagWebhook = settings.webhooks && settings.webhooks[pad];
    const padDefault = defaultWebhooks[pad];
    const webhookUrl = (tagWebhook && tagWebhook.arrival) || (padDefault && padDefault.arrival) || '';

    const eventItem: EnrichedHistoryEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'arrival',
      cardId: event.cardId,
      pad,
      readerId: event.readerId,
      scannedAt: event.scannedAt.toISOString(),
      name: settings.name,
      arrivalColor: settings.arrivalColor,
      departureColor: settings.departureColor,
      icon: settings.icon,
      iconType: settings.iconType,
      webhookUrl: webhookUrl || undefined,
      webhookStatus: webhookUrl ? 'pending' : undefined,
    };

    // Add to history
    scanHistory.unshift(eventItem);
    if (scanHistory.length > 50) {
      scanHistory.pop();
    }

    // Set active tag (add to array if not already present)
    const exists = activeTags[pad].some((t) => t.cardId === event.cardId);
    if (!exists) {
      activeTags[pad].push({
        cardId: event.cardId,
        readerId: event.readerId,
        scannedAt: event.scannedAt.toISOString(),
        name: settings.name,
        arrivalColor: settings.arrivalColor,
        departureColor: settings.departureColor,
        icon: settings.icon,
        iconType: settings.iconType,
      });
    }

    // Broadcast to SSE clients
    broadcast({
      type: 'scan',
      event: eventItem,
      activeTags,
      status: nfcReader.getStatus(),
    });

    // Asynchronously dispatch webhook in background
    const arrivalPayload = (tagWebhook && tagWebhook.arrival) ? tagWebhook.arrivalPayload : (padDefault ? padDefault.arrivalPayload : undefined);
    if (webhookUrl) {
      dispatchWebhook(eventItem.id, webhookUrl, {
        tagId: event.cardId,
        name: settings.name,
        padNumber: pad,
        type: 'arrival',
        payload: arrivalPayload || undefined,
      });
    }
  });

  nfcReader.on('remove', (event: { cardId: string; pad: number; readerId: string; scannedAt: Date }) => {
    const pad = event.pad || 1;

    const db = Database.getInstance();
    const settings = db.getTagSettings(event.cardId);
    const defaultWebhooks = db.getDefaultWebhooks();
    
    const tagWebhook = settings.webhooks && settings.webhooks[pad];
    const padDefault = defaultWebhooks[pad];
    const webhookUrl = (tagWebhook && tagWebhook.departure) || (padDefault && padDefault.departure) || '';

    const eventItem: EnrichedHistoryEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'departure',
      cardId: event.cardId,
      pad,
      readerId: event.readerId,
      scannedAt: event.scannedAt.toISOString(),
      name: settings.name,
      arrivalColor: settings.arrivalColor,
      departureColor: settings.departureColor,
      icon: settings.icon,
      iconType: settings.iconType,
      webhookUrl: webhookUrl || undefined,
      webhookStatus: webhookUrl ? 'pending' : undefined,
    };

    // Add to history
    scanHistory.unshift(eventItem);
    if (scanHistory.length > 50) {
      scanHistory.pop();
    }

    // Clear active tag from array
    activeTags[pad] = activeTags[pad].filter((t) => t.cardId !== event.cardId);

    // Broadcast to SSE clients
    broadcast({
      type: 'remove',
      event: eventItem,
      activeTags,
      status: nfcReader.getStatus(),
    });

    // Asynchronously dispatch webhook in background
    const departurePayload = (tagWebhook && tagWebhook.departure) ? tagWebhook.departurePayload : (padDefault ? padDefault.departurePayload : undefined);
    if (webhookUrl) {
      dispatchWebhook(eventItem.id, webhookUrl, {
        tagId: event.cardId,
        name: settings.name,
        padNumber: pad,
        type: 'departure',
        payload: departurePayload || undefined,
      });
    }
  });

  nfcReader.on('connect', () => {
    broadcast({
      type: 'status',
      status: nfcReader.getStatus(),
    });
  });

  nfcReader.on('disconnect', () => {
    // Clear active tags since reader disconnected
    activeTags = { 1: [], 2: [], 3: [] };
    broadcast({
      type: 'status',
      status: nfcReader.getStatus(),
      activeTags,
    });
  });
};
