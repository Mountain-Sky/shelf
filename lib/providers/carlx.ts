import type { CatalogProvider } from "../types";
/** SOAP access/search is user-confirmed. Wire mappings await their sanitized working examples. */
export class CarlXProvider implements CatalogProvider {
  readonly id = "carlx";
  readonly kind = "catalog" as const;
  readonly capabilities: CatalogProvider["capabilities"] = {
    fields: ["keyword"],
  };
  async search(): ReturnType<CatalogProvider["search"]> {
    throw Error("CarlX mapping requires the existing verified SOAP examples.");
  }
  async holdings(): ReturnType<CatalogProvider["holdings"]> {
    throw Error("CarlX holdings mapping is not configured.");
  }
}
