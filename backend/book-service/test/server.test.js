const assert = require("node:assert/strict");
const test = require("node:test");

const app = require("../server");

async function withServer(run) {
  const server = await new Promise((resolve) => {
    const startedServer = app.listen(0, "127.0.0.1", () => resolve(startedServer));
  });

  try {
    return await run(server);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

function endpoint(server, path) {
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Expected the test server to listen on a TCP port.");
  }

  return `http://127.0.0.1:${address.port}${path}`;
}

test("GET /book returns book data", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/book"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.service, "book-service");
    assert.equal(Array.isArray(body.data), true);
    assert.equal(body.data.length, 3);
    assert.deepEqual(Object.keys(body.data[0]).sort(), [
      "author",
      "availableCopies",
      "id",
      "title"
    ]);
  });
});

test("GET /book/:id returns one book", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/book/b-101"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.service, "book-service");
    assert.deepEqual(body.data, {
      id: "b-101",
      title: "Cloud Notes",
      author: "A. Nguyen",
      availableCopies: 3
    });
  });
});

test("GET /book/:id returns 404 for an unknown book", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/book/b-missing"));
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.service, "book-service");
    assert.equal(body.error, "book_not_found");
  });
});

test("GET /book/:id/availability returns availability", async () => {
  await withServer(async (server) => {
    const availableResponse = await fetch(endpoint(server, "/book/b-101/availability"));
    const availableBody = await availableResponse.json();
    const unavailableResponse = await fetch(endpoint(server, "/book/b-102/availability"));
    const unavailableBody = await unavailableResponse.json();

    assert.equal(availableResponse.status, 200);
    assert.deepEqual(availableBody, {
      service: "book-service",
      bookId: "b-101",
      available: true,
      availableCopies: 3
    });
    assert.equal(unavailableResponse.status, 200);
    assert.deepEqual(unavailableBody, {
      service: "book-service",
      bookId: "b-102",
      available: false,
      availableCopies: 0
    });
  });
});

test("GET /book/:id/availability returns 404 for an unknown book", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/book/b-missing/availability"));
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.service, "book-service");
    assert.equal(body.error, "book_not_found");
  });
});

test("health endpoints are available", async () => {
  await withServer(async (server) => {
    const healthResponse = await fetch(endpoint(server, "/healthz"));
    const healthBody = await healthResponse.json();
    const readyResponse = await fetch(endpoint(server, "/readyz"));
    const readyBody = await readyResponse.json();

    assert.equal(healthResponse.status, 200);
    assert.deepEqual(healthBody, { status: "ok" });
    assert.equal(readyResponse.status, 200);
    assert.deepEqual(readyBody, { status: "ready" });
  });
});

test("GET /version returns service version", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/version"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.service, "book-service");
    assert.match(body.version, /^\d+\.\d+\.\d+$/);
  });
});

test("GET /metrics exposes Prometheus metrics", async () => {
  await withServer(async (server) => {
    await fetch(endpoint(server, "/book"));

    const response = await fetch(endpoint(server, "/metrics"));
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/plain/);
    assert.match(body, /mini_book_hub_service_info\{service="book-service"\} 1/);
    assert.match(body, /mini_book_hub_http_requests_total/);
    assert.match(body, /service="book-service"/);
    assert.match(body, /route="\/book"/);
    assert.match(body, /status_code="200"/);
    assert.match(body, /mini_book_hub_http_request_duration_seconds_bucket/);
  });
});
