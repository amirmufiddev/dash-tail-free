"use client";

import React, { useState } from "react";
import {
  PlusCircle,
  MoreHorizontal,
  Settings,
  Mail,
  Video,
  CircleDot,
  Sparkles,
  Send,
  FileText,
  LayoutGrid,
  Diamond,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  badgeClass: string;
  glyph: React.ReactNode;
  highlightedMenu?: boolean;
}

const initialIntegrations: IntegrationItem[] = [
  {
    id: "gmail",
    name: "Gmail",
    description:
      "Integrate Gmail to send, receive, and manage emails directly from your workspace.",
    enabled: false,
    badgeClass: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    glyph: <Mail className="h-4 w-4" />,
  },
  {
    id: "google-meet",
    name: "Google Meet",
    description:
      "Connect your Google Meet account for seamless video conferencing.",
    enabled: false,
    badgeClass:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    glyph: <Video className="h-4 w-4" />,
  },
  {
    id: "linear",
    name: "Linear",
    description:
      "Integrate Linear to manage issues, track progress, and streamline your team's.",
    enabled: false,
    badgeClass: "bg-indigo-600 text-white",
    glyph: <CircleDot className="h-4 w-4" />,
  },
  {
    id: "loom",
    name: "Loom",
    description:
      "Integrate Loom to easily record, share, and manage video messages.",
    enabled: false,
    badgeClass:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
    glyph: <Sparkles className="h-4 w-4" />,
    highlightedMenu: true,
  },
  {
    id: "zoom",
    name: "Zoom",
    description:
      "Integrate Zoom to streamline your virtual meetings and team collaborations.",
    enabled: true,
    badgeClass: "bg-blue-600 text-white",
    glyph: <Video className="h-4 w-4" />,
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description:
      "Connect Mailchimp to streamline your email marketing—automate campaigns.",
    enabled: true,
    badgeClass:
      "bg-default-100 text-default-900 dark:bg-default-200 dark:text-default-900",
    glyph: <Send className="h-4 w-4" />,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Capture, organize, and tackle your to-dos from anywhere.",
    enabled: false,
    badgeClass:
      "bg-background border border-border text-default-900",
    glyph: <FileText className="h-4 w-4" />,
  },
  {
    id: "trello",
    name: "Trello",
    description: "Capture, organize, and tackle your to-dos from anywhere.",
    enabled: false,
    badgeClass: "bg-sky-600 text-white",
    glyph: <LayoutGrid className="h-4 w-4" />,
  },
  {
    id: "jira",
    name: "Jira",
    description:
      "Track issues and manage projects with ease and full team visibility.",
    enabled: false,
    badgeClass:
      "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
    glyph: <Diamond className="h-4 w-4" />,
  },
];

export default function IntegrationsPage() {
  const [items, setItems] = useState<IntegrationItem[]>(initialIntegrations);
  const [detailItem, setDetailItem] = useState<IntegrationItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const toggleIntegration = (id: string, checked: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: checked } : item
      )
    );
    const target = items.find((item) => item.id === id);
    if (target) {
      toast.success(`${target.name} ${checked ? "enabled" : "disabled"}`);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created: IntegrationItem = {
      id: `int-${Date.now()}`,
      name: newName.trim(),
      description:
        newDesc.trim() ||
        "Connected custom integration for workspace automation.",
      enabled: true,
      badgeClass: "bg-primary/15 text-primary",
      glyph: <Sparkles className="h-4 w-4" />,
    };
    setItems((prev) => [...prev, created]);
    setNewName("");
    setNewDesc("");
    setAddOpen(false);
    toast.success(`Added ${created.name}`);
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border">
        <CardHeader className="flex flex-row items-center justify-between px-6 py-5 mb-0 border-b border-border">
          <CardTitle className="text-lg font-semibold text-default-900">
            Integrations
          </CardTitle>
          <Button
            
            className="gap-2"
            onClick={() => setAddOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Add New Integration
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {items.map((item) => (
              <Card
                key={item.id}
                className="rounded-xl border border-border shadow-none flex flex-col justify-between"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center",
                        item.badgeClass
                      )}
                    >
                      {item.glyph}
                    </div>
                    <button
                      type="button"
                      aria-label={`More options for ${item.name}`}
                      onClick={() => setDetailItem(item)}
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center text-default-500 hover:bg-muted transition-colors",
                        item.highlightedMenu && "bg-muted"
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-default-900">
                      {item.name}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>

                <CardFooter className="px-5 py-3.5 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="icon"
                      aria-label={`Configure ${item.name}`}
                      onClick={() => setDetailItem(item)}
                      className="h-8 w-8 border-border bg-background text-default-600 hover:bg-muted hover:text-default-900"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailItem(item)}
                      className="h-8 border-border bg-background text-default-700 hover:bg-muted hover:text-default-900"
                    >
                      Details
                    </Button>
                  </div>
                  <Switch
                    
                    checked={item.enabled}
                    onCheckedChange={(checked) =>
                      toggleIntegration(item.id, checked)
                    }
                    aria-label={`Toggle ${item.name}`}
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(detailItem)}
        onOpenChange={(open) => !open && setDetailItem(null)}
      >
        <DialogContent size="md">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle>{detailItem.name}</DialogTitle>
                <DialogDescription>{detailItem.description}</DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <div className="text-sm font-medium text-default-900">
                    Connection Status
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {detailItem.enabled ? "Active in workspace" : "Not connected"}
                  </div>
                </div>
                <Switch
                  
                  checked={detailItem.enabled}
                  onCheckedChange={(checked) => {
                    toggleIntegration(detailItem.id, checked);
                    setDetailItem({ ...detailItem, enabled: checked });
                  }}
                />
              </div>
              <DialogFooter>
                <Button  onClick={() => setDetailItem(null)}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Add New Integration</DialogTitle>
            <DialogDescription>
              Connect a third-party app to your DashTail workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="integration-name">App Name</Label>
              <Input
                id="integration-name"
                placeholder="e.g. Slack"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="integration-desc">Description</Label>
              <Textarea
                id="integration-desc"
                placeholder="Describe how this integration will be used..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                color="secondary"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" >
                Add Integration
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
