"use client";

import React, { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PermissionGroup {
  id: string;
  module: string;
  permissions: string[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "api-key",
    module: "Module: Api Key",
    permissions: [
      "org:api-key:create",
      "org:api-key:read",
      "org:api-key:list",
      "org:api-key:update",
      "org:api-key:delete",
    ],
  },
  {
    id: "org-members",
    module: "Module: Organization & Members",
    permissions: [
      "org:member:invite",
      "org:member:assign-role",
      "org:settings:update",
      "org:member:remove",
    ],
  },
  {
    id: "billing-invoices",
    module: "Module: Billing & Invoices",
    permissions: [
      "org:billing:read",
      "org:billing:update",
      "org:invoice:download",
    ],
  },
];

const ALL_PERMS = PERMISSION_GROUPS.flatMap((g) => g.permissions);

interface RoleItem {
  id: string;
  name: string;
  identifier: string;
  description: string;
  memberCount: number;
  system?: boolean;
  permissions: string[];
}

const INITIAL_ROLES: RoleItem[] = [
  {
    id: "role-owner",
    name: "Owner",
    identifier: "org:owner",
    description:
      "Full administrative access across organization settings, billing, API keys, and members.",
    memberCount: 2,
    system: true,
    permissions: ALL_PERMS,
  },
  {
    id: "role-admin",
    name: "Admin",
    identifier: "org:admin",
    description: "Manage organization API keys, team roles, and integrations.",
    memberCount: 3,
    permissions: [
      "org:api-key:create",
      "org:api-key:read",
      "org:api-key:list",
      "org:api-key:update",
      "org:member:invite",
      "org:member:assign-role",
    ],
  },
  {
    id: "role-developer",
    name: "Developer",
    identifier: "org:developer",
    description:
      "Read and list organization API keys and collaborate across workspace apps.",
    memberCount: 6,
    permissions: ["org:api-key:create", "org:api-key:read", "org:api-key:list"],
  },
  {
    id: "role-viewer",
    name: "Viewer",
    identifier: "org:viewer",
    description: "Read-only access to organization API keys and billing reports.",
    memberCount: 3,
    permissions: ["org:api-key:list", "org:billing:read"],
  },
];

export default function RolePage() {
  const [roles, setRoles] = useState<RoleItem[]>(INITIAL_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("role-admin");
  const [roleSearch, setRoleSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleIdentifier, setNewRoleIdentifier] = useState("org:");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.identifier.toLowerCase().includes(q)
    );
  }, [roles, roleSearch]);

  const activeRole =
    roles.find((r) => r.id === selectedRoleId) ?? roles[0] ?? null;

  const updateActiveRole = (updater: (role: RoleItem) => RoleItem) => {
    if (!activeRole) return;
    setRoles((prev) =>
      prev.map((role) => (role.id === activeRole.id ? updater(role) : role))
    );
  };

  const togglePermission = (perm: string, checked: boolean) => {
    updateActiveRole((role) => {
      const exists = role.permissions.includes(perm);
      if (checked && !exists) {
        return { ...role, permissions: [...role.permissions, perm] };
      }
      if (!checked && exists) {
        return {
          ...role,
          permissions: role.permissions.filter((p) => p !== perm),
        };
      }
      return role;
    });
  };

  const handleSavePermissions = () => {
    if (!activeRole) return;
    toast.success(
      `Saved ${activeRole.permissions.length} permissions for ${activeRole.name}`
    );
  };

  const handleDeleteRole = () => {
    if (!activeRole) return;
    if (activeRole.system) {
      toast.error("System Owner role cannot be deleted");
      return;
    }
    const remaining = roles.filter((r) => r.id !== activeRole.id);
    setRoles(remaining);
    setSelectedRoleId(remaining[0]?.id ?? "");
    toast.success(`Deleted role ${activeRole.name}`);
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRoleName.trim();
    const identifier = newRoleIdentifier.trim();
    if (!name || !identifier) return;

    const created: RoleItem = {
      id: `role-${Date.now()}`,
      name,
      identifier,
      description:
        newRoleDescription.trim() || `Custom permissions role for ${name}.`,
      memberCount: 0,
      permissions: ["org:api-key:read", "org:api-key:list"],
    };
    setRoles((prev) => [...prev, created]);
    setSelectedRoleId(created.id);
    setNewRoleName("");
    setNewRoleIdentifier("org:");
    setNewRoleDescription("");
    setCreateOpen(false);
    toast.success(`Created role ${created.name}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-default-900 tracking-tight">
            Roles &amp; Access Assignment
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create custom roles and assign module-level access control
            permissions.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <Card className="lg:col-span-4 rounded-xl border border-border">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Filter roles..."
                className="pl-9"
              />
            </div>

            <div className="space-y-2.5">
              {filteredRoles.map((role) => {
                const isSelected = activeRole?.id === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={cn(
                      "w-full text-left rounded-lg border p-3.5 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isSelected ? "text-primary" : "text-default-900"
                        )}
                      >
                        {role.name}
                      </span>
                      <code className="text-[11px] text-muted-foreground">
                        {role.identifier}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {role.memberCount} members · {role.permissions.length}{" "}
                      perms
                    </p>
                  </button>
                );
              })}
              {filteredRoles.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No roles found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {activeRole && (
          <Card className="lg:col-span-8 rounded-xl border border-border">
            <CardHeader className="flex flex-row items-center justify-between gap-4 px-6 py-5 mb-0">
              <CardTitle className="text-lg font-semibold text-default-900">
                Edit Role: {activeRole.name}
              </CardTitle>
              <Badge variant="soft" color="default">
                {activeRole.memberCount} Assigned Members
              </Badge>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input
                    id="role-name"
                    value={activeRole.name}
                    onChange={(e) =>
                      updateActiveRole((r) => ({ ...r, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role-identifier">Role Identifier</Label>
                  <Input
                    id="role-identifier"
                    value={activeRole.identifier}
                    onChange={(e) =>
                      updateActiveRole((r) => ({
                        ...r,
                        identifier: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role-desc">Description</Label>
                <Input
                  id="role-desc"
                  value={activeRole.description}
                  onChange={(e) =>
                    updateActiveRole((r) => ({
                      ...r,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="border-t border-border pt-5 space-y-3">
                <h2 className="text-sm font-semibold text-default-900">
                  Assign Access Control
                </h2>

                <Accordion
                  type="multiple"
                  defaultValue={["api-key", "org-members"]}
                  className="space-y-3"
                >
                  {PERMISSION_GROUPS.map((group) => {
                    const checkedCount = group.permissions.filter((p) =>
                      activeRole.permissions.includes(p)
                    ).length;

                    return (
                      <AccordionItem
                        key={group.id}
                        value={group.id}
                        className="border border-border bg-background rounded-lg px-4 py-0 shadow-none"
                      >
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <div className="flex items-center gap-2.5 text-left">
                            <span className="text-sm font-semibold text-default-900">
                              {group.module}
                            </span>
                            <Badge
                              variant="soft"
                              color={checkedCount > 0 ? "default" : "secondary"}
                            >
                              {checkedCount} / {group.permissions.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="[&>div]:pt-0">
                          <div className="border-t border-border pt-3 pb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {group.permissions.map((perm) => {
                                const checkboxId = `${activeRole.id}-${perm}`;
                                const isChecked =
                                  activeRole.permissions.includes(perm);
                                return (
                                  <div
                                    key={perm}
                                    className="flex items-center gap-2.5 rounded-md border border-border/60 bg-card px-3 py-2"
                                  >
                                    <Checkbox
                                      id={checkboxId}
                                      size="sm"
                                      checked={isChecked}
                                      onCheckedChange={(checked) =>
                                        togglePermission(perm, Boolean(checked))
                                      }
                                    />
                                    <Label
                                      htmlFor={checkboxId}
                                      className="text-xs font-mono text-default-700 cursor-pointer flex-1"
                                    >
                                      {perm}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="soft"
                  color="destructive"
                  disabled={activeRole.system}
                  onClick={handleDeleteRole}
                  className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Delete Role
                </Button>
                <Button type="button" onClick={handleSavePermissions}>
                  Save Permissions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>
              Create a new RBAC role and assign its module permissions in the
              editor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-role-name">Role Name</Label>
              <Input
                id="new-role-name"
                placeholder="e.g. Security Auditor"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role-id">Role Identifier</Label>
              <Input
                id="new-role-id"
                placeholder="org:auditor"
                value={newRoleIdentifier}
                onChange={(e) => setNewRoleIdentifier(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role-desc">Description</Label>
              <Input
                id="new-role-desc"
                placeholder="Read access to security logs and API keys"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                color="secondary"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Role</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
