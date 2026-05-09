import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuth } from './auth';

const HUB_URL = '/hubs/notifications';

export interface IncomingNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  createdAt: string;
}

let connection: HubConnection | null = null;
let listeners: Array<(n: IncomingNotification) => void> = [];

/**
 * Otwiera trwałe połączenie SignalR i woła `onNotification` przy każdym pushu z backendu.
 * Zwraca cleanup, który odpina handler (i zamyka połączenie, gdy ostatni odbiorca odszedł).
 */
export async function subscribeToNotifications(
  onNotification: (n: IncomingNotification) => void,
): Promise<() => Promise<void>> {
  listeners.push(onNotification);

  if (!connection) {
    const conn = new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => useAuth.getState().token ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();
    conn.on('notification', (payload: IncomingNotification) => {
      for (const fn of listeners) fn(payload);
    });
    try {
      await conn.start();
      connection = conn;
    } catch {
      // Pozwalamy bell-owi nadal pollować — SignalR nie jest wymagany do działania.
      listeners = listeners.filter((fn) => fn !== onNotification);
      throw new Error('Could not connect to notifications hub');
    }
  }

  return async () => {
    listeners = listeners.filter((fn) => fn !== onNotification);
    if (listeners.length === 0 && connection) {
      try {
        await connection.stop();
      } catch {
        /* ignore */
      }
      connection = null;
    }
  };
}
