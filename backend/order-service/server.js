const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

const orders = [
  { id: "o-301", readerId: "r-201", bookId: "b-101", status: "borrowed" },
  { id: "o-302", readerId: "r-202", bookId: "b-102", status: "reserved" },
  { id: "o-303", readerId: "r-203", bookId: "b-103", status: "returned" }
];

app.use(cors());
app.use(express.json());

app.get("/order", (_req, res) => {
  res.json({ service: "order-service", data: orders });
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
