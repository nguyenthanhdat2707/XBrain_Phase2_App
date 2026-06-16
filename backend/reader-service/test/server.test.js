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

test("GET /reader returns reader data", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/reader"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.service, "reader-service");
    assert.equal(Array.isArray(body.data), true);
    assert.equal(body.data.length, 3);
    assert.deepEqual(Object.keys(body.data[0]).sort(), ["active", "favoriteGenre", "id", "name"]);
  });
});

test("GET /reader/:id returns one reader", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/reader/r-201"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.service, "reader-service");
    assert.deepEqual(body.data, {
      id: "r-201",
      name: "Linh",
      favoriteGenre: "DevOps",
      active: true
    });
  });
});

test("GET /reader/:id returns 404 for an unknown reader", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/reader/r-missing"));
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.service, "reader-service");
    assert.equal(body.error, "reader_not_found");
  });
});

test("GET /reader/:id/status returns active status", async () => {
  await withServer(async (server) => {
    const activeResponse = await fetch(endpoint(server, "/reader/r-201/status"));
    const activeBody = await activeResponse.json();
    const inactiveResponse = await fetch(endpoint(server, "/reader/r-203/status"));
    const inactiveBody = await inactiveResponse.json();

    assert.equal(activeResponse.status, 200);
    assert.deepEqual(activeBody, {
      service: "reader-service",
      readerId: "r-201",
      active: true
    });
    assert.equal(inactiveResponse.status, 200);
    assert.deepEqual(inactiveBody, {
      service: "reader-service",
      readerId: "r-203",
      active: false
    });
  });
});

test("GET /reader/:id/status returns 404 for an unknown reader", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/reader/r-missing/status"));
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.service, "reader-service");
    assert.equal(body.error, "reader_not_found");
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
    assert.equal(body.service, "reader-service");
    assert.match(body.version, /^\d+\.\d+\.\d+$/);
  });
});
