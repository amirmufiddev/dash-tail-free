"use client";

import React, { useState } from "react";
import { PlusCircle, Copy, Check, RotateCw, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  suffix: string;
  status: "Active" | "Disabled";
  created: string;
  lastUsed: string;
  enabled: boolean;
}

const initialApiKeys: ApiKeyItem[] = [
  {
    id: "key-1",
    name: "Web Client API Key",
    prefix: "web_live_",
    suffix: "5182",
    status: "Active",
    created: "11 Feb, 2025",
    lastUsed: "Today, 09:30 AM",
    enabled: true,
  },
  {
    id: "key-2",
    name: "Development API key",
    prefix: "dev_live_",
    suffix: "9471",
    status: "Active",
    created: "19 Dec, 2024",
    lastUsed: "Today, 01:30 AM",
    enabled: true,
  },
  {
    id: "key-3",
    name: "Production API Key",
    prefix: "pro_live_",
    suffix: "3845",
    status: "Disabled",
    created: "23 Mar, 2024",
    lastUsed: "Today, 06:30 PM",
    enabled: false,
  },
];

function randomFourDigits() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function ApiKeyPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>(initialApiKeys);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPrefix, setNewKeyPrefix] = useState("app_live_");

  const formatMaskedKey = (item: ApiKeyItem) =>
    `${item.prefix}************${item.suffix}`;

  const handleCopy = async (item: ApiKeyItem) => {
    const masked = formatMaskedKey(item);
    try {
      await navigator.clipboard.writeText(masked);
    } catch {
      // Clipboard may be unavailable in non-HTTPS contexts
    }
    setCopiedId(item.id);
    toast.success(`Copied ${item.name}`);
    setTimeout(() => {
      setCopiedId((prev) => (prev === item.id ? null : prev));
    }, 1500);
  };

  const handleRegenerate = (id: string) => {
    setKeys((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, suffix: randomFourDigits(), lastUsed: "Just now" }
          : item
      )
    );
    toast.success("API key regenerated");
  };

  const handleToggle = (id: string, checked: boolean) => {
    setKeys((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              enabled: checked,
              status: checked ? "Active" : "Disabled",
            }
          : item
      )
    );
  };

  const handleDelete = (id: string) => {
    setKeys((prev) => prev.filter((item) => item.id !== id));
    toast.success("API key deleted");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyName.trim();
    if (!trimmed) return;
    const prefix = newKeyPrefix.trim() || "app_live_";
    const created: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: trimmed,
      prefix: prefix.endsWith("_") ? prefix : `${prefix}_`,
      suffix: randomFourDigits(),
      status: "Active",
      created: "23 Nov, 2026",
      lastUsed: "Never",
      enabled: true,
    };
    setKeys((prev) => [created, ...prev]);
    setNewKeyName("");
    setDialogOpen(false);
    toast.success(`Generated ${created.name}`);
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 mb-0">
          <div>
            <CardTitle className="text-lg font-semibold text-default-900">
              API Keys
            </CardTitle>
            <CardDescription className="mt-1">
              API keys are used to authenticate requests to the dashtail API
            </CardDescription>
          </div>
          <Button
            
            className="gap-2 self-start sm:self-auto"
            onClick={() => setDialogOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Generate API key
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="px-6 min-w-[340px]">Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Disable/Enable</TableHead>
                <TableHead className="px-6 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((item) => (
                <TableRow
                  key={item.id}
                  className="border-b border-border last:border-b-0"
                >
                  <TableCell className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-default-900">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <Input
                            readOnly
                            removeWrapper
                            value={formatMaskedKey(item)}
                            aria-label={item.name}
                            className="w-[210px] h-9 rounded-r-none border-r-0 text-xs text-default-600 font-mono bg-background"
                          />
                          <Button
                            type="button"
                            color="secondary"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(item)}
                            className="h-9 rounded-l-none border-border bg-background text-default-700 hover:bg-muted hover:text-default-900 gap-1.5"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedId === item.id ? "Copied" : "Copy"}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          color="secondary"
                          size="icon"
                          aria-label={`Regenerate ${item.name}`}
                          onClick={() => handleRegenerate(item.id)}
                          className="h-9 w-9 bg-default-100 border border-border text-default-700 hover:bg-default-200 hover:text-default-900"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="soft"
                      color={item.status === "Active" ? "success" : "destructive"}
                      className={
                        item.status === "Active"
                          ? "bg-success/15 text-success hover:text-success"
                          : "bg-destructive/15 text-destructive hover:text-destructive"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-default-600">
                    {item.created}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-default-600">
                    {item.lastUsed}
                  </TableCell>
                  <TableCell>
                    <Switch
                      
                      checked={item.enabled}
                      onCheckedChange={(checked) => handleToggle(item.id, checked)}
                      aria-label={`Toggle ${item.name}`}
                    />
                  </TableCell>
                  <TableCell className="px-6 text-center">
                    <Button
                      type="button"
                      variant="soft"
                      color="destructive"
                      size="icon"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => handleDelete(item.id)}
                      className="h-9 w-9 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {keys.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No API keys yet. Click &ldquo;Generate API key&rdquo; to create one.
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
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              Create a new secret key to authenticate requests to the DashTail API.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">Key Name</Label>
              <Input
                id="api-key-name"
                placeholder="e.g. Staging Backend Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key-prefix">Prefix</Label>
              <Input
                id="api-key-prefix"
                placeholder="app_live_"
                value={newKeyPrefix}
                onChange={(e) => setNewKeyPrefix(e.target.value)}
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
              <Button type="submit" >
                Create Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
