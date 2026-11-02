import { store } from "../../data/store.js";

export class SystemMapService {
  get() {
    return {
      tools: store.catalogTools,
      flows: store.automations,
      dataSources: store.dataSources,
      agents: [] as [],
      agentNote: "No named agents are listed yet. This section stays empty until ownership is confirmed.",
    };
  }
}

export const systemMapService = new SystemMapService();
