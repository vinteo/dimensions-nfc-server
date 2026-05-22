import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './app.js';

describe('Dimensions NFC Server API', () => {
  describe('GET /api/health', () => {
    it('should return a 200 status and healthy details', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'dimensions-nfc-server');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/nfc/status', () => {
    it('should return connection status', async () => {
      const response = await request(app).get('/api/nfc/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('connected');
      expect(response.body).toHaveProperty('mode');
    });
  });

  describe('POST /api/nfc/mock and GET /api/nfc/latest', () => {
    it('should trigger a simulated scan and make it available on /latest', async () => {
      const mockScan = {
        cardId: 'card-998877',
        readerId: 'test-entrance',
      };

      // 1. Trigger mock scan
      const mockResponse = await request(app)
        .post('/api/nfc/mock')
        .send(mockScan);

      expect(mockResponse.status).toBe(200);
      expect(mockResponse.body).toHaveProperty('success', true);
      expect(mockResponse.body).toHaveProperty('simulatedCard', mockScan.cardId.toUpperCase());

      // 2. Query latest scan endpoint
      const latestResponse = await request(app).get('/api/nfc/latest');

      expect(latestResponse.status).toBe(200);
      expect(latestResponse.body.cardId).toBe(mockScan.cardId.toUpperCase());
      expect(latestResponse.body.readerId).toBe(mockScan.readerId);
      expect(latestResponse.body).toHaveProperty('scannedAt');
    });

    it('should fail /mock with 400 if cardId is missing', async () => {
      const response = await request(app)
        .post('/api/nfc/mock')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should accept custom pad and direction mock scanning', async () => {
      const mockScan = {
        cardId: 'card-preset-001',
        pad: 2,
        direction: 'departure',
      };

      const response = await request(app)
        .post('/api/nfc/mock')
        .send(mockScan);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pad', 2);
      expect(response.body).toHaveProperty('direction', 'departure');
    });
  });

  describe('GET /api/nfc/state and POST /api/nfc/clear', () => {
    it('should retrieve full system state and allow clearing scan history', async () => {
      // 1. Get current state
      const stateResponse = await request(app).get('/api/nfc/state');
      expect(stateResponse.status).toBe(200);
      expect(stateResponse.body).toHaveProperty('status');
      expect(stateResponse.body).toHaveProperty('activeTags');
      expect(stateResponse.body).toHaveProperty('history');

      // 2. Clear state
      const clearResponse = await request(app).post('/api/nfc/clear');
      expect(clearResponse.status).toBe(200);
      expect(clearResponse.body).toHaveProperty('success', true);

      // 3. Confirm cleared state
      const stateResponseAfter = await request(app).get('/api/nfc/state');
      expect(stateResponseAfter.body.history.length).toBe(0);
      expect(stateResponseAfter.body.activeTags[1]).toEqual([]);
      expect(stateResponseAfter.body.activeTags[2]).toEqual([]);
      expect(stateResponseAfter.body.activeTags[3]).toEqual([]);
    });
  });

  describe('POST /api/nfc/light', () => {
    it('should set physical light and return 200', async () => {
      const response = await request(app)
        .post('/api/nfc/light')
        .send({
          pad: 1,
          color: '#a855f7',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should fail with 400 if color or pad is missing', async () => {
      const response = await request(app)
        .post('/api/nfc/light')
        .send({
          pad: 1,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/nfc/scan (Legacy)', () => {
    it('should accept legacy scan POST payloads', async () => {
      const scanData = {
        cardId: 'nfc-card-12345',
        readerId: 'reader-main-entrance',
      };

      const response = await request(app)
        .post('/api/nfc/scan')
        .send(scanData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Custom Tag Settings API', () => {
    it('should retrieve default tag settings for a tag', async () => {
      const response = await request(app).get('/api/nfc/tags/batman');
      
      expect(response.status).toBe(200);
      expect(response.body.cardId).toBe('BATMAN');
      expect(response.body.name).toBe('Batman'); // fallback preset name
      expect(response.body.arrivalColor).toBe('#10b981');
      expect(response.body.departureColor).toBe('#f59e0b');
    });

    it('should update and retrieve custom settings for a tag', async () => {
      const customData = {
        name: 'Dark Knight',
        arrivalColor: '#8b5cf6',
        departureColor: '#ec4899',
        icon: 'Ghost',
        iconType: 'lucide',
        webhooks: {
          1: { arrival: 'http://localhost:9999/webhook', departure: '' }
        }
      };

      const postResponse = await request(app)
        .post('/api/nfc/tags/batman')
        .send(customData);

      expect(postResponse.status).toBe(200);
      expect(postResponse.body.success).toBe(true);
      expect(postResponse.body.settings.name).toBe('Dark Knight');
      expect(postResponse.body.settings.arrivalColor).toBe('#8b5cf6');

      const getResponse = await request(app).get('/api/nfc/tags/batman');
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.name).toBe('Dark Knight');
      expect(getResponse.body.webhooks['1'].arrival).toBe('http://localhost:9999/webhook');
    });

    it('should upload custom PNG image icon successfully', async () => {
      const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const response = await request(app)
        .post('/api/nfc/tags/batman/icon-upload')
        .send({ base64Image: base64Png });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.iconUrl).toContain('/uploads/BATMAN-');
      expect(response.body.settings.iconType).toBe('custom');
    });
  });
});
