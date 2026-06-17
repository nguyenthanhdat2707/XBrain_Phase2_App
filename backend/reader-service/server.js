const express = require("express");
const cors = require("cors");
const client = require("prom-client");

const app = express();
const port = process.env.PORT || 3000;
const readers = require("./data/readers.json");
const serviceName = "reader-service";
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

app.get("/reader", (_req, res) => {
  res.json({ service: "reader-service", data: readers });
});

app.get("/reader/:id", (req, res) => {
  const reader = readers.find((item) => item.id === req.params.id);

  if (!reader) {
    res.status(404).json({
      service: "reader-service",
      error: "reader_not_found",
      message: `Reader ${req.params.id} was not found.`
    });
    return;
  }

  res.json({ service: "reader-service", data: reader });
});

app.get("/reader/:id/status", (req, res) => {
  const reader = readers.find((item) => item.id === req.params.id);

  if (!reader) {
    res.status(404).json({
      service: "reader-service",
      error: "reader_not_found",
      message: `Reader ${req.params.id} was not found.`
    });
    return;
  }

  res.json({
    service: "reader-service",
    readerId: reader.id,
    active: reader.active
  });
});

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/readyz", (_req, res) => {
  res.json({ status: "ready" });
});

app.get("/version", (_req, res) => {
  res.json({ service: "reader-service", version: "1.0.0" });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`reader-service listening on ${port}`);
  });
}

module.exports = app;
