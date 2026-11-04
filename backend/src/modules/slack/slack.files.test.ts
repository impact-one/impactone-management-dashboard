import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapChannelMessages, slackFileUrl, slackPermalink, sniffImageType } from "./slack.files.js";

const channel = { id: "C123", name: "all-impact-testing" };

describe("slack file mapping", () => {
  it("keeps a file upload that has no message text", () => {
    const mapped = mapChannelMessages(
      [
        {
          type: "message",
          subtype: "file_share",
          text: "",
          user: "U123ABC456",
          ts: "1700000000.000100",
          files: [
            {
              id: "F0123ABCD",
              name: "site-photo.png",
              title: "Site photo",
              mimetype: "image/png",
              filetype: "png",
              pretty_type: "PNG",
              size: 24000,
              permalink: "https://impactone.slack.com/files/U123/F0123ABCD/site-photo.png",
              thumb_360: "https://files.slack.com/files-tmb/T1-F0123ABCD/site-photo_360.png",
              url_private: "https://files.slack.com/files-pri/T1-F0123ABCD/site-photo.png",
            },
          ],
        },
      ],
      channel,
      new Map([["U123ABC456", "Saray"]]),
    );

    assert.equal(mapped.length, 1);
    const message = mapped[0]?.message;
    assert.equal(message?.author, "Saray");
    assert.equal(message?.files.length, 1);
    assert.equal(message?.files[0]?.kind, "image");
    assert.equal(message?.files[0]?.preview, true);
    assert.equal(message?.files[0]?.permalink, "https://impactone.slack.com/files/U123/F0123ABCD/site-photo.png");
    assert.equal(mapped[0]?.previews[0]?.url, "https://files.slack.com/files-tmb/T1-F0123ABCD/site-photo_360.png");
    assert.equal(JSON.stringify(message).includes("url_private"), false);
  });

  it("describes a document without treating it as an inline image", () => {
    const mapped = mapChannelMessages(
      [
        {
          text: "Notes for tomorrow",
          ts: "1700000001.000100",
          user: "U999",
          files: [
            {
              id: "F99PDF01",
              name: "operations-notes.pdf",
              title: "Operations notes",
              mimetype: "application/pdf",
              filetype: "pdf",
              pretty_type: "PDF",
              size: 184320,
              permalink: "https://impactone.slack.com/files/U999/F99PDF01/operations-notes.pdf",
              thumb_360: "https://files.slack.com/files-tmb/T1-F99PDF01/operations-notes_360.png",
            },
          ],
        },
      ],
      channel,
      new Map(),
    );
    const file = mapped[0]?.message.files[0];
    assert.equal(file?.kind, "file");
    assert.equal(file?.prettyType, "PDF");
    assert.equal(file?.preview, true);
    assert.equal(file?.size, 184320);
  });

  it("drops join notices and empty rows, and rejects non-Slack file hosts", () => {
    const mapped = mapChannelMessages(
      [
        { subtype: "channel_join", text: "joined", ts: "1", user: "U1" },
        { text: "", ts: "2", user: "U1" },
        {
          text: "remote",
          ts: "3",
          user: "U1",
          files: [
            {
              id: "F00REMOTE",
              name: "secret.pdf",
              mimetype: "application/pdf",
              permalink: "https://evil.example/files/secret.pdf",
              url_private: "http://files.slack.com/files-pri/secret.pdf",
              thumb_360: "https://cdn.example/thumb.png",
            },
          ],
        },
      ],
      channel,
      new Map(),
    );
    assert.equal(mapped.length, 1);
    const file = mapped[0]?.message.files[0];
    assert.equal(file?.permalink, null);
    assert.equal(file?.preview, false);
    assert.equal(slackFileUrl("https://files.slack.com/files-pri/a.png"), "https://files.slack.com/files-pri/a.png");
    assert.equal(slackFileUrl("https://user:pass@files.slack.com/a.png"), null);
    assert.equal(slackPermalink("https://impactone.slack.com/files/a"), "https://impactone.slack.com/files/a");
    assert.equal(slackPermalink("https://files.slack.com/files-pri/a.png"), null);
  });

  it("treats a jpeg file type as an image even when the mime type is generic", () => {
    const mapped = mapChannelMessages(
      [
        {
          text: "",
          ts: "1700000002.000100",
          user: "U1",
          files: [
            {
              id: "F00JPG01",
              name: "board.jpg",
              title: "Board",
              mimetype: "application/octet-stream",
              filetype: "jpg",
              pretty_type: "JPEG",
              size: 1200,
              permalink: "https://impactone.slack.com/files/U1/F00JPG01/board.jpg",
              url_private: "https://files.slack.com/files-pri/T1-F00JPG01/board.jpg",
            },
          ],
        },
      ],
      channel,
      new Map(),
    );
    assert.equal(mapped[0]?.message.files[0]?.kind, "image");
    assert.equal(mapped[0]?.message.files[0]?.preview, true);
  });

  it("recognises image bytes and rejects markup", () => {
    assert.equal(sniffImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
    assert.equal(sniffImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
    assert.equal(sniffImageType(new TextEncoder().encode("<!doctype html>")), null);
  });
});
