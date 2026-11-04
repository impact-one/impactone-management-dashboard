const IGNORED = new Set(["list", "lists", "hidden", "folder", "folders", "space", "spaces", "clickup", "task", "tasks"]);

export interface ProjectRef {
  id: string;
  name: string;
}

export function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function labelsOf(task: { projectName: string; listName?: string; tags?: string[]; title?: string }): string[] {
  return [task.projectName, task.listName ?? "", task.title ?? "", ...(task.tags ?? [])]
    .flatMap((value) => value.split("·"))
    .map((value) => normalizeLabel(value))
    .filter((value) => value.length >= 3 && !IGNORED.has(value));
}

function phraseMatch(part: string, name: string): boolean {
  if (part === name) return true;
  if (part.length < 4 || name.length < 4) return false;
  const [shorter, longer] = part.length <= name.length ? [part, name] : [name, part];
  return longer.includes(shorter) && shorter.length / longer.length >= 0.6;
}

function score(part: string, name: string, id: string): number {
  if (part === name || (id && part === id)) return 1000 + name.length;
  if (name.length >= 4 && part.includes(name)) return 500 + name.length;
  if (id.length >= 4 && part.includes(id)) return 400 + id.length;
  if (phraseMatch(part, name)) return 100 + Math.min(part.length, name.length);
  if (id && phraseMatch(part, id)) return 80 + Math.min(part.length, id.length);
  return 0;
}

export function assignTaskProject<
  T extends { projectId: string | null; projectName: string; listName?: string; tags?: string[]; title?: string },
>(task: T, projects: ProjectRef[]): T {
  const current = task.projectId ? projects.find((project) => project.id === task.projectId) : undefined;
  if (current) {
    return task.projectName === current.name ? task : { ...task, projectName: current.name };
  }

  let best: ProjectRef | null = null;
  let bestScore = 0;
  for (const project of projects) {
    const name = normalizeLabel(project.name);
    const id = normalizeLabel(project.id);
    for (const part of labelsOf(task)) {
      const next = score(part, name, id);
      if (next > bestScore) {
        best = project;
        bestScore = next;
      }
    }
  }
  if (!best) return task;
  return { ...task, projectId: best.id, projectName: best.name };
}
