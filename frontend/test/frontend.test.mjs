import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

function createButton(dataset = {}) {
  return {
    dataset,
    disabled: false,
    listeners: {},
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    }
  };
}

function sameContextObject(value) {
  return JSON.parse(JSON.stringify(value));
}

async function createHarness(fetchImpl) {
  const template = await readFile(new URL("app.js.tpl", root), "utf8");
  const renderedSource = template.replace("{{ api_base_url }}", "/api");
  const bookButton = createButton({ path: "/book" });
  const readerButton = createButton({ path: "/reader" });
  const orderButton = createButton({ path: "/order" });
  const createOrderButton = createButton();
  const statusEl = { textContent: "Ready" };
  const endpointEl = { textContent: "No request yet" };
  const resultEl = { textContent: "" };
  const pathButtons = [bookButton, readerButton, orderButton];

  const document = {
    querySelectorAll(selector) {
      assert.equal(selector, "[data-path]");
      return pathButtons;
    },
    querySelector(selector) {
      const elements = {
        "[data-create-order]": createOrderButton,
        "#status": statusEl,
        "#endpoint": endpointEl,
        "#result": resultEl
      };

      return elements[selector];
    }
  };

  const context = {
    document,
    fetch: fetchImpl,
    window: {}
  };

  vm.runInNewContext(renderedSource, context, { filename: "app.js" });

  return {
    buttons: {
      bookButton,
      readerButton,
      orderButton,
      createOrderButton
    },
    elements: {
      statusEl,
      endpointEl,
      resultEl
    },
    window: context.window
  };
}

test("index.html wires the expected API action buttons", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");

  assert.match(html, /<script src="app\.js"><\/script>/);
  assert.match(html, /data-path="\/book"/);
  assert.match(html, /data-path="\/reader"/);
  assert.match(html, /data-path="\/order"/);
  assert.match(html, /data-create-order/);
});

test("app.js template renders syntactically valid browser JavaScript", async () => {
  const template = await readFile(new URL("app.js.tpl", root), "utf8");
  const renderedSource = template.replace("{{ api_base_url }}", "/api");

  assert.match(template, /const API_BASE_URL = "\{\{ api_base_url \}\}";/);
  assert.doesNotThrow(() => new vm.Script(renderedSource, { filename: "app.js" }));
  assert.match(renderedSource, /const API_BASE_URL = "\/api";/);
});

test("Load Books button calls /book and renders success", async () => {
  const calls = [];
  const harness = await createHarness(async (url, options = {}) => {
    calls.push({ url, options });
    return response(200, { service: "book-service", data: [] });
  });

  await harness.buttons.bookButton.listeners.click();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/book");
  assert.deepEqual(sameContextObject(calls[0].options), {});
  assert.equal(harness.elements.statusEl.textContent, "Loaded");
  assert.match(harness.elements.resultEl.textContent, /book-service/);
});

test("Load Readers button calls /reader", async () => {
  const calls = [];
  const harness = await createHarness(async (url, options = {}) => {
    calls.push({ url, options });
    return response(200, { service: "reader-service", data: [] });
  });

  await harness.buttons.readerButton.listeners.click();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/reader");
  assert.deepEqual(sameContextObject(calls[0].options), {});
  assert.equal(harness.elements.statusEl.textContent, "Loaded");
});

test("Load Orders button calls /order", async () => {
  const calls = [];
  const harness = await createHarness(async (url, options = {}) => {
    calls.push({ url, options });
    return response(200, { service: "order-service", data: [] });
  });

  await harness.buttons.orderButton.listeners.click();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/order");
  assert.deepEqual(sameContextObject(calls[0].options), {});
  assert.equal(harness.elements.statusEl.textContent, "Loaded");
});

test("Create Sample Order sends POST /order", async () => {
  const calls = [];
  const harness = await createHarness(async (url, options = {}) => {
    calls.push({ url, options });
    return response(201, {
      service: "order-service",
      data: {
        id: "o-new-001",
        readerId: "r-201",
        bookId: "b-101",
        status: "borrowed"
      }
    });
  });

  await harness.buttons.createOrderButton.listeners.click();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/order");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    readerId: "r-201",
    bookId: "b-101"
  });
  assert.equal(harness.elements.statusEl.textContent, "Created");
  assert.match(harness.elements.resultEl.textContent, /o-new-001/);
});

test("error response is rendered as error", async () => {
  const harness = await createHarness(async () =>
    response(409, {
      service: "order-service",
      error: "book_unavailable"
    })
  );

  await harness.buttons.createOrderButton.listeners.click();

  assert.equal(harness.elements.statusEl.textContent, "Error");
  assert.match(harness.elements.resultEl.textContent, /book_unavailable/);
});

test("stylesheet keeps the primary interaction areas defined", async () => {
  const css = await readFile(new URL("style.css", root), "utf8");

  assert.match(css, /\.actions\s*\{/);
  assert.match(css, /\.result-panel\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
});
