import SQLiteDb from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TagSettings {
  cardId: string;
  name: string;
  arrivalColor: string; // default "#10b981"
  departureColor: string; // default "#f59e0b"
  icon: string; // Lucide name or custom filename
  iconType: 'lucide' | 'custom';
  webhooks: Record<number, { arrival: string; arrivalPayload?: string; departure: string; departurePayload?: string }>;
}

interface TagSettingsRow {
  card_id: string;
  name: string;
  arrival_color: string;
  departure_color: string;
  icon: string;
  icon_type: string;
  webhooks: string;
}

interface LegacyTagSettings {
  name?: string;
  arrivalColor?: string;
  departureColor?: string;
  icon?: string;
  iconType?: 'lucide' | 'custom';
  webhooks?: Record<number, { arrival?: string; arrivalPayload?: string; departure?: string; departurePayload?: string }>;
}


export class Database {
  private static instance: Database;
  private sqliteDb: SQLiteDb.Database;

  private constructor() {
    const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;
    const dbPath = isTest ? ':memory:' : path.join(__dirname, '../../database.db');
    
    // Create base directories if they don't exist
    if (!isTest) {
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }

    // Initialize the SQLite connection
    this.sqliteDb = new SQLiteDb(dbPath);
    
    // Set busy timeout to prevent locking issues
    this.sqliteDb.pragma('busy_timeout = 5000');
    
    this.initializeSchema();
    if (!isTest) {
      this.migrateLegacyData();
    }
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private initializeSchema() {
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS tag_settings (
        card_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        arrival_color TEXT NOT NULL,
        departure_color TEXT NOT NULL,
        icon TEXT NOT NULL,
        icon_type TEXT NOT NULL,
        webhooks TEXT NOT NULL
      );
    `);
  }

  private migrateLegacyData() {
    const legacyPath = path.join(__dirname, '../../database.json');
    if (fs.existsSync(legacyPath)) {
      try {
        console.log('[DB] Found legacy database.json. Initiating migration to SQLite...');
        const raw = fs.readFileSync(legacyPath, 'utf-8');
        const legacyData = JSON.parse(raw) as Record<string, LegacyTagSettings>;
        
        const insertStmt = this.sqliteDb.prepare(`
          INSERT OR IGNORE INTO tag_settings (card_id, name, arrival_color, departure_color, icon, icon_type, webhooks)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const transaction = this.sqliteDb.transaction((data: Record<string, LegacyTagSettings>) => {
          for (const [cardId, settings] of Object.entries(data)) {
            const normalized = cardId.toUpperCase();
            
            // Clean up webhooks structure or fallback
            const webhooks = settings.webhooks || {
              1: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
              2: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
              3: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' }
            };

            insertStmt.run(
              normalized,
              settings.name || normalized,
              settings.arrivalColor || '#10b981',
              settings.departureColor || '#f59e0b',
              settings.icon || 'Shield',
              settings.iconType || 'lucide',
              JSON.stringify(webhooks)
            );
          }
        });
        
        transaction(legacyData);
        console.log(`[DB] Successfully migrated ${Object.keys(legacyData).length} records from database.json to SQLite.`);
        
        // Backup the legacy database.json file to database.json.bak
        const backupPath = `${legacyPath}.bak`;
        fs.renameSync(legacyPath, backupPath);
        console.log(`[DB] Backed up legacy database.json to database.json.bak`);
      } catch (err) {
        console.error('[DB] Failed to migrate legacy database.json:', err);
      }
    }
  }

  public getTagSettings(cardId: string): TagSettings {
    const normalized = cardId.toUpperCase();
    
    const CHARACTER_MAP: Record<string, string> = {
      '041285A2E23E80': 'Batman',
      'BATMAN': 'Batman',
      '045B82A2E23E80': 'Gandalf',
      'GANDALF': 'Gandalf',
      '041F85A2E23E80': 'Wyldstyle',
      'WYLDSTYLE': 'Wyldstyle',
      '045286A2E23E80': 'Chell (Portal)',
      'CHELL': 'Chell (Portal)',
      '043F86A2E23E80': 'Doctor Who',
      'DOCTOR_WHO': 'Doctor Who',
      '042A86A2E23E80': 'Sonic The Hedgehog',
      'SONIC': 'Sonic The Hedgehog',
      '04E983A2E23E80': 'Homer Simpson',
      'HOMER': 'Homer Simpson',
      '045C86A2E23E80': 'Scooby-Doo',
      'SCOOBY': 'Scooby-Doo',
      'A1B2C3D4E5F677': 'Vortex Mystery Tag',
      'VORTEX': 'Vortex Mystery Tag',
    };
    const defaultName = CHARACTER_MAP[normalized] || normalized;

    try {
      const row = this.sqliteDb.prepare('SELECT * FROM tag_settings WHERE card_id = ?').get(normalized) as TagSettingsRow | undefined;
      if (row) {
        let webhooks: Record<number, { arrival?: string; arrivalPayload?: string; departure?: string; departurePayload?: string }> = {};
        try {
          webhooks = JSON.parse(row.webhooks);
        } catch {
          // fallback
        }
        
        // Clean up and ensure webhooks has pads 1, 2, and 3
        const ensuredWebhooks: TagSettings['webhooks'] = {
          1: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
          2: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
          3: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' }
        };
        for (const padNum of [1, 2, 3]) {
          const entry = webhooks[padNum];
          if (entry) {
            ensuredWebhooks[padNum] = {
              arrival: entry.arrival || '',
              arrivalPayload: entry.arrivalPayload || '',
              departure: entry.departure || '',
              departurePayload: entry.departurePayload || '',
            };
          }
        }

        return {
          cardId: normalized,
          name: row.name || defaultName,
          arrivalColor: row.arrival_color || '#10b981',
          departureColor: row.departure_color || '#f59e0b',
          icon: row.icon || 'Shield',
          iconType: (row.icon_type as 'lucide' | 'custom') || 'lucide',
          webhooks: ensuredWebhooks,
        };
      }
    } catch (err) {
      console.error(`[DB] Error fetching settings for card ${normalized}:`, err);
    }

    // Default tag settings
    return {
      cardId: normalized,
      name: defaultName,
      arrivalColor: '#10b981',
      departureColor: '#f59e0b',
      icon: 'Shield',
      iconType: 'lucide',
      webhooks: {
        1: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
        2: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
        3: { arrival: '', arrivalPayload: '', departure: '', departurePayload: '' },
      },
    };
  }

  public getAllTagSettings(): Record<string, TagSettings> {
    const result: Record<string, TagSettings> = {};
    try {
      const rows = this.sqliteDb.prepare('SELECT card_id FROM tag_settings').all() as Array<{ card_id: string }>;
      for (const row of rows) {
        result[row.card_id] = this.getTagSettings(row.card_id);
      }
    } catch (err) {
      console.error('[DB] Error fetching all tag settings:', err);
    }
    return result;
  }

  public async setTagSettings(cardId: string, settings: Partial<TagSettings>): Promise<TagSettings> {
    const normalized = cardId.toUpperCase();
    const current = this.getTagSettings(normalized);

    const updated = {
      cardId: normalized,
      name: settings.name !== undefined ? settings.name : current.name,
      arrivalColor: settings.arrivalColor !== undefined ? settings.arrivalColor : current.arrivalColor,
      departureColor: settings.departureColor !== undefined ? settings.departureColor : current.departureColor,
      icon: settings.icon !== undefined ? settings.icon : current.icon,
      iconType: settings.iconType !== undefined ? settings.iconType : current.iconType,
      webhooks: settings.webhooks !== undefined ? { ...current.webhooks, ...settings.webhooks } : current.webhooks,
    };

    try {
      this.sqliteDb.prepare(`
        INSERT INTO tag_settings (card_id, name, arrival_color, departure_color, icon, icon_type, webhooks)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(card_id) DO UPDATE SET
          name = excluded.name,
          arrival_color = excluded.arrival_color,
          departure_color = excluded.departure_color,
          icon = excluded.icon,
          icon_type = excluded.icon_type,
          webhooks = excluded.webhooks
      `).run(
        updated.cardId,
        updated.name,
        updated.arrivalColor,
        updated.departureColor,
        updated.icon,
        updated.iconType,
        JSON.stringify(updated.webhooks)
      );
    } catch (err) {
      console.error(`[DB] Error saving settings for card ${normalized}:`, err);
      throw err;
    }

    return updated;
  }
}
