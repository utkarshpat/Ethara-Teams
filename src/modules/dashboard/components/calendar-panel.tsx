"use client";

import type { CalendarEventStatus, CalendarEventType } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { DashboardCalendarEvent } from "@/modules/dashboard/types";
import { cn } from "@/lib/utils";

const eventTypes: CalendarEventType[] = ["MEETING", "EVENT", "REMINDER", "FOCUS"];
const reminderOptions = [
  { label: "No reminder", value: "none" },
  { label: "At start", value: "0" },
  { label: "10 min before", value: "10" },
  { label: "30 min before", value: "30" },
  { label: "1 hour before", value: "60" },
  { label: "1 day before", value: "1440" },
];

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-input px-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35";

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "Request failed");
  }

  return (await response.json()) as T;
}

function dateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateTimeInputValue(date: Date) {
  return `${dateInputValue(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function dayBounds(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59);
  return { start, end };
}

function timeLabel(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function eventDuration(event: DashboardCalendarEvent) {
  const start = new Date(event.startAt).getTime();
  const end = new Date(event.endAt).getTime();
  return Math.max(15, Math.round((end - start) / 60000));
}

function reminderLabel(minutes: number | null) {
  if (minutes === null) {
    return "No reminder";
  }

  if (minutes === 0) {
    return "At start";
  }

  if (minutes < 60) {
    return `${minutes} min before`;
  }

  if (minutes === 60) {
    return "1 hour before";
  }

  if (minutes === 1440) {
    return "1 day before";
  }

  return `${minutes} min before`;
}

function hourEvents(events: DashboardCalendarEvent[], hour: number) {
  return events.filter((event) => new Date(event.startAt).getHours() === hour);
}

function eventTone(type: CalendarEventType) {
  if (type === "MEETING") {
    return "border-primary/40 bg-primary/10";
  }

  if (type === "REMINDER") {
    return "border-amber-400/30 bg-amber-400/10";
  }

  if (type === "FOCUS") {
    return "border-cyan-400/30 bg-cyan-400/10";
  }

  return "border-border bg-muted/50";
}

export function CalendarPanel() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(dateInputValue(new Date()));
  const [isDialogOpen, setDialogOpen] = useState(false);
  const { start, end } = useMemo(() => dayBounds(selectedDate), [selectedDate]);

  const eventsQuery = useQuery({
    queryKey: ["calendar-events", selectedDate],
    queryFn: () =>
      fetchJson<DashboardCalendarEvent[]>(
        `/api/calendar-events?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`,
      ),
  });

  const events = eventsQuery.data ?? [];
  const upcoming = events.filter((event) => event.status === "SCHEDULED").slice(0, 4);
  const scheduledCount = events.filter((event) => event.status === "SCHEDULED").length;
  const completedCount = events.filter((event) => event.status === "COMPLETED").length;
  const focusMinutes = events
    .filter((event) => event.type === "FOCUS")
    .reduce((total, event) => total + eventDuration(event), 0);

  const createMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      notes?: string;
      location?: string;
      type: CalendarEventType;
      startAt: string;
      endAt: string;
      reminderMinutes?: number | null;
    }) =>
      fetchJson<DashboardCalendarEvent>("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setDialogOpen(false);
      toast.success("Calendar event created");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; status: CalendarEventStatus }) =>
      fetchJson<DashboardCalendarEvent>(`/api/calendar-events/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: payload.status }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Calendar updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson<DashboardCalendarEvent>(`/api/calendar-events/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Calendar event removed");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-border bg-card/45 p-4 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-normal">Daily schedule</h3>
            <p className="text-sm text-muted-foreground">
              Meetings, reminders, focus blocks, and sync windows for the selected day.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-[170px]"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedDate(dateInputValue(new Date()))}
            >
              Today
            </Button>
            <CalendarEventDialog
              open={isDialogOpen}
              onOpenChange={setDialogOpen}
              selectedDate={selectedDate}
              onSubmit={(payload) => createMutation.mutate(payload)}
              isPending={createMutation.isPending}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <CalendarStat label="Scheduled" value={scheduledCount} tone="primary" />
        <CalendarStat label="Completed" value={completedCount} tone="success" />
        <CalendarStat label="Focus minutes" value={focusMinutes} tone="cyan" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-border bg-card/45 p-4 shadow-sm backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-normal">Agenda</h3>
              <p className="text-sm text-muted-foreground">Upcoming for this day</p>
            </div>
            <Badge variant="outline">{events.length} events</Badge>
          </div>
          <div className="grid gap-3">
            {upcoming.length ? (
              upcoming.map((event) => (
                <CalendarEventRow
                  key={event.id}
                  event={event}
                  onComplete={() =>
                    updateMutation.mutate({ id: event.id, status: "COMPLETED" })
                  }
                  onCancel={() =>
                    updateMutation.mutate({ id: event.id, status: "CANCELLED" })
                  }
                  onDelete={() => deleteMutation.mutate(event.id)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background/35 p-6 text-center">
                <CalendarClock className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">No events scheduled</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a meeting, reminder, or focus block for this date.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card/45 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <div>
              <h3 className="text-base font-semibold tracking-normal">Hourly timeline</h3>
              <p className="text-sm text-muted-foreground">
                {new Intl.DateTimeFormat("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(start)}
              </p>
            </div>
            <Badge variant="outline">24h</Badge>
          </div>
          <ScrollArea className="h-[560px]">
            <div className="divide-y divide-border/50">
              {Array.from({ length: 24 }, (_, hour) => {
                const items = hourEvents(events, hour);

                return (
                  <div key={hour} className="grid min-h-20 grid-cols-[76px_1fr]">
                    <div className="border-r border-border/50 px-4 py-4 text-xs text-muted-foreground">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    <div className="flex flex-col gap-2 p-3">
                      {items.length ? (
                        items.map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "rounded-xl border px-3 py-2 shadow-sm",
                              eventTone(event.type),
                              event.status !== "SCHEDULED" && "opacity-60",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium">{event.title}</p>
                              <Badge variant="outline">{event.type}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {timeLabel(event.startAt)} - {timeLabel(event.endAt)} / {eventDuration(event)} min
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Reminder: {reminderLabel(event.reminderMinutes)}
                            </p>
                            {event.location ? (
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin />
                                {event.location}
                              </p>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <span className="py-2 text-xs text-muted-foreground/60">
                          Available
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </section>
      </div>
    </div>
  );
}

function CalendarStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "cyan";
}) {
  const toneClass = {
    primary: "bg-primary/12 text-primary",
    success: "bg-emerald-400/12 text-emerald-300",
    cyan: "bg-cyan-400/12 text-cyan-300",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card/45 p-4 shadow-sm backdrop-blur-xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-2xl font-semibold tracking-normal">{value}</p>
        <div className={cn("grid size-9 place-items-center rounded-xl", toneClass)}>
          <CalendarClock />
        </div>
      </div>
    </div>
  );
}

function CalendarEventRow({
  event,
  onComplete,
  onCancel,
  onDelete,
}: {
  event: DashboardCalendarEvent;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-4 transition-all hover:shadow-md hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{event.title}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 />
            {timeLabel(event.startAt)} - {timeLabel(event.endAt)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Reminder: {reminderLabel(event.reminderMinutes)}
          </p>
        </div>
        <Badge variant="outline">{event.status}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button type="button" size="icon-sm" variant="outline" onClick={onComplete}>
          <CheckCircle2 />
        </Button>
        <Button type="button" size="icon-sm" variant="outline" onClick={onCancel}>
          <XCircle />
        </Button>
        <Button type="button" size="icon-sm" variant="outline" onClick={onDelete}>
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

function CalendarEventDialog({
  open,
  onOpenChange,
  selectedDate,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  onSubmit: (payload: {
    title: string;
    notes?: string;
    location?: string;
    type: CalendarEventType;
    startAt: string;
    endAt: string;
    reminderMinutes?: number | null;
  }) => void;
  isPending: boolean;
}) {
  const startDefault = useMemo(() => {
    const now = new Date();
    const [year, month, day] = selectedDate.split("-").map(Number);
    const hour = Math.max(9, now.getHours() + 1);
    return new Date(year, month - 1, day, hour, 0, 0);
  }, [selectedDate]);
  const endDefault = useMemo(
    () => new Date(startDefault.getTime() + 30 * 60000),
    [startDefault],
  );
  const [type, setType] = useState<CalendarEventType>("MEETING");
  const [reminder, setReminder] = useState("10");
  const [startValue, setStartValue] = useState(dateTimeInputValue(startDefault));
  const [endValue, setEndValue] = useState(dateTimeInputValue(endDefault));

  function resetDefaults() {
    setStartValue(dateTimeInputValue(startDefault));
    setEndValue(dateTimeInputValue(endDefault));
  }

  function handleStartChange(value: string) {
    setStartValue(value);

    const nextStart = new Date(value);
    const currentEnd = new Date(endValue);

    if (!value || Number.isNaN(nextStart.getTime())) {
      return;
    }

    if (!endValue || Number.isNaN(currentEnd.getTime()) || currentEnd <= nextStart) {
      setEndValue(dateTimeInputValue(new Date(nextStart.getTime() + 30 * 60000)));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          resetDefaults();
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus data-icon="inline-start" />
        New event
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/70 px-5 pb-4 pt-5">
          <DialogTitle>Create calendar event</DialogTitle>
          <DialogDescription>
            Block time for meetings, reminders, focus work, or team syncs.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex max-h-[calc(100dvh-8rem)] flex-col overflow-y-auto px-5 pb-5 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const reminderMinutes =
              reminder === "none" ? null : Number.parseInt(reminder, 10);
            const startAt = new Date(startValue);
            const endAt = new Date(endValue);

            if (endAt <= startAt) {
              toast.error("End time must be after start time");
              return;
            }

            onSubmit({
              title: String(formData.get("title") ?? ""),
              notes: String(formData.get("notes") ?? ""),
              location: String(formData.get("location") ?? ""),
              type,
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString(),
              reminderMinutes,
            });
          }}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="calendar-title">Title</FieldLabel>
              <Input id="calendar-title" name="title" required />
            </Field>
            <Field>
              <FieldLabel>Type</FieldLabel>
              <select
                className={selectClassName}
                value={type}
                onChange={(event) => setType(event.target.value as CalendarEventType)}
              >
                {eventTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="calendar-start">Start</FieldLabel>
              <Input
                id="calendar-start"
                name="startAt"
                type="datetime-local"
                value={startValue}
                onChange={(event) => handleStartChange(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="calendar-end">End</FieldLabel>
              <Input
                id="calendar-end"
                name="endAt"
                type="datetime-local"
                min={startValue}
                value={endValue}
                onChange={(event) => setEndValue(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel>Reminder</FieldLabel>
              <select
                className={selectClassName}
                value={reminder}
                onChange={(event) => setReminder(event.target.value)}
              >
                {reminderOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="calendar-location">Location or link</FieldLabel>
              <Input id="calendar-location" name="location" />
            </Field>
            <Field>
              <FieldLabel htmlFor="calendar-notes">Notes</FieldLabel>
              <Textarea id="calendar-notes" name="notes" rows={3} />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={isPending}>
            <CalendarClock data-icon="inline-start" />
            Save event
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
