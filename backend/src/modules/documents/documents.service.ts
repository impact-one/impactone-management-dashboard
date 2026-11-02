import { store } from "../../data/store.js";
import { isStaff } from "../../lib/permissions.js";
import type { PublicUser } from "../../types/domain.js";
import { filterByProject } from "../../lib/visibility.js";
import { driveClient } from "../integrations/clients/drive.client.js";

export class DocumentsService {
  async list(user: PublicUser, projectId?: string) {
    let items = filterByProject(user, store.documents, store.projects);
    let note = "Drive is not connected. These rows are known documents from the brief, not a file export.";

    if (isStaff(user)) {
      const live = await driveClient.get();
      if (live.ok && live.data && live.data.length > 0) {
        items = [...items, ...live.data];
        note = "Known documents stay listed. Live Drive rows are file names and links only, for executive and manager roles.";
      } else if (live.configured && !live.ok) {
        note = `${live.message} Known documents are shown instead.`;
      }
    }

    if (projectId) items = items.filter((item) => item.projectId === projectId);
    return { items, note };
  }
}

export const documentsService = new DocumentsService();
