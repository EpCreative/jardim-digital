# Jardim — local development

- This repository is a static Three.js website. No Node installation or build step is required.
- Fixed development port: **4341**, bound to `127.0.0.1`.
- Inspect `lsof -nP -iTCP:4341 -sTCP:LISTEN` before starting a server. Identify the process and project that own the port.
- Reuse a healthy server belonging to this project; keep its existing session and preview tab.
- Start a missing server with `python3 serve.py` from the repository root.
- The server uses a strict port. Never choose a fallback port or stop another project's process. Report conflicts for the user to resolve.
- Do not inspect or reuse sibling projects unless the user explicitly includes them in scope.
- Vercel serves the static website from this directory using `vercel.json`.
