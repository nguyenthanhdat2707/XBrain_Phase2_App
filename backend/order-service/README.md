# Order Service

Node.js API service for Mini Book Hub order data.

## Local Run

```bash
npm install
npm start
```

The service listens on `PORT`, defaulting to `3000`.

## Service Dependencies

`order-service` owns order data only. It validates reader and book state through public service APIs:

```text
GET ${READER_SERVICE_URL}/reader/:id/status
GET ${BOOK_SERVICE_URL}/book/:id/availability
```

Local defaults:

```text
BOOK_SERVICE_URL=http://localhost:3001
READER_SERVICE_URL=http://localhost:3002
```
