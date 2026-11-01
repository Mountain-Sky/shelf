---
name: Replit branch restores
description: Restoring a non-artifact app branch after Replit artifact workflows were active.
---

When switching away from artifact-backed workspaces to a regular app branch, stop leftover artifact dev processes and remove the old generated artifact directories before fixing the target branch's `.replit` port map.

**Why:** Stale artifact processes and their port registrations can persist after switching branches and make the restored app's preview point to the wrong service.

**How to apply:** Before testing or publishing a restored non-artifact branch, check for leftover artifact services and verify `.replit` maps the original app port.
