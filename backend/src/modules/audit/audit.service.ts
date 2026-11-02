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
      note: "In-memory activity log for this process. Resets on restart. Credentials and payloads are not stored.",
    };
  }
}

export const auditService = new AuditService();
