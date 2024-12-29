'use client';
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Search,
  Settings,
  ArrowUpToLine,
} from "lucide-react";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
    icon: React.ReactNode;
  }[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [active, setActive] = useState('your-jobs');

  const navItems = [
    {
      href: "/dashboard",
      title: "Your Jobs",
      icon: <Briefcase className="w-5 h-5" />,
    },
    {
      href: "/dashboard/search",
      title: "Search Jobs",
      icon: <Search className="w-5 h-5" />,
    },
    {
      href: "/dashboard/submit",
      title: "Submit Jobs",
      icon: <ArrowUpToLine className="w-5 h-5" />,
    },
    {
      href: "/dashboard/settings",
      title: "Settings",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800">
        <div className="flex flex-col h-full justify-between py-4">
          {/* Top section with main tabs */}
          <div className="px-3 py-2">
            <div className="space-y-1">
              {navItems.slice(0, -1).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2 font-normal",
                      item.href === "/dashboard" ? "bg-zinc-900 text-zinc-50" : "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900"
                    )}
                  >
                    {item.icon}
                    {item.title}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Bottom section with settings */}
          <div className="px-3 py-2">
            <Link href={navItems[3].href}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 font-normal text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900"
              >
                {navItems[3].icon}
                {navItems[3].title}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto p-8 text-zinc-200">
        {children}
      </main>
    </div>
  );
} 