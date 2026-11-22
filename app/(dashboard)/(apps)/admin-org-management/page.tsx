"use client";

import React, { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Building2 } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
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

type OrgPlan = "Enterprise" | "Pro" | "Starter";
type OrgStatus = "Active" | "Trial" | "Suspended";

interface OrganizationItem {
  id: string;
  mark: string;
  name: string;
  slug: string;
  domain: string;
  ownerEmail: string;
  plan: OrgPlan;
  usedSeats: number;
  maxSeats: number;
  status: OrgStatus;
  createdAt: string;
}

const INITIAL_ORGS: OrganizationItem[] = [
  {
    id: "org_84k29m",
    mark: "DT",
    name: "DashTail Labs Inc.",
    slug: "dashtail-labs",
    domain: "app.dashtail.dev",
    ownerEmail: "amir@dashtail.dev",
    plan: "Pro",
    usedSeats: 14,
    maxSeats: 20,
    status: "Active",
    createdAt: "12 Jan, 2025",
  },
  {
    id: "org_31x77q",
    mark: "CS",
    name: "CloudScale Labs",
    slug: "cloudscale-labs",
    domain: "sso.cloudscale.dev",
    ownerEmail: "alda@cloudscale.dev",
    plan: "Enterprise",
    usedSeats: 48,
    maxSeats: 100,
    status: "Active",
    createdAt: "04 Feb, 2025",
  },
  {
    id: "org_55n10p",
    mark: "NS",
    name: "Northstar Desk",
    slug: "northstar-desk",
    domain: "portal.northstar.io",
    ownerEmail: "cami@northstar.io",
    plan: "Pro",
    usedSeats: 9,
    maxSeats: 20,
    status: "Trial",
    createdAt: "18 Mar, 2025",
  },
  {
    id: "org_92v41w",
    mark: "VG",
    name: "VectorGrid Corp",
    slug: "vectorgrid-corp",
    domain: "auth.vectorgrid.io",
    ownerEmail: "dalton@vectorgrid.io",
    plan: "Starter",
    usedSeats: 5,
    maxSeats: 5,
    status: "Suspended",
    createdAt: "29 Apr, 2025",
  },
];

export default function AdminOrgManagementPage() {
  const [orgs, setOrgs] = useState<OrganizationItem[]>(INITIAL_ORGS);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [formOwner, setFormOwner] = useState("");
  const [formPlan, setFormPlan] = useState<OrgPlan>("Pro");
  const [formSeats, setFormSeats] = useState("20");
  const [formStatus, setFormStatus] = useState<OrgStatus>("Active");

  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orgs.filter((o) => {
      const matchesPlan = planFilter === "all" || o.plan === planFilter;
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesSearch =
        !q ||
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        o.ownerEmail.toLowerCase().includes(q) ||
        o.domain.toLowerCase().includes(q);
      return matchesPlan && matchesStatus && matchesSearch;
    });
  }, [orgs, search, planFilter, statusFilter]);

  const totalSeatsUsed = orgs.reduce((acc, item) => acc + item.usedSeats, 0);
  const paidCount = orgs.filter(
    (o) => o.plan === "Enterprise" || o.plan === "Pro"
  ).length;
  const suspendedCount = orgs.filter((o) => o.status === "Suspended").length;

  const openCreate = () => {
    setEditingOrg(null);
    setFormName("");
    setFormSlug("");
    setFormDomain("");
    setFormOwner("");
    setFormPlan("Pro");
    setFormSeats("20");
    setFormStatus("Active");
    setDialogOpen(true);
  };

  const openEdit = (org: OrganizationItem) => {
    setEditingOrg(org);
    setFormName(org.name);
    setFormSlug(org.slug);
    setFormDomain(org.domain);
    setFormOwner(org.ownerEmail);
    setFormPlan(org.plan);
    setFormSeats(String(org.maxSeats));
    setFormStatus(org.status);
    setDialogOpen(true);
  };

  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    const slug =
      formSlug.trim() ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    if (!name || !slug) return;

    const parsedSeats = Math.max(1, Number(formSeats) || 20);
    const mark = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

    if (editingOrg) {
      setOrgs((prev) =>
        prev.map((o) =>
          o.id === editingOrg.id
            ? {
                ...o,
                name,
                slug,
                mark: mark || o.mark,
                domain: formDomain.trim() || `${slug}.dashtail.dev`,
                ownerEmail: formOwner.trim() || o.ownerEmail,
                plan: formPlan,
                maxSeats: parsedSeats,
                status: formStatus,
              }
            : o
        )
      );
      toast.success(`Updated organization ${name}`);
    } else {
      const created: OrganizationItem = {
        id: `org_${Math.random().toString(36).slice(2, 8)}`,
        mark: mark || "OR",
        name,
        slug,
        domain: formDomain.trim() || `${slug}.dashtail.dev`,
        ownerEmail: formOwner.trim() || "owner@dashtail.dev",
        plan: formPlan,
        usedSeats: 1,
        maxSeats: parsedSeats,
        status: formStatus,
        createdAt: "23 Nov, 2026",
      };
      setOrgs((prev) => [created, ...prev]);
      toast.success(`Created organization ${name}`);
    }
    setDialogOpen(false);
  };

  const handleDeleteOrg = (org: OrganizationItem) => {
    setOrgs((prev) => prev.filter((o) => o.id !== org.id));
    toast.success(`Removed organization ${org.name}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-default-900 tracking-tight">
            Admin Organization Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage tenant organizations, subscription tiers, seat quotas, and
            workspace provisioning.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Organization
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Total Organizations
            </p>
            <p className="text-2xl font-bold text-default-900 mt-1">
              {orgs.length}
            </p>
            <p className="text-xs text-primary mt-1">Multi-tenant workspaces</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Paid Plans (Pro / Ent)
            </p>
            <p className="text-2xl font-bold text-default-900 mt-1">
              {paidCount}
            </p>
            <p className="text-xs text-success mt-1">Active subscriptions</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Provisioned Seats
            </p>
            <p className="text-2xl font-bold text-default-900 mt-1">
              {totalSeatsUsed}
            </p>
            <p className="text-xs text-primary mt-1">Active org members</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Suspended Orgs
            </p>
            <p className="text-2xl font-bold text-default-900 mt-1">
              {suspendedCount}
            </p>
            <p className="text-xs text-destructive mt-1">Requires billing review</p>
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
                placeholder="Search org name, slug, domain, or owner..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="w-[170px]">
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Plan: All Plans</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                    <SelectItem value="Pro">Pro</SelectItem>
                    <SelectItem value="Starter">Starter</SelectItem>
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
                    <SelectItem value="Trial">Trial</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead>Organization</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="min-w-[170px]">Seats Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.map((org) => {
                const ratio = Math.min(
                  100,
                  Math.round((org.usedSeats / org.maxSeats) * 100)
                );
                return (
                  <TableRow
                    key={org.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {org.mark || <Building2 className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-default-900">
                            {org.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {org.slug} · {org.domain}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-default-700">
                      {org.ownerEmail}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="soft"
                        color={
                          org.plan === "Enterprise"
                            ? "default"
                            : org.plan === "Pro"
                              ? "info"
                              : "secondary"
                        }
                      >
                        {org.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-default-900">
                            {org.usedSeats} / {org.maxSeats}
                          </span>
                          <span className="text-muted-foreground">{ratio}%</span>
                        </div>
                        <Progress value={ratio} size="sm" color="primary" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="soft"
                        color={
                          org.status === "Active"
                            ? "success"
                            : org.status === "Trial"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {org.createdAt}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          color="secondary"
                          aria-label={`Edit ${org.name}`}
                          onClick={() => openEdit(org)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="soft"
                          color="destructive"
                          aria-label={`Delete ${org.name}`}
                          onClick={() => handleDeleteOrg(org)}
                          className="h-8 w-8 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredOrgs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No organizations match your filter criteria.
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
              {editingOrg
                ? `Edit Organization: ${editingOrg.name}`
                : "Create Organization"}
            </DialogTitle>
            <DialogDescription>
              Provision a tenant organization with custom slug, verified domain,
              and seat quota.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveOrg} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-org-name">Organization Name</Label>
                <Input
                  id="admin-org-name"
                  placeholder="Acme Cloud Inc."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-org-slug">Organization Slug</Label>
                <Input
                  id="admin-org-slug"
                  placeholder="acme-cloud"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-org-owner">Owner Email</Label>
                <Input
                  id="admin-org-owner"
                  type="email"
                  placeholder="founder@acme.dev"
                  value={formOwner}
                  onChange={(e) => setFormOwner(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-org-domain">Verified Domain</Label>
                <Input
                  id="admin-org-domain"
                  placeholder="sso.acme.dev"
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-org-plan">Plan</Label>
                <Select
                  value={formPlan}
                  onValueChange={(val) => setFormPlan(val as OrgPlan)}
                >
                  <SelectTrigger id="admin-org-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                    <SelectItem value="Pro">Pro</SelectItem>
                    <SelectItem value="Starter">Starter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-org-seats">Seat Limit</Label>
                <Input
                  id="admin-org-seats"
                  type="number"
                  min={1}
                  value={formSeats}
                  onChange={(e) => setFormSeats(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-org-status">Status</Label>
                <Select
                  value={formStatus}
                  onValueChange={(val) => setFormStatus(val as OrgStatus)}
                >
                  <SelectTrigger id="admin-org-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Trial">Trial</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                {editingOrg ? "Save Changes" : "Create Organization"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
