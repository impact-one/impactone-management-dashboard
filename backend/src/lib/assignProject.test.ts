import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assignTaskProject, type ProjectRef } from "./assignProject.js";

const projects: ProjectRef[] = [
  { id: "ksp-hills", name: "King Salman Park Hills" },
  { id: "io-ops", name: "Impact One operations" },
  { id: "social-intake", name: "Social media intake" },
  { id: "ai-overview", name: "AI solutions overview" },
];

function task(
  overrides: Partial<{ projectId: string | null; projectName: string; listName: string; tags: string[]; title: string }> = {},
) {
  return {
    projectId: null,
    projectName: "AI Management Dashboard · List",
    listName: "List",
    tags: [] as string[],
    title: "",
    ...overrides,
  };
}

describe("assignTaskProject", () => {
  it("leaves a task unassigned when the ClickUp location is not a project", () => {
    const assigned = assignTaskProject(task(), projects);
    assert.equal(assigned.projectId, null);
    assert.equal(assigned.projectName, "AI Management Dashboard · List");
  });

  it("maps a list, folder, or space name onto that project only", () => {
    const assigned = assignTaskProject(
      task({ projectName: "Impact · Social media intake · Delivery", listName: "Delivery" }),
      projects,
    );
    assert.equal(assigned.projectId, "social-intake");
    assert.equal(assigned.projectName, "Social media intake");
  });

  it("maps a project tag or task title onto that project", () => {
    const tagged = assignTaskProject(task({ tags: ["King Salman Park Hills"] }), projects);
    assert.equal(tagged.projectId, "ksp-hills");
    const titled = assignTaskProject(task({ title: "Review the Social media intake plan" }), projects);
    assert.equal(titled.projectId, "social-intake");
  });

  it("keeps an existing project id and does not copy the task onto another project", () => {
    const assigned = assignTaskProject(task({ projectId: "io-ops", projectName: "ClickUp" }), projects);
    assert.equal(assigned.projectId, "io-ops");
    assert.equal(assigned.projectName, "Impact One operations");
  });

  it("prefers the closer project name when one name contains the other", () => {
    const catalogue = [
      { id: "park", name: "King Salman Park" },
      { id: "hills", name: "King Salman Park Hills" },
    ];
    const assigned = assignTaskProject(task({ projectName: "King Salman Park Hills", listName: "King Salman Park Hills" }), catalogue);
    assert.equal(assigned.projectId, "hills");
  });
});
