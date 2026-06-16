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

async function postJson(server, path, body) {
  return fetch(endpoint(server, path), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

test("GET /order returns order data", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/order"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.service, "order-service");
    assert.equal(Array.isArray(body.data), true);
    assert.equal(body.data.length >= 3, true);
    assert.deepEqual(Object.keys(body.data[0]).sort(), ["bookId", "id", "readerId", "status"]);
  });
});

test("GET /order/:id returns one order", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/order/o-301"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.service, "order-service");
    assert.deepEqual(body.data, {
      id: "o-301",
      readerId: "r-201",
      bookId: "b-101",
      status: "borrowed"
    });
  });
});

test("GET /order/:id returns 404 for an unknown order", async () => {
  await withServer(async (server) => {
    const response = await fetch(endpoint(server, "/order/o-missing"));
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.service, "order-service");
    assert.equal(body.error, "order_not_found");
  });
});

test("POST /order creates an in-memory order for a valid request", async () => {
  await withServer(async (server) => {
    const response = await postJson(server, "/order", {
      readerId: "r-201",
      bookId: "b-101"
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.service, "order-service");
    assert.match(body.data.id, /^o-new-\d{3}$/);
    assert.equal(body.data.readerId, "r-201");
    assert.equal(body.data.bookId, "b-101");
    assert.equal(body.data.status, "borrowed");
  });
});

test("POST /order fails when readerId is missing", async () => {
  await withServer(async (server) => {
    const response = await postJson(server, "/order", { bookId: "b-101" });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "reader_id_required");
  });
});

test("POST /order fails when bookId is missing", async () => {
  await withServer(async (server) => {
    const response = await postJson(server, "/order", { readerId: "r-201" });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "book_id_required");
  });
});

test("POST /order fails when reader does not exist", async () => {
  await withServer(async (server) => {
    const response = await postJson(server, "/order", {
      readerId: "r-missing",
      bookId: "b-101"
    });
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error, "reader_not_found");
  });
});

test("POST /order fails when book does not exist", async () => {
  await withServer(async (server) => {
    const response = await postJson(server, "/order", {
      readerId: "r-201",
      bookId: "b-missing"
    });
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error, "book_not_found");
  });
});

test("POST /order fails when reader is inactive", async () => {
  await withServer(async (server) => {
    const response = await postJson(server, "/order", {
      readerId: "r-203",
      bookId: "b-101"
    });
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.error, "reader_inactive");
  });
});

test("POST /order fails when book has no available copies", async () => {
  await withServer(async (server) => {
    const response = await postJson(server, "/order", {
      readerId: "r-201",
      bookId: "b-102"
    });
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.error, "book_unavailable");
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
    assert.equal(body.service, "order-service");
    assert.match(body.version, /^\d+\.\d+\.\d+$/);
  });
});
