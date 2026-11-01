import type { CatalogProvider } from "../types";
/** Implement only against library/vendor supplied WSDL, schemas and redacted fixtures. */
export class CarlXProvider implements CatalogProvider {
  readonly mode = "carlx" as const;
  async search(): ReturnType<CatalogProvider["search"]> {
    throw new Error(
      "CarlX adapter is not configured: verified SOAP contracts are required.",
    );
  }
  async availability(): ReturnType<CatalogProvider["availability"]> {
    throw new Error("CarlX holdings contract is not configured.");
  }
}
