import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

test("index.html wires the expected API action buttons", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");

  assert.match(html, /<script src="app\.js"><\/script>/);
  assert.match(html, /data-path="\/book"/);
  assert.match(html, /data-path="\/reader"/);
  assert.match(html, /data-path="\/order"/);
});

test("app.js template renders syntactically valid browser JavaScript", async () => {
  const template = await readFile(new URL("app.js.tpl", root), "utf8");
  const renderedSource = template.replace("{{ api_base_url }}", "/api");

  assert.match(template, /const API_BASE_URL = "\{\{ api_base_url \}\}";/);
  assert.doesNotThrow(() => new vm.Script(renderedSource, { filename: "app.js" }));
  assert.match(renderedSource, /const API_BASE_URL = "\/api";/);
});

test("stylesheet keeps the primary interaction areas defined", async () => {
  const css = await readFile(new URL("style.css", root), "utf8");

  assert.match(css, /\.actions\s*\{/);
  assert.match(css, /\.result-panel\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
});
