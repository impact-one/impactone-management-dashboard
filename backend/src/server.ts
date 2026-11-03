import { env } from "./config/env.js";
import { initStore } from "./data/store.js";
import { createApp } from "./app.js";

const app = createApp();

await initStore();

const host = "0.0.0.0";
app.listen(env.port, host, () => {
  console.log(`API listening on http://${host}:${env.port}`);
});
