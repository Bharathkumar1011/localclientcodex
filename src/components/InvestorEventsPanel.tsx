import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, Loader2, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import type { InvestorEventItem, InvestorEventsFeedResponse } from "@/lib/types";

function formatDate(value?: string | null) {
  if (!value) return "Date TBA";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function EventRow({ item }: { item: InvestorEventItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-1 rounded-md p-3 transition-colors hover:bg-muted/50 group"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </span>
        <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <span className="font-semibold text-emerald-700">{item.source || "Event Feed"}</span>
        <span>•</span>
        <span>{formatDate(item.eventDate)}</span>
        {item.city && (
          <>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.city}
            </span>
          </>
        )}
      </div>
    </a>
  );
}

export default function InvestorEventsPanel() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const { data, isLoading } = useQuery<InvestorEventsFeedResponse>({
    queryKey: ["/investor-events"],
    queryFn: async () => {
      const res = await apiFetch(`${API_BASE_URL}/investor-events`);
      if (!res.ok) throw new Error("Failed to fetch investor events");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const totalItems =
    (data?.hyderabadEvents?.length || 0) + (data?.indiaEvents?.length || 0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || totalItems <= 6 || isPaused) return;

    const intervalId = window.setInterval(() => {
      if (el.scrollHeight <= el.clientHeight + 8) return;

      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      el.scrollTop = atBottom ? 0 : el.scrollTop + 1;
    }, 45);

    return () => window.clearInterval(intervalId);
  }, [totalItems, isPaused]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hyderabadEvents = data?.hyderabadEvents || [];
  const indiaEvents = data?.indiaEvents || [];
  const hasEvents = hyderabadEvents.length > 0 || indiaEvents.length > 0;

  if (!hasEvents) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center text-center text-sm text-muted-foreground p-4">
        <CalendarDays className="mb-2 h-8 w-8 opacity-20" />
        <p>No investor events found in the current refresh window.</p>
        <p className="mt-1 text-xs">
          This panel checks recent and upcoming conferences with Hyderabad priority.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="h-[400px] overflow-y-auto pr-2"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Hyderabad first • weekly auto-refresh on read
        </div>
        {data?.lastUpdatedAt && (
          <div className="text-[10px] text-muted-foreground">
            Updated: {formatDate(data.lastUpdatedAt)}
          </div>
        )}
      </div>

      {hyderabadEvents.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 border border-emerald-100">
            Top Results — Hyderabad
          </div>
          <div className="divide-y rounded-md border bg-background">
            {hyderabadEvents.map((item) => (
              <EventRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {indiaEvents.length > 0 && (
        <div>
          <div className="mb-2 rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 border">
            Other India Events
          </div>
          <div className="divide-y rounded-md border bg-background">
            {indiaEvents.map((item) => (
              <EventRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}