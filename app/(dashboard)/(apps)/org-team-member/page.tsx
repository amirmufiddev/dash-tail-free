"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  LayoutList,
  Plus,
  Search,
  Trash2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MemberRole = "Owner" | "Admin" | "Developer" | "Viewer";
type MemberStatus = "Active" | "Pending";

interface TeamMemberItem {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  joined: string;
  avatar: string;
}

const INITIAL_MEMBERS: TeamMemberItem[] = [
  {
    id: "m-1",
    name: "Amir Mufid",
    email: "amir@dashtail.dev",
    role: "Owner",
    status: "Active",
    joined: "12 Jan, 2025",
    avatar: "/images/avatar/avatar-1.jpg",
  },
  {
    id: "m-2",
    name: "Georgeanna Ramero",
    email: "georgeanna@dashtail.dev",
    role: "Admin",
    status: "Active",
    joined: "04 Feb, 2025",
    avatar: "/images/avatar/avatar-2.jpg",
  },
  {
    id: "m-3",
    name: "Alda Ziemer",
    email: "alda@dashtail.dev",
    role: "Developer",
    status: "Active",
    joined: "19 Mar, 2025",
    avatar: "/images/avatar/avatar-3.jpg",
  },
  {
    id: "m-4",
    name: "Dalton Paden",
    email: "dalton@dashtail.dev",
    role: "Developer",
    status: "Active",
    joined: "02 Apr, 2025",
    avatar: "/images/avatar/avatar-4.jpg",
  },
  {
    id: "m-5",
    name: "Cami Macha",
    email: "cami@dashtail.dev",
    role: "Viewer",
    status: "Pending",
    joined: "Invited today",
    avatar: "/images/avatar/avatar-5.jpg",
  },
];

export default function OrgTeamMemberPage() {
  const [members, setMembers] = useState<TeamMemberItem[]>(INITIAL_MEMBERS);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("Developer");

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchesRole = roleFilter === "all" || m.role === roleFilter;
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [members, search, roleFilter]);

  const activeCount = members.filter((m) => m.status === "Active").length;
  const pendingCount = members.filter((m) => m.status === "Pending").length;

  const handleRoleChange = (id: string, role: MemberRole) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
    toast.success(`Updated member role to ${role}`);
  };

  const handleRemoveMember = (member: TeamMemberItem) => {
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    toast.success(`Removed ${member.name}`);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    const name = inviteName.trim() || email.split("@")[0];
    const created: TeamMemberItem = {
      id: `m-${Date.now()}`,
      name,
      email,
      role: inviteRole,
      status: "Pending",
      joined: "Invited today",
      avatar: "/images/avatar/avatar-6.jpg",
    };
    setMembers((prev) => [created, ...prev]);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("Developer");
    setInviteOpen(false);
    toast.success(`Sent invitation to ${created.email}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-default-900 tracking-tight">
            Organization Team Members
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invite team members, manage seat access, and assign organization
            RBAC roles.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl border border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Total Members
            </p>
            <p className="text-2xl font-bold text-default-900 mt-1">
              {members.length + 9}
            </p>
            <p className="text-xs text-primary mt-1">+2 joined this month</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Active Seats
            </p>
            <p className="text-2xl font-bold text-default-900 mt-1">
              {activeCount + 8} / 20
            </p>
            <p className="text-xs text-primary mt-1">Pro Organization Plan</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Pending Invites
            </p>
            <p className="text-2xl font-bold text-default-900 mt-1">
              {pendingCount + 1}
            </p>
            <p className="text-xs text-primary mt-1">Awaiting acceptance</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-border">
        <CardContent className="p-5 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-full md:w-[320px]">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member name or email..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-[180px]">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Role: All Roles</SelectItem>
                    <SelectItem value="Owner">Owner</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Developer">Developer</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div
                className="inline-flex items-center rounded-md border border-border bg-muted/40 p-1"
                role="group"
                aria-label="Member view mode"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-default-600 hover:text-default-900"
                  )}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-default-600 hover:text-default-900"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Grid
                </button>
              </div>
            </div>
          </div>

          {viewMode === "list" ? (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead>Member</TableHead>
                  <TableHead>Assign Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>
                            {member.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link
                            href={`/detail-member?member=${encodeURIComponent(member.id)}`}
                            className="text-sm font-semibold text-default-900 hover:text-primary transition-colors"
                          >
                            {member.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-[165px]">
                        <Select
                          value={member.role}
                          onValueChange={(val) =>
                            handleRoleChange(member.id, val as MemberRole)
                          }
                        >
                          <SelectTrigger className="h-9">
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
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="soft"
                        color={member.status === "Active" ? "success" : "warning"}
                      >
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-default-600 whitespace-nowrap">
                      {member.joined}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          asChild
                          size="icon"
                          variant="outline"
                          color="secondary"
                          className="h-8 w-8"
                          aria-label={`View ${member.name}`}
                        >
                          <Link
                            href={`/detail-member?member=${encodeURIComponent(member.id)}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="soft"
                          color="destructive"
                          aria-label={`Remove ${member.name}`}
                          onClick={() => handleRemoveMember(member)}
                          className="h-8 w-8 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMembers.map((member) => (
                <Card
                  key={member.id}
                  className="rounded-xl border border-border bg-background shadow-none"
                >
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>
                            {member.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link
                            href={`/detail-member?member=${encodeURIComponent(member.id)}`}
                            className="text-sm font-semibold text-default-900 hover:text-primary block truncate"
                          >
                            {member.name}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="soft"
                        color={member.status === "Active" ? "success" : "warning"}
                      >
                        {member.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground block">
                        Assigned Role
                      </span>
                      <Select
                        value={member.role}
                        onValueChange={(val) =>
                          handleRoleChange(member.id, val as MemberRole)
                        }
                      >
                        <SelectTrigger className="h-9">
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

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        {member.joined}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          color="secondary"
                          className="h-8 px-2.5 text-xs"
                        >
                          <Link
                            href={`/detail-member?member=${encodeURIComponent(member.id)}`}
                          >
                            Detail
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="soft"
                          color="destructive"
                          aria-label={`Remove ${member.name}`}
                          onClick={() => handleRemoveMember(member)}
                          className="h-8 w-8 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredMembers.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No team members match your filter criteria.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an organization invitation and pre-assign their initial RBAC
              role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Full Name</Label>
              <Input
                id="invite-name"
                placeholder="e.g. Nadia Rahman"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Work Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="nadia@dashtail.dev"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Assign Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(val) => setInviteRole(val as MemberRole)}
              >
                <SelectTrigger id="invite-role">
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                color="secondary"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Send Invitation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
