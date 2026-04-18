import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { IncomingMessage, ServerResponse } from "http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: IncomingMessage & { id?: unknown }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files (PDFs, etc.) at /api/pdf/*
app.use("/api/pdf", express.static(path.join(__dirname, "../public")));

app.use("/api", router);

export default app;
