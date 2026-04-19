"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { getNovaUiCopy, resolveNovaRuntimeErrorMessage } from "@/lib/nova-ui";
import type {
  NovaAgentResponse,
  NovaActionHint,
  NovaDraftPayload,
  NovaAgentSource,
  NovaSafetyBlock,
  NovaAgentToolPreview,
} from "@/lib/nova/agent";
import {
  getNovaProactiveBrief,
  markNovaWorkflowStep,
  type NovaFollowUpAction,
  type NovaWorkflowSummary,
} from "@/lib/supabase/nova-workflows";
import {
  MessageCircle,
  X,
  Minus,
  Send,
  Sparkles,
  Bot,
  User,
} from "lucide-react";

type NovaSource = {
  doc_title?: string;
  law?: string;
  article?: string;
  article_number?: string;
  article_title?: string;
};

type NovaNavigation = {
  action: "navigate";
  url: string;
  label: string;
  reason: string;
  destination: string;
  auto_navigate: boolean;
};

type WidgetAction = {
  label: string;
  path: string;
  icon: string;
};

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  suggestions?: WidgetAction[];
  timestamp: Date;
  sources?: NovaSource[];
  navigation?: NovaNavigation | null;
  workflow?: NovaWorkflowSummary | null;
  followUpActions?: NovaFollowUpAction[];
  actionHint?: NovaActionHint | null;
  toolPreview?: NovaAgentToolPreview | null;
  draft?: NovaDraftPayload | null;
  safetyBlock?: NovaSafetyBlock | null;
  isError?: boolean;
};

type WidgetPosition = {
  x: number;
  y: number;
};

const WIDGET_POSITION_KEY = "risknova.chatWidgetPosition";
const EDGE_OFFSET = 24;

function clampPosition(x: number, y: number, width: number, height: number): WidgetPosition {
  if (typeof window === "undefined") {
    return { x, y };
  }

  const maxX = Math.max(EDGE_OFFSET, window.innerWidth - width - EDGE_OFFSET);
  const maxY = Math.max(EDGE_OFFSET + 72, window.innerHeight - height - EDGE_OFFSET);

  return {
    x: Math.min(Math.max(EDGE_OFFSET, x), maxX),
    y: Math.min(Math.max(EDGE_OFFSET + 72, y), maxY),
  };
}

function getDefaultPosition(open: boolean): WidgetPosition {
  if (typeof window === "undefined") {
    return { x: EDGE_OFFSET, y: EDGE_OFFSET + 72 };
  }

  const width = open ? Math.min(380, window.innerWidth - EDGE_OFFSET * 2) : 56;
  const height = open ? Math.min(600, window.innerHeight - 96) : 56;

  return clampPosition(
    window.innerWidth - width - EDGE_OFFSET,
    window.innerHeight - height - EDGE_OFFSET,
    width,
    height,
  );
}

export function ChatWidget({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useI18n();
  const ui = getNovaUiCopy(locale);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [actionInFlightId, setActionInFlightId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [position, setPosition] = useState<WidgetPosition>(() => getDefaultPosition(false));
  const [dragging, setDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const proactiveLoadedRef = useRef(false);
  const dragOffsetRef = useRef<WidgetPosition>({ x: 0, y: 0 });
  const pointerStartRef = useRef<WidgetPosition | null>(null);
  const pendingClosedDragRef = useRef(false);
  const draggedClosedButtonRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const actionPollCancelledRef = useRef(false);
  const supabase = createClient();
  const authenticatedWelcomeActions = useMemo<WidgetAction[]>(() => ([
    { label: ui.quickActions.workspace, path: "/solution-center", icon: "N" },
    { label: ui.quickActions.planner, path: "/planner", icon: "P" },
    { label: ui.quickActions.newIncident, path: "/incidents/new", icon: "O" },
    { label: ui.quickActions.documents, path: "/solution-center/documents", icon: "D" },
  ]), [ui.quickActions.documents, ui.quickActions.newIncident, ui.quickActions.planner, ui.quickActions.workspace]);
  const publicEntryActions = useMemo<WidgetAction[]>(() => ([
    { label: ui.quickActions.login, path: "/login", icon: "G" },
    { label: ui.quickActions.register, path: "/register", icon: "K" },
  ]), [ui.quickActions.login, ui.quickActions.register]);
  const welcomeText = isAuthenticated ? ui.widget.welcomeAuthenticated : ui.widget.welcomePublic;
  const welcomeActions = isAuthenticated ? authenticatedWelcomeActions : publicEntryActions;

  function buildBotMessageFromAgentResponse(data: NovaAgentResponse): Message {
    const answer = data?.answer || ui.widget.unavailable;
    const rawSources = data?.sources || [];
    const navigation: NovaNavigation | null = (data?.navigation as NovaNavigation | null) || null;
    const workflow: NovaWorkflowSummary | null = (data?.workflow as NovaWorkflowSummary | null) || null;
    const followUpActions: NovaFollowUpAction[] = Array.isArray(data?.follow_up_actions)
      ? (data.follow_up_actions as NovaFollowUpAction[])
      : [];

    const normalizedSources: NovaSource[] = rawSources.map((s: NovaAgentSource) => ({
      doc_title: s.doc_title || s.law || "",
      law: s.law,
      article: s.article,
      article_number: s.article_number || s.article || "",
      article_title: s.article_title || s.title || "",
    }));

    return {
      id: crypto.randomUUID(),
      role: "bot",
      text: answer,
      sources: normalizedSources.length > 0 ? normalizedSources : undefined,
      navigation,
      workflow,
      followUpActions,
      actionHint:
        data.action_hint && typeof data.action_hint === "object"
          ? (data.action_hint as NovaActionHint)
          : null,
      toolPreview: data.tool_preview || null,
      draft: data.draft || null,
      safetyBlock: data.safety_block || null,
      suggestions:
        navigation == null && answer.length < 220
          ? authenticatedWelcomeActions.slice(0, 3)
          : undefined,
      timestamp: new Date(),
    };
  }

  // Fetch organization_id for authenticated users
  useEffect(() => {
    if (!isAuthenticated || !supabase) return;

    async function fetchOrgId() {
      try {
        const { data: { session } } = await supabase!.auth.getSession();
        const user = session?.user ?? null;
        if (!user) return;

        const { data } = await supabase!
          .from("user_profiles")
          .select("organization_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (data?.organization_id) {
          setOrganizationId(data.organization_id);
        }
      } catch {
        return;
      }
    }

    fetchOrgId();
  }, [isAuthenticated, supabase]);

  // Welcome message on first open
  useEffect(() => {
    return () => {
      actionPollCancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(WIDGET_POSITION_KEY);
    if (!raw) {
      setPosition(getDefaultPosition(open));
      return;
    }

    try {
      const saved = JSON.parse(raw) as WidgetPosition;
      const width = open ? Math.min(380, window.innerWidth - EDGE_OFFSET * 2) : 56;
      const height = open ? Math.min(600, window.innerHeight - 96) : 56;
      setPosition(clampPosition(saved.x, saved.y, width, height));
    } catch {
      setPosition(getDefaultPosition(open));
    }
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WIDGET_POSITION_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    function handleWindowResize() {
      const width = open ? Math.min(380, window.innerWidth - EDGE_OFFSET * 2) : 56;
      const height = open ? Math.min(600, window.innerHeight - 96) : 56;
      setPosition((current) => clampPosition(current.x, current.y, width, height));
    }

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [open]);

  useEffect(() => {
    if (!dragging) return;

    function handlePointerMove(event: PointerEvent) {
      if (dragPointerIdRef.current !== null && event.pointerId !== dragPointerIdRef.current) return;
      const width = open ? Math.min(380, window.innerWidth - EDGE_OFFSET * 2) : 56;
      const height = open ? Math.min(600, window.innerHeight - 96) : 56;
      const nextX = event.clientX - dragOffsetRef.current.x;
      const nextY = event.clientY - dragOffsetRef.current.y;
      setPosition(clampPosition(nextX, nextY, width, height));
    }

    function handlePointerUp() {
      dragPointerIdRef.current = null;
      pendingClosedDragRef.current = false;
      pointerStartRef.current = null;
      setDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, open]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!pendingClosedDragRef.current) return;
      if (dragPointerIdRef.current !== null && event.pointerId !== dragPointerIdRef.current) return;
      const start = pointerStartRef.current;
      if (!start) return;

      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (!dragging && distance > 6) {
        draggedClosedButtonRef.current = true;
        setDragging(true);
      }
    }

    function handlePointerUp() {
      if (!pendingClosedDragRef.current) return;
      pendingClosedDragRef.current = false;
      pointerStartRef.current = null;
      dragPointerIdRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "bot",
          text: welcomeText,
          suggestions: welcomeActions,
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages.length, open, welcomeActions, welcomeText]);

  useEffect(() => {
    if (!open || !isAuthenticated || !organizationId || proactiveLoadedRef.current) return;
    if (messages.length !== 1 || messages[0]?.id !== "welcome") return;

    proactiveLoadedRef.current = true;
    let cancelled = false;

    (async () => {
      const brief = await getNovaProactiveBrief(locale);
      if (cancelled || !brief) return;
      if (!brief.actions.length && !brief.insights.length && !brief.activeWorkflows.length) return;

      const summaryLines = [
        brief.summary,
        ...brief.insights.slice(0, 2).map((item) => `- ${item}`),
      ].filter(Boolean);

      const proactiveMessage: Message = {
        id: "proactive-brief",
        role: "bot",
        text: summaryLines.join("\n"),
        workflow: brief.activeWorkflows[0] ?? null,
        followUpActions: brief.actions,
        timestamp: new Date(),
      };

      setMessages((prev) => {
        if (prev.some((item) => item.id === "proactive-brief")) return prev;
        return [...prev, proactiveMessage];
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isAuthenticated, organizationId, locale, messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || typing) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // Public users: no fake/demo response layer
    if (!isAuthenticated) {
      setTimeout(() => {
        const botMsg: Message = {
          id: crypto.randomUUID(),
          role: "bot",
          text: ui.widget.publicLocked,
          suggestions: publicEntryActions,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setTyping(false);
      }, 600 + Math.random() * 400);
      return;
    }

    if (!supabase) {
      setTimeout(() => {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "bot",
          text: ui.widget.initializing,
          timestamp: new Date(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
        setTyping(false);
      }, 500);
      return;
    }

    // Authenticated users: Nova edge function
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const history = messages.slice(-10).map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      const response = await fetch("/api/nova/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          language: locale,
          as_of_date: new Date().toISOString().slice(0, 10),
          answer_mode: "extractive",
          access_token: session?.access_token ?? null,
          mode: "agent",
          context_surface: "widget",
          history,
          current_page: pathname,
        }),
      });

      const data: NovaAgentResponse = await response.json().catch(() => ({
        type: "safety_block",
        answer: ui.widget.unavailable,
      }));

      if (!response.ok) {
        throw { context: new Response(JSON.stringify(data), { status: response.status }) };
      }

      // Preserve session
      if (data?.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      setMessages((prev) => [...prev, buildBotMessageFromAgentResponse(data)]);
    } catch (err: unknown) {
      const errorText = await resolveNovaRuntimeErrorMessage(locale, err);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "bot",
        text: errorText,
        suggestions: authenticatedWelcomeActions.slice(0, 2),
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setTyping(false);
    }
  }

  function handleQuickAction(action: WidgetAction) {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: action.label,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    setTimeout(() => {
      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: "bot",
        text: ui.widget.redirecting(action.label),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setTyping(false);

      setTimeout(() => router.push(action.path), 800);
    }, 400);
  }

  async function handleFollowUpAction(action: NovaFollowUpAction) {
    if (action.workflow_step_id) {
      await markNovaWorkflowStep(action.workflow_step_id, "completed");
    }

    if (action.kind === "navigate" && action.url) {
      router.push(action.url);
      setOpen(false);
      return;
    }

    if (action.kind === "prompt" && action.prompt) {
      setInput(action.prompt);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handlePendingAction(actionHint: NovaActionHint, decision: "confirm" | "cancel") {
    const actionRunId = actionHint.action_run_id;
    if (!actionRunId) return;

    setActionInFlightId(actionRunId);
    try {
      const response = await fetch(`/api/nova/actions/${actionRunId}/${decision}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          decision === "confirm"
            ? {
                idempotency_key: crypto.randomUUID(),
                context_surface: "widget",
              }
            : {
                context_surface: "widget",
              },
        ),
      });

      const data: NovaAgentResponse = await response.json().catch(() => ({
        type: "safety_block",
        answer: ui.widget.unavailable,
      }));

      if (!response.ok) {
        throw { context: new Response(JSON.stringify(data), { status: response.status }) };
      }

      setMessages((prev) => [
        ...prev.map((msg) =>
          msg.actionHint?.action_run_id === actionRunId
            ? { ...msg, actionHint: null }
            : msg,
        ),
        buildBotMessageFromAgentResponse(data),
      ]);

      const executionStatus =
        data.action_hint && typeof data.action_hint === "object"
          ? data.action_hint.execution_status
          : null;

      if (decision === "confirm" && (executionStatus === "queued" || executionStatus === "processing")) {
        void pollActionRunUntilSettled(actionRunId);
      }
    } catch (err: unknown) {
      const errorText = await resolveNovaRuntimeErrorMessage(locale, err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          text: errorText,
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setActionInFlightId(null);
    }
  }

  async function pollActionRunUntilSettled(actionRunId: string) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (actionPollCancelledRef.current) return;

      await new Promise((resolve) => window.setTimeout(resolve, 2500));

      const response = await fetch(`/api/nova/actions/${actionRunId}`, { cache: "no-store" });
      const data: NovaAgentResponse = await response.json().catch(() => ({
        type: "message",
        answer: ui.widget.unavailable,
      }));

      if (!response.ok) {
        return;
      }

      const executionStatus =
        data.action_hint && typeof data.action_hint === "object"
          ? data.action_hint.execution_status
          : null;

      if (executionStatus === "queued" || executionStatus === "processing") {
        continue;
      }

      setMessages((prev) => [...prev, buildBotMessageFromAgentResponse(data)]);
      return;
    }
  }

  function beginDrag(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (open && target.closest("button")) return;

    dragPointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const dragTarget = open ? panelRef.current : event.currentTarget;
    if (!dragTarget) return;
    const rect = dragTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    if (open) {
      setDragging(true);
      return;
    }

    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    pendingClosedDragRef.current = true;
    draggedClosedButtonRef.current = false;
  }

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          type="button"
          onPointerDown={beginDrag}
          onClick={() => {
            if (draggedClosedButtonRef.current) {
              draggedClosedButtonRef.current = false;
              return;
            }
            if (dragging) return;
            setOpen(true);
          }}
          className="group fixed z-50 inline-flex size-14 cursor-grab items-center justify-center rounded-full bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] text-white shadow-[0_8px_32px_rgba(184,134,11,0.4)] transition-all hover:scale-110 hover:shadow-[0_12px_40px_rgba(184,134,11,0.5)] active:cursor-grabbing"
          style={{ left: position.x, top: position.y }}
          aria-label={ui.widget.openAriaLabel}
          title="Nova'yi ac veya surukleyerek tası"
        >
          <span className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] opacity-40 animate-ping" style={{ animationDuration: "2.5s" }} />
          <span className="absolute -inset-1 rounded-full border-2 border-amber-400/30 animate-pulse" style={{ animationDuration: "3s" }} />
          <MessageCircle className="relative size-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_rgba(0,0,0,0.2)]"
          style={{ left: position.x, top: position.y, height: "min(600px, calc(100vh - 6rem))" }}
        >
          {/* Header */}
          <div
            className="flex cursor-grab items-center justify-between border-b border-border bg-[var(--header-bg-solid)] px-4 py-3 active:cursor-grabbing"
            onPointerDown={beginDrag}
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_100%)]">
                <Sparkles className="size-4 text-white" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Nova</p>
                <p className="text-xs text-white/50">{ui.widget.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={ui.widget.minimizeAriaLabel}
                title={ui.widget.minimizeAriaLabel}
                className="inline-flex size-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
              >
                <Minus className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setMessages([]);
                  setSessionId(null);
                  proactiveLoadedRef.current = false;
                }}
                aria-label={ui.widget.closeAriaLabel}
                title={ui.widget.closeAriaLabel}
                className="inline-flex size-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <span className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg ${
                  msg.role === "bot"
                    ? "bg-[var(--gold-glow)] text-[var(--gold)]"
                    : "bg-primary/10 text-primary"
                }`}>
                  {msg.role === "bot" ? <Bot className="size-4" /> : <User className="size-4" />}
                </span>

                <div className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "text-right" : ""}`}>
                  {/* Text */}
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : msg.isError
                        ? "bg-red-500/10 text-red-400 rounded-tl-sm border border-red-500/20"
                        : "bg-muted text-foreground rounded-tl-sm"
                  }`}>
                    {msg.text.split("\n").map((line, i) => (
                      <span key={i}>
                        {line.startsWith("**") && line.endsWith("**")
                          ? <strong>{line.slice(2, -2)}</strong>
                          : line.startsWith("• ")
                            ? <span className="block pl-2">{line}</span>
                            : line.startsWith("- ")
                              ? <span className="block pl-2">{line}</span>
                              : line
                        }
                        {i < msg.text.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>

                  {/* Nova Sources Accordion */}
                  {msg.sources && msg.sources.length > 0 && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-yellow-500/80 hover:text-yellow-400 select-none">
                        {ui.widget.sourceCount(msg.sources.length)}
                      </summary>
                      <div className="mt-2 space-y-1 pl-2 border-l-2 border-yellow-500/20">
                        {msg.sources.slice(0, 5).map((src, i) => (
                          <div key={i} className="text-muted-foreground">
                            <span className="font-medium text-foreground/80">
                              {src.doc_title || src.law}
                            </span>
                            {src.article_number && (
                              <span className="ml-1">— {src.article_number}</span>
                            )}
                          </div>
                        ))}
                        {msg.sources.length > 5 && (
                          <div className="text-muted-foreground italic">
                            +{msg.sources.length - 5} daha...
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  {/* Nova Navigation Card */}
                  {msg.navigation && (
                    <div className="mt-2 p-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                      <div className="text-xs text-yellow-500/80 mb-1">{ui.widget.navigationTitle}</div>
                      <div className="text-xs font-medium mb-2">{msg.navigation.label}</div>
                      <button
                        type="button"
                        onClick={() => {
                          if (msg.navigation) {
                            router.push(msg.navigation.url);
                            setOpen(false);
                          }
                        }}
                        className="w-full px-3 py-1.5 rounded-md bg-gradient-to-r from-yellow-600 to-yellow-500 text-black text-xs font-semibold hover:from-yellow-500 hover:to-yellow-400 transition-all"
                      >
                        {ui.widget.gotoPage}
                      </button>
                    </div>
                  )}

                  {msg.toolPreview && (
                    <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {ui.widget.toolPreviewLabel}
                      </div>
                      <div className="mt-1 text-xs font-medium text-foreground">{msg.toolPreview.title}</div>
                      <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{msg.toolPreview.summary}</div>
                      {msg.actionHint?.action_run_id && msg.toolPreview.requiresConfirmation ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={actionInFlightId === msg.actionHint.action_run_id}
                            onClick={() => handlePendingAction(msg.actionHint as NovaActionHint, "confirm")}
                            className="flex-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionInFlightId === msg.actionHint.action_run_id
                              ? ui.widget.actionRunning
                              : ui.widget.approveAction}
                          </button>
                          <button
                            type="button"
                            disabled={actionInFlightId === msg.actionHint.action_run_id}
                            onClick={() => handlePendingAction(msg.actionHint as NovaActionHint, "cancel")}
                            className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {ui.widget.cancelAction}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {msg.draft && (
                    <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        {ui.widget.draftReadyLabel}
                      </div>
                      <div className="mt-1 text-xs font-medium text-foreground">{msg.draft.title}</div>
                      {msg.draft.summary ? (
                        <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{msg.draft.summary}</div>
                      ) : null}
                    </div>
                  )}

                  {msg.safetyBlock && (
                    <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        {ui.widget.safetyBlockLabel}
                      </div>
                      <div className="mt-1 text-xs font-medium text-foreground">{msg.safetyBlock.title}</div>
                      <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{msg.safetyBlock.message}</div>
                    </div>
                  )}

                  {msg.workflow && (
                    <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">{ui.widget.workflowLabel}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {msg.workflow.current_step}/{msg.workflow.total_steps}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-foreground">{msg.workflow.title}</div>
                      {msg.workflow.next_step_label && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {ui.widget.nextStepLabel}: {msg.workflow.next_step_label}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.followUpActions && msg.followUpActions.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {msg.followUpActions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => handleFollowUpAction(action)}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-foreground">{action.label}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                              {action.kind === "navigate" ? ui.widget.openLabel : ui.widget.continueLabel}
                            </span>
                          </div>
                          {action.description && (
                            <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                              {action.description}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {(msg.toolPreview || msg.draft || msg.workflow) && (
                    <button
                      type="button"
                      onClick={() => router.push("/solution-center")}
                      className="text-xs font-medium text-primary transition-colors hover:text-primary-hover"
                    >
                      {ui.widget.continueInWorkspace}
                    </button>
                  )}

                  {/* Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestions.map((s) => (
                        <button key={s.path} type="button" onClick={() => handleQuickAction(s)}
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors">
                          <span>{s.icon}</span> {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex gap-2.5">
                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--gold-glow)] text-[var(--gold)]">
                  <Bot className="size-4" />
                </span>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                  <div className="flex gap-1">
                    <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "0ms" }} />
                    <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "150ms" }} />
                    <span className="size-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card p-3">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isAuthenticated
                    ? ui.widget.authenticatedPlaceholder
                    : ui.widget.publicPlaceholder
                }
                className="h-10 flex-1 rounded-xl border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button type="submit" disabled={!input.trim() || typing}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_100%)] text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100">
                <Send className="size-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
