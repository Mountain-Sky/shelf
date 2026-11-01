import { build } from "esbuild";
import path from "node:path";
await build({
  entryPoints: ["server.ts"],
  outfile: "dist/server.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  // Bundle workspace TypeScript, leave Express as a production dependency.
  plugins: [{
    name: "workspace-core",
    setup(b) {
      b.onResolve({ filter: /^@workspace\/shelf-core\// }, (args) => {
        return { path: path.resolve("../../lib/shelf-core/lib", args.path.replace("@workspace/shelf-core/", "") + ".ts") };
      });
    }
  }],
});
