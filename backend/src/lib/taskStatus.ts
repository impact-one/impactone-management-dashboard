export function isTaskClosed(task: { status: string; closed?: boolean }): boolean {
  if (typeof task.closed === "boolean") return task.closed;
  return task.status === "done";
}

export function countStatuses(tasks: { status: string }[], order: string[] = []) {
  const counts = new Map<string, number>();
  for (const name of order) counts.set(name, 0);
  for (const task of tasks) {
    counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
  }
  const ordered = order.map((name) => ({ name, count: counts.get(name) ?? 0 }));
  const extra = [...counts.entries()]
    .filter(([name]) => !order.includes(name))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return [...ordered, ...extra];
}
