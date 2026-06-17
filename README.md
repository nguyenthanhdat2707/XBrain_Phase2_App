# Mini Book Hub App

This repo owns application source code and application CI.

It builds frontend and backend service images. It does not own Kubernetes desired state, Argo CD manifests, Terraform, Ansible, or infrastructure bootstrap code.

## Components

- `frontend`: static web frontend prepared to run as a container.
- `backend/book-service`: Node.js API for book data.
- `backend/reader-service`: Node.js API for reader data.
- `backend/order-service`: Node.js API for order data.

## Observability

Backend services expose Prometheus metrics on `/metrics` and `/metric`.

The metrics include:

- `mini_book_hub_service_info`
- `mini_book_hub_http_requests_total`
- `mini_book_hub_http_request_duration_seconds`

## Lifecycle

```text
code -> test -> build image -> push registry
```

The current GitHub Actions workflow implements feature branch CI for basic cleanliness checks. It runs affected component checks and Docker build validation without pushing images or creating official artifacts.

## PR Impact Gate

This workflow tests the merge-result of a PR, runs impact-based checks, builds candidate images from the tested merge-result, pushes immutable GHCR digests, and writes preview metadata to the GitOps repository.

It does not deploy Kubernetes resources. Runtime preview is handled later by the GitOps repo, AppSet, Argo CD, and a smoke Job.
