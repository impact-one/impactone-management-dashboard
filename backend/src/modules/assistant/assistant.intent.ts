export const AGENT_INTENTS = ["draft", "research", "analyze", "brainstorm", "automate", "overview", "chat"] as const;

export type AgentIntent = (typeof AGENT_INTENTS)[number];

export type WritingTask = "draft" | "research" | "analyze" | "brainstorm" | "summarize";

export type DeskLookup = "message" | "meeting" | "tasks" | "projects" | "documents" | "followUps" | "dashboard";

export type ClassifiedIntent = {
  intent: AgentIntent;
  writing?: WritingTask;
  lookup?: DeskLookup;
  refuseWrite?: boolean;
  /** One most recently updated task, not the open-task list. */
  latest?: boolean;
  /** Limit tasks to the person who asked. */
  mine?: boolean;
};

export const INTENT_LABEL: Record<AgentIntent, string> = {
  draft: "Draft",
  research: "Research",
  analyze: "Analyze",
  brainstorm: "Brainstorm",
  automate: "Automate",
  overview: "Desk",
  chat: "Chat",
};

export function classifyIntent(brief: string): ClassifiedIntent | null {
  const text = brief.trim();
  if (asksToAct(text)) return { intent: "automate", refuseWrite: true };
  if (asksMeeting(text)) return { intent: "overview", lookup: "meeting" };
  if (asksMessage(text)) return { intent: "overview", lookup: "message" };
  if (asksTasks(text)) {
    return {
      intent: "overview",
      lookup: "tasks",
      latest: /\b(latest|newest|most recent|last)\b/i.test(text),
      mine: /\b(my|mine)\b/i.test(text),
    };
  }
  if (asksProjects(text)) return { intent: "overview", lookup: "projects" };
  if (asksDocuments(text)) return { intent: "overview", lookup: "documents" };
  if (asksFollowUps(text)) return { intent: "overview", lookup: "followUps" };
  if (asksOverview(text)) return { intent: "overview", lookup: "dashboard" };
  if (asksAutomate(text)) return { intent: "automate" };
  if (/\bresearch\b/i.test(text)) return { intent: "research", writing: "research" };
  if (/\b(summari[sz]e|shorten)\b/i.test(text)) return { intent: "analyze", writing: "summarize" };
  if (/\b(analy[sz]e|review)\b/i.test(text)) return { intent: "analyze", writing: "analyze" };
  if (/\b(brainstorm|ideas for|options for)\b/i.test(text)) return { intent: "brainstorm", writing: "brainstorm" };
  if (/\b(draft|write|compose|email)\b/i.test(text)) return { intent: "draft", writing: "draft" };
  if (isSmallTalk(text)) return { intent: "chat" };
  return null;
}

export function intentFromModel(word: string): ClassifiedIntent {
  const cleaned = word.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned === "overview" || cleaned === "desk" || cleaned === "chat") return { intent: "chat" };
  if (cleaned === "automate" || cleaned === "automation") return { intent: "automate" };
  if (cleaned === "research") return { intent: "research", writing: "research" };
  if (cleaned === "analyze" || cleaned === "analyse" || cleaned === "summarize" || cleaned === "summarise") {
    return { intent: "analyze", writing: cleaned.startsWith("summar") ? "summarize" : "analyze" };
  }
  if (cleaned === "brainstorm") return { intent: "brainstorm", writing: "brainstorm" };
  return { intent: "draft", writing: "draft" };
}

function asksToAct(text: string) {
  return (
    /\b(post|send) (this|that|it|an update|a message|the update)\b/i.test(text) ||
    /\bpost (to|on|in) slack\b/i.test(text) ||
    /\b(book|schedule) (a |the |my )?(meeting|call|event)\b/i.test(text) ||
    /\bcreate (a |the )?(clickup )?task\b/i.test(text) ||
    /\bgrant access\b/i.test(text)
  );
}

function asksMeeting(text: string) {
  if (/\b(draft|write|compose)\b/i.test(text)) return false;
  return (
    /\b(next meeting|upcoming meeting|when is my( next)? meeting|when am i free)\b/i.test(text) ||
    /\bwhat'?s on my calendar\b/i.test(text) ||
    (/\bcalendar\b/i.test(text) && /\b(when|next|today|tomorrow)\b/i.test(text))
  );
}

function asksMessage(text: string) {
  if (/\b(draft|write|compose|post|send)\b/i.test(text)) return false;
  return (
    /\b(new message|latest message|last message|what did i (just )?receive)\b/i.test(text) ||
    /\bwhat(?:'s| is|s) the (new|latest|last) message\b/i.test(text) ||
    (/\bslack\b/i.test(text) && /\b(new|latest|last|recent|message)\b/i.test(text)) ||
    (/\bclickup\b/i.test(text) && /\b(comment|message)\b/i.test(text))
  );
}

function asksTasks(text: string) {
  if (/\b(draft|write|compose)\b/i.test(text)) return false;
  return (
    /\b(my tasks|open tasks|due tasks|deadlines|what(?:'s| is) due|tasks due|overdue)\b/i.test(text) ||
    /\b(latest|newest|most recent|last|my)\s+tasks?\b/i.test(text) ||
    /\btasks?\s+of\s+mine\b/i.test(text)
  );
}

function isSmallTalk(text: string) {
  const compact = text.replace(/[!?.]+$/g, "").trim();
  if (compact.length > 80) return false;
  if (/\b(meeting|calendar|slack|clickup|task|project|document|deadline|follow-?up)\b/i.test(compact)) return false;
  return /^(hi|hello|hey|hiya|yo|thanks|thank you|good (morning|afternoon|evening))\b/i.test(compact);
}

function asksProjects(text: string) {
  if (/\b(draft|write|compose)\b/i.test(text)) return false;
  return /\b(my projects|which projects|project status|list (the )?projects)\b/i.test(text);
}

function asksDocuments(text: string) {
  if (/\b(draft|write|compose)\b/i.test(text)) return false;
  return /\b(which|what|list|show)\b[\s\S]{0,40}\b(documents|drive files)\b/i.test(text);
}

function asksFollowUps(text: string) {
  if (/\b(draft|write|compose)\b/i.test(text)) return false;
  return /\bfollow-?ups?\b/i.test(text);
}

function asksOverview(text: string) {
  return /\b(what(?:'s| is) on (the |my )?desk|desk overview|status of the desk)\b/i.test(text);
}

function asksAutomate(text: string) {
  return /\b(automat\w*|workflow|make\.com)\b/i.test(text);
}
