const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const ts = require("typescript");

function loadTs(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (name) => dependencies[name] ?? require(name), module, module.exports
  );
  return module.exports;
}

function setup(result) {
  let signal;
  const query = {
    select() { return this; },
    limit() { return this; },
    abortSignal(value) { signal = value; return this; },
    then(resolve, reject) {
      if (result.throws) {
        reject(result.throws);
      } else {
        resolve(result);
      }
    },
  };
  const { GET } = loadTs("app/api/cron/keepalive/route.ts", {
    "@/lib/supabase": { supabaseAdmin: { from: () => query } },
  });
  return {
    get signal() { return signal; },
    run: (headers = {}) =>
      GET(new Request("http://localhost/api/cron/keepalive", { headers })),
  };
}

test("successful cron ping queries database and returns 200", async () => {
  const api = setup({ data: [{ id: "123" }], error: null, status: 200 });
  const response = await api.run();
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.success, true);
  assert.equal(json.rowsFound, 1);
});

test("database query error returns 500", async () => {
  const api = setup({ data: null, error: { code: "57P01", message: "admin shutdown" }, status: 500 });
  const response = await api.run();
  assert.equal(response.status, 500);
  const json = await response.json();
  assert.equal(json.success, false);
  assert.equal(json.code, "57P01");
});

test("CRON_SECRET verification blocks unauthorized calls and allows authorized calls", async () => {
  process.env.CRON_SECRET = "super-secret-token";
  try {
    const api = setup({ data: [{ id: "123" }], error: null, status: 200 });

    // Unauthorized call (no header)
    const unauthorizedRes = await api.run();
    assert.equal(unauthorizedRes.status, 401);

    // Unauthorized call (wrong header)
    const wrongRes = await api.run({ authorization: "Bearer wrong" });
    assert.equal(wrongRes.status, 401);

    // Authorized call
    const authorizedRes = await api.run({ authorization: "Bearer super-secret-token" });
    assert.equal(authorizedRes.status, 200);
    const json = await authorizedRes.json();
    assert.equal(json.success, true);
  } finally {
    delete process.env.CRON_SECRET;
  }
});
