const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;
const baseOrders = require("./data/orders.json");
const books = require("./data/books.json");
const readers = require("./data/readers.json");
const createdOrders = [];

function allOrders() {
  return [...baseOrders, ...createdOrders];
}

app.use(cors());
app.use(express.json());

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

app.post("/order", (req, res) => {
  const { readerId, bookId } = req.body || {};

  if (!readerId) {
    res.status(400).json({
      service: "order-service",
      error: "reader_id_required",
      message: "readerId is required."
    });
    return;
  }

  if (!bookId) {
    res.status(400).json({
      service: "order-service",
      error: "book_id_required",
      message: "bookId is required."
    });
    return;
  }

  const reader = readers.find((item) => item.id === readerId);

  if (!reader) {
    res.status(404).json({
      service: "order-service",
      error: "reader_not_found",
      message: `Reader ${readerId} was not found.`
    });
    return;
  }

  if (!reader.active) {
    res.status(409).json({
      service: "order-service",
      error: "reader_inactive",
      message: `Reader ${readerId} is inactive.`
    });
    return;
  }

  const book = books.find((item) => item.id === bookId);

  if (!book) {
    res.status(404).json({
      service: "order-service",
      error: "book_not_found",
      message: `Book ${bookId} was not found.`
    });
    return;
  }

  if (book.availableCopies <= 0) {
    res.status(409).json({
      service: "order-service",
      error: "book_unavailable",
      message: `Book ${bookId} has no available copies.`
    });
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
