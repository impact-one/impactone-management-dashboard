import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { meetings } from "../../data/seed.js";
import { formatNewMessage, formatNextMeeting } from "./assistant.desk.js";
import type { SlackMessage } from "../../types/domain.js";

describe("assistant desk answers", () => {
  it("does not treat the seeded October meetings as upcoming", () => {
    const answer = formatNextMeeting(meetings, new Date("2026-11-04T12:00:00.000Z"));
    assert.match(answer.text, /no upcoming meeting/i);
    assert.doesNotMatch(answer.text, /Proposal check-in/);
  });

  it("names the channel on a Slack message", () => {
    const slack: SlackMessage = {
      id: "m1",
      channelId: "C1",
      channelName: "all-impact-testing",
      text: "The calendar connection is ready.",
      author: "Kulde",
      postedAt: "2026-11-04T09:00:00.000Z",
      source: { origin: "live", system: "Slack", detail: "Live" },
      href: null,
      files: [],
    };
    const answer = formatNewMessage({ slack, comment: null });
    assert.match(answer.text, /#all-impact-testing/);
    assert.match(answer.text, /live/);
    assert.equal(answer.origin, "live");
  });
});
