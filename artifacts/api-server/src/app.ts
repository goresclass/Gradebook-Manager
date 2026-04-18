import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      req: { method: req.method, url: req.url?.split("?")[0] },
      res: { statusCode: res.statusCode },
      responseTime: Date.now() - start,
    }, "request completed");
  });
  next();
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files (PDFs, etc.) at /api/pdf/*
app.use("/api/pdf", express.static(path.join(__dirname, "../public")));

app.use("/api", router);

export default app;
