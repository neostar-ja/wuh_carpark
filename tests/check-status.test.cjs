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

const validation = loadTs("lib/validation.ts", {
  "./provinces": loadTs("lib/provinces.ts"),
});

function setup(result, allowed = true) {
  const filters = [];
  let signal;
  const query = {
    select() { return this; },
    eq(...args) { filters.push(args); return this; },
    abortSignal(value) { signal = value; return this; },
    async maybeSingle() { return result; },
  };
  const { GET } = loadTs("app/api/check-status/route.ts", {
    "@/lib/supabase": { supabaseAdmin: { from: () => query } },
    "@/lib/validation": validation,
    "@/lib/rate-limit": {
      getClientIp: () => "test",
      checkStatusRateLimit: () => ({ allowed, retryAfterSeconds: 60 }),
    },
  });
  return {
    filters,
    get signal() { return signal; },
    run: (params = { plate: "กข1234", phone: "0812345678" }) =>
      GET(new Request("http://localhost/api/check-status?" + new URLSearchParams(params))),
  };
}

test("successful lookup requires plate and phone and sets a deadline", async () => {
  const data = { license_plate: "กข1234", status: "approved" };
  const api = setup({ data, error: null, status: 200 });
  const response = await api.run();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, found: true, data });
  assert.deepEqual(api.filters, [["license_plate", "กข1234"], ["phone_number", "0812345678"]]);
  assert.ok(api.signal instanceof AbortSignal);
});

test("missing record is distinct from database failure", async () => {
  const response = await setup({ data: null, error: null, status: 200 }).run();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, found: false });
});

for (const status of [0, 502, 503, 504]) {
  test(`database transport/upstream failure ${status} returns retryable 503`, async () => {
    const response = await setup({ data: null, error: { code: "", details: "private detail" }, status }).run();
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Retry-After"), "60");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.found, undefined);
    assert.ok(!JSON.stringify(body).includes("private detail"));
  });
}

test("query/schema errors remain server errors", async () => {
  const response = await setup({ data: null, error: { code: "42703" }, status: 400 }).run();
  assert.equal(response.status, 500);
});

test("invalid inputs and rate-limited requests do not query the database", async () => {
  const invalid = setup(null);
  assert.equal((await invalid.run({ plate: "กข1234" })).status, 400);
  assert.deepEqual(invalid.filters, []);
  const limited = setup(null, false);
  assert.equal((await limited.run()).status, 429);
  assert.deepEqual(limited.filters, []);
});
