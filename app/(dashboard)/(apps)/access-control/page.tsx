"use client";

import React, { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type PermissionAction = "Create" | "Read" | "List" | "Update" | "Delete";
type PermissionModule =
  | "Api Key"
  | "Organization & Members"
  | "Billing & Invoices";

interface PermissionItem {
  id: string;
  key: string;
  module: PermissionModule;
  action: PermissionAction;
  description: string;
  assignedRoles: string[];
  enabled: boolean;
}

const MODULE_META: Record<
  PermissionModule,
  { scopePrefix: string; badgeColor: "default" | "secondary" }
> = {
  "Api Key": { scopePrefix: "org:api-key:*", badgeColor: "default" },
  "Organization & Members": {
    scopePrefix: "org:member:*",
    badgeColor: "secondary",
  },
  "Billing & Invoices": {
    scopePrefix: "org:billing:*",
    badgeColor: "secondary",
  },
};

const ACTION_BADGE_COLORS: Record<
  PermissionAction,
  "default" | "info" | "secondary" | "warning" | "destructive"
> = {
  Create: "default",
  Read: "info",
  List: "secondary",
  Update: "warning",
  Delete: "destructive",
};

const INITIAL_PERMISSIONS: PermissionItem[] = [
  {
    id: "perm-1",
    key: "org:api-key:create",
    module: "Api Key",
    action: "Create",
    description: "Generate new organization API keys and signing tokens",
    assignedRoles: ["Owner", "Admin"],
    enabled: true,
  },
  {
    id: "perm-2",
    key: "org:api-key:read",
    module: "Api Key",
    action: "Read",
    description: "View API key metadata, scopes, and last-used status",
    assignedRoles: ["Owner", "Admin", "Developer"],
    enabled: true,
  },
  {
    id: "perm-3",
    key: "org:api-key:list",
    module: "Api Key",
    action: "List",
    description: "List all active and revoked API keys inside an organization",
    assignedRoles: ["Owner", "Admin", "Developer", "Viewer"],
    enabled: true,
  },
  {
    id: "perm-4",
    key: "org:api-key:update",
    module: "Api Key",
    action: "Update",
    description: "Rotate secrets, rename keys, and toggle active state",
    assignedRoles: ["Owner", "Admin"],
    enabled: true,
  },
  {
    id: "perm-5",
    key: "org:api-key:delete",
    module: "Api Key",
    action: "Delete",
    description: "Permanently revoke and remove organization API keys",
    assignedRoles: ["Owner", "Admin"],
    enabled: true,
  },
  {
    id: "perm-6",
    key: "org:member:invite",
    module: "Organization & Members",
    action: "Create",
    description: "Invite new team members and send workspace onboarding links",
    assignedRoles: ["Owner", "Admin"],
    enabled: true,
  },
  {
    id: "perm-7",
    key: "org:member:assign-role",
    module: "Organization & Members",
    action: "Update",
    description: "Assign or modify organization RBAC roles for team members",
    assignedRoles: ["Owner", "Admin"],
    enabled: true,
  },
  {
    id: "perm-8",
    key: "org:settings:update",
    module: "Organization & Members",
    action: "Update",
    description: "Modify workspace identity, SSO policies, and 2FA enforcement",
    assignedRoles: ["Owner"],
    enabled: true,
  },
  {
    id: "perm-9",
    key: "org:member:remove",
    module: "Organization & Members",
    action: "Delete",
    description: "Revoke organization access and remove team members",
    assignedRoles: ["Owner"],
    enabled: true,
  },
  {
    id: "perm-10",
    key: "org:billing:read",
    module: "Billing & Invoices",
    action: "Read",
    description: "View organization subscription plan, seats, and invoices",
    assignedRoles: ["Owner", "Admin"],
    enabled: true,
  },
  {
    id: "perm-11",
    key: "org:billing:update",
    module: "Billing & Invoices",
    action: "Update",
    description: "Update payment method, billing email, and seat limits",
    assignedRoles: ["Owner"],
    enabled: true,
  },
];

export default function AccessControlPage() {
  const [permissions, setPermissions] =
    useState<PermissionItem[]>(INITIAL_PERMISSIONS);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [expandedModules, setExpandedModules] = useState<
    Record<PermissionModule, boolean>
  >({
    "Api Key": true,
    "Organization & Members": false,
    "Billing & Invoices": false,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PermissionItem | null>(null);
  const [formKey, setFormKey] = useState("");
  const [formModule, setFormModule] = useState<PermissionModule>("Api Key");
  const [formAction, setFormAction] = useState<PermissionAction>("Read");
  const [formDescription, setFormDescription] = useState("");
  const [formRoles, setFormRoles] = useState("Owner, Admin");

  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return permissions.filter((item) => {
      const matchesModule =
        moduleFilter === "all" || item.module === moduleFilter;
      const matchesSearch =
        !q ||
        item.key.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.action.toLowerCase().includes(q);
      return matchesModule && matchesSearch;
    });
  }, [permissions, search, moduleFilter]);

  const groupedModules = useMemo(() => {
    const modules: PermissionModule[] = [
      "Api Key",
      "Organization & Members",
      "Billing & Invoices",
    ];
    return modules
      .map((mod) => ({
        module: mod,
        items: filteredPermissions.filter((p) => p.module === mod),
      }))
      .filter((g) => moduleFilter === "all" || g.module === moduleFilter);
  }, [filteredPermissions, moduleFilter]);

  const openCreateDialog = (defaultModule: PermissionModule = "Api Key") => {
    setEditingItem(null);
    setFormModule(defaultModule);
    setFormAction("Create");
    setFormKey(
      defaultModule === "Api Key"
        ? "org:api-key:"
        : defaultModule === "Organization & Members"
          ? "org:member:"
          : "org:billing:"
    );
    setFormDescription("");
    setFormRoles("Owner, Admin");
    setDialogOpen(true);
  };

  const openEditDialog = (item: PermissionItem) => {
    setEditingItem(item);
    setFormModule(item.module);
    setFormAction(item.action);
    setFormKey(item.key);
    setFormDescription(item.description);
    setFormRoles(item.assignedRoles.join(", "));
    setDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = formKey.trim();
    const trimmedDesc = formDescription.trim();
    if (!trimmedKey || !trimmedDesc) return;

    const rolesList = formRoles
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    if (editingItem) {
      setPermissions((prev) =>
        prev.map((p) =>
          p.id === editingItem.id
            ? {
                ...p,
                key: trimmedKey,
                module: formModule,
                action: formAction,
                description: trimmedDesc,
                assignedRoles: rolesList.length ? rolesList : ["Owner"],
              }
            : p
        )
      );
      toast.success(`Updated permission ${trimmedKey}`);
    } else {
      const created: PermissionItem = {
        id: `perm-${Date.now()}`,
        key: trimmedKey,
        module: formModule,
        action: formAction,
        description: trimmedDesc,
        assignedRoles: rolesList.length ? rolesList : ["Owner"],
        enabled: true,
      };
      setPermissions((prev) => [...prev, created]);
      setExpandedModules((prev) => ({ ...prev, [formModule]: true }));
      toast.success(`Created permission ${trimmedKey}`);
    }
    setDialogOpen(false);
  };

  const handleToggle = (id: string, checked: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: checked } : p))
    );
    toast.success(checked ? "Permission enabled" : "Permission disabled");
  };

  const handleDelete = (item: PermissionItem) => {
    setPermissions((prev) => prev.filter((p) => p.id !== item.id));
    toast.success(`Deleted ${item.key}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-default-900 tracking-tight">
            Permissions &amp; Access Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define granular module scopes and manage permission CRUD policies.
          </p>
        </div>
        <Button onClick={() => openCreateDialog("Api Key")} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Permission
        </Button>
      </div>

      <Card className="rounded-xl border border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-[320px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search permissions (e.g. org:api-key:read)"
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-[230px]">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Module: All Modules</SelectItem>
                <SelectItem value="Api Key">Module: Api Key</SelectItem>
                <SelectItem value="Organization & Members">
                  Module: Organization &amp; Members
                </SelectItem>
                <SelectItem value="Billing & Invoices">
                  Module: Billing &amp; Invoices
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {groupedModules.map(({ module, items }) => {
        const isExpanded =
          Boolean(search.trim()) ||
          moduleFilter !== "all" ||
          expandedModules[module];
        const meta = MODULE_META[module];

        return (
          <Card key={module} className="rounded-xl border border-border">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 mb-0">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-base font-semibold text-default-900">
                  Module: {module}
                </CardTitle>
                <Badge variant="soft" color={meta.badgeColor}>
                  {meta.scopePrefix}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {items.length} scopes configured
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  color="secondary"
                  onClick={() => openCreateDialog(module)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Scope
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  color="secondary"
                  onClick={() =>
                    setExpandedModules((prev) => ({
                      ...prev,
                      [module]: !isExpanded,
                    }))
                  }
                >
                  {isExpanded ? "Collapse" : "Expand"}
                </Button>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="px-6">Permission Key</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Assigned Roles</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead className="px-6 text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow
                        key={item.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <TableCell className="px-6 py-4">
                          <code className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-default-900">
                            {item.key}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="soft"
                            color={ACTION_BADGE_COLORS[item.action]}
                          >
                            {item.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-default-600 max-w-[340px]">
                          {item.description}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-default-700 whitespace-nowrap">
                          {item.assignedRoles.join(", ")}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={item.enabled}
                            onCheckedChange={(checked) =>
                              handleToggle(item.id, checked)
                            }
                            aria-label={`Enable ${item.key}`}
                          />
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              color="secondary"
                              aria-label={`Edit ${item.key}`}
                              onClick={() => openEditDialog(item)}
                              className="h-8 w-8 text-default-600 hover:bg-muted hover:text-default-900"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="soft"
                              color="destructive"
                              aria-label={`Delete ${item.key}`}
                              onClick={() => handleDelete(item)}
                              className="h-8 w-8 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No permissions match the current filter in this
                          module.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        );
      })}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Permission Scope" : "Create Permission Scope"}
            </DialogTitle>
            <DialogDescription>
              Configure module access control key, action type, and default role
              assignments.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="perm-module">Module</Label>
                <Select
                  value={formModule}
                  onValueChange={(val) =>
                    setFormModule(val as PermissionModule)
                  }
                >
                  <SelectTrigger id="perm-module">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Api Key">Api Key</SelectItem>
                    <SelectItem value="Organization & Members">
                      Organization &amp; Members
                    </SelectItem>
                    <SelectItem value="Billing & Invoices">
                      Billing &amp; Invoices
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="perm-action">Action</Label>
                <Select
                  value={formAction}
                  onValueChange={(val) =>
                    setFormAction(val as PermissionAction)
                  }
                >
                  <SelectTrigger id="perm-action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Create">Create</SelectItem>
                    <SelectItem value="Read">Read</SelectItem>
                    <SelectItem value="List">List</SelectItem>
                    <SelectItem value="Update">Update</SelectItem>
                    <SelectItem value="Delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perm-key">Permission Key</Label>
              <Input
                id="perm-key"
                placeholder="org:api-key:create"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="perm-desc">Description</Label>
              <Textarea
                id="perm-desc"
                placeholder="Describe what this permission allows..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="perm-roles">
                Assigned Roles (comma separated)
              </Label>
              <Input
                id="perm-roles"
                placeholder="Owner, Admin"
                value={formRoles}
                onChange={(e) => setFormRoles(e.target.value)}
              />
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
                {editingItem ? "Save Changes" : "Create Permission"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
