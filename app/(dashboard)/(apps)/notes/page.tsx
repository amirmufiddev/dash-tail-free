"use client";

import React, { useMemo, useState } from "react";
import { Search, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

type NoteColorKey = "charcoal" | "red" | "amber" | "teal" | "navy";

interface NoteItem {
  id: string;
  content: string;
  date: string;
  color: NoteColorKey;
}

const colorStyles: Record<
  NoteColorKey,
  {
    swatch: string;
    card: string;
    text: string;
  }
> = {
  charcoal: {
    swatch: "bg-zinc-900",
    card: "bg-muted",
    text: "text-default-900",
  },
  red: {
    swatch: "bg-red-600",
    card: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-600 dark:text-red-400",
  },
  amber: {
    swatch: "bg-amber-500",
    card: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
  },
  teal: {
    swatch: "bg-teal-600",
    card: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-400",
  },
  navy: {
    swatch: "bg-sky-900",
    card: "bg-slate-100 dark:bg-slate-900",
    text: "text-slate-700 dark:text-slate-300",
  },
};

const initialNotes: NoteItem[] = [
  {
    id: "n-1",
    content:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    date: "6/4/2023",
    color: "charcoal",
  },
  {
    id: "n-2",
    content:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.",
    date: "6/3/2023",
    color: "red",
  },
  {
    id: "n-3",
    content:
      "consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.",
    date: "6/2/2023",
    color: "amber",
  },
  {
    id: "n-4",
    content:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    date: "6/4/2023",
    color: "teal",
  },
];

const swatchOrder: NoteColorKey[] = ["amber", "charcoal", "red", "teal", "navy"];

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [selectedId, setSelectedId] = useState<string>(initialNotes[0].id);
  const [search, setSearch] = useState("");

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter((n) => n.content.toLowerCase().includes(q));
  }, [notes, search]);

  const activeNote =
    notes.find((n) => n.id === selectedId) ?? filteredNotes[0] ?? null;

  const handleAddNote = () => {
    const now = new Date();
    const formatted = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const created: NoteItem = {
      id: `n-${Date.now()}`,
      content: "New workspace note...",
      date: formatted,
      color: "charcoal",
    };
    setNotes((prev) => [created, ...prev]);
    setSelectedId(created.id);
    toast.success("Note added");
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? "");
      }
      return next;
    });
    toast.success("Note deleted");
  };

  const handleUpdateContent = (value: string) => {
    if (!activeNote) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNote.id ? { ...n, content: value } : n))
    );
  };

  const handleChangeColor = (color: NoteColorKey) => {
    if (!activeNote) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNote.id ? { ...n, color } : n))
    );
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          {/* Left Notes List */}
          <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-border p-4 space-y-4">
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Notes..."
                className="pl-9"
              />
            </div>

            <div className="text-sm font-semibold text-default-900">
              All Notes
            </div>

            <ScrollArea className="h-[460px]">
              <div className="space-y-3 pr-1">
                {filteredNotes.map((note) => {
                  const style = colorStyles[note.color];
                  const isActive = activeNote?.id === note.id;
                  return (
                    <div
                      key={note.id}
                      onClick={() => setSelectedId(note.id)}
                      className={cn(
                        "rounded-lg p-3.5 cursor-pointer transition-all space-y-2.5",
                        style.card,
                        isActive && "ring-1 ring-border shadow-xs"
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-semibold truncate",
                          style.text
                        )}
                      >
                        {note.content || "Untitled note"}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[11px]", style.text)}>
                          {note.date}
                        </span>
                        <button
                          type="button"
                          aria-label="Delete note"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          className="p-1 rounded text-default-600 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredNotes.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No notes found.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Note Editor */}
          <div className="lg:col-span-9 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-default-900">
                Edit Note
              </h2>
              <Button  onClick={handleAddNote}>
                Add Note
              </Button>
            </div>

            {activeNote ? (
              <div className="p-6 space-y-6 flex-1">
                <Textarea
                  value={activeNote.content}
                  onChange={(e) => handleUpdateContent(e.target.value)}
                  placeholder="Write your note..."
                  className="min-h-[140px] text-sm leading-relaxed text-default-800"
                />

                <div className="space-y-3">
                  <div className="text-sm font-semibold text-default-900">
                    Change Note Color
                  </div>
                  <div className="flex items-center gap-3">
                    {swatchOrder.map((colorKey) => {
                      const isSelected = activeNote.color === colorKey;
                      return (
                        <button
                          key={colorKey}
                          type="button"
                          aria-label={`Set note color ${colorKey}`}
                          onClick={() => handleChangeColor(colorKey)}
                          className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center transition-transform hover:scale-105",
                            colorStyles[colorKey].swatch,
                            isSelected && "ring-2 ring-offset-2 ring-border"
                          )}
                        >
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
                Click &ldquo;Add Note&rdquo; to create your first note.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
