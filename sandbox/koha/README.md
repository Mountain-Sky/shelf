# Private Koha development sandbox

This is a Koha development sandbox, not a production ILS deployment. It uses official Koha/KTD sources, synthetic items and sample data. Only OPAC/staff ports on host loopback are published. Database/cache have no host ports. Keep Shelf's reviewers outside the staff interface.

## Prepare

Requires Git, Python 3, Docker and Docker Compose 2.33.1+. The pinned image is Linux amd64. Linux x86-64 is the validation target; Windows/macOS execution is not verified here (WSL/Docker Desktop may be used according to upstream KTD instructions).

Clone the official sources outside the Shelf checkout and check out these exact revisions:

```sh
git clone https://github.com/Koha-Community/Koha.git koha
git -C koha checkout 7d272018beee67e422a090697796921a03a6eb39
git clone https://gitlab.com/koha-community/koha-testing-docker.git ktd
git -C ktd checkout ef7f1f97a5ba24d7552d3c4ed6396f196e6b1b36
python3 prepare.py --koha-source /absolute/path/koha --ktd-source /absolute/path/ktd --output /absolute/path/private-koha
```

The output must be a new directory outside Git. It contains mode-0600 generated passwords and Compose configuration. Never share or commit it. `prepare.py` refuses to overwrite existing configuration. The upstream startup script is adapted only to use Docker's configured hostname (avoiding SYS_ADMIN), a generated DB-root password, readable public package manifests, and standard Apache prefork under the dedicated Koha instance user instead of per-vhost mpm_itk. The latter avoids an initgroups failure under ordinary container capabilities. RabbitMQ server and control commands are limited to two Erlang schedulers through both environment settings and rabbitmq-env.conf, avoiding excessive startup concurrency. No extra Docker capabilities are requested.

If outbound traffic requires an approved proxy and trust bundle, `--use-environment-proxy --ca-bundle /path/to/trusted-ca.pem` uses the existing proxy variables and CA without disabling TLS verification. Ordinary hosts do not need these options.

From the generated output directory:

```sh
docker compose -p shelf-koha -f compose.json up -d
docker compose -p shelf-koha -f compose.json exec koha test -f /ktd_ready
```

A startup sentinel is preliminary only: actual authenticated API requests must pass before claiming readiness. Bootstrap logs may contain development credentials; do not paste raw logs into chat. Stop with `docker compose -p shelf-koha -f compose.json stop`. Restart retained containers with `docker compose -p shelf-koha -f compose.json start`. The generated startup script resumes services when the existing readiness marker and instance configuration are present, skipping installation and sample-data bootstrap. Verify actual API readiness again; the marker alone does not prove that services are running. A dedicated named database volume retains data; `down -v` deliberately destroys that sandbox's data and should not be used routinely.

## Seed and authenticate

Run the bootstrap helper after the startup sentinel exists:

```sh
python3 bootstrap.py --sandbox /absolute/path/private-koha
```

The helper copies the non-secret Perl scripts, executes them using Koha's supported object layer, and atomically captures credentials/settings in mode-0600 `reader.json`. It refuses to write secrets inside a Git worktree. Reruns reuse the captured OAuth key and seeded item barcodes, rather than generating keys or duplicate items each time. A failed command writes a private `bootstrap-error.log`; never paste that file unredacted.

`create-reader.pl` creates synthetic ASH/RUST/PUR branches and a password-disabled synthetic principal with only the catalogue permission (flags=4). It enables OAuth2 client credentials. `seed-shelf.pl` creates a record for the real title _The Left Hand of Darkness_ (Le Guin, 1969), with a note identifying the synthetic sandbox items. It seeds one available RUST item and one not-for-loan ASH item and captures the actual bibliographic ID and BK-to-print format mapping.

Pass the resulting settings to Shelf through environment variables. Do not upload them to Git. Run Shelf's read-only Koha smoke command, verify the expected record and holdings, then change only the seeded synthetic item's not-for-loan status through Koha administration and re-read it to prove live availability resolution.

## Storage and this cloud environment

The upstream image is pinned in `prepare.py`; database/cache digests are in `images.json`. The pinned Koha root filesystem is approximately 5.2 GB. Normal Docker overlay storage and ample free disk are recommended.

This cloud environment uses Docker's `vfs` driver, which duplicates the filesystem for every image layer. A normal pull consumed tens of GB before it was stopped safely. We instead used the official Google go-containerregistry `crane` release (published checksum verified) to export the pinned Koha manifest's verified layers to a flat root filesystem, then imported one Docker layer while restoring upstream Env/Cmd/Entrypoint/WorkingDir/User. That derived image has its own local image ID; it is not byte-identical to the upstream image manifest. Pass `--image koha-shelf-flat:pinned` only after preparing and validating that local image. Runtime credentials never enter the image.

The cloud task and Docker daemon can also have different loopback network namespaces. If the host's published loopback port cannot be reached from the task, a temporary task-local TCP relay can forward loopback port 18081 to the known private Koha container bridge address. This is an environment-specific transport workaround, not an API simulator, and must never bind a public address. Ordinary hosts should use the direct published loopback port.

## Validation boundary

The initialized local instance successfully issued an OAuth token, returned the seeded bibliographic record and its two item statuses, denied the catalogue-only principal access to the patron API (403), and served OPAC/staff-login HTML and same-origin stylesheets (200). The bootstrap helper was rerun successfully without creating duplicate seeded items or another reader key. The included set-test-item.pl helper changes only the seeded synthetic RUST item for an end-to-end availability demonstration.

The complete combined preparation recipe has **not** been rerun from an empty database after all environment adaptations. The validated instance required recovery of its initialized services during setup. Treat this handoff as a reviewed setup recipe with individually exercised adaptations, not a verified unattended installer or production deployment. No Replit-to-Koha network path or permanent hosted Koha instance is provided by this local laboratory.
