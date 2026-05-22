import { Response } from 'express';

export interface SseClient {
  id: number;
  res: Response;
}

export let sseClients: SseClient[] = [];

export const addSseClient = (client: SseClient) => {
  sseClients.push(client);
};

export const removeSseClient = (id: number) => {
  sseClients = sseClients.filter((c) => c.id !== id);
};

export const broadcast = (data: unknown) => {
  const json = JSON.stringify(data);
  sseClients.forEach((client) => {
    client.res.write(`data: ${json}\n\n`);
  });
};
