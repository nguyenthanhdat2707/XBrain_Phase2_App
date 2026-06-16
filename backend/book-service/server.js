const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;
const books = require("./data/books.json");

app.use(cors());
app.use(express.json());

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
