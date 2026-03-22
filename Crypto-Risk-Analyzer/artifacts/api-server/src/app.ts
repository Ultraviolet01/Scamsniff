import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

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

app.get("/", (req, res) => {
  const domain = process.env.REPLIT_DEV_DOMAIN;
  if (domain) {
    res.redirect(302, `https://${domain}:5000/`);
  } else {
    res.redirect(302, "http://localhost:5000/");
  }
});

export default app;
