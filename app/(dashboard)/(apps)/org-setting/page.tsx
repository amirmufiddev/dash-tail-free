"use client";

import React, { useState } from "react";
import { ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

export default function OrgSettingPage() {
  const [orgName, setOrgName] = useState("DashTail Labs Inc.");
  const [orgSlug, setOrgSlug] = useState("dashtail-labs");
  const [billingEmail, setBillingEmail] = useState("ops@dashtail.dev");
  const [verifiedDomain, setVerifiedDomain] = useState("app.dashtail.dev");
  const [defaultRole, setDefaultRole] = useState("org:developer");
  const [orgMark, setOrgMark] = useState("DT");

  const [enforceSso, setEnforceSso] = useState(true);
  const [require2fa, setRequire2fa] = useState(true);
  const [allowMemberKeys, setAllowMemberKeys] = useState(false);
  const [ipAllowlist, setIpAllowlist] = useState(true);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");

  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Saved settings for ${orgName}`);
  };

  const handleCycleLogo = () => {
    const marks = ["DT", "DL", "DX"];
    const next = marks[(marks.indexOf(orgMark) + 1) % marks.length];
    setOrgMark(next);
    toast.success("Updated organization badge");
  };

  const handleConfirmDelete = () => {
    if (confirmSlug.trim() !== orgSlug) {
      toast.error(`Type "${orgSlug}" to confirm`);
      return;
    }
    setDeleteOpen(false);
    setConfirmSlug("");
    toast.success("Organization deletion request queued");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-default-900 tracking-tight">
            Organization Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage organization identity, default member roles, and workspace
            security policies.
          </p>
        </div>
        <Badge variant="soft" color="default" className="self-start sm:self-auto">
          Org ID: org_84k29m
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-5">
          <Card className="rounded-xl border border-border">
            <CardHeader className="px-6 py-4 mb-0">
              <CardTitle className="text-base font-semibold text-default-900">
                Organization Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveOrg} className="space-y-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-lg font-bold shrink-0">
                    {orgMark}
                  </div>
                  <div className="space-y-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      color="secondary"
                      onClick={handleCycleLogo}
                      className="gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Org Logo
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Displayed in SSO login screens and shared workspace
                      invites.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="org-slug">Organization Slug</Label>
                    <Input
                      id="org-slug"
                      value={orgSlug}
                      onChange={(e) => setOrgSlug(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="billing-email">Billing Email</Label>
                    <Input
                      id="billing-email"
                      type="email"
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="verified-domain">Verified Domain</Label>
                    <Input
                      id="verified-domain"
                      value={verifiedDomain}
                      onChange={(e) => setVerifiedDomain(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="default-role">
                    Default Role for New Invites
                  </Label>
                  <Select value={defaultRole} onValueChange={setDefaultRole}>
                    <SelectTrigger id="default-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="org:admin">
                        Admin (org:admin)
                      </SelectItem>
                      <SelectItem value="org:developer">
                        Developer (org:developer)
                      </SelectItem>
                      <SelectItem value="org:viewer">
                        Viewer (org:viewer)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit">Save Organization</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-destructive/60">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-destructive">
                  Transfer or Delete Organization
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Deleting removes all API keys, roles, and member records
                  permanently.
                </p>
              </div>
              <Button
                type="button"
                variant="soft"
                color="destructive"
                onClick={() => setDeleteOpen(true)}
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0"
              >
                Delete Organization
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-5">
          <Card className="rounded-xl border border-border">
            <CardHeader className="px-6 py-4 mb-0">
              <CardTitle className="text-base font-semibold text-default-900">
                RBAC &amp; Security Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-default-900">
                    Enforce SSO / SAML
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Require identity provider sign-in for all members.
                  </p>
                </div>
                <Switch
                  checked={enforceSso}
                  onCheckedChange={setEnforceSso}
                  aria-label="Enforce SSO / SAML"
                />
              </div>

              <div className="flex items-start justify-between gap-3 pt-3 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-default-900">
                    Require 2FA for All Members
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Block API key management until 2FA is verified.
                  </p>
                </div>
                <Switch
                  checked={require2fa}
                  onCheckedChange={setRequire2fa}
                  aria-label="Require 2FA for All Members"
                />
              </div>

              <div className="flex items-start justify-between gap-3 pt-3 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-default-900">
                    Allow Member API Keys
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permit non-admin developers to issue scoped keys.
                  </p>
                </div>
                <Switch
                  checked={allowMemberKeys}
                  onCheckedChange={setAllowMemberKeys}
                  aria-label="Allow Member API Keys"
                />
              </div>

              <div className="flex items-start justify-between gap-3 pt-3 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-default-900">
                    IP Allowlist Guard
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Restrict admin actions to corporate VPN CIDR blocks.
                  </p>
                </div>
                <Switch
                  checked={ipAllowlist}
                  onCheckedChange={setIpAllowlist}
                  aria-label="IP Allowlist Guard"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-default-900">
                  Organization Seats
                </span>
                <span className="font-semibold text-primary text-xs">
                  14 / 20 used
                </span>
              </div>
              <Progress value={70} color="primary" size="md" />
              <p className="text-xs text-muted-foreground">
                Pro Organization Plan renews on 01 Dec, 2026.
              </p>
            </CardContent>
          </Card>

          <Alert color="info" variant="soft" className="items-start">
            <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <AlertTitle className="text-sm font-semibold mb-1">
                RBAC Policy Enforced
              </AlertTitle>
              <AlertDescription className="text-xs">
                Permission updates propagate immediately across all 14
                organization members.
              </AlertDescription>
            </div>
          </Alert>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete Organization
            </DialogTitle>
            <DialogDescription>
              Type <strong>{orgSlug}</strong> below to confirm permanent
              deletion of this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-org-slug">Organization Slug</Label>
            <Input
              id="confirm-org-slug"
              placeholder={orgSlug}
              value={confirmSlug}
              onChange={(e) => setConfirmSlug(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              color="secondary"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              color="destructive"
              onClick={handleConfirmDelete}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
