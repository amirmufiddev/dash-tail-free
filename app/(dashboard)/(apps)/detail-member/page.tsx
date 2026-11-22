"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  Clock,
  Laptop,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MemberRole = "Owner" | "Admin" | "Developer" | "Viewer";

interface MemberDetailProfile {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  role: MemberRole;
  status: "Active" | "Pending" | "Suspended";
  joined: string;
  lastActive: string;
  mfaEnabled: boolean;
  apiKeysAllowed: boolean;
  avatar: string;
  directOverrides: string[];
  sessions: {
    id: string;
    device: string;
    location: string;
    ip: string;
    lastSeen: string;
    current?: boolean;
  }[];
  auditLogs: {
    id: string;
    action: string;
    scope: string;
    timestamp: string;
  }[];
}

const ROLE_DEFAULT_PERMS: Record<MemberRole, string[]> = {
  Owner: [
    "org:api-key:create",
    "org:api-key:read",
    "org:api-key:list",
    "org:api-key:update",
    "org:api-key:delete",
    "org:member:invite",
    "org:member:assign-role",
    "org:settings:update",
    "org:member:remove",
  ],
  Admin: [
    "org:api-key:create",
    "org:api-key:read",
    "org:api-key:list",
    "org:api-key:update",
    "org:member:invite",
    "org:member:assign-role",
  ],
  Developer: ["org:api-key:create", "org:api-key:read", "org:api-key:list"],
  Viewer: ["org:api-key:list"],
};

const ALL_SCOPES = [
  { group: "Module: Api Key", key: "org:api-key:create" },
  { group: "Module: Api Key", key: "org:api-key:read" },
  { group: "Module: Api Key", key: "org:api-key:list" },
  { group: "Module: Api Key", key: "org:api-key:update" },
  { group: "Module: Api Key", key: "org:api-key:delete" },
  { group: "Module: Organization & Members", key: "org:member:invite" },
  { group: "Module: Organization & Members", key: "org:member:assign-role" },
  { group: "Module: Organization & Members", key: "org:settings:update" },
  { group: "Module: Organization & Members", key: "org:member:remove" },
];

const INITIAL_MEMBER_PROFILES: MemberDetailProfile[] = [
  {
    id: "m-1",
    name: "Amir Mufid",
    email: "amir@dashtail.dev",
    title: "Principal Platform Owner",
    department: "Platform Engineering",
    role: "Owner",
    status: "Active",
    joined: "12 Jan, 2025",
    lastActive: "2 mins ago",
    mfaEnabled: true,
    apiKeysAllowed: true,
    avatar: "/images/avatar/avatar-1.jpg",
    directOverrides: [],
    sessions: [
      {
        id: "s-1",
        device: "Chrome 132 · Ubuntu Linux",
        location: "Jakarta, ID",
        ip: "103.42.198.12",
        lastSeen: "Active now",
        current: true,
      },
      {
        id: "s-2",
        device: "DashTail CLI · macOS",
        location: "Singapore, SG",
        ip: "18.141.92.40",
        lastSeen: "3 hours ago",
      },
    ],
    auditLogs: [
      {
        id: "a-1",
        action: "Updated role permissions",
        scope: "org:admin",
        timestamp: "Today, 09:15 AM",
      },
      {
        id: "a-2",
        action: "Generated API Key",
        scope: "org:api-key:create",
        timestamp: "Yesterday, 06:40 PM",
      },
    ],
  },
  {
    id: "m-2",
    name: "Georgeanna Ramero",
    email: "georgeanna@dashtail.dev",
    title: "Operations Administrator",
    department: "Operations",
    role: "Admin",
    status: "Active",
    joined: "04 Feb, 2025",
    lastActive: "18 mins ago",
    mfaEnabled: true,
    apiKeysAllowed: true,
    avatar: "/images/avatar/avatar-2.jpg",
    directOverrides: ["org:api-key:delete"],
    sessions: [
      {
        id: "s-3",
        device: "Safari 18 · macOS",
        location: "New York, US",
        ip: "72.14.201.88",
        lastSeen: "18 mins ago",
        current: true,
      },
    ],
    auditLogs: [
      {
        id: "a-3",
        action: "Invited Cami Macha",
        scope: "org:member:invite",
        timestamp: "Today, 08:05 AM",
      },
      {
        id: "a-4",
        action: "Rotated Production Key",
        scope: "org:api-key:update",
        timestamp: "21 Nov, 2026",
      },
    ],
  },
  {
    id: "m-3",
    name: "Alda Ziemer",
    email: "alda@dashtail.dev",
    title: "Senior Backend Engineer",
    department: "Engineering",
    role: "Developer",
    status: "Active",
    joined: "19 Mar, 2025",
    lastActive: "1 hour ago",
    mfaEnabled: true,
    apiKeysAllowed: true,
    avatar: "/images/avatar/avatar-3.jpg",
    directOverrides: ["org:api-key:update"],
    sessions: [
      {
        id: "s-4",
        device: "Firefox 135 · Windows 11",
        location: "Seattle, US",
        ip: "54.212.14.9",
        lastSeen: "1 hour ago",
      },
    ],
    auditLogs: [
      {
        id: "a-5",
        action: "Inspected Web Client Key",
        scope: "org:api-key:read",
        timestamp: "Today, 07:30 AM",
      },
    ],
  },
  {
    id: "m-4",
    name: "Dalton Paden",
    email: "dalton@dashtail.dev",
    title: "Frontend Systems Engineer",
    department: "Engineering",
    role: "Developer",
    status: "Active",
    joined: "02 Apr, 2025",
    lastActive: "Yesterday",
    mfaEnabled: false,
    apiKeysAllowed: false,
    avatar: "/images/avatar/avatar-4.jpg",
    directOverrides: [],
    sessions: [],
    auditLogs: [
      {
        id: "a-6",
        action: "Listed organization keys",
        scope: "org:api-key:list",
        timestamp: "Yesterday, 03:20 PM",
      },
    ],
  },
  {
    id: "m-5",
    name: "Cami Macha",
    email: "cami@dashtail.dev",
    title: "Support Analyst",
    department: "Support",
    role: "Viewer",
    status: "Pending",
    joined: "Invited today",
    lastActive: "Awaiting activation",
    mfaEnabled: false,
    apiKeysAllowed: false,
    avatar: "/images/avatar/avatar-5.jpg",
    directOverrides: [],
    sessions: [],
    auditLogs: [],
  },
];

function DetailMemberInner() {
  const searchParams = useSearchParams();
  const memberParam = searchParams?.get("member") ?? null;

  const [profiles, setProfiles] = useState<MemberDetailProfile[]>(
    INITIAL_MEMBER_PROFILES
  );
  const [manualMemberId, setManualMemberId] = useState<string | null>(null);

  const selectedId =
    manualMemberId ??
    (memberParam && profiles.some((p) => p.id === memberParam)
      ? memberParam
      : "m-2");

  const member =
    profiles.find((p) => p.id === selectedId) ?? profiles[0];

  const updateMember = (
    updater: (prev: MemberDetailProfile) => MemberDetailProfile
  ) => {
    setProfiles((prev) =>
      prev.map((item) => (item.id === member.id ? updater(item) : item))
    );
  };

  const inheritedScopes = ROLE_DEFAULT_PERMS[member.role];
  const effectiveScopes = Array.from(
    new Set([...inheritedScopes, ...member.directOverrides])
  );

  const toggleOverrideScope = (scopeKey: string, checked: boolean) => {
    updateMember((m) => {
      const hasOverride = m.directOverrides.includes(scopeKey);
      if (checked && !hasOverride) {
        return { ...m, directOverrides: [...m.directOverrides, scopeKey] };
      }
      if (!checked && hasOverride) {
        return {
          ...m,
          directOverrides: m.directOverrides.filter((k) => k !== scopeKey),
        };
      }
      return m;
    });
  };

  const handleRevokeSession = (sessionId: string) => {
    updateMember((m) => ({
      ...m,
      sessions: m.sessions.filter((s) => s.id !== sessionId),
    }));
    toast.success("Session revoked");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              color="secondary"
              size="sm"
              className="px-2 h-8 gap-1.5"
            >
              <Link href="/org-team-member">
                <ArrowLeft className="h-4 w-4" />
                Back to Team Members
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-semibold text-default-900 tracking-tight">
            Member Detail &amp; Access Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Inspect role inheritance, manage direct scope overrides, and review
            active sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-[230px]">
            <Select value={member.id} onValueChange={setManualMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Switch member..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            color="secondary"
            onClick={() => {
              const nextStatus =
                member.status === "Suspended" ? "Active" : "Suspended";
              updateMember((m) => ({ ...m, status: nextStatus }));
              toast.success(`${member.name} status updated to ${nextStatus}`);
            }}
          >
            {member.status === "Suspended"
              ? "Reactivate Member"
              : "Suspend Access"}
          </Button>

          <Button
            type="button"
            onClick={() =>
              toast.success(`Saved access configuration for ${member.name}`)
            }
          >
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <Card className="lg:col-span-4 rounded-xl border border-border">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>
                  {member.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-default-900 truncate">
                    {member.name}
                  </h2>
                  <Badge
                    variant="soft"
                    color={
                      member.status === "Active"
                        ? "success"
                        : member.status === "Pending"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {member.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {member.email}
                </p>
                <p className="text-xs font-medium text-default-700 mt-1">
                  {member.title}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-border">
              <Label htmlFor="detail-member-role">Assigned Organization Role</Label>
              <Select
                value={member.role}
                onValueChange={(val) => {
                  updateMember((m) => ({ ...m, role: val as MemberRole }));
                  toast.success(`Assigned ${val} role to ${member.name}`);
                }}
              >
                <SelectTrigger id="detail-member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Developer">Developer</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div className="rounded-lg border border-border p-3">
                <span className="text-muted-foreground block">Department</span>
                <span className="font-semibold text-default-900 mt-0.5 block">
                  {member.department}
                </span>
              </div>
              <div className="rounded-lg border border-border p-3">
                <span className="text-muted-foreground block">Joined</span>
                <span className="font-semibold text-default-900 mt-0.5 block">
                  {member.joined}
                </span>
              </div>
              <div className="rounded-lg border border-border p-3">
                <span className="text-muted-foreground block">Last Active</span>
                <span className="font-semibold text-default-900 mt-0.5 block">
                  {member.lastActive}
                </span>
              </div>
              <div className="rounded-lg border border-border p-3">
                <span className="text-muted-foreground block">
                  Effective Scopes
                </span>
                <span className="font-semibold text-primary mt-0.5 block">
                  {effectiveScopes.length} active
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-default-900">
                    2FA Verified
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Authenticator app enforcement
                  </p>
                </div>
                <Switch
                  checked={member.mfaEnabled}
                  onCheckedChange={(checked) =>
                    updateMember((m) => ({ ...m, mfaEnabled: checked }))
                  }
                  aria-label="2FA Verified"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-default-900">
                    Can Issue API Keys
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Allow creating personal org tokens
                  </p>
                </div>
                <Switch
                  checked={member.apiKeysAllowed}
                  onCheckedChange={(checked) =>
                    updateMember((m) => ({ ...m, apiKeysAllowed: checked }))
                  }
                  aria-label="Can Issue API Keys"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-8 space-y-5">
          <Tabs defaultValue="permissions" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
              <TabsTrigger value="permissions">
                Effective Permissions
              </TabsTrigger>
              <TabsTrigger value="overrides">Direct Overrides</TabsTrigger>
              <TabsTrigger value="sessions">Sessions &amp; Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="permissions" className="mt-4 space-y-4">
              <Alert color="info" variant="soft" className="items-start">
                <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <AlertTitle className="text-sm font-semibold mb-1">
                    Inherited from {member.role} Role
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {member.name} inherits {inheritedScopes.length} permissions
                    from <strong>{member.role}</strong> plus{" "}
                    {member.directOverrides.length} direct override scope(s).
                  </AlertDescription>
                </div>
              </Alert>

              <Card className="rounded-xl border border-border">
                <CardHeader className="px-6 py-4 mb-0">
                  <CardTitle className="text-base font-semibold">
                    Effective Access Matrix
                  </CardTitle>
                  <CardDescription>
                    Combined permissions evaluated at API runtime for this
                    member.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_SCOPES.map((scope) => {
                    const fromRole = inheritedScopes.includes(scope.key);
                    const fromOverride = member.directOverrides.includes(
                      scope.key
                    );
                    return (
                      <div
                        key={scope.key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <code className="text-xs font-semibold text-default-900 block truncate">
                            {scope.key}
                          </code>
                          <span className="text-[11px] text-muted-foreground">
                            {scope.group}
                          </span>
                        </div>
                        <Badge
                          variant="soft"
                          color={
                            fromRole
                              ? "success"
                              : fromOverride
                                ? "info"
                                : "secondary"
                          }
                        >
                          {fromRole
                            ? "Role"
                            : fromOverride
                              ? "Override"
                              : "Denied"}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overrides" className="mt-4">
              <Card className="rounded-xl border border-border">
                <CardHeader className="px-6 py-4 mb-0">
                  <CardTitle className="text-base font-semibold">
                    Direct Permission Overrides
                  </CardTitle>
                  <CardDescription>
                    Grant supplemental access scopes beyond the assigned{" "}
                    {member.role} role.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_SCOPES.map((scope) => {
                    const inherited = inheritedScopes.includes(scope.key);
                    const overridden = member.directOverrides.includes(
                      scope.key
                    );
                    const checkId = `override-${member.id}-${scope.key}`;

                    return (
                      <div
                        key={scope.key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            id={checkId}
                            size="sm"
                            checked={inherited || overridden}
                            disabled={inherited}
                            onCheckedChange={(checked) =>
                              toggleOverrideScope(scope.key, Boolean(checked))
                            }
                          />
                          <Label
                            htmlFor={checkId}
                            className="text-xs font-mono text-default-700 truncate cursor-pointer"
                          >
                            {scope.key}
                          </Label>
                        </div>
                        {inherited && (
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions" className="mt-4 space-y-5">
              <Card className="rounded-xl border border-border">
                <CardHeader className="px-6 py-4 mb-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-primary" />
                    Active Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="px-6">Device</TableHead>
                        <TableHead>Location / IP</TableHead>
                        <TableHead>Last Seen</TableHead>
                        <TableHead className="px-6 text-right">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {member.sessions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="px-6 font-medium text-xs text-default-900">
                            {s.device}
                            {s.current && (
                              <Badge
                                variant="soft"
                                color="success"
                                className="ml-2"
                              >
                                Current
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {s.location} · {s.ip}
                          </TableCell>
                          <TableCell className="text-xs text-default-600">
                            {s.lastSeen}
                          </TableCell>
                          <TableCell className="px-6 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="soft"
                              color="destructive"
                              onClick={() => handleRevokeSession(s.id)}
                              className="h-8 gap-1 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {member.sessions.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-6 text-center text-xs text-muted-foreground"
                          >
                            No active sessions found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="rounded-xl border border-border">
                <CardHeader className="px-6 py-4 mb-0">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Recent RBAC Audit Events
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {member.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-default-900">
                          {log.action}
                        </span>
                        <Badge variant="soft" color="secondary">
                          {log.scope}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
                  {member.auditLogs.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      No audit events recorded yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function DetailMemberPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          Loading member detail...
        </div>
      }
    >
      <DetailMemberInner />
    </Suspense>
  );
}
