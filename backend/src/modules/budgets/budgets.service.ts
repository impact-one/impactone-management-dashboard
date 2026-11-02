import { store } from "../../data/store.js";
import { AppError } from "../../lib/AppError.js";
import type { Budget, PublicUser } from "../../types/domain.js";

export class BudgetsService {
  get(user: PublicUser): Budget {
    if (!user.permissions.viewBudget) {
      throw new AppError(403, "Budget overview is limited to executive and manager roles.");
    }
    return store.budget;
  }
}

export const budgetsService = new BudgetsService();
