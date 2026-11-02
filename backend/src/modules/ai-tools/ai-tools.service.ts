import { store } from "../../data/store.js";

const agentNote =
  "No named agent was listed in the pilot brief. This list stays empty until Zygm's overview names one. Nothing here is inferred.";

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
