import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import ts from "typescript";
const root = resolve(".");
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : /\.tsx?$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
}
function imports(file: string) {
  const ast = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const found: { name: string; typeOnly: boolean }[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      found.push({
        name: node.moduleSpecifier.text,
        typeOnly: node.importClause?.isTypeOnly ?? false,
      });
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      found.push({
        name: node.moduleSpecifier.text,
        typeOnly: node.isTypeOnly,
      });
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        node.expression.getText(ast) === "require") &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      found.push({ name: node.arguments[0].text, typeOnly: false });
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return found;
}
test("UI and API routes cannot bypass the application/engine boundary", () => {
  for (const file of files("app"))
    for (const item of imports(file)) {
      const target = relative(
        root,
        resolve(dirname(file), item.name),
      ).replaceAll("\\", "/");
      if (file.includes("/api/"))
        assert.ok(
          !/lib\/(providers|ai|engine)\//.test(target),
          `${file} bypasses application via ${item.name}`,
        );
      else if (!item.typeOnly && target.startsWith("lib/"))
        assert.ok(
          target.startsWith("lib/config/"),
          `${file} imports server logic via ${item.name}`,
        );
    }
});
test("engine is independent of HTTP, environment configuration, SDKs and providers", () => {
  for (const file of files("lib/engine")) {
    for (const item of imports(file))
      assert.ok(
        item.name.startsWith(".") &&
          !/providers|application|\/ai\//.test(item.name),
        `${file}: forbidden dependency ${item.name}`,
      );
    const text = readFileSync(file, "utf8");
    assert.ok(
      !/process\.env|fetch\(/.test(text),
      `${file}: environment or transport leaked into engine`,
    );
  }
});
test("catalog adapters receive normalized requests, not discovery orchestration", () => {
  for (const file of files("lib/providers"))
    for (const item of imports(file))
      assert.ok(
        !/engine|application|\/ai\//.test(item.name),
        `${file}: ${item.name}`,
      );
});

test("public configuration cannot import server layers", () => {
  for (const file of files("lib/config"))
    for (const item of imports(file))
      assert.ok(
        item.typeOnly ||
          !/(engine|application|providers|\/ai\/)/.test(item.name),
        `${file}: ${item.name}`,
      );
});
