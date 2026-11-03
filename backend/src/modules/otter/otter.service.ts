import { env } from "../../config/env.js";
import { isStaff } from "../../lib/permissions.js";
import type { OtterDesk, OtterMeeting, PublicUser } from "../../types/domain.js";
import { otterClient } from "./otter.client.js";

const OPERATING_MODEL = {
  bestFit: "Meeting notes and searchable transcripts",
  implementationNote: "Confirm consent, permissions, and transcript-sharing settings before notes are opened.",
  operatingModel:
    "Otter captures the conversation and returns the transcript, summary, and action items. This desk reads them. It does not change who the transcript is shared with, and it does not copy action items into ClickUp.",
  consentStatement:
    "Open notes only after you have checked that people in the meeting agreed to transcription and that the sharing list on this conversation is the one that should apply.",
  consentChecks: [
    {
      id: "consent",
      label: "Participants were told this meeting would be transcribed.",
    },
    {
      id: "permissions",
      label: "This uses an Impact Otter workspace key, not a personal account.",
    },
    {
      id: "sharing",
      label: "The people and channels listed for this conversation are the correct audience. This desk will not share the transcript further.",
    },
  ],
  steps: [
    { name: "Capture", detail: "Otter records the meeting in the Enterprise workspace." },
    { name: "Confirm", detail: "Check consent, the API key’s workspace, and who the transcript is shared with." },
    { name: "Read", detail: "Executive and manager roles can then search the transcript, summary, and action items." },
  ],
};

function sampleMeetings(): OtterMeeting[] {
  return [
    {
      id: "otter-sample-ops",
      title: "Operations stand-up",
      summary:
        "The team reviewed open follow-ups and agreed that meeting notes stay inside the workspace until sharing is confirmed.",
      transcript:
        "Mikolaj  00:00\nWe will keep using Otter for the stand-up notes.\n\nKulde  00:08\nConfirm consent and who the transcript is shared with before it leaves the workspace.\n\nMikolaj  00:16\nAction items stay here until someone confirms a ClickUp handoff.",
      transcriptTruncated: false,
      createdAt: "2026-11-02T08:30:00.000Z",
      owner: "Mikolaj",
      url: null,
      joinUrl: null,
      guests: [
        { name: "Mikolaj", email: "mikolaj@impactone.example" },
        { name: "Kulde", email: "kulde@impactone.example" },
      ],
      shares: [
        {
          name: "Operations",
          email: null,
          permission: "view",
          kind: "channel",
          discoverability: "private",
        },
      ],
      actionItems: [
        {
          id: "otter-sample-action-1",
          text: "Confirm transcript sharing before the notes are circulated.",
          assignee: "Kulde",
          completed: false,
        },
      ],
      insights: [
        {
          topic: "Sharing",
          points: ["Notes stay in the private Operations channel until sharing is reviewed."],
        },
      ],
      summaryStatus: "finished",
      actionStatus: "finished",
      source: {
        origin: "sample",
        system: "Otter.ai",
        detail: "Labelled sample until OTTER_API_KEY is set on an Enterprise workspace.",
      },
    },
    {
      id: "otter-sample-ioc",
      title: "IOC consultant check-in",
      summary: "Reference notes for a consultant check-in. Dates and fees in this sample are not the live plan.",
      transcript:
        "Saray  00:00\nThis is a sample transcript so the notes screen can be reviewed without a live Otter workspace.\n\nZygm  00:09\nSearch should find this line when someone looks for the consultant check-in.",
      transcriptTruncated: false,
      createdAt: "2026-10-28T11:00:00.000Z",
      owner: "Saray",
      url: null,
      joinUrl: null,
      guests: [{ name: "Saray", email: "saray@impactone.example" }],
      shares: [
        {
          name: "saray@impactone.example",
          email: "saray@impactone.example",
          permission: "collaborate",
          kind: "person",
          discoverability: null,
        },
      ],
      actionItems: [
        {
          id: "otter-sample-action-2",
          text: "Keep IOC dates on the sample plan until Saray's file is connected.",
          assignee: "Saray",
          completed: false,
        },
      ],
      insights: [],
      summaryStatus: "finished",
      actionStatus: "finished",
      source: {
        origin: "sample",
        system: "Otter.ai",
        detail: "Labelled sample until OTTER_API_KEY is set on an Enterprise workspace.",
      },
    },
  ];
}

function deskFrom(meetings: OtterMeeting[], connected: boolean, canRead: boolean): OtterDesk {
  return {
    connected,
    canRead,
    bestFit: OPERATING_MODEL.bestFit,
    implementationNote: OPERATING_MODEL.implementationNote,
    operatingModel: OPERATING_MODEL.operatingModel,
    consentStatement: OPERATING_MODEL.consentStatement,
    consentChecks: OPERATING_MODEL.consentChecks,
    steps: OPERATING_MODEL.steps,
    meetings,
  };
}

export class OtterService {
  async desk(user: PublicUser): Promise<{ desk: OtterDesk; note: string }> {
    if (!isStaff(user)) {
      return {
        note: "Meeting notes are limited to executive and manager roles.",
        desk: deskFrom([], false, false),
      };
    }
    if (!env.otterApiKey) {
      return {
        note: "Otter is not connected. Showing reference notes. Confirm consent and sharing before opening them.",
        desk: deskFrom(sampleMeetings(), false, false),
      };
    }
    const live = await otterClient.meetings();
    if (live.ok && live.data) {
      return {
        note: live.message,
        desk: deskFrom(live.data, true, true),
      };
    }
    return {
      note: live.configured ? `${live.message} Showing reference notes instead.` : live.message,
      desk: deskFrom(sampleMeetings(), false, false),
    };
  }
}

export const otterService = new OtterService();
