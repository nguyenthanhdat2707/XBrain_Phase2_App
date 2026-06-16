const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;
const readers = require("./data/readers.json");

app.use(cors());
app.use(express.json());

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
