import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDaysIcon, PlusIcon, RadioIcon, Share2Icon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "../components/EmptyState";
import { ErrorNote, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { DeskSkeleton } from "../components/PageSkeleton";
import { SourceBadge } from "../components/SourceBadge";
import { ChartPanel, ChartRow, SoftDonutChart, SoftProgressTracks, countBy } from "../components/charts";
import { MetricStrip, Section } from "../components/Surface";
import { api } from "../lib/api";
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
  const { data, error, loading, reload } = useApi<Envelope<CalendarDesk>>("/calendar/desk");
  const desk = data?.data;
  const [formError, setFormError] = useState<string | undefined>();
  const [saved, setSaved] = useState<string | undefined>();
  const [booking, setBooking] = useState(false);
  const [availabilityNote, setAvailabilityNote] = useState<string | undefined>();

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
        lede={
          desk && !desk.canSchedule
            ? "View upcoming meetings. Booking and calendar sharing require manager access."
            : "Review the shared agenda and schedule meetings on calendars you can edit."
        }
      >
        {desk?.canSchedule ? (
          <Button type="button" onClick={() => setBooking((open) => !open)}>
            <PlusIcon data-icon="inline-start" />
            {booking ? "Close form" : "Book a meeting"}
          </Button>
        ) : null}
      </PageHeader>
      {loading && !data ? <DeskSkeleton label="Loading agenda" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? <Note>{data.meta.note}</Note> : null}
      {saved ? <Note>{saved}</Note> : null}
      {formError ? <ErrorNote message={formError} /> : null}
      {desk ? (
        <div className="space-y-6">
          <MetricStrip
            items={[
              { label: "Meetings", value: meetings.length, icon: <CalendarDaysIcon /> },
              { label: "Calendars", value: desk.calendars.length, icon: <Share2Icon /> },
              { label: "Live", value: meetings.filter((row) => row.source.origin === "live").length, icon: <RadioIcon /> },
              { label: "Days shown", value: grouped.length, icon: <ClockIcon /> },
              {
                label: "Can book",
                value: desk.canSchedule ? "Yes" : "No",
                icon: <PlusIcon />,
                tone: desk.canSchedule ? "good" : "muted",
              },
            ]}
          />
          {meetings.length > 0 ? (
            <ChartRow>
              <ChartPanel title="Meeting sources" className="lg:col-span-4">
                <SoftDonutChart
                  data={countBy(meetings, (row) => {
                    if (row.source.origin === "live") return "Live";
                    if (row.source.origin === "sample") return "Sample";
                    if (row.source.origin === "documented") return "Documented";
                    return "Needs review";
                  })}
                  centerLabel="Meetings"
                  compact
                />
              </ChartPanel>
              <ChartPanel title="By day" className="lg:col-span-8">
                <SoftProgressTracks data={grouped.map(([day, rows]) => ({ name: dayHeading(day), value: rows.length }))} />
              </ChartPanel>
            </ChartRow>
          ) : null}
          {booking && desk.canSchedule ? (
            <ScheduleForm
              calendars={desk.calendars}
              fallbackZone={desk.timeZone}
              onCancel={() => setBooking(false)}
              onSubmit={(body) =>
                run(async () => {
                  const message = await schedule(body);
                  setBooking(false);
                  return message;
                })
              }
            />
          ) : null}

          <Section title={meetings.length === 1 ? "1 meeting" : `${meetings.length} meetings`}>
            {meetings.length === 0 ? (
              <EmptyState
                title="Nothing on the agenda"
                description={
                  desk.canSchedule
                    ? "Book a meeting and it will show up here."
                    : "Meetings will show up here when they are on a calendar you can read."
                }
              />
            ) : (
              <div className="surface overflow-hidden rounded-2xl bg-card ring-0">
                {grouped.map(([day, rows]) => (
                  <div key={day} className="border-b border-border/60 last:border-b-0">
                    <h3 className="bg-muted/50 px-5 py-2.5 text-xs font-semibold text-muted-foreground">
                      {dayHeading(day)}
                    </h3>
                    <ul className="list-none p-0">
                      {rows.map((row) => (
                        <li key={row.id} className="flex flex-col gap-2 border-b px-4 py-3.5 last:border-b-0 sm:flex-row sm:gap-6">
                          <div className="border-l-2 border-primary/35 pl-3 sm:w-36 sm:shrink-0">
                            <p className="text-sm font-medium tabular-nums">{row.timeLabel}</p>
                            <p className="text-xs text-muted-foreground">{row.timeZone}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {row.href ? (
                                <a
                                  href={row.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                                >
                                  {row.title}
                                </a>
                              ) : (
                                <p className="text-sm font-medium">{row.title}</p>
                              )}
                              <SourceBadge origin={row.source.origin} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {row.calendarName}
                              {row.location ? ` · ${row.location}` : ""}
                            </p>
                            <p className="mt-1 text-sm text-foreground/80">{guestSummary(row)}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {row.reminders.length > 0 ? row.reminders.map(reminderLabel).join(" · ") : "No reminders"}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Calendars">
            <ul className="surface divide-y overflow-hidden rounded-2xl bg-card p-0 ring-0">
              {desk.calendars.map((calendar) => (
                <li key={calendar.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{calendar.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {calendar.timeZone}
                        {calendar.primary ? " · Primary" : ""} · {roleLabel(calendar.accessRole)}
                      </p>
                    </div>
                    <SourceBadge origin={calendar.source.origin} />
                  </div>
                  {calendar.shares.length > 0 ? (
                    <ul className="mt-3 list-none space-y-1.5 p-0">
                      {calendar.shares.map((share) => (
                        <li key={share.email} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span>{share.email}</span>
                          <span className="text-xs text-muted-foreground">{roleLabel(share.role)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {desk.canSchedule ? "No one else is on this list." : "The sharing list is hidden for your role."}
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
                          return `${email} can now ${roleLabel(role).toLowerCase()}.`;
                        })
                      }
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>

          {desk.canSchedule ? (
            <Section title="People">
              <p className="mb-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                Check who is free before you book, or change the guests on a meeting that is already on the calendar.
              </p>
              <div className="grid gap-4">
                <AvailabilityForm
                  fallbackZone={desk.timeZone}
                  result={availabilityNote}
                  onSubmit={async (body) => {
                    setFormError(undefined);
                    setAvailabilityNote(undefined);
                    try {
                      setAvailabilityNote(await checkAvailability(body));
                    } catch (reason) {
                      setFormError(reason instanceof Error ? reason.message : "Request failed.");
                    }
                  }}
                />
                <InvitationEditor
                  meetings={meetings.filter((meeting) => meeting.startsAt)}
                  onSubmit={(meetingId, invitations) =>
                    run(async () => {
                      await api(`/calendar/meetings/${encodeURIComponent(meetingId)}/invitations`, {
                        method: "POST",
                        body: JSON.stringify({ invitations }),
                      });
                      return "Guests updated.";
                    })
                  }
                />
              </div>
            </Section>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function ScheduleForm({
  calendars,
  fallbackZone,
  onSubmit,
  onCancel,
}: {
  calendars: CalendarDesk["calendars"];
  fallbackZone: string;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel: () => void;
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
    <form className="surface rounded-2xl bg-card p-4 ring-0 sm:p-5" onSubmit={submit}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight">Book a meeting</h2>
        <p className="mt-1 text-sm text-muted-foreground">Name it, pick a time, and add the people who should get the invite.</p>
      </div>
      <div className="grid gap-4">
        <Field label="Meeting name">
          <Input name="title" required maxLength={140} placeholder="Weekly planning" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Date">
            <Input name="date" type="date" required />
          </Field>
          <Field label="Start">
            <Input name="startTime" type="time" required />
          </Field>
          <Field label="End">
            <Input name="endTime" type="time" required />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
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
                  {calendar.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Time zone">
            <Input name="timeZone" value={timeZone} onChange={(event) => setTimeZone(event.target.value)} required />
          </Field>
        </div>
        <Field label="Guests" hint="Separate email addresses with a comma. Leave blank if it is just you.">
          <Input name="invitations" placeholder="saray@impactone.example, kulde@impactone.example" />
        </Field>
        <Field label="Place" hint="Optional.">
          <Input name="location" maxLength={200} placeholder="Room, link, or address" />
        </Field>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Reminders</legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={emailReminder}
                onChange={(event) => setEmailReminder(event.target.checked)}
              />
              Email, 1 day before
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={popupReminder}
                onChange={(event) => setPopupReminder(event.target.checked)}
              />
              Popup, 30 minutes before
            </label>
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Book meeting</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

function AvailabilityForm({
  fallbackZone,
  result,
  onSubmit,
}: {
  fallbackZone: string;
  result?: string;
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
    <form className="surface rounded-2xl bg-card p-4 ring-0" onSubmit={submit}>
      <h3 className="text-sm font-medium">Who is free?</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Enter the people and the time you have in mind.</p>
      <div className="mt-3 grid gap-3">
        <Field label="People">
          <Input name="emails" required placeholder="saray@impactone.example, kulde@impactone.example" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Date">
            <Input name="date" type="date" required />
          </Field>
          <Field label="From">
            <Input name="startTime" type="time" required />
          </Field>
          <Field label="To">
            <Input name="endTime" type="time" required />
          </Field>
          <Field label="Time zone">
            <Input name="timeZone" required defaultValue={fallbackZone} />
          </Field>
        </div>
        <div>
          <Button type="submit" variant="outline">
            Check
          </Button>
        </div>
        {result ? <p className="text-sm leading-6 text-foreground">{result}</p> : null}
      </div>
    </form>
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
      <select name="role" className={fieldClass} defaultValue="reader" aria-label="What they can do">
        <option value="writer">Can edit</option>
        <option value="reader">See details</option>
        <option value="freeBusyReader">Free/busy only</option>
      </select>
      <Button type="submit" variant="outline">
        Share
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
    <div className="surface rounded-2xl bg-card p-4 ring-0">
      <h3 className="text-sm font-medium">Guests on a meeting</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Add someone, mark them optional, or record their reply.</p>
      <div className="mt-3 grid gap-3">
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
            <li key={person.email} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_9rem_auto_auto] sm:items-center">
              <span className="text-sm">{person.name || person.email}</span>
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
                <option value="tentative">Maybe</option>
                <option value="declined">Declined</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
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
            Save guests
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-5 text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

async function schedule(body: Record<string, unknown>) {
  if (Array.isArray(body.reminders) && body.reminders.length === 0) {
    throw new Error("Choose an email reminder, a popup, or both.");
  }
  await api("/calendar/meetings", { method: "POST", body: JSON.stringify(body) });
  return "Meeting booked. It is on the agenda below.";
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

function dayHeading(value: string) {
  if (value === "undated") return "Not booked yet";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
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
  if (response === "tentative") return "maybe";
  return "no reply";
}

function guestSummary(meeting: Meeting) {
  if (meeting.invitations.length === 0) return "No guests";
  return meeting.invitations
    .map((person) => {
      const name = person.name || person.email;
      return person.optional ? `${name} (optional, ${responseLabel(person.response)})` : `${name} (${responseLabel(person.response)})`;
    })
    .join(", ");
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
