import { store } from "../../data/store.js";
import { AppError } from "../../lib/AppError.js";
import type { PublicUser } from "../../types/domain.js";

export class AuditService {
  list(user: PublicUser) {
    if (!user.permissions.viewAudit) {
      throw new AppError(403, "The audit trail is limited to executive and manager roles.");
    }
    return {
      events: store.audit,
      note: "The trail is in memory for this pilot. It resets when the API restarts. It records who read which route. It does not store request bodies or tokens.",
    };
  }
}

export const auditService = new AuditService();
