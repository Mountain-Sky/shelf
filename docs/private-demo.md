# Private reviewer demo

Shelf now supports a complete local demonstration with an independent HTTP catalog simulator, persistent synthetic stock, visual discovery, edition details, comparisons and temporary reading lists. The simulator is **not Koha and not CARL•X**. Every extra edition/extent/holding is test data. Live ILS mappings and unrestricted semantic readers' advisory remain separate work.

## Fast start: macOS, Windows or Linux

Install Node.js 24 LTS, then:

```sh
npm ci
npm run demo
```

Open the local application on port 3000 in your browser. This single command starts the separate catalog simulator on loopback port 4310 and the Shelf development application on loopback port 3000. Ctrl+C stops both. Nothing is publicly exposed. No API key is required.

For the production build:

```sh
npm run build
npm run demo:start
```

The state file `.local/catalog.json` is ignored by Git and survives restart. Ordinary startup does not reset your test stock. See [catalog sandbox](catalog-sandbox.md) for stock-management commands. For example:

```sh
npm run catalog:set-stock -- --record demo-1 --branch RUST --copies 3
```

Search for Project Hail Mary at Rust again to observe the changed print holding. `npm run catalog:reset` restores fixture stock explicitly. This simulates catalog changes, not patron circulation.

## Walkthrough for reviewers

1. Explore the initial visual collection. Select a branch and a format.
2. Search for a known title, then use **More like this** to explore related catalog records.
3. Try “I loved Project Hail Mary but want something less technical, preferably available at Rust.” The seed must come from the catalog; uncertainty about technical difficulty remains visible.
4. Refine with “Only audiobooks,” “Actually nonfiction,” or a page limit. Supported strict constraints remain in effect until changed.
5. Compare titles and examine edition-specific availability. Add a few to a temporary reading list, remove a title, and copy the list.
6. Change synthetic stock with the CLI, then requery Shelf. The application reads holdings through the separate service.
7. Inspect the engine locally with `SHELF_INSPECTOR=1`; restart after changing configuration. Diagnostics are disabled by default for reviewers and omit request text.

The available fixture catalog is curated and finite. Unknown availability is not zero, and no recommendation should imply that the sample collection represents LCPL.

## Private hosting package

The `Dockerfile` builds a single Node container running the production app and internal catalog service. `compose.yaml` exposes the app on the host's loopback only, persists catalog state in a named volume, and enables the reviewer access gate. The catalog service is never exposed outside the container.

Supply a random `DEMO_ACCESS_PASSWORD` of at least 16 characters through your hosting secret manager or local shell environment; never commit it. The reviewer username is `reviewer`. A missing/short password fails closed. This is a shared demo password, not individual invitations or patron authentication.

```sh
docker compose up --build -d
```

The same command works from PowerShell once the environment variable is set. To change the running container’s stock, use `docker compose exec shelf npm run catalog:set-stock -- --record demo-1 --branch RUST --copies 3`; the command uses the same `/data/catalog.json` volume as the live service. Use `docker compose down` to stop; do not add `-v` unless you intend to discard synthetic stock.

To give reviewers an external private link, run one replica on a persistent Node/container host behind HTTPS, or connect the loopback port through an authenticated tunnel. Set `SHELF_PUBLIC_ORIGIN` to the exact external HTTPS origin so browser API requests pass origin checks. Put the reviewer password in secure environment settings. Do not expose plain HTTP with Basic credentials over the Internet. Prefer a host-level identity-aware access policy in addition to the built-in demo gate when available.

## Why not deploy directly to Vercel or Cloudflare Workers today?

The current engine uses short-lived process-local sessions, and the demo stock lives in a local file. Serverless instances do not share either. A direct deployment could lose refinements between requests or discard stock changes. A single persistent container is the suitable private-demo target. Vercel would need a shared ephemeral session store and a separately hosted catalog; Cloudflare Workers would additionally need its Next.js/runtime adapter validated. Neither migration is necessary to review the demo.

This repository includes deployment preparation, not an active hosted URL or account. A hosting account/project, secure secret entry and HTTPS endpoint are required to publish a durable private link. The coding environment is not a promised permanent host. No public deployment or live patron interaction is performed by these scripts.

### Restricted build environments

The Docker build supports an optional BuildKit secret named `build_ca` for a trusted organization CA bundle. In environments that require an outbound proxy, forward the standard HTTP_PROXY/HTTPS_PROXY/NO_PROXY build arguments and supply the trusted CA file using `--secret id=build_ca,src=...`. This affects dependency installation only; the CA secret is not stored in the image. Ordinary hosts do not need this option. TLS and lockfile integrity checks remain enabled.

## Cloudflare Tunnel with invited reviewers

Use a named Cloudflare Tunnel on your own machine, with a hostname in a domain managed by your Cloudflare account. The recommended layout is:

```text
Invited reviewer → HTTPS → Cloudflare Access email allowlist
    → named Tunnel → host cloudflared → 127.0.0.1:3000 Shelf
    → internal catalog simulator (loopback only)
```

1. In Cloudflare Zero Trust, create a **self-hosted Access application** for the exact intended hostname (for example, `shelf-demo.example.com`). Add an Allow policy for the specific invited email addresses and an identity provider or email one-time PIN. Do not add an Everyone, Bypass, or public policy. Configure this before publishing the tunnel hostname.
2. On the host, install Node 24 LTS and dependencies with `npm ci`, then run `npm run build`. Docker is optional. Keep this as a single running instance because conversational sessions are held in memory.
3. Configure the production process using the shell examples below. Choose a random reviewer password of at least 16 characters, stored in your password manager. Replace the example hostname with your own. Keep `SHELF_INSPECTOR=0` for reviewers.
4. Start Shelf with `npm run demo:start`. In a separate terminal, verify an unauthenticated request to the local app receives **401**. A **503** means the private password configuration is missing or too short. Log in locally using username `reviewer` and your password, and confirm search works before connecting the tunnel.
5. In Cloudflare's tunnel dashboard, create or select a named tunnel and install/run its connector on the **same host** using Cloudflare's OS-specific instructions. Keep the connector token private. Configure the published application route for the chosen hostname with service type **HTTP** and URL **127.0.0.1:3000**. Do not publish port 4310. These instructions assume cloudflared runs on the host, not in a separate container.
6. Test the HTTPS hostname in a signed-out browser: Cloudflare Access must challenge the visitor, an uninvited account must be denied, and an invited account must reach the additional Shelf password gate. Then test search, branch changes, similarity, and reading lists. Only after those checks should you send the link and share the demo password through a separate secure channel.
7. Keep the host awake and both processes running, or install them as managed services. Stop the tunnel or remove its route to withdraw access. Remove expired reviewer emails from the Access policy.

macOS/Linux (Bash, password entry is hidden):

```bash
export SHELF_ACCESS=private
export SHELF_PUBLIC_ORIGIN=https://shelf-demo.example.com
export SHELF_INSPECTOR=0
read -r -s -p 'Reviewer password: ' DEMO_ACCESS_PASSWORD
export DEMO_ACCESS_PASSWORD
npm run demo:start
```

Windows PowerShell:

```powershell
$env:SHELF_ACCESS = 'private'
$env:SHELF_PUBLIC_ORIGIN = 'https://shelf-demo.example.com'
$env:SHELF_INSPECTOR = '0'
$reviewerSecret = Read-Host 'Reviewer password' -AsSecureString
$env:DEMO_ACCESS_PASSWORD = [System.Net.NetworkCredential]::new('', $reviewerSecret).Password
npm run demo:start
```

For Docker, set the same variables, then use `docker compose up --build -d` instead of `npm run demo:start`. The host tunnel still connects to `127.0.0.1:3000`. Neither option requires a router port-forward or a public application listener. Do not use a public Quick Tunnel for this private review.

Cloudflare configuration and reviewer identity checks require validation in your account. They have not been exercised by the repository's browser tests; those tests verify Shelf's own access gate. No Cloudflare credentials belong in this repository or chat.

## Validation of this demo package

The production build, strict TypeScript check, 50 automated tests and seven Chromium browser tests passed in the development environment. Browser coverage includes mobile layout, discovery/refinements, similarity, comparisons, temporary lists, retry behavior, stock changes through the separate catalog service, and private page/API access. The dependency audit reported zero known vulnerabilities at validation time.

The Docker image also built successfully. Requests inside the running container verified anonymous page/API rejection (401), authenticated page/API success (200), and disabled reviewer diagnostics; the stock CLI wrote the shared `/data/catalog.json` state. The cloud development environment did not make the Docker loopback port mapping reachable from its shell, so host port routing must still be checked on the actual tunnel machine. No Cloudflare hostname, Access policy, live model call, Koha instance or CARL•X endpoint was validated here.
