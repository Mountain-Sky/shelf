# Private demo on Replit

Import `Mountain-Sky/shelf` from GitHub, selecting `main`. No Cloudflare account, tunnel, separate VM, AI key or live ILS credentials are required. Replit deployment charges may apply; review its current pricing in your account.

## Configure and run

1. Import the repository into Replit. The `.replit` file selects Node 22, a development Run command, and a Reserved VM deployment. If the UI asks for configuration, select **Reserved VM**, use build command `npm ci --include=dev && npm run build`, and run command `npm run replit:start`. Do not select Static or Autoscale for this version.
2. Add `DEMO_ACCESS_PASSWORD` in Replit Secrets: a unique random password of at least 16 characters. The username is `reviewer`. Configure the secret for the deployment as well as the development workspace; verify it is included in deployment settings. Never commit its value.
3. Set `SHELF_PUBLIC_ORIGIN` to the exact assigned deployment HTTPS origin, for example `https://your-app.replit.app`, without a path or trailing slash. Use the URL Replit actually assigns. For development, use the workspace preview's origin instead; when omitted in development only, the launcher derives it from `REPLIT_DEV_DOMAIN`.
4. Run `npm ci` in the workspace before pressing Run. Publish the Reserved VM with the build/run commands above. The launcher binds Shelf to `0.0.0.0`, honors `PORT` (default 3000), enforces the password gate and disables diagnostics. Only the web port should be mapped externally. The catalog stays on internal loopback port 4310.
5. Before inviting anyone, open the deployed URL in a private browser window. It must require authentication. Sign in as `reviewer`, search for “Project Hail Mary,” select a branch, try “Only audiobooks,” compare titles and save a reading list. An anonymous POST to `/api/chat` must return 401. Cross-origin API requests must be denied. Share the password separately from the link.

Missing or short passwords and missing/invalid public origins stop the Replit launcher before it opens a listener. If search returns 403, verify that `SHELF_PUBLIC_ORIGIN` exactly matches the URL in the browser and restart/redeploy. Replit's own publishing/network checks must be verified in your account; do not disable the access gate to pass a platform check. If a publishing health check requires an unauthenticated endpoint, configure a dedicated readiness check before publishing rather than exposing discovery.

## Demo state and updates

`replit:start` intentionally resets synthetic holdings to the committed fixtures on **every startup**, including restarts and redeployments. Replit deployment files are not treated as durable storage. Stock changes are temporary within that running instance. Conversational sessions also expire on restart; reading lists are browser-memory only. This is appropriate for review, not durable user data. Add a database/object store before promising persistent stock edits or user lists.

The catalog is the same independent HTTP simulator used locally: 32 works / 44 records with synthetic holdings. It is not Koha or CARL•X. No patron accounts or holds are enabled.

Continue coding through GitHub feature branches and reviewed updates to `main`. Pull the latest `main` into the Replit workspace and explicitly redeploy; do not assume a GitHub push automatically updates the deployed app. Keep Secrets in Replit, not Git. Do not make simultaneous uncommitted edits in Replit and another checkout without reconciling them first.

Local production/build/browser checks validate the application and launcher. Actual Replit deployment, assigned URL, secret propagation, restart behavior and private access require a final smoke test in the Replit account.
