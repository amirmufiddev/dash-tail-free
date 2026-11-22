"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Search,
  Sparkles,
  Code2,
  Mail,
  Bug,
  Paperclip,
  Globe,
  ChevronDown,
  Mic,
  ArrowUp,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Trash2,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AiModel = "Claude 3.5 sonnet" | "Gemini 1.5 Pro" | "GPT-4o" | "Llama 3.1";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  codeSnippet?: string;
  note?: string;
  listTitle?: string;
  listItems?: string[];
  alertTitle?: string;
  alertDescription?: string;
  reaction?: "up" | "down" | null;
}

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  model: AiModel;
  messages: ChatMessage[];
}

const MODELS: AiModel[] = [
  "Claude 3.5 sonnet",
  "Gemini 1.5 Pro",
  "GPT-4o",
  "Llama 3.1",
];

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "chat-1",
    title: "How can I improve my skincare rou...",
    preview: "Cleanse twice daily, moisturize, and always we...",
    model: "Gemini 1.5 Pro",
    messages: [
      {
        id: "m-1",
        role: "user",
        content: "How can I improve my skincare routine?",
      },
      {
        id: "m-2",
        role: "assistant",
        content:
          "A consistent routine works best when kept simple and gentle:",
        listTitle: "Daily Skincare Essentials",
        listItems: [
          "Cleanse twice daily using a gentle, fragrance-free cleanser.",
          "Apply moisturizer while skin is slightly damp to lock in hydration.",
          "Wear broad-spectrum SPF 30+ sunscreen every morning.",
        ],
      },
    ],
  },
  {
    id: "chat-2",
    title: "What is React?",
    preview: "React is a JavaScript library for building user i...",
    model: "Claude 3.5 sonnet",
    messages: [
      {
        id: "m-3",
        role: "user",
        content: "What is React?",
      },
      {
        id: "m-4",
        role: "assistant",
        content:
          "React is a declarative JavaScript library for building composable user interfaces using reusable components and unidirectional data flow.",
      },
    ],
  },
  {
    id: "chat-3",
    title: "How much water should I drink dai...",
    preview: "Aim for about 8 glasses (2 liters) daily, but adju...",
    model: "GPT-4o",
    messages: [
      {
        id: "m-5",
        role: "user",
        content: "How much water should I drink daily?",
      },
      {
        id: "m-6",
        role: "assistant",
        content:
          "Aim for about 8 glasses (2 liters) daily, adjusting upward during warm weather or exercise.",
      },
    ],
  },
  {
    id: "chat-4",
    title: "How can I develop a daily reading ...",
    preview: "Set aside 10-15 minutes daily, choose books yo...",
    model: "Gemini 1.5 Pro",
    messages: [
      {
        id: "m-7",
        role: "user",
        content: "How can I develop a daily reading habit?",
      },
      {
        id: "m-8",
        role: "assistant",
        content:
          "Set aside 10-15 minutes at the same time each day, keep a book nearby, and start with topics you genuinely enjoy.",
      },
    ],
  },
  {
    id: "chat-5",
    title: "What is a hook in React?",
    preview: "Hooks are functions like useState and useEffe...",
    model: "Claude 3.5 sonnet",
    messages: [
      {
        id: "m-9",
        role: "user",
        content: "What is a hook in React?",
      },
      {
        id: "m-10",
        role: "assistant",
        content: "Hooks are functions like useState and useEffect that let function components manage state and side effects.",
        codeSnippet: `function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;\n}`,
      },
    ],
  },
];

const SUGGESTION_PROMPTS = [
  {
    title: "Write clean code snippets",
    subtitle: "efficient and readable code",
    icon: Code2,
    iconBoxClass: "bg-warning/15 text-warning",
    prompt: "Write clean code snippets",
  },
  {
    title: "Write a reply to this email",
    subtitle: "professional response",
    icon: Mail,
    iconBoxClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    prompt: "Write a reply to this email",
  },
  {
    title: "Help me debug this code",
    subtitle: "fix bugs quickly",
    icon: Bug,
    iconBoxClass: "bg-destructive/15 text-destructive",
    prompt: "Help me debug this code",
  },
];

let msgSeq = 100;
function nextId(prefix: string) {
  msgSeq += 1;
  return `${prefix}-${msgSeq}`;
}

function buildMockAssistantReply(prompt: string): ChatMessage {
  const lower = prompt.toLowerCase();
  const id = nextId("msg");

  if (lower.includes("code") || lower.includes("snippet")) {
    return {
      id,
      role: "assistant",
      content: "Here is a code example:",
      codeSnippet: `function example() {\n  console.log('This is a mock code snippet.');\n}`,
      note: "Please note that this is not generated by an actual AI model.",
    };
  }

  if (lower.includes("email") || lower.includes("reply")) {
    return {
      id,
      role: "assistant",
      content:
        "Subject: Re: Project Timeline Update\n\nHi Team,\nThank you for sharing the latest milestone details. I have reviewed the scope and confirmed we are aligned on this week's deliverables. Let's sync briefly tomorrow morning if any blockers come up.",
      note: "Please note that this is not generated by an actual AI model.",
    };
  }

  if (lower.includes("debug")) {
    return {
      id,
      role: "assistant",
      content: "Try these quick debugging checks to isolate the issue:",
      listTitle: "Quick Debug Checklist",
      listItems: [
        "Verify inputs and null/undefined guards before transforming data.",
        "Check network response payloads and status codes in DevTools.",
        "Isolate side effects and confirm state updates trigger cleanly.",
      ],
      note: "Please note that this is not generated by an actual AI model.",
    };
  }

  if (lower.includes("alert")) {
    return {
      id,
      role: "assistant",
      content: "Here is an example alert block:",
      alertTitle: "Heads up!",
      alertDescription:
        "You can trigger structured blocks by including keywords like 'title', 'alert', 'code', or 'list' in your prompt.",
    };
  }

  if (lower.includes("list") || lower.includes("title")) {
    return {
      id,
      role: "assistant",
      content: "Here is a structured overview based on your prompt:",
      listTitle: "Structured Response Example",
      listItems: [
        "Break tasks down into small, verifiable increments.",
        "Reuse existing UI primitives for visual consistency.",
        "Validate edge cases across both Light and Dark themes.",
      ],
    };
  }

  return {
    id,
    role: "assistant",
    content:
      "This is a sample response for demonstration purposes only. It's not generated by a real AI. Try including keywords like 'title', 'alert', 'code', or 'list'.",
  };
}

export default function AiChatBotPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState("");
  const [selectedModel, setSelectedModel] = useState<AiModel>("Gemini 1.5 Pro");
  const [promptInput, setPromptInput] = useState("");
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const filteredSessions = useMemo(() => {
    const q = searchHistory.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.preview.toLowerCase().includes(q)
    );
  }, [sessions, searchHistory]);

  const handleNewChat = () => {
    setActiveSessionId(null);
    setPromptInput("");
    setAttachedFileName(null);
    setIsThinking(false);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
    toast.success("Chat history removed");
  };

  const sendPrompt = (rawText: string) => {
    const text =
      rawText.trim() ||
      (attachedFileName ? `Uploaded attachment: ${attachedFileName}` : "");
    if (!text || isThinking) return;

    const userMsg: ChatMessage = {
      id: nextId("user"),
      role: "user",
      content: attachedFileName ? `${text} (${attachedFileName})` : text,
    };

    let targetSessionId = activeSessionId;

    if (!targetSessionId) {
      const createdId = nextId("chat");
      const newSession: ChatSession = {
        id: createdId,
        title: text.length > 34 ? `${text.slice(0, 34)}...` : text,
        preview: "Generating response...",
        model: selectedModel,
        messages: [userMsg],
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(createdId);
      targetSessionId = createdId;
    } else {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, messages: [...s.messages, userMsg] }
            : s
        )
      );
    }

    setPromptInput("");
    setAttachedFileName(null);
    setIsThinking(true);

    setTimeout(() => {
      const reply = buildMockAssistantReply(text);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? {
                ...s,
                preview:
                  reply.content.length > 48
                    ? `${reply.content.slice(0, 48)}...`
                    : reply.content,
                messages: [...s.messages, reply],
              }
            : s
        )
      );
      setIsThinking(false);
    }, 550);
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    const fullText = [msg.content, msg.codeSnippet, msg.note]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      // Ignore clipboard rejection in restricted contexts
    }
    setCopiedMsgId(msg.id);
    toast.success("Response copied");
    setTimeout(() => {
      setCopiedMsgId((prev) => (prev === msg.id ? null : prev));
    }, 1500);
  };

  const handleReaction = (msgId: string, type: "up" | "down") => {
    if (!activeSession) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === msgId
                  ? { ...m, reaction: m.reaction === type ? null : type }
                  : m
              ),
            }
          : s
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt(promptInput);
    }
  };

  return (
    <Card className="rounded-xl border border-border overflow-hidden">
      <div className="flex flex-col lg:flex-row min-h-[720px] lg:h-[calc(100vh-180px)]">
        {/* Left Chat History Sidebar */}
        <aside className="w-full lg:w-[300px] border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-card shrink-0">
          <div className="px-5 py-4 border-b border-border flex items-center justify-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-default-900 text-default-50 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold text-default-900 tracking-tight">
              DashTail AI
            </span>
          </div>

          <div className="p-4">
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                placeholder="Look up Chat History..."
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1.5 pb-4">
              {filteredSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <div
                    key={session.id}
                    className={cn(
                      "group flex items-start justify-between gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
                      isActive
                        ? "bg-muted text-default-900"
                        : "hover:bg-muted/60 text-default-800"
                    )}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setSelectedModel(session.model);
                      setIsThinking(false);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-default-900 truncate">
                        {session.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {session.preview}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          color="secondary"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Options for ${session.title}`}
                          className="h-6 w-6 opacity-70 lg:opacity-0 lg:group-hover:opacity-100 shrink-0"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
              {filteredSessions.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No chat history found.
                </p>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border">
            <Button
              type="button"
              
              className="w-full"
              onClick={handleNewChat}
            >
              New Chat
            </Button>
          </div>
        </aside>

        {/* Right Main Conversation Workspace */}
        <section className="flex-1 flex flex-col min-w-0 bg-card">
          <ScrollArea className="flex-1 p-6 md:p-8">
            {!activeSession ? (
              <div className="max-w-4xl mx-auto pt-4 space-y-6">
                <div className="space-y-1.5">
                  <h1 className="text-3xl font-bold text-default-300 dark:text-default-600 tracking-tight">
                    Hey there!
                  </h1>
                  <p className="text-xl font-semibold text-default-900">
                    What would you like to explore today?
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {SUGGESTION_PROMPTS.map((item) => {
                    const PromptIcon = item.icon;
                    return (
                      <Card
                        key={item.title}
                        onClick={() => sendPrompt(item.prompt)}
                        className="rounded-xl border border-border p-5 cursor-pointer hover:border-primary/60 hover:shadow-md transition-all flex flex-col justify-between min-h-[175px]"
                      >
                        <div
                          className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            item.iconBoxClass
                          )}
                        >
                          <PromptIcon className="h-5 w-5" />
                        </div>
                        <div className="space-y-2 pt-5">
                          <h2 className="text-sm font-semibold text-default-900">
                            {item.title}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {item.subtitle}
                          </p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6 pb-4">
                {activeSession.messages.map((msg) => {
                  if (msg.role === "user") {
                    return (
                      <div
                        key={msg.id}
                        className="flex items-center justify-end gap-3"
                      >
                        <div className="rounded-lg bg-muted px-4 py-2.5 text-sm text-default-900 max-w-[80%]">
                          {msg.content}
                        </div>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage
                            src="/images/avatar/avatar-2.jpg"
                            alt="Current User"
                          />
                          <AvatarFallback>AM</AvatarFallback>
                        </Avatar>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full border border-border bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-default-700" />
                      </div>
                      <div className="space-y-3 min-w-0 max-w-[85%]">
                        <div className="rounded-lg bg-muted/70 px-4 py-3 text-sm text-default-900 whitespace-pre-line">
                          {msg.content}
                        </div>

                        {msg.codeSnippet && (
                          <div className="rounded-lg border border-border bg-muted/40 p-3">
                            <pre className="rounded-md bg-zinc-950 text-zinc-100 p-4 text-xs font-mono overflow-x-auto">
                              <code>{msg.codeSnippet}</code>
                            </pre>
                          </div>
                        )}

                        {msg.listItems && (
                          <div className="rounded-lg border border-border bg-background p-4 space-y-2">
                            {msg.listTitle && (
                              <h3 className="text-xs font-semibold text-default-900 uppercase tracking-wide">
                                {msg.listTitle}
                              </h3>
                            )}
                            <ul className="list-disc pl-5 space-y-1 text-xs text-default-700">
                              {msg.listItems.map((li) => (
                                <li key={li}>{li}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {msg.alertTitle && (
                          <Alert color="info" variant="soft">
                            <Info className="h-4 w-4 shrink-0" />
                            <div>
                              <AlertTitle className="text-sm font-semibold mb-1">
                                {msg.alertTitle}
                              </AlertTitle>
                              <AlertDescription className="text-xs">
                                {msg.alertDescription}
                              </AlertDescription>
                            </div>
                          </Alert>
                        )}

                        {msg.note && (
                          <div className="rounded-lg bg-muted/70 px-4 py-2.5 text-xs text-default-700">
                            {msg.note}
                          </div>
                        )}

                        <div className="flex items-center gap-1 pt-0.5">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            color="secondary"
                            aria-label="Copy response"
                            onClick={() => handleCopyMessage(msg)}
                            className="h-7 w-7 text-muted-foreground hover:text-default-900"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            color="secondary"
                            aria-label="Helpful response"
                            onClick={() => handleReaction(msg.id, "up")}
                            className={cn(
                              "h-7 w-7",
                              msg.reaction === "up"
                                ? "text-primary"
                                : "text-muted-foreground hover:text-default-900"
                            )}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            color="secondary"
                            aria-label="Unhelpful response"
                            onClick={() => handleReaction(msg.id, "down")}
                            className={cn(
                              "h-7 w-7",
                              msg.reaction === "down"
                                ? "text-destructive"
                                : "text-muted-foreground hover:text-default-900"
                            )}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isThinking && (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-default-900 text-default-50 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-2">
                      <span className="h-2 w-2 rounded-full bg-default-400 animate-bounce" />
                      <span className="h-2 w-2 rounded-full bg-default-400 animate-bounce [animation-delay:120ms]" />
                      <span className="h-2 w-2 rounded-full bg-default-400 animate-bounce [animation-delay:240ms]" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Bottom Composer Box */}
          <div className="p-4 md:px-8 md:pb-6 pt-2">
            <div className="max-w-4xl mx-auto rounded-xl border border-border bg-background p-3 shadow-sm space-y-2.5">
              {attachedFileName && (
                <div className="inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1 text-xs text-default-800">
                  <Paperclip className="h-3 w-3" />
                  <span>{attachedFileName}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFileName(null)}
                    aria-label="Remove attachment"
                    className="text-muted-foreground hover:text-default-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <Textarea
                variant="ghost"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="min-h-[48px] max-h-[160px] resize-none border-0 focus:border-0 bg-transparent p-1 text-default-900 shadow-none focus-visible:ring-0 focus:outline-none text-sm"
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAttachedFileName(file.name);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    color="secondary"
                    aria-label="Attach file"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-8 text-default-600"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        color="secondary"
                        className="h-8 rounded-full px-3 gap-1.5 text-xs font-medium"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span>{selectedModel}</span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[210px]">
                      {MODELS.map((modelName) => (
                        <DropdownMenuItem
                          key={modelName}
                          onClick={() => {
                            setSelectedModel(modelName);
                            toast.success(`Switched model to ${modelName}`);
                          }}
                          className="gap-2 justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            {modelName}
                          </span>
                          {selectedModel === modelName && (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    color="secondary"
                    aria-label="Voice input"
                    onClick={() =>
                      toast.info("Voice prompt dictation ready")
                    }
                    className="h-8 w-8 rounded-full"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    aria-label="Send message"
                    disabled={
                      (!promptInput.trim() && !attachedFileName) || isThinking
                    }
                    onClick={() => sendPrompt(promptInput)}
                    className="h-8 w-8 rounded-full"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Card>
  );
}
