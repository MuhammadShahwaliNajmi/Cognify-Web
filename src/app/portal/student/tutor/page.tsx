"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn, spring } from "@/lib/utils";
import { courseOf, useStudent } from "@/lib/portal/store";
import { Label, PageHeader, Status } from "@/components/portal/ui";

type Msg = { from: "me" | "tutor"; text: string };

/** The preview answers only these sample questions. Anything else gets the "coming soon" reply. */
const SAMPLES: { q: string; a?: string }[] = [
  { q: "What should I revise first?" },
  {
    q: "Explain price elasticity of demand",
    a: `Price elasticity of demand (PED) measures how strongly quantity demanded responds to a change in price.

PED = % change in quantity demanded ÷ % change in price

• It is negative for almost every good, because price and quantity move in opposite directions.
• Bigger than 1 (ignoring the sign) = elastic: buyers react strongly, so a price rise cuts total revenue.
• Smaller than 1 = inelastic: buyers barely react, so a price rise increases total revenue.

Exam tip: never stop at the number. Say what it means for the firm's revenue or for the government's tax decision. That interpretation is where the marks are.`,
  },
  {
    q: "How do I structure a 20-mark essay?",
    a: `For a 20-mark "evaluate" or "discuss" essay, examiners reward a judgement, not a list. Use this plan:

• Introduction: define the key terms and say what the answer depends on.
• Paragraph 1: your strongest argument for, with a labelled diagram and a full chain of reasoning.
• Paragraph 2: a second argument, ending with "however, this depends on…".
• Paragraph 3: the best argument against, or an alternative policy, weighed against the first.
• Conclusion: answer the exact question, and state the condition that decides it (the size of the elasticity, the time period, the cause of the problem).

The most common way to lose marks is leaving all the evaluation to the last paragraph. Evaluate at the end of every point.`,
  },
  {
    q: "Demand-pull vs cost-push inflation",
    a: `Both raise the price level, but they start on opposite sides of the AD/AS diagram.

• Demand-pull: aggregate demand shifts right (lower interest rates, tax cuts, a boom in exports). Prices rise and real output rises, at least in the short run.
• Cost-push: short-run aggregate supply shifts left (dearer oil, higher wages, a weaker exchange rate raising import costs). Prices rise but real output falls.

Why it matters: the right policy depends on the cause. Higher interest rates deal with demand-pull well, but against cost-push they cut output even further. Making that distinction is exactly the evaluation that earns top-band marks.`,
  },
];

const COMING_SOON =
  "The full Lab AI Tutor is coming soon. It will answer any question from your syllabus using your board's mark schemes. For now, pick one of the sample questions below to see how it works, and bring other questions to your next class.";

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function Bubble({ m }: { m: Msg }) {
  const mine = m.from === "me";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.snappy}
      className={cn("flex gap-3", mine && "justify-end")}
    >
      {!mine && (
        <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-deep text-gold">
          <Sparkles size={14} />
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-[20px] px-4 py-3 text-[15px] leading-relaxed md:max-w-[75%]",
          mine ? "rounded-br-md bg-navy-deep text-white" : "rounded-bl-md border border-navy/10 bg-white text-navy"
        )}
      >
        {m.text.split("\n").map((line, i) =>
          line.startsWith("• ") ? (
            <p key={i} className="mt-1.5 flex gap-2">
              <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <span>{line.slice(2)}</span>
            </p>
          ) : line.trim() ? (
            <p key={i} className={i ? "mt-2.5" : undefined}>
              {line}
            </p>
          ) : null
        )}
      </div>
    </motion.div>
  );
}

export default function StudentTutor() {
  const { db, me, cohort } = useStudent();
  const first = me.name.split(" ")[0];
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: "tutor",
      text: `Hi ${first}. I'm the Lab AI Tutor for ${courseOf(cohort)}. The full tutor is coming soon. For now, try one of the sample questions below.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const reply = (q: string) => {
    const sample = SAMPLES.find((x) => norm(x.q) === norm(q));
    if (!sample) return COMING_SOON;
    if (sample.a) return sample.a;
    // "What should I revise first?" uses the student's own topic scores
    const weak = [...(db.progress.find((p) => p.studentId === me.id)?.mastery ?? [])].sort((a, b) => a.score - b.score).slice(0, 2);
    return weak.length
      ? `Going by your marked work, start with these two:\n\n${weak
          .map((w) => `• ${w.unit} (${w.score}%)${w.fix ? `: ${w.fix}` : ""}`)
          .join("\n")}\n\nCheck Resources for notes and past papers on each, do one timed question on each, submit it under Assignments, and your examiner will tell you if the gap has closed.`
      : "Once your first pieces of work are marked, I'll point you to your two weakest topics here. Until then, start with the topic you covered most recently in class: reread the notes in Resources, then try one past-paper question on it under timed conditions.";
  };

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || thinking) return;
    setMsgs((m) => [...m, { from: "me", text }]);
    setDraft("");
    setThinking(true);
    timer.current = window.setTimeout(() => {
      setMsgs((m) => [...m, { from: "tutor", text: reply(text) }]);
      setThinking(false);
    }, 900);
  };

  return (
    <>
      <PageHeader
        title="AI Tutor"
        actions={<Status tone="attention">Coming soon</Status>}
      />

      <div className="flex h-[calc(100dvh-17rem)] min-h-[22rem] flex-col overflow-hidden rounded-xl border border-navy/12 bg-white">
        <div ref={scroller} className="thin-scroll flex-1 space-y-4 overflow-y-auto p-5 md:p-7">
          {msgs.map((m, i) => (
            <Bubble key={i} m={m} />
          ))}
          {thinking && (
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-deep text-gold">
                <Sparkles size={14} />
              </span>
              <span className="flex gap-1.5 rounded-full border border-navy/10 px-4 py-3" aria-label="Lab AI Tutor is typing">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 animate-pulse-node rounded-full bg-gold" style={{ animationDelay: `${i * 0.25}s` }} />
                ))}
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-navy/10 p-4 md:p-5">
          <Label>Sample questions</Label>
          <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto pb-1">
            {SAMPLES.map(({ q: s }) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="shrink-0 rounded-full border border-navy/15 px-3.5 py-2 text-[13px] font-medium text-navy transition-colors hover:border-gold hover:text-navy focus-gold"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
            className="mt-3 flex items-center gap-2.5"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a question, or pick a sample above"
              aria-label="Your question"
              className="w-full rounded-full border border-navy/15 bg-white px-5 py-3 text-[15px] text-navy outline-none transition-all placeholder:text-navy/40 focus:border-gold focus:ring-4 focus:ring-gold/15"
            />
            <button
              type="submit"
              disabled={!draft.trim() || thinking}
              aria-label="Send"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold text-navy-deep transition-[transform,opacity] hover:-translate-y-0.5 focus-gold disabled:pointer-events-none disabled:opacity-40"
            >
              <ArrowUp size={19} strokeWidth={2.6} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
