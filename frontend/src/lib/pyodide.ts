/**
 * Pyodide loader. Pyodide ładujemy z CDN przez script tag, żeby nie pakować
 * ~10MB do bundla. `loadPyodide` jest globalne po załadowaniu skryptu.
 *
 * Implementacja runnera (z timeoutem przez Web Worker) — w kolejnym kroku.
 */

declare global {
  interface Window {
    loadPyodide?: (config?: { indexURL?: string }) => Promise<PyodideInstance>;
  }
}

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>;
  runPython: (code: string) => unknown;
  globals: { get: (name: string) => unknown };
}

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full`;

let pyodidePromise: Promise<PyodideInstance> | null = null;

export async function getPyodide(): Promise<PyodideInstance> {
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = (async () => {
    if (typeof window.loadPyodide !== 'function') {
      await loadScript(`${PYODIDE_URL}/pyodide.js`);
    }
    if (typeof window.loadPyodide !== 'function') {
      throw new Error('Pyodide failed to load');
    }
    return window.loadPyodide({ indexURL: `${PYODIDE_URL}/` });
  })();

  return pyodidePromise;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export async function runPython(code: string): Promise<{ stdout: string; error?: string }> {
  const py = await getPyodide();
  let buffer = '';
  try {
    py.runPython(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = sys.stdout
`);
    await py.runPythonAsync(code);
    buffer = String(py.runPython('sys.stdout.getvalue()') ?? '');
    return { stdout: buffer };
  } catch (err) {
    return { stdout: buffer, error: err instanceof Error ? err.message : String(err) };
  }
}
