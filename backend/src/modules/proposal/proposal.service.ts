export class ProposalService {
  get() {
    return {
      assumptions: [
        "The first information architecture is the four areas named in the brief: Impact One operations, King Salman Park Hills, social intake, and the AI overview.",
        "No live credentials were in the brief, so ClickUp, Drive, and the budget sheet stay on labelled sample data until access exists. Calendar scheduling uses the labelled Asia/Riyadh workspace until a Calendar token is set.",
        "Budget figures in the app are fictional. They are not a substitute for the IOC finance sheet.",
        "Milestone dates on King Salman Park Hills are placeholders, not Saray's plan.",
        "Where a tool's purpose or connection was not written down, the row is marked Needs review instead of filled in.",
        "LibreChat is evaluated and not installed.",
        "Sign-in is a local pilot account. Company SSO is a next-stage item.",
        "The role split (executive, manager, consultant, viewer) is a proposal for Kulde to confirm.",
        "Further build after this prototype waits on Mikolaj's review.",
      ],
      architecture: [
        {
          title: "Web app and API",
          detail:
            "A React interface talks only to this API. Each business area is a module with its own route, controller, and service.",
        },
        {
          title: "Read-only adapters",
          detail:
            "Google Calendar schedules meetings, updates invitations, checks free/busy, and sets sharing. ClickUp and Drive stay HTTP GET. Slack, Make, Instagram, and Sheets have no client.",
        },
        {
          title: "Sample before access",
          detail:
            "If a token is missing or the read fails, the service returns the labelled sample and records the limitation. The screen does not go blank.",
        },
        {
          title: "Role filter",
          detail:
            "Live ClickUp, Calendar, and Drive results are returned only to executive and manager roles, because those APIs are team-wide. Consultant fees and the budget are on the same rule. The audit log is too.",
        },
        {
          title: "Audit trail",
          detail:
            "Each authenticated request records actor, role, route, and status in memory. Bodies and tokens are not stored. Persistence is a next-stage item.",
        },
      ],
      accessModel: [
        { role: "Executive", access: "All pilot screens, including budget amounts and the audit trail. Demo account: Mikolaj." },
        { role: "Manager", access: "Same read scope as executive. Demo accounts: Kulde, Zygm, Saray." },
        { role: "Consultant", access: "King Salman Park Hills only. No budget, no fees, no audit, no live team-wide exports." },
        { role: "Viewer", access: "Operational screens across the pilot, without budget, fees, audit, or live exports. Demo account: Tetia." },
      ],
      libreChat: {
        verdict: "Do not deploy LibreChat in this pilot.",
        points: [
          "LibreChat can be a single chat window over models the team already licences, such as the ChatGPT and Claude seats on the access tracker.",
          "It does not replace ClickUp, Calendar, Drive, Slack, or this management dashboard. It would be a second interface.",
          "Sending project or budget text into a model is a data decision. That decision should wait until Zygm's overview says which tools already do this.",
          "It needs its own hosting and keys in an Impact account, ideally behind company sign-in.",
          "Hosting is the smaller cost. Model usage can exceed it and is not predictable from the brief.",
        ],
      },
      costs: [
        {
          name: "This pilot",
          estimate: "Within the agreed pilot hours",
          note: "Commercial terms sit outside this codebase. This screen is not a quotation.",
        },
        {
          name: "App hosting, next stage",
          estimate: "About USD 20–40 per month",
          note: "One small container for the API and the static web app. Indicative, not a quote.",
        },
        {
          name: "LibreChat, if approved later",
          estimate: "About USD 20–50 per month plus model usage",
          note: "Model usage is variable and can be larger than hosting. Do not start until the AI overview is reviewed.",
        },
        {
          name: "ClickUp read and Calendar scheduling",
          estimate: "A few days after tokens exist",
          note: "Adapters are already in the API. The wait is access, not a new product.",
        },
        {
          name: "Company sign-in and stored audit",
          estimate: "About one week",
          note: "Replace demo passwords and keep the trail in a database on an Impact account.",
        },
        {
          name: "Operational dashboard after approval",
          estimate: "About 4–6 weeks part time, or 2–3 focused weeks",
          note: "Depends on Mikolaj's review, IOC confirmation, and which live sources are approved.",
        },
      ],
      nextStage: [
        "Persist the audit log and replace demo sign-in with company SSO.",
        "Map live ClickUp tasks onto real projects once a read-only token exists.",
        "Add Google OAuth for Calendar events, free/busy, and ACL, plus Drive metadata read, reviewed by Kulde.",
        "Connect the budget only after IOC finance approves a snapshot or a read-only sheet.",
        "Replace the AI catalogue with Zygm's overview, and only then decide on LibreChat.",
        "Fold Mikolaj's demo notes into the layout before any further build.",
      ],
      risks: [
        "Demo passwords are for this local pilot. Do not deploy them.",
        "A Google token used here can create and update calendar events. Keep it on an Impact account. This desk cannot grant calendar owner.",
        "Team-wide ClickUp and Calendar reads can include sensitive titles. They are limited to executive and manager roles for that reason.",
        "The in-memory audit trail is lost on restart.",
        "Sample budget figures can be mistaken for the real sheet if the Sample label is ignored. The budget screen repeats the warning.",
      ],
    };
  }
}

export const proposalService = new ProposalService();
