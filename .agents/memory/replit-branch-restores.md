---
name: Replit branch restores
description: Restoring a non-artifact app branch after Replit artifact workflows were active.
---

When switching away from artifact-backed workspaces to a regular app branch, stop leftover artifact dev processes and remove the old generated artifact directories before fixing the target branch's `.replit` port map.

**Why:** Stale artifact processes and their port registrations can persist after switching branches and make the restored app's preview point to the wrong service.

**How to apply:** Before testing or publishing a restored non-artifact branch, check for leftover artifact services and verify `.replit` maps the original app port.

Do not assume a successful `.replit` validation updates the active Networking mapping. Platform port state can restore an older mapping even after artifact processes and directories are removed.

**Why:** The Next.js server responded correctly on port 5000, while the public preview returned 502 and Replit repeatedly restored port 3000 as the external-80 target.

**How to apply:** Compare local and public HTTP responses. Normalize the preview to one port-5000-to-external-80 mapping rather than changing application code or repeatedly restarting the server.

Treat an HTTP 401 with Shelf's Basic-auth challenge as the expected healthy response for an unauthenticated private preview, not as an application failure. Avoid requiring a successful root-page response in the preview workflow's readiness wait.

**Why:** A workflow reported a port-opening timeout despite Next.js reporting ready. Removing its readiness wait and keeping the single correct port mapping produced a running workflow and the expected public password challenge without changing the app or adding a proxy.

**How to apply:** For this protected preview, keep the webview server on port 5000 without a workflow `waitForPort`. Confirm the public preview returns the Shelf authentication challenge rather than a 502. Do not remove password protection to satisfy readiness checks.
