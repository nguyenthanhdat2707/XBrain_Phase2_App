const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

const books = [
  { id: "b-101", title: "Cloud Notes", author: "A. Nguyen" },
  { id: "b-102", title: "Kubernetes Field Guide", author: "M. Tran" },
  { id: "b-103", title: "Terraform Lab Manual", author: "L. Pham" }
];

app.use(cors());
app.use(express.json());

app.get("/book", (_req, res) => {
  res.json({ service: "book-service", data: books });
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
