# Frontend

Static Mini Book Hub frontend.

This component is prepared to run as a container for Kubernetes-based deployment. It is not modeled as S3 static hosting in this repo split.

## Container

The placeholder Dockerfile uses nginx and renders `app.js` from `app.js.tpl` with a build-time `API_BASE_URL` argument.
