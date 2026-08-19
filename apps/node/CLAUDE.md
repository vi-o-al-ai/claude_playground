# Node Apps

Non-browser Node.js apps. These may run headless in CI (e.g., scheduled GitHub Actions workflows) rather than serving a UI. No Vite build step, and no `arcade` metadata — they are not deployed and never appear on the hub.

Any `workflow.example.yml` here is a template meant to be copied into a **separate** repo; it is not a workflow this repo runs. The root `ci-web.yml` still lints and tests these packages like every other workspace.
