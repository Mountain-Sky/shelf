import { Router, type Request, type Response } from "express";
import { GET, POST } from "@workspace/shelf-core/application/http";

const router = Router();

async function forward(req: Request, res: Response) {
  // Replit terminates TLS in front of Express. Respect its forwarded protocol
  // rather than confusing HTTPS browser origins with the internal HTTP hop.
  const protocol = req.get("x-forwarded-proto")?.split(",")[0].trim() || req.protocol;
  const headers = new Headers();
  if (req.get("origin")) headers.set("origin", req.get("origin")!);
  const request = new Request(`${protocol}://${req.get("host")}${req.originalUrl}`, {
    method: req.method,
    headers,
    ...(req.method === "POST" ? { body: req.body as Buffer } : {}),
  });
  const response = await (req.method === "POST" ? POST(request) : GET(request));
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.status(response.status).send(await response.text());
}

router.post("/chat", forward);
router.get("/catalog/search", forward);
export default router;
