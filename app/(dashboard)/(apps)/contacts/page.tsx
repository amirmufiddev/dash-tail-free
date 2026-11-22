"use client";

import React, { useMemo, useState } from "react";
import {
  Mail,
  Send,
  Star,
  Folder,
  Info,
  Briefcase,
  Search,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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

type Department = "Engineering" | "Support" | "Sales";

interface ContactItem {
  id: string;
  name: string;
  department: Department;
  company: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  avatar: string;
  starred: boolean;
  frequent: boolean;
}

const initialContacts: ContactItem[] = [
  {
    id: "c-1",
    name: "Georgeanna Ramero",
    department: "Sales",
    company: "Muller Inc",
    phone: "456-485-5623",
    email: "qq739v47ggn@claimab.com",
    address: "19214 110th Rd, Saint Albans, NY, 1141",
    notes:
      "Zac la bewaseipi kib pul fopigu div pic puwubew jeserbor wezuba tuc ne. Fi pujworot ezilawiz nujdol ge te enedeot reckoof lincutna viano pedepop zeje ni ipkiw zu.",
    avatar: "/images/avatar/avatar-1.jpg",
    starred: true,
    frequent: true,
  },
  {
    id: "c-2",
    name: "Cami Macha",
    department: "Support",
    company: "Northstar Desk",
    phone: "312-555-0184",
    email: "cami.macha@northstar.io",
    address: "418 N Wabash Ave, Chicago, IL, 60611",
    notes: "Primary escalation contact for enterprise SLA accounts.",
    avatar: "/images/avatar/avatar-2.jpg",
    starred: false,
    frequent: true,
  },
  {
    id: "c-3",
    name: "Alda Ziemer",
    department: "Engineering",
    company: "CloudScale Labs",
    phone: "206-555-0149",
    email: "alda.ziemer@cloudscale.dev",
    address: "920 Pike St, Seattle, WA, 98101",
    notes: "Lead platform architect overseeing API gateway migrations.",
    avatar: "/images/avatar/avatar-3.jpg",
    starred: false,
    frequent: false,
  },
  {
    id: "c-4",
    name: "Luciano Macpherson",
    department: "Support",
    company: "HelpWave",
    phone: "512-555-0192",
    email: "luciano@helpwave.co",
    address: "600 Congress Ave, Austin, TX, 78701",
    notes: "Manages onboarding playbooks and customer training sessions.",
    avatar: "/images/avatar/avatar-4.jpg",
    starred: true,
    frequent: true,
  },
  {
    id: "c-5",
    name: "Dalton Paden",
    department: "Engineering",
    company: "VectorGrid",
    phone: "415-555-0123",
    email: "dalton@vectorgrid.io",
    address: "535 Mission St, San Francisco, CA, 94105",
    notes: "Frontend performance and design system maintainer.",
    avatar: "/images/avatar/avatar-5.jpg",
    starred: false,
    frequent: false,
  },
  {
    id: "c-6",
    name: "Juan Granado",
    department: "Support",
    company: "BrightPulse",
    phone: "305-555-0176",
    email: "juan.granado@brightpulse.com",
    address: "1450 Brickell Ave, Miami, FL, 33131",
    notes: "Regional support coordinator for LATAM accounts.",
    avatar: "/images/avatar/avatar-6.jpg",
    starred: false,
    frequent: false,
  },
  {
    id: "c-7",
    name: "Revan Allen",
    department: "Support",
    company: "ApexCare",
    phone: "617-555-0134",
    email: "revan.allen@apexcare.org",
    address: "200 Clarendon St, Boston, MA, 02116",
    notes: "Handles billing inquiries and annual renewal reviews.",
    avatar: "/images/avatar/avatar-7.jpg",
    starred: false,
    frequent: true,
  },
  {
    id: "c-8",
    name: "Juley Huseman",
    department: "Sales",
    company: "Summit Partners",
    phone: "303-555-0167",
    email: "juley@summitpartners.com",
    address: "1700 Lincoln St, Denver, CO, 80203",
    notes: "Enterprise account executive for mid-market expansion.",
    avatar: "/images/avatar/avatar-8.jpg",
    starred: true,
    frequent: false,
  },
  {
    id: "c-9",
    name: "Bridgette Phung",
    department: "Engineering",
    company: "Synthetix AI",
    phone: "408-555-0188",
    email: "bridgette@synthetix.ai",
    address: "250 W Tasman Dr, San Jose, CA, 95134",
    notes: "Data pipeline lead collaborating on analytics webhooks.",
    avatar: "/images/avatar/avatar-9.jpg",
    starred: true,
    frequent: true,
  },
  {
    id: "c-10",
    name: "Ernest Cousins",
    department: "Support",
    company: "KiteWorks",
    phone: "404-555-0115",
    email: "ernest@kiteworks.net",
    address: "191 Peachtree St NE, Atlanta, GA, 30303",
    notes: "Technical support specialist for SSO integrations.",
    avatar: "/images/avatar/avatar-10.jpg",
    starred: false,
    frequent: false,
  },
  {
    id: "c-11",
    name: "Nicolette Trapani",
    department: "Engineering",
    company: "LumenOps",
    phone: "212-555-0154",
    email: "nicolette@lumenops.dev",
    address: "350 Fifth Ave, New York, NY, 10118",
    notes: "Infrastructure engineer working on observability tooling.",
    avatar: "/images/avatar/avatar-11.jpg",
    starred: false,
    frequent: false,
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>(initialContacts);
  const [selectedId, setSelectedId] = useState<string>(initialContacts[0].id);
  const [filterView, setFilterView] = useState<"all" | "frequent" | "starred">("all");
  const [categoryFilter, setCategoryFilter] = useState<Department | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    department: "Engineering" as Department,
    company: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (filterView === "frequent" && !c.frequent) return false;
      if (filterView === "starred" && !c.starred) return false;
      if (categoryFilter && c.department !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [contacts, filterView, categoryFilter, search]);

  const activeContact =
    contacts.find((c) => c.id === selectedId) ?? filteredContacts[0] ?? null;

  const toggleStar = (id: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c))
    );
  };

  const deleteContact = (id: string) => {
    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? "");
      }
      return next;
    });
    toast.success("Contact deleted");
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormState({
      name: "",
      department: "Engineering",
      company: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (contact: ContactItem) => {
    setEditingId(contact.id);
    setFormState({
      name: contact.name,
      department: contact.department,
      company: contact.company,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
      notes: contact.notes,
    });
    setModalOpen(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) return;
    if (editingId) {
      setContacts((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, ...formState } : c))
      );
      toast.success("Contact updated");
    } else {
      const created: ContactItem = {
        id: `c-${Date.now()}`,
        ...formState,
        avatar: `/images/avatar/avatar-${(contacts.length % 13) + 1}.jpg`,
        starred: false,
        frequent: false,
      };
      setContacts((prev) => [created, ...prev]);
      setSelectedId(created.id);
      toast.success("Contact added");
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
          {/* Left Filter Sidebar */}
          <div className="lg:col-span-2 border-b lg:border-b-0 lg:border-r border-border p-4 space-y-4">
            <Button  className="w-full" onClick={openAddModal}>
              Add New Contact
            </Button>

            <div className="space-y-1">
              {[
                { key: "all" as const, label: "All", icon: Mail },
                { key: "frequent" as const, label: "Frequent", icon: Send },
                { key: "starred" as const, label: "Starred", icon: Star },
              ].map((item) => {
                const Icon = item.icon;
                const active = filterView === item.key && !categoryFilter;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setFilterView(item.key);
                      setCategoryFilter(null);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                      active
                        ? "bg-muted font-semibold text-default-900"
                        : "text-default-600 hover:bg-muted/60"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="px-3 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                Categories
              </div>
              <div className="space-y-1">
                {(
                  [
                    { label: "Engineering" as const, icon: Folder },
                    { label: "Support" as const, icon: Info },
                    { label: "Sales" as const, icon: Briefcase },
                  ] as const
                ).map((cat) => {
                  const Icon = cat.icon;
                  const active = categoryFilter === cat.label;
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() =>
                        setCategoryFilter((prev) =>
                          prev === cat.label ? null : cat.label
                        )
                      }
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                        active
                          ? "bg-muted font-semibold text-default-900"
                          : "text-default-600 hover:bg-muted/60"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Middle Contact List */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-border flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find top Contacts.."
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="h-[620px]">
              <div className="divide-y divide-border/50">
                {filteredContacts.map((contact) => {
                  const isSelected = activeContact?.id === contact.id;
                  return (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedId(contact.id)}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition-colors",
                        isSelected ? "bg-muted" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={contact.avatar} alt={contact.name} />
                          <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-default-900 truncate">
                            {contact.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {contact.department}
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          aria-label={`Star ${contact.name}`}
                          onClick={() => toggleStar(contact.id)}
                          className="p-1 rounded hover:bg-background"
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              contact.starred
                                ? "fill-amber-400 text-amber-400"
                                : "text-default-400"
                            )}
                          />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${contact.name}`}
                          onClick={() => deleteContact(contact.id)}
                          className="p-1 rounded text-default-500 hover:text-destructive hover:bg-background"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredContacts.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No contacts match the current filter.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Contact Details */}
          <div className="lg:col-span-6 flex flex-col">
            {activeContact ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 className="text-base font-semibold text-default-900">
                    Contact Details
                  </h2>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Toggle favorite"
                      onClick={() => toggleStar(activeContact.id)}
                      className="p-1 rounded hover:bg-muted"
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          activeContact.starred
                            ? "fill-amber-400 text-amber-400"
                            : "text-default-400"
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      aria-label="Edit contact"
                      onClick={() => openEditModal(activeContact)}
                      className="p-1 rounded text-default-600 hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete contact"
                      onClick={() => deleteContact(activeContact.id)}
                      className="p-1 rounded text-default-600 hover:text-destructive hover:bg-muted"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6 flex-1">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage
                        src={activeContact.avatar}
                        alt={activeContact.name}
                      />
                      <AvatarFallback>
                        {getInitials(activeContact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-base font-semibold text-default-900">
                        {activeContact.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activeContact.department}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activeContact.company}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Phone Number
                      </div>
                      <div className="mt-1 text-sm font-semibold text-default-900">
                        {activeContact.phone}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Email address
                      </div>
                      <div className="mt-1 text-sm font-semibold text-default-900">
                        {activeContact.email}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">Address</div>
                    <div className="mt-1 text-sm font-semibold text-default-900">
                      {activeContact.address}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Department
                      </div>
                      <div className="mt-1 text-sm font-semibold text-default-900">
                        {activeContact.department}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Company</div>
                      <div className="mt-1 text-sm font-semibold text-default-900">
                        {activeContact.company}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">Notes</div>
                    <p className="mt-1 text-sm font-medium text-default-800 leading-relaxed">
                      {activeContact.notes}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-border flex items-center gap-3">
                  <Button
                    type="button"
                    
                    onClick={() => openEditModal(activeContact)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="soft"
                    color="destructive"
                    className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => deleteContact(activeContact.id)}
                  >
                    Delete
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
                Select a contact to view details.
              </div>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Contact" : "Add New Contact"}
            </DialogTitle>
            <DialogDescription>
              Manage workspace contact details and department assignment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveContact} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Full Name</Label>
                <Input
                  id="contact-name"
                  value={formState.name}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-dept">Department</Label>
                <Select
                  value={formState.department}
                  onValueChange={(value) =>
                    setFormState((s) => ({
                      ...s,
                      department: value as Department,
                    }))
                  }
                >
                  <SelectTrigger id="contact-dept" size="md">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Support">Support</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-phone">Phone Number</Label>
                <Input
                  id="contact-phone"
                  value={formState.phone}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email Address</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={formState.email}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, email: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact-company">Company</Label>
                <Input
                  id="contact-company"
                  value={formState.company}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, company: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-address">Address</Label>
                <Input
                  id="contact-address"
                  value={formState.address}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, address: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                value={formState.notes}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, notes: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                color="secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" >
                {editingId ? "Save Changes" : "Create Contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
