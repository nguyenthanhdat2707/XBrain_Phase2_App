# Mini Book Hub App

This repo owns application source code and application CI.

It builds frontend and backend service images. It does not own Kubernetes desired state, Argo CD manifests, Terraform, Ansible, or infrastructure bootstrap code.

## Components

- `frontend`: static web frontend prepared to run as a container.
- `backend/book-service`: Node.js API for book data.
- `backend/reader-service`: Node.js API for reader data.
- `backend/order-service`: Node.js API for order data.

## Lifecycle

```text
code -> test -> build image -> push registry
```

The current GitHub Actions workflow implements feature branch CI for basic cleanliness checks. It runs affected component checks and Docker build validation without pushing images or creating official artifacts.
