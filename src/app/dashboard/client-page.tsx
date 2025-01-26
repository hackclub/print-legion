"use client";

import { JobCard } from "@/components/job-card";
import Link from "next/link";
import { PlusIcon, PrinterIcon, InboxIcon, SearchIcon } from "lucide-react";
import { useMemo } from "react";
import { Session } from "next-auth";
import { getRecentActivity } from "./recent-activity.action";
import { NavItem } from "./layout";

const StatsCard = ({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) => {
  return (
    <div className="rounded-lg shadow-sm border border-border p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {title}
      </h3>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};
export default function DashboardPage({
  session,
  recentActivity,
  navItems,
}: {
  session: Session;
  recentActivity: Awaited<ReturnType<typeof getRecentActivity>>;
  navItems: NavItem[];
}) {
  if (!recentActivity || "error" in recentActivity) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-400">Error loading dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-purple-300 to-purple-900 rounded-lg text-white relative">
        <div className="absolute w-full h-full block bg-black/30"></div>
        <div className="flex flex-col p-10">
          <h1 className="text-3xl font-bold mb-2 z-10">
            Welcome back, {session?.user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-purple-100 z-10">
            Here's what's happening in your printing world
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 md-lg:grid-cols-3 gap-4">
        {navItems.slice(1, 4).map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="block group hover:scale-[1.02] transition-transform"
          >
            <div className="rounded-lg shadow-sm border border-border hover:bg-card transition-colors px-5 py-4 flex items-center space-x-4">
              <div className={`${action.color} p-2 rounded-lg text-white`}>
                {action.icon}
              </div>
              <span className="font-medium text-foreground group-hover:text-card-foreground transition-colors">
                {action.title}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Recent Activity"
          value={recentActivity.stats.lastHourModifications || 0}
          description="jobs modified in the last hour"
        />
        <StatsCard
          title="Active Jobs"
          value={recentActivity.stats.totalActiveJobs || 0}
          description="jobs in progress"
        />
        <StatsCard
          title="Completed Jobs"
          value={recentActivity.stats.totalCompletedJobs || 0}
          description="jobs completed"
        />
      </div>

      {/* Recent Jobs */}
      {recentActivity?.recentJobs && recentActivity.recentJobs.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="grid gap-4">
            {recentActivity.recentJobs.map((job) => (
              <JobCard key={job.id} job={job} isAssigned={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
