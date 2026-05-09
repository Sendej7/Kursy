/// <reference lib="webworker" />

// W workerze `self` jest globalnym DedicatedWorkerGlobalScope — alias dla wygodnego typu.
const ctx = self as unknown as DedicatedWorkerGlobalScope & typeof globalThis;

interface LoadPyodideFn {
  (config?: { indexURL?: string }): Promise<PyodideInstance>;
}

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>;
  runPython: (code: string) => unknown;
  globals: { get: (name: string) => unknown };
}

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full`;

let pyodideReady: Promise<PyodideInstance> | null = null;

function loadPyodide(): Promise<PyodideInstance> {
  if (pyodideReady) return pyodideReady;
  pyodideReady = (async () => {
    importScripts(`${PYODIDE_BASE}/pyodide.js`);
    const fn = (self as unknown as { loadPyodide: LoadPyodideFn }).loadPyodide;
    return fn({ indexURL: `${PYODIDE_BASE}/` });
  })();
  return pyodideReady;
}

interface RunMsg {
  type: 'run';
  id: string;
  code: string;
}

interface SubmitMsg {
  type: 'submit';
  id: string;
  code: string;
  testsCode: string;
}

type InMsg = RunMsg | SubmitMsg;

ctx.onmessage = async (ev: MessageEvent<InMsg>) => {
  const { id } = ev.data;
  try {
    const py = await loadPyodide();

    if (ev.data.type === 'run') {
      py.runPython(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = sys.stdout
`);
      try {
        await py.runPythonAsync(ev.data.code);
        const stdout = String(py.runPython('sys.stdout.getvalue()') ?? '');
        ctx.postMessage({ id, ok: true, stdout });
      } catch (err) {
        const stdout = String(py.runPython('sys.stdout.getvalue()') ?? '');
        ctx.postMessage({
          id,
          ok: false,
          stdout,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (ev.data.type === 'submit') {
      py.runPython(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = sys.stdout
`);
      try {
        await py.runPythonAsync(ev.data.code);
        const stdout = String(py.runPython('sys.stdout.getvalue()') ?? '');

        const testRunner = `
${ev.data.testsCode}

import inspect, json
results = []
for name, fn in list(globals().items()):
    if name.startswith("test_") and callable(fn):
        try:
            params = inspect.signature(fn).parameters
            args = []
            for p in params:
                if p == "stdout":
                    args.append(${JSON.stringify(stdout)})
                elif p == "locals_":
                    args.append({k: globals()[k] for k in globals() if not k.startswith("__")})
                else:
                    args.append(None)
            fn(*args)
            results.append({"name": name, "passed": True, "message": None})
        except AssertionError as e:
            results.append({"name": name, "passed": False, "message": str(e) or "AssertionError"})
        except Exception as e:
            results.append({"name": name, "passed": False, "message": f"{type(e).__name__}: {e}"})
import json as _json
_json.dumps(results)
`;
        const testsJson = await py.runPythonAsync(testRunner);
        const tests = JSON.parse(String(testsJson));
        const passed = tests.length > 0 && tests.every((t: { passed: boolean }) => t.passed);
        ctx.postMessage({ id, ok: true, stdout, tests, passed });
      } catch (err) {
        const stdout = String(py.runPython('sys.stdout.getvalue()') ?? '');
        ctx.postMessage({
          id,
          ok: false,
          stdout,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch (err) {
    ctx.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
