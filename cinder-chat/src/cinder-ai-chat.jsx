import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Menu, X, Copy, Check, Square, Flame,
  Send, Sun, Moon, RotateCcw, User,
} from "lucide-react";

const STORAGE_KEY = "cinder:conversations";

const THEME = {
  dark: {
    bg: "#0a1614",
    sidebar: "#0e1c19",
    surface: "#13241f",
    surfaceHover: "#1a2e28",
    border: "#1f3a33",
    borderLight: "#254138",
    accent: "#34d399",
    accentSoft: "rgba(52,211,153,0.14)",
    accent2: "#2dd4bf",
    text: "#eaf6f0",
    textMuted: "#86a89b",
    textFaint: "#4f6a5f",
    userBubble: "#1c3a30",
    codeBg: "#0c1815",
    danger: "#f87171",
  },
  light: {
    bg: "#f5f8ef",
    sidebar: "#edf2e3",
    surface: "#ffffff",
    surfaceHover: "#e7eed8",
    border: "#dbe5c9",
    borderLight: "#c9d6b1",
    accent: "#5d8a3a",
    accentSoft: "rgba(93,138,58,0.12)",
    accent2: "#3f9488",
    text: "#27301f",
    textMuted: "#637356",
    textFaint: "#94a382",
    userBubble: "#e1ebcf",
    codeBg: "#eef2e2",
    danger: "#dc2626",
  },
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const newConversation = () => ({ id: uid(), title: "New chat", messages: [], updatedAt: Date.now() });

const SUGGESTIONS = [
  "Explain how async/await works in JS",
  "Write a regex to validate an email",
  "Give me a React useEffect cheat sheet",
  "Debug why my fetch call hangs",
];

// ---------- inline markdown-lite (bold + inline code) ----------
function InlineText({ text }) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter((t) => t !== "");
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.startsWith("**") && tok.endsWith("**")) {
          return <strong key={i}>{tok.slice(2, -2)}</strong>;
        }
        if (tok.startsWith("`") && tok.endsWith("`")) {
          return (
            <code key={i} className="px-1 py-0.5 rounded text-sm" style={{ background: "rgba(127,127,127,0.18)" }}>
              {tok.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{tok}</span>;
      })}
    </>
  );
}

function TextBlock({ text, t }) {
  const lines = text.split("\n");
  return (
    <p className="whitespace-pre-wrap leading-relaxed" style={{ color: t.text }}>
      {lines.map((line, i) => (
        <span key={i}>
          <InlineText text={line} />
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  );
}

function CodeBlock({ lang, code, t }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-lg overflow-hidden my-2 border" style={{ borderColor: t.border, background: t.codeBg }}>
      <div className="flex items-center justify-between px-3 py-1.5 text-xs" style={{ color: t.textMuted, borderBottom: `1px solid ${t.border}` }}>
        <span className="font-mono">{lang || "code"}</span>
        <button onClick={copy} className="flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: t.textMuted }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm font-mono" style={{ color: t.text }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderContent(text, t) {
  const parts = text.split(/```(\w*)\n?([\s\S]*?)```/g);
  const nodes = [];
  let i = 0;
  while (i < parts.length) {
    if (parts[i]) nodes.push(<TextBlock key={`t${i}`} text={parts[i]} t={t} />);
    i++;
    if (i < parts.length) {
      const lang = parts[i];
      const code = parts[i + 1] ?? "";
      nodes.push(<CodeBlock key={`c${i}`} lang={lang} code={code} t={t} />);
      i += 2;
    }
  }
  return nodes;
}

// ---------- message row ----------
function MessageRow({ msg, t, isLast, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";
  const copyAll = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex gap-3 px-4 py-5 group" style={isUser ? {} : { background: "transparent" }}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: isUser ? t.surfaceHover : t.accentSoft, color: isUser ? t.text : t.accent }}
      >
        {isUser ? <User size={16} /> : <Flame size={16} />}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        {renderContent(msg.content, t)}
        <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={copyAll} className="flex items-center gap-1 text-xs" style={{ color: t.textMuted }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
          {!isUser && isLast && (
            <button onClick={onRegenerate} className="flex items-center gap-1 text-xs" style={{ color: t.textMuted }}>
              <RotateCcw size={13} />
              Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ThinkingDots({ t }) {
  return (
    <div className="flex gap-1.5 px-4 py-5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.accentSoft, color: t.accent }}>
        <Flame size={16} />
      </div>
      <div className="flex items-center gap-1 pt-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ background: t.textMuted, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- main app ----------
export default function CinderChat() {
  const [theme, setTheme] = useState("dark");
  const t = THEME[theme];

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState(null);
  const [streamingText, setStreamingText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const taRef = useRef(null);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);
  const revealRef = useRef(null);

  // load persisted conversations
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        const parsed = res ? JSON.parse(res.value) : null;
        if (parsed && parsed.length) {
          setConversations(parsed);
          setActiveId(parsed[0].id);
        } else {
          const c = newConversation();
          setConversations([c]);
          setActiveId(c.id);
        }
      } catch {
        const c = newConversation();
        setConversations([c]);
        setActiveId(c.id);
      }
      setLoaded(true);
    })();
  }, []);

  // persist on change
  useEffect(() => {
    if (!loaded) return;
    window.storage.set(STORAGE_KEY, JSON.stringify(conversations)).catch(() => {});
  }, [conversations, loaded]);

  const active = conversations.find((c) => c.id === activeId) || conversations[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages?.length, streamingText]);

  const updateConv = useCallback((id, fn) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const newChat = () => {
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setInput("");
    setSidebarOpen(false);
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId) {
        if (next.length) setActiveId(next[0].id);
        else {
          const c = newConversation();
          setActiveId(c.id);
          return [c];
        }
      }
      return next;
    });
  };

  const callAPI = async (apiMessages, signal) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "You are Cinder, a sharp and friendly AI assistant. Be clear, direct, and helpful.",
        messages: apiMessages,
      }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  };

  const startReveal = (fullText, assistantId, convId) => {
    setStreamingId(assistantId);
    setStreamingText("");
    const words = fullText.split(/(\s+)/);
    let idx = 0;
    revealRef.current = setInterval(() => {
      idx++;
      setStreamingText(words.slice(0, idx).join(""));
      if (idx >= words.length) {
        clearInterval(revealRef.current);
        finalize(fullText, assistantId, convId);
      }
    }, 16);
  };

  const finalize = (text, assistantId, convId) => {
    updateConv(convId, (c) => ({
      ...c,
      messages: [...c.messages, { id: assistantId, role: "assistant", content: text }],
      updatedAt: Date.now(),
    }));
    setStreamingId(null);
    setStreamingText("");
    setIsLoading(false);
  };

  const runTurn = async (convId, apiMessages) => {
    setIsLoading(true);
    setErrorMsg("");
    const controller = new AbortController();
    abortRef.current = controller;
    const assistantId = uid();
    try {
      const text = await callAPI(apiMessages, controller.signal);
      startReveal(text, assistantId, convId);
    } catch (err) {
      setIsLoading(false);
      if (err.name !== "AbortError") {
        setErrorMsg("Something went wrong talking to the model. Try again.");
      }
    }
  };

  const send = () => {
    const value = input.trim();
    if (!value || isLoading || !active) return;
    const userMsg = { id: uid(), role: "user", content: value };
    const isFirst = active.messages.length === 0;
    updateConv(active.id, (c) => ({
      ...c,
      title: isFirst ? value.slice(0, 42) + (value.length > 42 ? "…" : "") : c.title,
      messages: [...c.messages, userMsg],
      updatedAt: Date.now(),
    }));
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    const apiMessages = [...active.messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    runTurn(active.id, apiMessages);
  };

  const regenerate = () => {
    if (!active || isLoading) return;
    const msgs = active.messages;
    if (!msgs.length || msgs[msgs.length - 1].role !== "assistant") return;
    const trimmed = msgs.slice(0, -1);
    updateConv(active.id, (c) => ({ ...c, messages: trimmed }));
    runTurn(active.id, trimmed.map((m) => ({ role: m.role, content: m.content })));
  };

  const stop = () => {
    if (revealRef.current) {
      clearInterval(revealRef.current);
      if (streamingId && active) finalize(streamingText || "…", streamingId, active.id);
    } else if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    const ta = taRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  };

  if (!loaded || !active) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: t.bg, color: t.textMuted }}>
        Loading…
      </div>
    );
  }

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const showStop = isLoading;

  return (
    <div className="flex h-screen font-sans" style={{ background: t.bg, color: t.text }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* sidebar */}
      <div
        className={`fixed md:static z-40 inset-y-0 left-0 w-72 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        style={{ background: t.sidebar, borderRight: `1px solid ${t.border}` }}
      >
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 px-1">
            <Flame size={20} style={{ color: t.accent }} />
            <span className="font-semibold tracking-tight">Cinder</span>
          </div>
          <button className="md:hidden p-1.5 rounded-lg" style={{ color: t.textMuted }} onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            style={{ background: t.accentSoft, color: t.accent }}
          >
            <Plus size={16} /> New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {sorted.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                setActiveId(c.id);
                setSidebarOpen(false);
              }}
              className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors"
              style={{
                background: c.id === activeId ? t.surfaceHover : "transparent",
                color: c.id === activeId ? t.text : t.textMuted,
              }}
            >
              <span className="truncate">{c.title}</span>
              <button
                onClick={(e) => deleteChat(c.id, e)}
                className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
                style={{ color: t.textFaint }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t" style={{ borderColor: t.border }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{ color: t.textMuted }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </div>

      {/* main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: t.border }}>
          <button className="md:hidden p-1.5 rounded-lg" style={{ color: t.textMuted }} onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
          <span className="text-sm font-medium truncate" style={{ color: t.textMuted }}>
            {active.title}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full">
            {active.messages.length === 0 && !streamingId && (
              <div className="flex flex-col items-center justify-center text-center px-6 pt-24 gap-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: t.accentSoft, color: t.accent }}>
                  <Flame size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">What can I help with?</h1>
                  <p className="text-sm mt-1" style={{ color: t.textMuted }}>
                    Ask anything — code, debugging, explanations, drafts.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-left text-sm rounded-lg px-3 py-2.5 border transition-colors"
                      style={{ borderColor: t.border, color: t.textMuted, background: t.surface }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {active.messages.map((m, i) => (
              <MessageRow
                key={m.id}
                msg={m}
                t={t}
                isLast={i === active.messages.length - 1 && m.role === "assistant" && !isLoading}
                onRegenerate={regenerate}
              />
            ))}

            {streamingId && <MessageRow msg={{ id: streamingId, role: "assistant", content: streamingText }} t={t} isLast={false} />}
            {isLoading && !streamingId && <ThinkingDots t={t} />}

            {errorMsg && (
              <div className="px-4 py-2 text-sm" style={{ color: t.danger }}>
                {errorMsg}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="p-4 flex-shrink-0">
          <div
            className="max-w-2xl mx-auto flex items-end gap-2 rounded-2xl border px-3 py-2"
            style={{ background: t.surface, borderColor: t.borderLight }}
          >
            <textarea
              ref={taRef}
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message Cinder…"
              className="flex-1 resize-none outline-none bg-transparent text-sm py-2 max-h-48"
              style={{ color: t.text }}
            />
            <button
              onClick={showStop ? stop : send}
              disabled={!showStop && !input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-opacity"
              style={{
                background: showStop || input.trim() ? t.accent : t.surfaceHover,
                color: showStop || input.trim() ? t.bg : t.textFaint,
              }}
            >
              {showStop ? <Square size={14} /> : <Send size={15} />}
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: t.textFaint }}>
            Cinder can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}
