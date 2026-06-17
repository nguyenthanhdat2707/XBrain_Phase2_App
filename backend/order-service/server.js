const express = require("express");
const cors = require("cors");
const client = require("prom-client");

const app = express();
const port = process.env.PORT || 3000;
const baseOrders = require("./data/orders.json");
const createdOrders = [];
const defaultBookServiceUrl = "http://localhost:3001";
const defaultReaderServiceUrl = "http://localhost:3002";
const serviceName = "order-service";
const metricsRegister = new client.Registry();

metricsRegister.setDefaultLabels({ service: serviceName });
client.collectDefaultMetrics({ register: metricsRegister });

const serviceInfo = new client.Gauge({
  name: "mini_book_hub_service_info",
  help: "Mini Book Hub service availability marker.",
  registers: [metricsRegister]
});

const httpRequestsTotal = new client.Counter({
  name: "mini_book_hub_http_requests_total",
  help: "Total HTTP requests handled by a Mini Book Hub service.",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegister]
});

const httpRequestDuration = new client.Histogram({
  name: "mini_book_hub_http_request_duration_seconds",
  help: "HTTP request duration in seconds for a Mini Book Hub service.",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegister]
});

serviceInfo.set(1);

function routeLabel(req) {
  return req.route?.path ? String(req.route.path) : "unmatched";
}

function metricsMiddleware(req, res, next) {
  if (req.path === "/metrics" || req.path === "/metric") {
    next();
    return;
  }

  const endTimer = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status_code: String(res.statusCode)
    };

    httpRequestsTotal.inc(labels);
    endTimer(labels);
  });

  next();
}

async function metricsHandler(_req, res, next) {
  try {
    res.set("Content-Type", metricsRegister.contentType);
    res.end(await metricsRegister.metrics());
  } catch (error) {
    next(error);
  }
}

function allOrders() {
  return [...baseOrders, ...createdOrders];
}

function dependencyUrl(envName, defaultUrl) {
  return (process.env[envName] || defaultUrl).replace(/\/+$/, "");
}

function orderError(res, status, error, message) {
  res.status(status).json({
    service: "order-service",
    error,
    message
  });
}

async function fetchDependencyJson(url, dependencyName) {
  let response;

  try {
    response = await fetch(url, {
      headers: {
        accept: "application/json"
      }
    });
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: `${dependencyName}_service_failure`,
      message: `${dependencyName}-service request failed: ${error.message}`
    };
  }

  let body;

  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      status: 502,
      error: `${dependencyName}_service_failure`,
      message: `${dependencyName}-service returned invalid JSON.`
    };
  }

  if (response.status === 404) {
    return {
      ok: false,
      status: 404,
      body
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: 502,
      error: `${dependencyName}_service_failure`,
      message: `${dependencyName}-service returned ${response.status}.`
    };
  }

  return {
    ok: true,
    body
  };
}

async function validateReader(readerId) {
  const url = `${dependencyUrl("READER_SERVICE_URL", defaultReaderServiceUrl)}/reader/${encodeURIComponent(
    readerId
  )}/status`;
  const result = await fetchDependencyJson(url, "reader");

  if (!result.ok) {
    if (result.status === 404) {
      return {
        ok: false,
        status: 404,
        error: "reader_not_found",
        message: `Reader ${readerId} was not found.`
      };
    }

    return result;
  }

  if (typeof result.body.active !== "boolean") {
    return {
      ok: false,
      status: 502,
      error: "reader_service_failure",
      message: "reader-service returned an invalid status contract."
    };
  }

  if (!result.body.active) {
    return {
      ok: false,
      status: 409,
      error: "reader_inactive",
      message: `Reader ${readerId} is inactive.`
    };
  }

  return { ok: true };
}

async function validateBook(bookId) {
  const url = `${dependencyUrl("BOOK_SERVICE_URL", defaultBookServiceUrl)}/book/${encodeURIComponent(
    bookId
  )}/availability`;
  const result = await fetchDependencyJson(url, "book");

  if (!result.ok) {
    if (result.status === 404) {
      return {
        ok: false,
        status: 404,
        error: "book_not_found",
        message: `Book ${bookId} was not found.`
      };
    }

    return result;
  }

  if (
    typeof result.body.available !== "boolean" ||
    typeof result.body.availableCopies !== "number"
  ) {
    return {
      ok: false,
      status: 502,
      error: "book_service_failure",
      message: "book-service returned an invalid availability contract."
    };
  }

  if (!result.body.available) {
    return {
      ok: false,
      status: 409,
      error: "book_unavailable",
      message: `Book ${bookId} has no available copies.`
    };
  }

  return { ok: true };
}

app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.get(["/metrics", "/metric"], metricsHandler);

app.get("/order", (_req, res) => {
  res.json({ service: "order-service", data: allOrders() });
});

app.get("/order/:id", (req, res) => {
  const order = allOrders().find((item) => item.id === req.params.id);

  if (!order) {
    res.status(404).json({
      service: "order-service",
      error: "order_not_found",
      message: `Order ${req.params.id} was not found.`
    });
    return;
  }

  res.json({ service: "order-service", data: order });
});

app.post("/order", async (req, res) => {
  const { readerId, bookId } = req.body || {};

  if (!readerId) {
    orderError(res, 400, "reader_id_required", "readerId is required.");
    return;
  }

  if (!bookId) {
    orderError(res, 400, "book_id_required", "bookId is required.");
    return;
  }

  const readerValidation = await validateReader(readerId);

  if (!readerValidation.ok) {
    orderError(res, readerValidation.status, readerValidation.error, readerValidation.message);
    return;
  }

  const bookValidation = await validateBook(bookId);

  if (!bookValidation.ok) {
    orderError(res, bookValidation.status, bookValidation.error, bookValidation.message);
    return;
  }

  const order = {
    id: `o-new-${String(createdOrders.length + 1).padStart(3, "0")}`,
    readerId,
    bookId,
    status: "borrowed"
  };

  createdOrders.push(order);
  res.status(201).json({ service: "order-service", data: order });
});

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/readyz", (_req, res) => {
  res.json({ status: "ready" });
});

app.get("/version", (_req, res) => {
  res.json({ service: "order-service", version: "1.0.0" });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`order-service listening on ${port}`);
  });
}

module.exports = app;
