/// <reference lib="webworker" />
export {}; // marker — plik jest modułem (izolowany scope, brak kolizji z pyodide-worker.ts)

// JavaScript runner w Web Worker. Worker scope sam w sobie sandboxed (no DOM, no localStorage),
// więc używamy Function constructor + przechwycenie console.log dla stdout.
// Brak modulów ES (require/import nie działa), brak fetch — to feature, nie bug.

const ctx = self as unknown as DedicatedWorkerGlobalScope & typeof globalThis;

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

interface TestResult {
  name: string;
  passed: boolean;
  message: string | null;
}

/**
 * Wykonuje kod usera z przechwyconym console.* + zwraca stdout. NIE rzuca — łapiemy błąd
 * i zwracamy razem z dotychczasowym stdout (żeby user zobaczył partial output).
 */
function runWithCapturedStdout(code: string, extraScope: Record<string, unknown> = {}):
  { stdout: string; error: string | null; scope: Record<string, unknown> } {
  const lines: string[] = [];
  const fakeConsole = {
    log: (...args: unknown[]) => lines.push(args.map(formatArg).join(' ')),
    error: (...args: unknown[]) => lines.push(args.map(formatArg).join(' ')),
    warn: (...args: unknown[]) => lines.push(args.map(formatArg).join(' ')),
    info: (...args: unknown[]) => lines.push(args.map(formatArg).join(' ')),
  };

  // Scope wraps user code w closure żeby zmienne nie ladowały się w globalThis.
  const scopeKeys = ['console', ...Object.keys(extraScope)];
  const scopeVals = [fakeConsole, ...Object.values(extraScope)];

  // Capture vars zadeklarowane przez usera — wystawiamy je przez return obiektu.
  const wrapped = `
    "use strict";
    ${code}
    return (typeof __captureVars__ === 'function') ? __captureVars__() : {};
  `;

  let error: string | null = null;
  let scope: Record<string, unknown> = {};
  try {
    const fn = new Function(...scopeKeys, wrapped);
    const ret = fn(...scopeVals);
    if (ret && typeof ret === 'object') scope = ret as Record<string, unknown>;
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  return { stdout: lines.join('\n'), error, scope };
}

function formatArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

ctx.onmessage = (ev: MessageEvent<InMsg>) => {
  const { id } = ev.data;

  if (ev.data.type === 'run') {
    const { stdout, error } = runWithCapturedStdout(ev.data.code);
    ctx.postMessage({ id, ok: error === null, stdout, error });
    return;
  }

  if (ev.data.type === 'submit') {
    const { stdout, error: runError, scope } = runWithCapturedStdout(ev.data.code);
    if (runError) {
      ctx.postMessage({ id, ok: false, stdout, error: runError });
      return;
    }

    // Testy: wywołuj funkcje zaczynające się od test_; dostają (stdout, scope) jako argumenty.
    // Konwencja: testy używają chai-like assert.equal albo throw 'msg' albo console.assert.
    const tests: TestResult[] = [];
    const testHelpers = `
      function assertEqual(a, b, msg) {
        if (a !== b) throw new Error(msg || \`Expected \${JSON.stringify(b)} but got \${JSON.stringify(a)}\`);
      }
      function assertContains(haystack, needle, msg) {
        if (typeof haystack !== 'string' || haystack.indexOf(needle) < 0)
          throw new Error(msg || \`Expected to contain \${JSON.stringify(needle)} but stdout=\${JSON.stringify(haystack)}\`);
      }
      function assertTrue(v, msg) { if (!v) throw new Error(msg || 'Expected truthy'); }
    `;

    // Funkcje testowe i scope kombinujemy w jednym wywołaniu Function żeby user-code był dostępny.
    const testWrapped = `
      "use strict";
      ${testHelpers}
      ${ev.data.code}
      ${ev.data.testsCode}
      const __results = [];
      for (const __name of Object.getOwnPropertyNames(this).concat(Object.keys(globalThis))) {
        // skip — nie iterujemy globalThis dla bezpieczeństwa, używamy detected vars
      }
      // Detection: parsujemy nazwy funkcji test_* z testsCode prostym regexem.
      const __testNames = ${JSON.stringify(extractTestNames(ev.data.testsCode))};
      for (const __n of __testNames) {
        try {
          const __fn = eval(__n);
          if (typeof __fn !== 'function') {
            __results.push({ name: __n, passed: false, message: 'not a function' });
            continue;
          }
          __fn(__stdout__, __scope__);
          __results.push({ name: __n, passed: true, message: null });
        } catch (e) {
          __results.push({ name: __n, passed: false, message: e && e.message ? e.message : String(e) });
        }
      }
      return __results;
    `;

    try {
      const fn = new Function('__stdout__', '__scope__', 'console', testWrapped);
      // console no-op podczas test-runa (testy nie powinny śmiecić w stdout)
      const noopConsole = { log: () => {}, error: () => {}, warn: () => {}, info: () => {} };
      const result = fn(stdout, scope, noopConsole) as TestResult[];
      tests.push(...result);
    } catch (e) {
      ctx.postMessage({
        id,
        ok: false,
        stdout,
        error: e instanceof Error ? e.message : String(e),
      });
      return;
    }

    const passed = tests.length > 0 && tests.every((t) => t.passed);
    ctx.postMessage({ id, ok: true, stdout, tests, passed });
  }
};

/**
 * Prosty regex parsing — wyciąga `function test_xxx(...)` i `const test_xxx = ` z kodu testów.
 * Brzydkie, ale wystarczy: kod testów jest zaufany (autora kursu, nie usera).
 */
function extractTestNames(code: string): string[] {
  const names = new Set<string>();
  const fnRe = /function\s+(test_[A-Za-z0-9_]+)\s*\(/g;
  const constRe = /(?:const|let|var)\s+(test_[A-Za-z0-9_]+)\s*=/g;
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(code))) names.add(m[1]);
  while ((m = constRe.exec(code))) names.add(m[1]);
  return [...names];
}
