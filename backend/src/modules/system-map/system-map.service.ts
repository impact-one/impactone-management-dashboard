import { store } from "../../data/store.js";

export class SystemMapService {
  get() {
    return {
      tools: store.catalogTools,
      flows: store.automations,
      dataSources: store.dataSources,
      agents: [] as [],
      agentNote:
        "No named agent was listed in the pilot brief. The agent row stays empty until Zygm's overview names one.",
    };
  }
}

export const systemMapService = new SystemMapService();
