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
    assert.deepEqual(Object.keys(body.data[0]).sort(), ["favoriteGenre", "id", "name"]);
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
