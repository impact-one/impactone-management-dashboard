import { store } from "../../data/store.js";
import { AppError } from "../../lib/AppError.js";
import type { PublicUser } from "../../types/domain.js";
import { canSeeProject } from "../../lib/visibility.js";
import { presentConsultants } from "../consultants/consultants.service.js";
import { documentsService } from "../documents/documents.service.js";
import { tasksService } from "../tasks/tasks.service.js";

export class ProjectsService {
  list(user: PublicUser) {
    return store.projects.filter((project) => canSeeProject(user, project));
  }

  async getById(user: PublicUser, id: string) {
    const project = this.list(user).find((item) => item.id === id);
    if (!project) throw new AppError(404, "Project not found.");

    const [taskResult, documentResult] = await Promise.all([tasksService.list(user), documentsService.list(user)]);

    const tasks = taskResult.items.filter((item) => item.projectId === id);
    const teamLiveTasks = taskResult.items.filter(
      (item) => item.projectId === null && item.source.origin === "live",
    );
    const documents = documentResult.items.filter((item) => item.projectId === id);
    const teamLiveDocuments = documentResult.items.filter(
      (item) => item.projectId === null && item.source.origin === "live",
    );

    return {
      project,
      tasks,
      teamLiveTasks,
      documents,
      teamLiveDocuments,
      followUps: store.followUps.filter((item) => item.projectId === id),
      milestones: store.milestones.filter((item) => item.projectId === id),
      consultants: presentConsultants(
        user,
        store.consultants.filter((item) => item.projectId === id),
      ),
      taskNote: taskResult.note,
      documentNote: documentResult.note,
    };
  }
}

export const projectsService = new ProjectsService();
