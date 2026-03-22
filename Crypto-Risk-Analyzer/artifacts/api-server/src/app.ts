import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const _dirname = (() => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    // Fallback for CJS bundles (esbuild) where import.meta.url may be undefined
    // @ts-ignore
    return typeof __dirname !== "undefined" ? __dirname : process.cwd();
  }
})();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const frontendDist = path.resolve(
  _dirname,
  "../../scamsniff/dist/public",
);

if (process.env.NODE_ENV === "production" && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    const domain = process.env.REPLIT_DEV_DOMAIN;
    if (domain) {
      res.redirect(302, `https://${domain}:5000/`);
    } else {
      res.redirect(302, "http://localhost:5000/");
    }
  });
}

export default app;
