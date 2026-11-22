"use client";

import React, { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, ShieldAlert, Check } from "lucide-react";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
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

type GlobalRole = "Super Admin" | "Support Admin" | "Standard User";
type UserStatus = "Active" | "Pending" | "Suspended";

interface PlatformUserItem {
  id: string;
  name: string;
  email: string;
  globalRole: GlobalRole;
  organization: string;
  status: UserStatus;
  mfaVerified: boolean;
  lastLogin: string;
  avatar: string;
}

const INITIAL_USERS: PlatformUserItem[] = [
  {
    id: "usr-1",
    name: "Amir Mufid",
    email: "amir@dashtail.dev",
    globalRole: "Super Admin",
    organization: "DashTail Labs Inc.",
    status: "Active",
    mfaVerified: true,
    lastLogin: "Today, 09:42 AM",
    avatar: "/images/avatar/avatar-1.jpg",
  },
  {
    id: "usr-2",
    name: "Georgeanna Ramero",
    email: "georgeanna@dashtail.dev",
    globalRole: "Support Admin",
    organization: "DashTail Labs Inc.",
    status: "Active",
    mfaVerified: true,
    lastLogin: "Today, 08:15 AM",
    avatar: "/images/avatar/avatar-2.jpg",
  },
  {
    id: "usr-3",
    name: "Alda Ziemer",
    email: "alda@cloudscale.dev",
    globalRole: "Standard User",
    organization: "CloudScale Labs",
    status: "Active",
    mfaVerified: true,
    lastLogin: "Yesterday, 04:20 PM",
    avatar: "/images/avatar/avatar-3.jpg",
  },
  {
    id: "usr-4",
    name: "Dalton Paden",
    email: "dalton@vectorgrid.io",
    globalRole: "Standard User",
    organization: "VectorGrid Corp",
    status: "Suspended",
    mfaVerified: false,
    lastLogin: "14 Nov, 2026",
    avatar: "/images/avatar/avatar-4.jpg",
  },
  {
    id: "usr-5",
    name: "Cami Macha",
    email: "cami@northstar.io",
    globalRole: "Standard User",
    organization: "Northstar Desk",
    status: "Pending",
    mfaVerified: false,
    lastLogin: "Invited today",
    avatar: "/images/avatar/avatar-5.jpg",
  },
];

export default function AdminUserManagementPage() {
  const [users, setUsers] = useState<PlatformUserItem[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUserItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<GlobalRole>("Standard User");
  const [formOrg, setFormOrg] = useState("DashTail Labs Inc.");
  const [formStatus, setFormStatus] = useState<UserStatus>("Active");
  const [formMfa, setFormMfa] = useState(true);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      const matchesRole = roleFilter === "all" || u.globalRole === roleFilter;
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.organization.toLowerCase().includes(q);
      return matchesStatus && matchesRole && matchesSearch;
    });
  }, [users, search, statusFilter, roleFilter]);

  const activeTotal = users.filter((u) => u.status === "Active").length;
  const suspendedTotal = users.filter((u) => u.status === "Suspended").length;
  const mfaTotal = users.filter((u) => u.mfaVerified).length;

  const openCreate = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormRole("Standard User");
    setFormOrg("DashTail Labs Inc.");
    setFormStatus("Active");
    setFormMfa(true);
    setDialogOpen(true);
  };

  const openEdit = (user: PlatformUserItem) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.globalRole);
    setFormOrg(user.organization);
    setFormStatus(user.status);
    setFormMfa(user.mfaVerified);
    setDialogOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    const email = formEmail.trim();
    if (!name || !email) return;

    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name,
                email,
                globalRole: formRole,
                organization: formOrg.trim() || "DashTail Labs Inc.",
                status: formStatus,
                mfaVerified: formMfa,
              }
            : u
        )
      );
      toast.success(`Updated user ${name}`);
    } else {
      const created: PlatformUserItem = {
        id: `usr-${Date.now()}`,
        name,
        email,
        globalRole: formRole,
        organization: formOrg.trim() || "DashTail Labs Inc.",
        status: formStatus,
        mfaVerified: formMfa,
        lastLogin: "Just created",
        avatar: "/images/avatar/avatar-6.jpg",
      };
      setUsers((prev) => [created, ...prev]);
      toast.success(`Created user ${name}`);
    }
    setDialogOpen(false);
  };

  const handleToggleSuspend = (user: PlatformUserItem) => {
    const nextStatus: UserStatus =
      user.status === "Suspended" ? "Active" : "Suspended";
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    );
    toast.success(`${user.name} is now ${nextStatus}`);
  };

  const handleDeleteUser = (user: PlatformUserItem) => {
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    toast.success(`Deleted user ${user.name}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-default-900 tracking-tight">
            Admin User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide CRUD directory for user accounts, global roles, and
            security posture.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Total Users
            </p>
            <p className="text-2xl font-bold text-default-900 mt-1">
              {users.length}
            </p>
            <p className="text-xs text-primary mt-1">Across all workspaces</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Active Accounts
            </p>
            <p className="text-2xl font-bold text-default-900 mt-1">
              {activeTotal}
            </p>
            <p className="text-xs text-success mt-1">Verified sessions</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              2FA Verified
            </p>
            <p className="text-2xl font-bold text-default-900 mt-1">
              {mfaTotal} / {users.length}
            </p>
            <p className="text-xs text-primary mt-1">MFA enrollment</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Suspended
            </p>
            <p className="text-2xl font-bold text-default-900 mt-1">
              {suspendedTotal}
            </p>
            <p className="text-xs text-destructive mt-1">Access locked</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-border">
        <CardContent className="p-5 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative w-full lg:w-[320px]">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, or organization..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-[180px]">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Global Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Role: All Roles</SelectItem>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                    <SelectItem value="Support Admin">Support Admin</SelectItem>
                    <SelectItem value="Standard User">Standard User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[170px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status: All</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Global Role</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-b border-border last:border-b-0"
                >
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-default-900">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="soft"
                      color={
                        user.globalRole === "Super Admin"
                          ? "default"
                          : user.globalRole === "Support Admin"
                            ? "info"
                            : "secondary"
                      }
                    >
                      {user.globalRole}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-default-700">
                    {user.organization}
                  </TableCell>
                  <TableCell>
                    {user.mfaVerified ? (
                      <Badge variant="soft" color="success">
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="soft" color="warning">
                        Not Set
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="soft"
                      color={
                        user.status === "Active"
                          ? "success"
                          : user.status === "Pending"
                            ? "warning"
                            : "destructive"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {user.lastLogin}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        color="secondary"
                        aria-label={`Edit ${user.name}`}
                        onClick={() => openEdit(user)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        color="secondary"
                        aria-label={
                          user.status === "Suspended"
                            ? `Activate ${user.name}`
                            : `Suspend ${user.name}`
                        }
                        onClick={() => handleToggleSuspend(user)}
                        className="h-8 w-8"
                      >
                        {user.status === "Suspended" ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-warning" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="soft"
                        color="destructive"
                        aria-label={`Delete ${user.name}`}
                        onClick={() => handleDeleteUser(user)}
                        className="h-8 w-8 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No platform users match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? `Edit User: ${editingUser.name}` : "Create User"}
            </DialogTitle>
            <DialogDescription>
              Configure global user identity, primary organization, and account
              access status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-user-name">Full Name</Label>
                <Input
                  id="admin-user-name"
                  placeholder="Nadia Rahman"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-user-email">Email</Label>
                <Input
                  id="admin-user-email"
                  type="email"
                  placeholder="nadia@dashtail.dev"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-user-role">Global Role</Label>
                <Select
                  value={formRole}
                  onValueChange={(val) => setFormRole(val as GlobalRole)}
                >
                  <SelectTrigger id="admin-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                    <SelectItem value="Support Admin">Support Admin</SelectItem>
                    <SelectItem value="Standard User">Standard User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-user-status">Account Status</Label>
                <Select
                  value={formStatus}
                  onValueChange={(val) => setFormStatus(val as UserStatus)}
                >
                  <SelectTrigger id="admin-user-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-user-org">Primary Organization</Label>
              <Input
                id="admin-user-org"
                value={formOrg}
                onChange={(e) => setFormOrg(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium text-default-900">
                  Enforce 2FA Verification
                </p>
                <p className="text-xs text-muted-foreground">
                  Require authenticator MFA on next sign-in.
                </p>
              </div>
              <Switch checked={formMfa} onCheckedChange={setFormMfa} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                color="secondary"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? "Save Changes" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
