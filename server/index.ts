import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { existsSync } from "node:fs";
import { createRouter } from "./routes";
import { makeDemoPicker } from "./picker";

const rawPort = Number(process.env.PORT);
const PORT = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 3001;
const rawToken = (process.env.VITE_MAPILLARY_TOKEN ?? process.env.MAPILLARY_TOKEN ?? "").trim();
const TOKEN =
  rawToken.length > 20 && !rawToken.includes("paste_your_token") ? rawToken : "";
const DEMO_MODE = process.env.DEMO_MODE === "1" || !TOKEN;

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  "/api",
  createRouter(TOKEN, DEMO_MODE ? { pick: makeDemoPicker() } : undefined),
);

// Production single-service mode: serve the built SPA from dist/ if present.
const distDir = path.join(process.cwd(), "dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  if (DEMO_MODE) {
    console.log("[server] DEMO MODE: fake locations (viewer will show a placeholder). Add a Mapillary token to .env for real panoramas.");
  }
});
