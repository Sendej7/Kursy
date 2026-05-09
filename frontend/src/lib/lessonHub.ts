import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuth } from './auth';

const HUB_URL = '/hubs/lesson';

let connection: HubConnection | null = null;
let starting: Promise<HubConnection> | null = null;

async function ensureConnection(): Promise<HubConnection> {
  if (connection?.state === 'Connected') return connection;
  if (starting) return starting;

  starting = (async () => {
    const conn = new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => useAuth.getState().token ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();
    await conn.start();
    connection = conn;
    starting = null;
    return conn;
  })();

  return starting;
}

export interface LessonPresence {
  lessonId: string;
  count: number;
}

export async function joinLesson(
  lessonId: string,
  onPresence: (p: LessonPresence) => void,
  onCompleted?: (displayName: string) => void,
): Promise<() => Promise<void>> {
  const conn = await ensureConnection();

  const presenceHandler = (p: LessonPresence) => {
    if (p.lessonId === lessonId) onPresence(p);
  };
  const completedHandler = (c: { lessonId: string; displayName: string }) => {
    if (c.lessonId === lessonId && onCompleted) onCompleted(c.displayName);
  };

  conn.on('presence', presenceHandler);
  conn.on('completed', completedHandler);
  await conn.invoke('JoinLesson', lessonId);

  return async () => {
    conn.off('presence', presenceHandler);
    conn.off('completed', completedHandler);
    try {
      await conn.invoke('LeaveLesson', lessonId);
    } catch {
      /* connection may be closed */
    }
  };
}

export async function notifyCompleted(lessonId: string, displayName: string): Promise<void> {
  try {
    const conn = await ensureConnection();
    await conn.invoke('NotifyCompleted', lessonId, displayName);
  } catch {
    /* ignore */
  }
}
