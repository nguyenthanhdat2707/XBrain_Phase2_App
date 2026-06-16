const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

const readers = [
  { id: "r-201", name: "Linh", favoriteGenre: "DevOps" },
  { id: "r-202", name: "Minh", favoriteGenre: "Systems" },
  { id: "r-203", name: "An", favoriteGenre: "Architecture" }
];

app.use(cors());
app.use(express.json());

app.get("/reader", (_req, res) => {
  res.json({ service: "reader-service", data: readers });
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
