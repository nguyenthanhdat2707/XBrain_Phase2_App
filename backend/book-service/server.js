const express = require("express");
const cors = require("cors");
const client = require("prom-client");

const app = express();
const port = process.env.PORT || 3000;
const books = require("./data/books.json");
const serviceName = "book-service";
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

app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.get(["/metrics", "/metric"], metricsHandler);

app.get("/book", (_req, res) => {
  res.json({ service: "book-service", data: books });
});

app.get("/book/:id", (req, res) => {
  const book = books.find((item) => item.id === req.params.id);

  if (!book) {
    res.status(404).json({
      service: "book-service",
      error: "book_not_found",
      message: `Book ${req.params.id} was not found.`
    });
    return;
  }

  res.json({ service: "book-service", data: book });
});

app.get("/book/:id/availability", (req, res) => {
  const book = books.find((item) => item.id === req.params.id);

  if (!book) {
    res.status(404).json({
      service: "book-service",
      error: "book_not_found",
      message: `Book ${req.params.id} was not found.`
    });
    return;
  }

  res.json({
    service: "book-service",
    bookId: book.id,
    available: book.availableCopies > 0,
    availableCopies: book.availableCopies
  });
});

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/readyz", (_req, res) => {
  res.json({ status: "ready" });
});

app.get("/version", (_req, res) => {
  res.json({ service: "book-service", version: "1.0.0" });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`book-service listening on ${port}`);
  });
}

module.exports = app;
