"use client";

import { useCalendar } from "./CalendarProvider";
import { StorageBadge } from "./ui";
import { IconCalendar } from "./icons";

export default function SiteFooter() {
  const { storage, users } = useCalendar();

  return (
    <footer className="relative border-t border-white/5 py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-brand-600 text-white">
              <IconCalendar size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">VideoCal</p>
              <p className="text-xs text-ink-400">
                {users.user1} y {users.user2} · calendario compartido de videos
              </p>
            </div>
          </div>
          <StorageBadge storage={storage} />
        </div>

      </div>
    </footer>
  );
}
