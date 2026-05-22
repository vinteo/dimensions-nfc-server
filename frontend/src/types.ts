export interface NfcStatus {
  connected: boolean;
  mode: 'usb' | 'mock';
  vendorId?: string;
  productId?: string;
}

export interface ActiveTagInfo {
  cardId: string;
  readerId: string;
  scannedAt: string;
  name?: string;
  arrivalColor?: string;
  departureColor?: string;
  icon?: string;
  iconType?: 'lucide' | 'custom';
}

export interface HistoryEvent {
  id: string;
  type: 'arrival' | 'departure';
  cardId: string;
  pad: number;
  readerId: string;
  scannedAt: string;
  name?: string;
  arrivalColor?: string;
  departureColor?: string;
  icon?: string;
  iconType?: 'lucide' | 'custom';
  webhookUrl?: string;
  webhookStatus?: 'pending' | 'success' | 'failed';
}

export interface CharacterPreset {
  name: string;
  id: string;
  type: string;
}

export interface ColorPreset {
  name: string;
  value: string;
}

export interface TagSettings {
  cardId: string;
  name: string;
  arrivalColor: string;
  departureColor: string;
  icon: string;
  iconType: 'lucide' | 'custom';
  webhooks: Record<number, { arrival: string; arrivalPayload?: string; departure: string; departurePayload?: string }>;
}
