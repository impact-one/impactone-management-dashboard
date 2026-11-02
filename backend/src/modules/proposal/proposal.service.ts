export class ProposalService {
  get() {
    return {
      assumptions: [
        "The desk covers Impact One operations, King Salman Park Hills, social intake, and the AI catalogue.",
        "Where a live credential is missing, the screen shows reference data instead of going blank.",
        "Budget figures are reference values until finance connects the live sheet.",
        "Milestone dates on King Salman Park Hills are placeholders pending programme confirmation.",
        "Incomplete tool purpose or ownership is marked Needs review rather than invented.",
        "LibreChat is evaluated only — not installed as part of this desk.",
        "Sign-in is local for now; company SSO is a later stage.",
        "Role split (executive, manager, consultant, viewer) should be confirmed with operations.",
      ],
      architecture: [
        {
          title: "Web app and API",
          detail:
            "A React interface talks only to this API. Each business area is a module with its own route, controller, and service.",
        },
        {
          title: "Integrations",
          detail:
            "Calendar schedules meetings and sharing. Drive manages folders, empty Docs/Sheets, and sharing. ClickUp is read-only. Slack posts stay in the configured channel.",
        },
        {
          title: "Reference before access",
          detail:
            "If a token is missing or a live read fails, the service returns labelled reference data and records the limitation.",
        },
        {
          title: "Role filter",
          detail:
            "Live team-wide ClickUp, Calendar, and Drive results are limited to executive and manager roles. Fees, budget, and audit follow the same rule.",
        },
        {
          title: "Audit trail",
          detail:
            "Each authenticated request records actor, role, route, and status. Bodies and tokens are not stored.",
        },
      ],
      accessModel: [
        { role: "Executive", access: "Full desk access, including budget amounts and the audit trail." },
        { role: "Manager", access: "Same operational scope as executive for day-to-day delivery." },
        { role: "Consultant", access: "Assigned IOC project view. No budget, fees, audit, or team-wide live exports." },
        { role: "Viewer", access: "Operational screens without budget, fees, audit, or live team-wide exports." },
      ],
      libreChat: {
        verdict: "Do not deploy LibreChat with this release.",
        points: [
          "LibreChat can sit as a chat layer over models the team already licences.",
          "It does not replace ClickUp, Calendar, Drive, Slack, or this management desk.",
          "Sending project or budget text into a model needs an explicit data decision first.",
          "It would need its own hosting and keys behind company sign-in.",
          "Hosting cost is modest; model usage can exceed it and is hard to predict.",
        ],
      },
      costs: [
        {
          name: "Current build",
          estimate: "Within the agreed delivery hours",
          note: "Commercial terms sit outside this screen. This is not a quotation.",
        },
        {
          name: "App hosting",
          estimate: "About USD 20–40 per month",
          note: "One small container for the API and static web app. Indicative only.",
        },
        {
          name: "LibreChat, if approved later",
          estimate: "About USD 20–50 per month plus model usage",
          note: "Model usage is variable. Do not start until the AI overview is reviewed.",
        },
        {
          name: "ClickUp, Calendar, and Drive live access",
          estimate: "A few days after tokens exist",
          note: "Adapters are already in the API. The wait is access, not new product work.",
        },
        {
          name: "Company sign-in and stored audit",
          estimate: "About one week",
          note: "Replace local passwords and persist the trail in an Impact-managed database.",
        },
        {
          name: "Operational hardening",
          estimate: "About 4–6 weeks part time, or 2–3 focused weeks",
          note: "Depends on review outcomes and which live sources are approved.",
        },
      ],
      nextStage: [
        "Persist the audit log and move to company SSO.",
        "Map live ClickUp tasks onto real projects once a read token exists.",
        "Complete Google OAuth for Calendar and Drive, reviewed by operations.",
        "Connect the budget only after IOC finance approves a snapshot or sheet read.",
        "Replace the AI catalogue with the confirmed overview before any LibreChat decision.",
        "Fold review feedback into the layout before further build.",
      ],
      risks: [
        "Local demo passwords must not be used in a shared deployment.",
        "A Google token used here can create calendar events and empty Drive files, and can change sharing. Keep it on an Impact account.",
        "Team-wide ClickUp and Calendar reads can include sensitive titles; they stay limited to executive and manager roles.",
        "The in-memory audit trail is lost on restart until persistence is added.",
        "Reference budget figures can be mistaken for live finance data if the Sample label is ignored.",
      ],
    };
  }
}

export const proposalService = new ProposalService();
