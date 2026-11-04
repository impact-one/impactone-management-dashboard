import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AppWindowIcon,
  BellIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ClockIcon,
  MailIcon,
  PlusIcon,
  Share2Icon,
  UserRoundIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "../components/EmptyState";
import { ErrorNote, Note, PageHeader, RetryableError } from "../components/PageHeader";
import { DeskSkeleton } from "../components/PageSkeleton";
import { SourceBadge } from "../components/SourceBadge";
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
  "h-8 w-full min-w-0 max-w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CalendarPage() {
  const { data, error, loading, reload } = useApi<Envelope<CalendarDesk>>("/calendar/desk");
  const desk = data?.data;
  const [formError, setFormError] = useState<string | undefined>();
  const [saved, setSaved] = useState<string | undefined>();
  const [booking, setBooking] = useState(false);
  const [availabilityNote, setAvailabilityNote] = useState<string | undefined>();

  const meetings = desk?.meetings ?? [];
  const grouped = useMemo(() => groupByDay(meetings), [meetings]);
  const bookedCount = meetings.filter((meeting) => meeting.date).length;
  const waitingCount = meetings.length - bookedCount;

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
        title="Calendar"
        lede={
          desk && !desk.canSchedule
            ? "View upcoming meetings. Booking and calendar sharing require manager access."
            : "Review the shared agenda and schedule meetings on calendars you can edit."
        }
      >
        {desk?.canSchedule ? (
          <Button
            type="button"
            size={booking ? "icon" : "default"}
            className={booking ? undefined : "w-full sm:w-auto"}
            aria-label={booking ? "Close form" : undefined}
            onClick={() => setBooking((open) => !open)}
          >
            {booking ? (
              <XIcon />
            ) : (
              <>
                <PlusIcon data-icon="inline-start" />
                Book a meeting
              </>
            )}
          </Button>
        ) : null}
      </PageHeader>
      {loading && !data ? <DeskSkeleton label="Loading agenda" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {data?.meta.note ? <Note>{data.meta.note}</Note> : null}
      {saved ? <Note>{saved}</Note> : null}
      {formError ? <ErrorNote message={formError} /> : null}
      {desk ? (
        <div className="min-w-0 space-y-6">
          <MetricStrip
            items={[
              {
                label: "Scheduled",
                value: bookedCount,
                hint: "Meetings that already have a day and time.",
                icon: <CalendarDaysIcon />,
              },
              {
                label: "Not booked yet",
                value: waitingCount,
                hint: "Named here, but no time has been set.",
                icon: <ClockIcon />,
              },
              {
                label: "Calendars",
                value: desk.calendars.length,
                hint: "Google calendars this account can open.",
                icon: <Share2Icon />,
              },
            ]}
          />
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

          <section className="mt-9" aria-labelledby="schedule-heading">
            <div className="mb-4 flex items-center gap-2.5">
              <h2 id="schedule-heading" className="text-[15px] font-semibold tracking-tight text-foreground">
                Schedule
              </h2>
              <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-xs font-medium text-muted-foreground">
                {countPhrase(meetings.length, "event")}
              </span>
            </div>
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
                    <DayHeader day={day} count={rows.length} />
                    <ul className="list-none p-0">
                      {rows.map((row) => (
                        <ScheduleEvent key={row.id} meeting={row} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Section title="Calendars">
            <ul className="grid list-none gap-4 p-0">
              {desk.calendars.map((calendar) => (
                <li key={calendar.id} className="surface rounded-2xl bg-card px-4 py-4 ring-0 sm:px-5 sm:py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{calendar.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {calendar.timeZone}
                        {calendar.primary ? " · Main calendar" : ""}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{accessSentence(calendar.accessRole)}</p>
                    </div>
                    <SourceBadge origin={calendar.source.origin} />
                  </div>
                  {calendar.shares.length > 0 ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-border/70">
                      <div className="flex items-center justify-between bg-muted/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                        <span>People</span>
                        <span>Access level</span>
                      </div>
                      <ul className="list-none divide-y divide-border/70 bg-card p-0">
                        {calendar.shares.map((share) => (
                          <li key={share.email} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold tracking-wide text-muted-foreground">
                                {emailInitials(share.email)}
                              </span>
                              <span className="truncate text-sm text-foreground">{share.email}</span>
                            </span>
                            <span className="shrink-0 text-sm text-muted-foreground">{roleLabel(share.role)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {desk.canSchedule ? "Not shared with anyone else." : "The sharing list is hidden for your role."}
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
              <div className="grid min-w-0 gap-4">
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
    <form className="surface min-w-0 rounded-2xl bg-card p-4 ring-0 sm:p-5" onSubmit={submit}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Book a meeting</h2>
          <p className="mt-1 text-sm text-muted-foreground">Name it, pick a time, and add the people who should get the invite.</p>
        </div>
        <Button type="button" variant="outline" size="icon" aria-label="Close form" onClick={onCancel}>
          <XIcon />
        </Button>
      </div>
      <div className="grid gap-4">
        <Field label="Meeting name">
          <Input name="title" required maxLength={140} placeholder="Weekly planning" />
        </Field>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.5rem),1fr))] gap-3">
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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3">
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
    <form className="surface min-w-0 rounded-2xl bg-card p-4 ring-0" onSubmit={submit}>
      <h3 className="text-sm font-medium">Who is free?</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Enter the people and the time you have in mind.</p>
      <div className="mt-3 grid gap-3">
        <Field label="People">
          <Input name="emails" required placeholder="saray@impactone.example, kulde@impactone.example" />
        </Field>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.5rem),1fr))] gap-3">
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
    <form className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center" onSubmit={submit}>
      <Input
        name="email"
        type="email"
        required
        placeholder="Add people by email"
        aria-label="Person to share with"
        className="h-10 flex-1 rounded-lg bg-background"
      />
      <div className="relative sm:w-40">
        <select
          name="role"
          defaultValue="reader"
          aria-label="What they can do"
          className="h-10 w-full appearance-none rounded-lg border border-primary bg-background px-3 pr-8 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <option value="writer">Can edit</option>
          <option value="reader">See details</option>
          <option value="freeBusyReader">Free/busy only</option>
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      <Button type="submit" variant="outline" className="h-10 rounded-lg border-primary px-4 text-primary hover:bg-primary/5">
        Share
      </Button>
    </form>
  );
}

const replySelectClass =
  "h-9 w-full min-w-0 appearance-none rounded-lg border border-input bg-background px-3 pr-8 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function ReplySelect({
  person,
  onChange,
}: {
  person: MeetingInvitation;
  onChange: (value: InvitationResponse) => void;
}) {
  return (
    <span className="relative block min-w-0">
      <select
        className={replySelectClass}
        value={person.response}
        aria-label={`Reply from ${person.email}`}
        onChange={(event) => onChange(event.target.value as InvitationResponse)}
      >
        <option value="needsAction">No reply</option>
        <option value="accepted">Accepted</option>
        <option value="tentative">Maybe</option>
        <option value="declined">Declined</option>
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
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

  function setResponse(address: string, response: InvitationResponse) {
    setRows((current) => current.map((row) => (row.email === address ? { ...row, response } : row)));
  }

  function setOptional(address: string, optional: boolean) {
    setRows((current) => current.map((row) => (row.email === address ? { ...row, optional } : row)));
  }

  function removeGuest(address: string) {
    setRows((current) => current.filter((row) => row.email !== address));
  }

  return (
    <div className="@container surface min-w-0 rounded-2xl bg-card p-4 ring-0 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <UserRoundIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Guests on a meeting</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Add someone, mark them optional, or record their reply.</p>
        </div>
      </div>
      <label className="mt-4 grid gap-1.5 text-sm">
        <span className="font-medium">Meeting</span>
        <span className="relative block min-w-0">
          <select
            className="h-10 w-full min-w-0 appearance-none rounded-lg border border-input bg-background px-3 pr-8 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={meetingId}
            onChange={(event) => choose(event.target.value)}
          >
            {meetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {meeting.title}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        </span>
      </label>
      <ul className="mt-4 grid list-none gap-2 p-0 @min-[42rem]:hidden">
        {rows.length === 0 ? (
          <li className="rounded-xl border border-border/70 px-3 py-3 text-sm text-muted-foreground">No guests yet.</li>
        ) : (
          rows.map((person) => (
            <li key={person.email} className="min-w-0 rounded-xl border border-border/70 p-3">
              <p className="truncate text-sm font-medium text-foreground">{person.name || person.email}</p>
              {person.name ? <p className="truncate text-xs text-muted-foreground">{person.email}</p> : null}
              <label className="mt-3 grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Response</span>
                <ReplySelect person={person} onChange={(response) => setResponse(person.email, response)} />
              </label>
              <div className="mt-3 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={person.optional}
                    aria-label={`Optional guest ${person.email}`}
                    onChange={(event) => setOptional(person.email, event.target.checked)}
                  />
                  Optional
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-muted-foreground"
                  onClick={() => removeGuest(person.email)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
      <div className="mt-4 hidden min-w-0 overflow-x-auto rounded-xl border border-border/70 @min-[42rem]:block">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/70 text-left text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Guest</th>
              <th className="px-3 py-2.5 font-medium">Response</th>
              <th className="px-3 py-2.5 text-center font-medium">Optional</th>
              <th className="px-3 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-muted-foreground">
                  No guests yet.
                </td>
              </tr>
            ) : (
              rows.map((person) => (
                <tr key={person.email} className="border-t border-border/70">
                  <td className="px-3 py-2.5 text-foreground">{person.name || person.email}</td>
                  <td className="px-3 py-2.5">
                    <span className="block max-w-[11rem]">
                      <ReplySelect person={person} onChange={(response) => setResponse(person.email, response)} />
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={person.optional}
                      aria-label={`Optional guest ${person.email}`}
                      onChange={(event) => setOptional(person.email, event.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground"
                      onClick={() => removeGuest(person.email)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <form
        className="mt-3 flex flex-col gap-2 @min-[24rem]:flex-row @min-[24rem]:items-center"
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
          className="h-10 w-full min-w-0 rounded-lg bg-background @min-[24rem]:max-w-xs"
        />
        <Button type="submit" variant="outline" className="h-10 w-full rounded-lg bg-background px-4 @min-[24rem]:w-auto">
          Add guest
        </Button>
      </form>
      <Button type="button" className="mt-3 w-full sm:w-auto" onClick={() => onSubmit(meetingId, rows)}>
        Save guests
      </Button>
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

function ScheduleEvent({ meeting }: { meeting: Meeting }) {
  const duration = durationLabel(meeting);
  const booked = Boolean(meeting.date);
  const identity = booked ? meeting.ownerEmail || meeting.owner : meeting.calendarName;
  const IdentityIcon = booked && (meeting.ownerEmail || meeting.owner) ? MailIcon : UsersIcon;

  return (
    <li className="@container relative border-b border-border/60 px-4 py-4 last:border-b-0 sm:px-5">
      <span
        className={`absolute inset-y-4 left-0 w-1 rounded-r-full ${accentClass(meeting.source.origin)}`}
        aria-hidden="true"
      />
      <div className="grid gap-4 pl-3 @min-[40rem]:grid-cols-[11rem_minmax(0,1fr)] @min-[40rem]:items-start @min-[40rem]:gap-6">
        <div className="flex min-w-0 gap-2">
          <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm leading-5 font-semibold text-foreground">{meeting.timeLabel}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="inline-flex max-w-full items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                <span className="truncate">{zoneLabel(meeting.timeZone)}</span>
              </span>
              {duration ? (
                <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                  {duration}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {meeting.href ? (
              <a
                href={meeting.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {meeting.title}
              </a>
            ) : (
              <p className="text-sm font-semibold text-foreground">{meeting.title}</p>
            )}
            <SourceBadge origin={meeting.source.origin} />
          </div>
          {identity ? (
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <IdentityIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{identity}</span>
              {meeting.location ? <span className="truncate text-muted-foreground">· {meeting.location}</span> : null}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <UsersIcon className="size-3.5" aria-hidden="true" />
              Guests
            </span>
            {meeting.invitations.length === 0 ? (
              <span className="text-sm text-muted-foreground">No guests</span>
            ) : (
              meeting.invitations.map((person) => <GuestChip key={person.email} person={person} />)
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BellIcon className="size-3.5" aria-hidden="true" />
              Reminders
            </span>
            {meeting.reminders.length === 0 ? (
              <span className="text-sm text-muted-foreground">None set</span>
            ) : (
              meeting.reminders.map((reminder, index) => (
                <span
                  key={`${reminder.method}-${reminder.minutesBefore}-${index}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground"
                >
                  {reminder.method === "email" ? (
                    <MailIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <AppWindowIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  )}
                  {reminderLabel(reminder)}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function DayHeader({ day, count }: { day: string; count: number }) {
  const booked = day !== "undated";
  return (
    <div className="border-b border-border/60 bg-muted/40 px-4 py-3 sm:px-5">
      <p className="text-sm font-semibold text-foreground">{dayHeading(day)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {booked ? countPhrase(count, "event") : `${countPhrase(count, "event")} waiting for a date`}
      </p>
    </div>
  );
}

function GuestChip({ person }: { person: MeetingInvitation }) {
  const mark = person.email.trim().charAt(0).toUpperCase() || "•";
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted py-0.5 pr-2.5 pl-0.5 text-xs" title={person.name || undefined}>
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-card text-[10px] font-semibold text-foreground ring-1 ring-border">
        {mark}
      </span>
      <span className="truncate text-foreground">{person.email}</span>
      {person.optional ? <span className="text-muted-foreground">Optional</span> : null}
      <span className={responseClass(person.response)}>{responseLabel(person.response)}</span>
    </span>
  );
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

function countPhrase(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function accentClass(origin: Meeting["source"]["origin"]) {
  if (origin === "live") return "bg-[var(--origin-live-dot)]";
  if (origin === "needs-review") return "bg-[var(--origin-review-dot)]";
  if (origin === "documented") return "bg-[var(--origin-documented-dot)]";
  return "bg-muted-foreground/35";
}

function zoneLabel(zone: string) {
  if (!zone || zone === "UTC" || zone === "Etc/UTC" || zone === "Etc/GMT") return zone ? "UTC" : "Local";
  return zone;
}

function durationLabel(meeting: Meeting) {
  if (!meeting.startsAt?.includes("T") || !meeting.endsAt?.includes("T")) return null;
  const start = Date.parse(meeting.startsAt);
  const end = Date.parse(meeting.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const total = Math.round((end - start) / 60000);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function responseClass(response: InvitationResponse) {
  if (response === "accepted") return "font-medium text-[var(--origin-live-fg)]";
  if (response === "declined") return "font-medium text-[var(--origin-review-fg)]";
  if (response === "tentative") return "font-medium text-[var(--origin-documented-fg)]";
  return "text-muted-foreground";
}

function splitEmails(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function accessSentence(role: CalendarAccess) {
  if (role === "owner") return "You own this calendar.";
  if (role === "writer") return "You can add and edit meetings on it.";
  if (role === "reader") return "You can see the meeting details.";
  return "You can see when people are busy, not the meeting details.";
}

function emailInitials(email: string) {
  const local = email.split("@")[0] ?? "";
  const letters = local.replace(/[^a-zA-Z]/g, "");
  return (letters.slice(0, 2) || "•").toUpperCase();
}

function roleLabel(role: CalendarAccess) {
  if (role === "owner") return "Owner";
  if (role === "writer") return "Can edit";
  if (role === "reader") return "See details";
  return "Free/busy only";
}

function responseLabel(response: InvitationResponse) {
  if (response === "accepted") return "Accepted";
  if (response === "declined") return "Declined";
  if (response === "tentative") return "Maybe";
  return "No reply";
}

function reminderLabel(reminder: Meeting["reminders"][number]) {
  const method = reminder.method === "email" ? "Email" : "Popup";
  if (reminder.minutesBefore % 1440 === 0 && reminder.minutesBefore >= 1440) {
    const days = reminder.minutesBefore / 1440;
    return `${method} · ${days} day${days === 1 ? "" : "s"} before`;
  }
  if (reminder.minutesBefore % 60 === 0 && reminder.minutesBefore >= 60) {
    const hours = reminder.minutesBefore / 60;
    return `${method} · ${hours} hour${hours === 1 ? "" : "s"} before`;
  }
  return `${method} · ${reminder.minutesBefore} min before`;
}
