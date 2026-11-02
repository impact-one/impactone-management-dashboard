import { store } from "../../data/store.js";

export class AutomationsService {
  list() {
    return store.automations;
  }
}

export const automationsService = new AutomationsService();
