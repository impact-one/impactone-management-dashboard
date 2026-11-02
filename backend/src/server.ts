import { env } from "./config/env.js";
import { initStore } from "./data/store.js";
import { createApp } from "./app.js";

const app = createApp();

await initStore();

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
