# Private Koha sandbox evaluation

Status: researched, not installed. Today's separate HTTP catalog simulator is not Koha and does not prove Koha or CARL•X API compatibility.

## Recommendation

Deliver the tested Shelf demo with its independent catalog simulator first. A private Koha instance is a practical next integration milestone, but adding an actual ILS also requires startup/bootstrap validation, a seeded collection, configured API authentication, and a tested adapter. Do not delay the usable discovery demo or label the simulator an ILS.

For a development-only Koha sandbox, use the Koha community's **koha-testing-docker (KTD)** project, rather than an unverified third-party all-in-one image. KTD is development infrastructure, not a production hosting recommendation. Keep its staff interface and administrative credentials away from invited Shelf reviewers.

## Verified prerequisites and sources

The environment currently has Docker Engine 28.4.0, Docker Compose 2.40.3, approximately 31 GB available RAM and 59 GB available disk. No Koha images were already present. No images were pulled and no containers were started for this evaluation.

The [official KTD README](https://gitlab.com/koha-community/koha-testing-docker/-/blob/main/README.md) requires Compose 2.33.1 or later and at least 2.6 GiB free RAM, plus another 2 GiB if Elasticsearch is enabled. It recommends Debian under WSL for Windows and Docker Desktop for macOS. It does not provide a reliable current disk-size requirement; actual image download and unpacked storage remain unmeasured here.

Inspected KTD `main` commit: `ef7f1f97a5ba24d7552d3c4ed6396f196e6b1b36`. Its current [base compose file](https://gitlab.com/koha-community/koha-testing-docker/-/blob/main/compose/base.yml) selects `koha/koha-testing:main` and memcached; the [MariaDB configuration](https://gitlab.com/koha-community/koha-testing-docker/-/blob/main/compose/db-mariadb.yml) selects MariaDB 10.11 by default. These are the verified upstream configuration values, not pinned artifacts that have been downloaded or tested.

The documented setup needs both a KTD checkout and a Koha source checkout. GitLab KTD Git reads succeeded. The upstream Koha Git hostname returned a network-policy 403 in this environment, while the [Koha community GitHub mirror](https://github.com/Koha-Community/Koha) was readable (`main` HEAD observed: `7d272018beee67e422a090697796921a03a6eb39`). Match the Koha source version and image version rather than combining unrelated moving tags.

## Important defaults to change before starting

- [KTD local ports](https://gitlab.com/koha-community/koha-testing-docker/-/blob/main/compose/local_ports.yml) publish ports 8080 and 8081 without a loopback host address. Override them to loopback-only for a private local sandbox; verify the effective merged compose configuration before launch.
- The base compose configuration adds all container capabilities. Do not copy that setting into the Shelf application container or assume it is suitable for a hosted service. Assess which privileges KTD needs in an isolated development host; reducing them is untested here.
- Upstream development database configuration includes default development credentials. Replace relevant defaults, keep secrets outside Git, and give Shelf only the catalog-read permissions needed by the adapter—not an administrative/superlibrarian account.
- Use a dedicated sandbox project/network and persistent database volume if preserving imported data. KTD reset commands can deliberately delete and recreate their database; do not use them against an instance whose data must be retained.
- Do not expose the staff interface publicly or assume KTD's proxy examples implement reviewer access control. A private Shelf demo should have its own authentication/access boundary.

## Shortest verified setup path to investigate next

1. Pin a compatible Koha source revision and KTD image/revision. Clone the official projects into a separate development area; use the accessible official mirror if the original Git hostname remains blocked.
2. Follow the README's `SYNC_REPO`, `KTD_HOME` and local environment setup. Prepare loopback port overrides and dedicated persistence. Inspect the rendered compose configuration before starting it.
3. Use the documented `ktd up` and `ktd --wait-ready` workflow. Confirm both OPAC and staff application readiness with functional requests, not merely a running container.
4. Validate the bootstrap. KTD's README and [startup script](https://gitlab.com/koha-community/koha-testing-docker/-/blob/main/files/run.sh) document a `koha-misc4dev` bootstrap that populates sample data. The precise sample inventory and its suitability for Shelf were **not** verified.
5. Create/import the approved dummy collection and clearly synthetic branches/items. Configure a dedicated read-only API principal. Seed via supported administration/import workflows or documented APIs, then verify actual records and item states.
6. Implement a small Koha adapter against that pinned instance's schema, running the same Shelf catalog-provider contract tests. Demonstrate a holdings change in Koha becoming visible through Shelf without editing Shelf fixtures.

## API evidence and limits

The official Koha source includes a REST API specification with base path `/api/v1`, authenticated bibliographic-list/detail operations, and bibliographic-item listing. The specification supports pagination and query parameters; this is evidence of a viable integration surface, not proof that every Shelf search strategy maps directly to a particular filter.

Sources inspected:

- [API specification](https://github.com/Koha-Community/Koha/blob/main/api/v1/swagger/swagger.yaml)
- [Bibliographic operations](https://github.com/Koha-Community/Koha/blob/main/api/v1/swagger/paths/biblios.yaml)
- [Item operations](https://github.com/Koha-Community/Koha/blob/main/api/v1/swagger/paths/items.yaml)
- [Authentication implementation](https://github.com/Koha-Community/Koha/blob/main/Koha/REST/V1/Auth.pm)
- [OAuth implementation](https://github.com/Koha-Community/Koha/blob/main/Koha/REST/V1/OAuth.pm)

The sources describe Basic authentication and OAuth2 client credentials as configurable options. OAuth token handling checks the `RESTOAuth2ClientCredentials` preference; catalog reads specify catalog permissions. The exact account setup, token flow, API calls, search semantics, item-status mapping, pagination, and response shapes must be validated on the chosen instance. Do not infer available-to-borrow merely from an item count or assume development credentials are appropriate for Shelf.

## What remains unverified

Image pulls and registry access; Koha startup duration; sample records and indexing; authentication configuration; live API responses; authoritative field/status mapping; data persistence; least-privilege startup settings; Windows/macOS execution; and any hosted reviewer deployment. No installation time estimate or “ready” claim is justified by this read-only evaluation.
