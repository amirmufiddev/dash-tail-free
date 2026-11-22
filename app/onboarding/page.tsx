"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  Search,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const workspaceOptions = [
  {
    id: "client-workspace",
    title: "Client Workspace",
    description:
      "Manage client projects, files, and communication in one place.",
    href: "/projects",
    icon: Users,
    badgeClass:
      "bg-info/15 text-info",
  },
  {
    id: "internal-operations",
    title: "Internal Operations",
    description: "Streamline team workflows, tasks, and internal processes.",
    href: "/task",
    icon: Building2,
    badgeClass:
      "bg-destructive/15 text-destructive",
  },
  {
    id: "research-planning",
    title: "Research & Planning",
    description: "Collect ideas, insights, and plan your next big move.",
    href: "/notes",
    icon: Search,
    badgeClass:
      "bg-warning/15 text-warning",
  },
];

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[580px] rounded-xl border border-border shadow-sm">
        <CardContent className="p-8 sm:p-9 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-default-900">
              Create your first project
            </h1>
            <p className="text-sm text-muted-foreground">
              Pick a starting point or create your project from scratch.
            </p>
          </div>

          <div className="space-y-3">
            {workspaceOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <Link
                  key={opt.id}
                  href={opt.href}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full shrink-0 flex items-center justify-center",
                        opt.badgeClass
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-default-900">
                        {opt.title}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                  <span className="h-7 w-7 rounded-full border border-border bg-background shrink-0 flex items-center justify-center text-default-600 transition-transform group-hover:translate-x-0.5">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="text-center pt-1">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-default-700 hover:text-primary transition-colors"
            >
              <span>or start with a blank project</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
