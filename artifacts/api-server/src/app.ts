import express, { type Express, type ErrorRequestHandler } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { demoGate } from "@workspace/shelf-core/application/gate";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use((req, res, next) => {
  if (req.path === "/api/healthz") { next(); return; }
  demoGate(req, res, next);
});
app.use("/api/chat", express.raw({ type: () => true, limit: 8000 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  res.status(err.status === 413 ? 413 : 400).json({
    error: err.status === 413 ? "Request too large" : "Invalid JSON",
  });
};
app.use(errorHandler);

export default app;
