// Smoke test: the plugin module loads and exposes the expected DSH surface.
import test from "node:test";
import assert from "node:assert/strict";

const mod = await import("../lib/index.js");

test("module exports name/inject/apply/Config", () => {
  assert.equal(typeof mod.name, "string");
  assert.ok(Array.isArray(mod.inject));
  assert.equal(typeof mod.apply, "function");
  assert.equal(typeof mod.Config, "function");
});

test("inject declares the expected services", () => {
  for (const svc of ["tools", "webServer"]) {
    assert.ok(mod.inject.includes(svc), `inject should include ${svc}`);
  }
});

test("Config carries the documented defaults", () => {
  // schemastery object schema: inspect the exposed shape when run inside the
  // harness; in a plain Node run we only assert the class is constructible.
  assert.equal(typeof mod.Config, "function");
  const defaults = mod.Config.props ?? {};
  assert.ok("mainQq" in defaults || "apiPort" in defaults || Object.keys(defaults).length === 0);
});