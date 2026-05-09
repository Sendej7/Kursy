/**
 * Pyodide runner — uruchamia kod w Web Workerze, żeby:
 *  - nie blokować głównego wątku UI,
 *  - mieć możliwość terminate() w razie nieskończonej pętli (timeout),
 *  - izolować kod studenta od reszty aplikacji.
 *
 * Worker pobiera Pyodide z CDN przy pierwszym wywołaniu (~10MB).
 */

export interface RunResult {
  stdout: string;
  error?: string;
}

export interface SubmitResult {
  stdout: string;
  passed: boolean;
  tests: { name: string; passed: boolean; message: string | null }[];
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;

let worker: Worker | null = null;
let counter = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./pyodide-worker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

function killWorker() {
  worker?.terminate();
  worker = null;
}

function nextId(): string {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

function send<T>(message: { type: 'run' | 'submit' } & Record<string, unknown>, timeoutMs: number): Promise<T> {
  const w = getWorker();
  const id = nextId();

  return new Promise<T>((resolve, reject) => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.id !== id) return;
      cleanup();
      resolve(ev.data as T);
    };
    const onError = (err: ErrorEvent) => {
      cleanup();
      reject(new Error(err.message));
    };
    const cleanup = () => {
      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      killWorker();
      reject(new Error(`Przekroczono limit ${timeoutMs / 1000}s — kod prawdopodobnie zawiesił się.`));
    }, timeoutMs);

    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    w.postMessage({ ...message, id });
  });
}

export async function runPython(code: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<RunResult> {
  try {
    const res = await send<{ stdout?: string; error?: string }>({ type: 'run', code }, timeoutMs);
    return { stdout: res.stdout ?? '', error: res.error };
  } catch (err) {
    return { stdout: '', error: err instanceof Error ? err.message : String(err) };
  }
}

export async function submitPython(code: string, testsCode: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<SubmitResult> {
  try {
    const res = await send<{
      stdout?: string;
      tests?: { name: string; passed: boolean; message: string | null }[];
      passed?: boolean;
      error?: string;
    }>({ type: 'submit', code, testsCode }, timeoutMs);
    return {
      stdout: res.stdout ?? '',
      tests: res.tests ?? [],
      passed: res.passed ?? false,
      error: res.error,
    };
  } catch (err) {
    return {
      stdout: '',
      tests: [],
      passed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
