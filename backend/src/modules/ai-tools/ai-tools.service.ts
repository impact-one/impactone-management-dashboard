import { store } from "../../data/store.js";

const agentNote =
  "No named agents are listed yet. This section stays empty until ownership is confirmed.";

export class AiToolsService {
  list() {
    return {
      tools: store.aiTools,
      agents: [] as [],
      agentNote,
    };
  }
}

export const aiToolsService = new AiToolsService();
