import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle, X, Send, Bot, Sparkles, TrendingUp,
  Users, BarChart3, Clock, AlertTriangle, ChevronRight, Trash2, Lightbulb
} from "lucide-react";
import { useNavigate } from "react-router";
import { storage } from "../utils/storage";
import { timetableEngine } from "../utils/timetable";
import { sounds } from "../utils/sounds";
import { haptics } from "../utils/haptics";
import { analyzeIntent, generateResponse } from "../utils/ai/nlp";
import { format } from "date-fns";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: Date;
  actions?: { label: string; path?: string; fn?: () => void }[];
  insights?: string[];
}

const SUGGESTED_PROMPTS = [
  "Show absentees today",
  "What's my next class?",
  "Who has low attendance?",
  "How many students are present?",
  "Top performers",
  "Attendance trends",
];

function processCommand(
  input: string,
  navigate: (path: string) => void,
  addMessage: (msg: Omit<Message, "id" | "timestamp">) => void
) {
  // Use intelligent NLP processing
  const intent = analyzeIntent(input);
  const response = generateResponse(input, intent);

  // Convert response actions to include navigation functions
  const actions = response.actions?.map((action) => ({
    label: action.label,
    fn: action.path ? () => navigate(action.path!) : () => {},
  })) || [];

  // Add the bot message with intelligent response
  addMessage({
    role: "bot",
    text: response.text,
    actions,
    insights: response.insights,
  });

  // Auto-navigate if path is provided and confidence is high
  if (intent.type === "navigation" && intent.confidence > 0.9 && response.actions?.[0]?.path) {
    setTimeout(() => navigate(response.actions![0].path!), 800);
  }
}

export function AIChatbot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hi! I'm your AI attendance assistant ✨\n\nI can help you with attendance tracking, student insights, timetable queries, and analytics. Just ask me naturally!",
      timestamp: new Date(),
      insights: ["💡 Try: \"Show absentees\", \"Who has low attendance?\", or \"What's my next class?\""],
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const addMessage = useCallback((msg: Omit<Message, "id" | "timestamp">) => {
    setMessages(prev => [...prev, { ...msg, id: Math.random().toString(36).slice(2), timestamp: new Date() }]);
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    sounds.playClick();
    haptics.light();

    addMessage({ role: "user", text: text.trim() });
    setInput("");
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      processCommand(text, navigate, addMessage);
    }, 700 + Math.random() * 500);
  }, [navigate, addMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([{
      id: "welcome",
      role: "bot",
      text: "Chat cleared! How can I help you?",
      timestamp: new Date(),
    }]);
    haptics.light();
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 300, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { setOpen(true); sounds.playClick(); haptics.light(); }}
        className="fixed bottom-28 left-4 z-40 w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-2xl shadow-purple-500/50 flex items-center justify-center"
        style={{ display: open ? "none" : "flex" }}
        aria-label="Open AI Assistant"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
        >
          <Bot size={26} className="text-white" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-purple-500/40"
        />
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-24 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-50 glass-strong rounded-3xl overflow-hidden flex flex-col shadow-2xl shadow-black/40"
            style={{ maxHeight: "calc(100vh - 140px)", height: "580px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">AI Assistant</p>
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-1.5 h-1.5 bg-green-400 rounded-full"
                    />
                    <p className="text-green-400 text-xs">Online</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={clearChat}
                  className="glass p-2 rounded-lg text-white/50 hover:text-white transition-colors"
                >
                  <Trash2 size={14} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setOpen(false); sounds.playClick(); }}
                  className="glass p-2 rounded-lg text-white/50 hover:text-white transition-colors"
                >
                  <X size={16} />
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}
                >
                  {msg.role === "bot" && (
                    <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={12} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div
                      className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-br-sm"
                          : "bg-white/10 text-white rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.insights && msg.insights.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.insights.map((insight, i) => (
                          <div key={i} className="flex items-start gap-1.5 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <Lightbulb size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-blue-200 text-[11px] leading-relaxed">{insight}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {msg.actions.map((action, i) => (
                          <motion.button
                            key={i}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { action.fn?.(); haptics.light(); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-all"
                          >
                            {action.label}
                            <ChevronRight size={10} />
                          </motion.button>
                        ))}
                      </div>
                    )}
                    <p className="text-white/30 text-[10px] px-1">
                      {format(msg.timestamp, "HH:mm")}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {typing && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot size={12} className="text-white" />
                    </div>
                    <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: d }}
                          className="w-1.5 h-1.5 bg-white/60 rounded-full"
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Suggested prompts */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2 flex-shrink-0">
                <p className="text-white/30 text-xs mb-2">Suggestions</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
                    <motion.button
                      key={prompt}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => sendMessage(prompt)}
                      className="text-xs px-3 py-1.5 glass rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all border border-white/10"
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick action row */}
            <div className="px-4 pb-2 flex gap-2 flex-shrink-0">
              {[
                { icon: Users, label: "Absent", cmd: "Show absentees today" },
                { icon: AlertTriangle, label: "Low %", cmd: "Who has low attendance?" },
                { icon: Clock, label: "Next", cmd: "What is my next class?" },
                { icon: BarChart3, label: "Report", cmd: "Generate report" },
              ].map(({ icon: Icon, label, cmd }) => (
                <motion.button
                  key={label}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => sendMessage(cmd)}
                  className="flex-1 flex flex-col items-center gap-1 py-2 glass rounded-xl hover:bg-white/10 transition-all"
                >
                  <Icon size={14} className="text-purple-400" />
                  <span className="text-white/60 text-[10px]">{label}</span>
                </motion.button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 flex gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 px-4 py-2.5 glass rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="submit"
                disabled={!input.trim() || typing}
                className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all shadow-lg shadow-purple-500/30"
              >
                <Send size={16} className="text-white" />
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
