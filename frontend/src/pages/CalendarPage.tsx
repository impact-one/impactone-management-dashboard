import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../app/AuthContext";
import { DataTable } from "../components/DataTable";
import { Due } from "../components/Due";
import { EmptyState } from "../components/EmptyState";
import { ErrorNote, Loading, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { SourceBadge } from "../components/SourceBadge";
import { Section } from "../components/Surface";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { useApi } from "../lib/useApi";
import type {
  AvailabilityReport,
  CalendarAccess,
  CalendarDesk,
  Envelope,
  InvitationResponse,
  Meeting,
  MeetingInvitation,
} from "../types";

const fieldClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CalendarPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<Envelope<CalendarDesk>>("/calendar/desk");
  const desk = data?.data;
  const [formError, setFormError] = useState<string | undefined>();
  const [saved, setSaved] = useState<string | undefined>();

  const meetings = desk?.meetings ?? [];
  const grouped = useMemo(() => groupByDay(meetings), [meetings]);

  async function run(action: () => Promise<string>) {
    setFormError(undefined);
    setSaved(undefined);
    try {
      const message = await action();
      setSaved(message);
      reload();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Request failed.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Agenda"
        lede={desk?.operatingModel ?? "Schedule meetings, manage invitations, check availability, and set sharing on the team calendars."}
      >
        {desk ? (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Badge>{desk.bestFit}</Badge>
            <p className="max-w-xs text-xs leading-5 text-muted-foreground sm:text-right">{desk.implementationNote}</p>
          </div>
        ) : null}
      </PageHeader>
      {loading && !data ? <Loading label="Loading agenda" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? <Note>{data.meta.note}</Note> : null}
      {saved ? <Note>{saved}</Note> : null}
      {formError ? <ErrorNote message={formError} /> : null}
      {desk ? (
        <>
          <Section title="How the tools work together">
            <ol className="grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
              {desk.steps.map((step, index) => (
                <li key={step.name} className="rounded-xl border bg-card p-3 shadow-sm">
                  <span className="grid size-6 place-items-center rounded-md bg-accent text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="mt-2 text-sm font-medium">{step.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                </li>
              ))}
            </ol>
          </Section>

          {desk.canSchedule ? (
            <ScheduleForm
              calendars={desk.calendars}
              fallbackZone={desk.timeZone}
              onSubmit={(body) => run(() => schedule(body))}
            />
          ) : (
            <Section title="Schedule">
              <EmptyState
                title="Scheduling is limited to executive and manager roles"
                description={
                  user
                    ? `${user.name} can read the agenda. Invitations and sharing stay with the people who run the calendars.`
                    : "Sign in as an executive or manager to schedule."
                }
              />
            </Section>
          )}

          {desk.canSchedule ? (
            <AvailabilityForm fallbackZone={desk.timeZone} onSubmit={(body) => run(() => checkAvailability(body))} />
          ) : null}

          <Section title="Shared calendars">
            <div className="grid gap-3">
              {desk.calendars.map((calendar) => (
                <article key={calendar.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">{calendar.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {calendar.timeZone}
                        {calendar.primary ? " · Primary" : ""} · {roleLabel(calendar.accessRole)}
                      </p>
                    </div>
                    <SourceBadge origin={calendar.source.origin} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{calendar.source.detail}</p>
                  {calendar.shares.length > 0 ? (
                    <ul className="mt-3 grid list-none gap-1 p-0 text-sm">
                      {calendar.shares.map((share) => (
                        <li key={share.email} className="flex flex-wrap items-center justify-between gap-2">
                          <span>{share.email}</span>
                          <span className="text-xs text-muted-foreground">{roleLabel(share.role)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {desk.canSchedule ? "No one else is on this list." : "Sharing list is hidden for this role."}
                    </p>
                  )}
                  {desk.canSchedule && calendar.accessRole === "owner" ? (
                    <ShareForm
                      onSubmit={(email, role) =>
                        run(async () => {
                          await api(`/calendar/calendars/${encodeURIComponent(calendar.id)}/sharing`, {
                            method: "POST",
                            body: JSON.stringify({ email, role }),
                          });
                          return `Sharing for ${email} is now ${roleLabel(role).toLowerCase()}.`;
                        })
                      }
                    />
                  ) : null}
                </article>
              ))}
            </div>
          </Section>

          {desk.canSchedule ? (
            <InvitationEditor
              meetings={meetings.filter((meeting) => meeting.startsAt)}
              onSubmit={(meetingId, invitations) =>
                run(async () => {
                  await api(`/calendar/meetings/${encodeURIComponent(meetingId)}/invitations`, {
                    method: "POST",
                    body: JSON.stringify({ invitations }),
                  });
                  return "Invitations updated.";
                })
              }
            />
          ) : null}

          {meetings.length === 0 ? (
            <Section title="Agenda">
              <EmptyState title="No meetings in view" description="Scheduled meetings will appear here." />
            </Section>
          ) : (
            grouped.map(([day, rows]) => (
              <Section key={day} title={day === "undated" ? "Date not set" : formatDate(day)}>
                <DataTable
                  caption={`Meetings on ${day === "undated" ? "unset dates" : formatDate(day)}`}
                  rows={rows}
                  columns={[
                    {
                      key: "title",
                      header: "Meeting",
                      render: (row) => (
                        <span>
                          <span className="font-medium">{row.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {row.calendarName}
                            {row.location ? ` · ${row.location}` : ""}
                          </span>
                        </span>
                      ),
                    },
                    { key: "when", header: "When", render: (row) => <Due value={row.date} /> },
                    { key: "time", header: "Time", render: (row) => row.timeLabel },
                    { key: "zone", header: "Time zone", render: (row) => row.timeZone },
                    {
                      key: "people",
                      header: "Invitations",
                      render: (row) =>
                        row.invitations.length === 0
                          ? "No guests"
                          : row.invitations.map((person) => `${person.name || person.email} (${responseLabel(person.response)})`).join(", "),
                    },
                    {
                      key: "reminders",
                      header: "Reminders",
                      render: (row) => row.reminders.map(reminderLabel).join(", ") || "None",
                    },
                    { key: "source", header: "Source", render: (row) => <SourceBadge origin={row.source.origin} /> },
                  ]}
                />
              </Section>
            ))
          )}
        </>
      ) : null}
    </>
  );
}

function ScheduleForm({
  calendars,
  fallbackZone,
  onSubmit,
}: {
  calendars: CalendarDesk["calendars"];
  fallbackZone: string;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const writable = calendars.filter((calendar) => calendar.accessRole === "owner" || calendar.accessRole === "writer");
  const [calendarId, setCalendarId] = useState(writable[0]?.id ?? "");
  const selected = writable.find((calendar) => calendar.id === calendarId);
  const [timeZone, setTimeZone] = useState(selected?.timeZone || fallbackZone);
  const [emailReminder, setEmailReminder] = useState(true);
  const [popupReminder, setPopupReminder] = useState(true);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reminders = [
      emailReminder ? { method: "email", minutesBefore: 1440 } : null,
      popupReminder ? { method: "popup", minutesBefore: 30 } : null,
    ].filter(Boolean);
    const invitations = splitEmails(String(form.get("invitations") ?? "")).map((email) => ({ email, optional: false }));
    onSubmit({
      calendarId,
      title: String(form.get("title") ?? ""),
      date: String(form.get("date") ?? ""),
      startTime: String(form.get("startTime") ?? ""),
      endTime: String(form.get("endTime") ?? ""),
      timeZone,
      location: String(form.get("location") ?? ""),
      invitations,
      reminders,
    });
  }

  return (
    <Section title="Schedule a meeting">
      <form className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2" onSubmit={submit}>
        <Field label="Calendar">
          <select
            className={fieldClass}
            value={calendarId}
            onChange={(event) => {
              const next = event.target.value;
              setCalendarId(next);
              const zone = writable.find((calendar) => calendar.id === next)?.timeZone;
              if (zone) setTimeZone(zone);
            }}
          >
            {writable.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.name} ({calendar.timeZone})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Time zone">
          <Input name="timeZone" value={timeZone} onChange={(event) => setTimeZone(event.target.value)} required />
        </Field>
        <Field label="Title">
          <Input name="title" required maxLength={140} placeholder="Weekly planning" />
        </Field>
        <Field label="Location">
          <Input name="location" maxLength={200} placeholder="Optional" />
        </Field>
        <Field label="Date">
          <Input name="date" type="date" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <Input name="startTime" type="time" required />
          </Field>
          <Field label="End">
            <Input name="endTime" type="time" required />
          </Field>
        </div>
        <Field label="Invite by email">
          <Input name="invitations" placeholder="saray@impactone.example, kulde@impactone.example" />
        </Field>
        <fieldset className="grid content-end gap-2 text-sm">
          <legend className="font-medium">Reminders</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={emailReminder} onChange={(event) => setEmailReminder(event.target.checked)} />
            Email, 1 day before
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={popupReminder} onChange={(event) => setPopupReminder(event.target.checked)} />
            Popup, 30 minutes before
          </label>
        </fieldset>
        <div className="sm:col-span-2">
          <Button type="submit">Schedule meeting</Button>
        </div>
      </form>
    </Section>
  );
}

function AvailabilityForm({
  fallbackZone,
  onSubmit,
}: {
  fallbackZone: string;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      date: String(form.get("date") ?? ""),
      startTime: String(form.get("startTime") ?? ""),
      endTime: String(form.get("endTime") ?? ""),
      timeZone: String(form.get("timeZone") ?? fallbackZone),
      emails: splitEmails(String(form.get("emails") ?? "")),
    });
  }

  return (
    <Section title="Availability">
      <form className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2" onSubmit={submit}>
        <Field label="People">
          <Input name="emails" required placeholder="saray@impactone.example, kulde@impactone.example" />
        </Field>
        <Field label="Time zone">
          <Input name="timeZone" required defaultValue={fallbackZone} />
        </Field>
        <Field label="Date">
          <Input name="date" type="date" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <Input name="startTime" type="time" required />
          </Field>
          <Field label="To">
            <Input name="endTime" type="time" required />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="outline">
            Check free/busy
          </Button>
        </div>
      </form>
    </Section>
  );
}

function ShareForm({ onSubmit }: { onSubmit: (email: string, role: CalendarAccess) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const role = String(form.get("role") ?? "reader") as CalendarAccess;
    onSubmit(String(form.get("email") ?? ""), role);
    event.currentTarget.reset();
  }

  return (
    <form className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-[1fr_10rem_auto]" onSubmit={submit}>
      <Input name="email" type="email" required placeholder="person@impactone.example" aria-label="Person to share with" />
      <select name="role" className={fieldClass} defaultValue="reader" aria-label="Sharing permission">
        <option value="writer">Can edit</option>
        <option value="reader">See details</option>
        <option value="freeBusyReader">Free/busy only</option>
      </select>
      <Button type="submit" variant="outline">
        Update sharing
      </Button>
    </form>
  );
}

function InvitationEditor({
  meetings,
  onSubmit,
}: {
  meetings: Meeting[];
  onSubmit: (meetingId: string, invitations: MeetingInvitation[]) => void;
}) {
  const [meetingId, setMeetingId] = useState(meetings[0]?.id ?? "");
  const [rows, setRows] = useState<MeetingInvitation[]>(meetings[0]?.invitations ?? []);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (meetingId && meetings.some((meeting) => meeting.id === meetingId)) return;
    const first = meetings[0];
    if (!first) return;
    setMeetingId(first.id);
    setRows(first.invitations);
  }, [meetings, meetingId]);

  function choose(id: string) {
    setMeetingId(id);
    setRows(meetings.find((meeting) => meeting.id === id)?.invitations ?? []);
  }

  if (meetings.length === 0) return null;

  return (
    <Section title="Invitations">
      <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <Field label="Meeting">
          <select className={fieldClass} value={meetingId} onChange={(event) => choose(event.target.value)}>
            {meetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {meeting.title}
              </option>
            ))}
          </select>
        </Field>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No guests yet.</p> : null}
        <ul className="grid list-none gap-2 p-0">
          {rows.map((person) => (
            <li key={person.email} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_9rem_auto_auto]">
              <span className="self-center text-sm">{person.name || person.email}</span>
              <select
                className={fieldClass}
                value={person.response}
                aria-label={`Reply from ${person.email}`}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((row) =>
                      row.email === person.email ? { ...row, response: event.target.value as InvitationResponse } : row,
                    ),
                  )
                }
              >
                <option value="needsAction">No reply</option>
                <option value="accepted">Accepted</option>
                <option value="tentative">Tentative</option>
                <option value="declined">Declined</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={person.optional}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((row) => (row.email === person.email ? { ...row, optional: event.target.checked } : row)),
                    )
                  }
                />
                Optional
              </label>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRows((current) => current.filter((row) => row.email !== person.email))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const next = email.trim().toLowerCase();
            if (!next || rows.some((row) => row.email === next)) return;
            setRows((current) => [...current, { email: next, name: "", response: "needsAction", optional: false }]);
            setEmail("");
          }}
        >
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Add an email"
            aria-label="Add guest"
            className="max-w-sm"
          />
          <Button type="submit" variant="outline">
            Add guest
          </Button>
        </form>
        <div>
          <Button type="button" onClick={() => onSubmit(meetingId, rows)}>
            Save invitations
          </Button>
        </div>
      </div>
    </Section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

async function schedule(body: Record<string, unknown>) {
  if (Array.isArray(body.reminders) && body.reminders.length === 0) {
    throw new Error("Choose an email reminder, a popup, or both.");
  }
  await api("/calendar/meetings", { method: "POST", body: JSON.stringify(body) });
  return "Meeting scheduled. Reminders stay on the event.";
}

async function checkAvailability(body: Record<string, unknown>) {
  const result = await api<Envelope<AvailabilityReport>>("/calendar/availability", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const report = result.data;
  if (report.clear) return `Everyone is free ${report.windowStart} to ${report.windowEnd} (${report.timeZone}).`;
  const lines = report.people.map((person) => {
    if (person.warning) return `${person.email}: ${person.warning}`;
    if (person.busy.length === 0) return `${person.email} is free.`;
    const blocks = person.busy.map((block) => block.title || `${block.start}–${block.end}`).join("; ");
    return `${person.email} is busy: ${blocks}.`;
  });
  return lines.join(" ");
}

function groupByDay(meetings: Meeting[]) {
  const map = new Map<string, Meeting[]>();
  for (const meeting of meetings) {
    const key = meeting.date ?? "undated";
    const list = map.get(key) ?? [];
    list.push(meeting);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => {
    if (a === "undated") return 1;
    if (b === "undated") return -1;
    return a.localeCompare(b);
  });
}

function splitEmails(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function roleLabel(role: CalendarAccess) {
  if (role === "owner") return "Owner";
  if (role === "writer") return "Can edit";
  if (role === "reader") return "See details";
  return "Free/busy only";
}

function responseLabel(response: InvitationResponse) {
  if (response === "accepted") return "accepted";
  if (response === "declined") return "declined";
  if (response === "tentative") return "tentative";
  return "no reply";
}

function reminderLabel(reminder: Meeting["reminders"][number]) {
  const method = reminder.method === "email" ? "Email" : "Popup";
  if (reminder.minutesBefore % 1440 === 0 && reminder.minutesBefore >= 1440) {
    const days = reminder.minutesBefore / 1440;
    return `${method} ${days} day${days === 1 ? "" : "s"} before`;
  }
  if (reminder.minutesBefore % 60 === 0 && reminder.minutesBefore >= 60) {
    const hours = reminder.minutesBefore / 60;
    return `${method} ${hours} hour${hours === 1 ? "" : "s"} before`;
  }
  return `${method} ${reminder.minutesBefore} min before`;
}
