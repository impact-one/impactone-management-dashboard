import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";

/** Serves the built React app from WEB_ROOT. Dev leaves this unset and uses Vite. */
export function mountWeb(app: Express, webRoot: string | undefined) {
  if (!webRoot) return;
  const root = path.resolve(webRoot);
  const indexHtml = path.join(root, "index.html");
  if (!fs.existsSync(indexHtml)) {
    console.warn(`WEB_ROOT is set but ${indexHtml} is missing. The API will not serve the web app.`);
    return;
  }

  app.use(express.static(root, { index: false, maxAge: "1h" }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    if (path.extname(req.path)) return next();
    res.sendFile(indexHtml);
  });
}
