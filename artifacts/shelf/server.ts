import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { demoGate } from "@workspace/shelf-core/application/gate";

const app = express();
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
app.use(demoGate);
app.use(express.static(publicDir, { index: false }));
app.get("/{*path}", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
const port = Number(process.env.PORT);
if (!port) throw new Error("PORT is required");
app.listen(port, "0.0.0.0");
