import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";

/* Utils */
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function useReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefers(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return prefers;
}

function celebrate(colors: string[], enabled: boolean, reduced: boolean) {
  if (!enabled || reduced) return;
  const end = Date.now() + 2500;
  (function frame() {
    confetti({
      particleCount: 40,
      spread: 70,
      startVelocity: 40,
      origin: { x: 0.5, y: 1.05 },
      colors,
      ticks: 200,
      scalar: 0.9,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/* Types */
type ID = string;

interface Habit { id: ID; name: string; color?: string; createdAt: number; archived?: boolean; }
interface HabitLog { id: ID; habitId: ID; date: string; value: 0 | 1; }
interface MoodEntry { id: ID; date: string; score: 1|2|3|4|5|6|7; note?: string; }
interface Task { id: ID; title: string; createdAt: number; completedAt?: number; priority?: "low"|"med"|"high"; }

interface Prefs {
  theme: "light"|"dark"|"mint"|"sunset"|"orchid"|"sand";
  fontScale: "sm"|"md"|"lg";
  confetti: { enabled: boolean; palette: string[] };
}

/* Local storage hook */
function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : initial; }
    catch { return initial; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
  return [state, setState] as const;
}

/* App */
export default function App() {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<"Home"|"Habits"|"Mood"|"Tasks"|"Settings">("Home");

  const [prefs, setPrefs] = useLocalStorage<Prefs>("hmt:prefs", {
    theme: "light",
    fontScale: "md",
    confetti: { enabled: true, palette: ["#ffd1dc","#cde7ff","#e3ffd6","#fff1c1","#e9d6ff"] }
  });

  const [habits, setHabits] = useLocalStorage<Habit[]>("hmt:habits", []);
  const [habitLogs, setHabitLogs] = useLocalStorage<HabitLog[]>("hmt:habitLogs", []);
  const [moods, setMoods] = useLocalStorage<MoodEntry[]>("hmt:moods", []);
  const [tasks, setTasks] = useLocalStorage<Task[]>("hmt:tasks", []);

  /* Theme + font */
  useEffect(() => {
    const themeVars: Record<Prefs["theme"], { bg: string; text: string }> = {
      light:{bg:"#ffffff",text:"#111111"}, dark:{bg:"#0b0b0c",text:"#f1f5f9"},
      mint:{bg:"#f0fff7",text:"#06281c"}, sunset:{bg:"#fff7f3",text:"#3b0d0a"},
      orchid:{bg:"#fbf7ff",text:"#271033"}, sand:{bg:"#fffbf2",text:"#22180a"}
    };
    const t = themeVars[prefs.theme];
    document.body.style.background = t.bg;
    document.body.style.color = t.text;
  }, [prefs.theme]);

  useEffect(() => {
    const scale = prefs.fontScale === "sm" ? 0.95 : prefs.fontScale === "lg" ? 1.12 : 1;
    document.documentElement.style.fontSize = `${16 * scale}px`;
  }, [prefs.fontScale]);

  /* Habit helpers */
  const toggleHabitToday = (habitId: ID) => {
    const d = todayISO();
    const existing = habitLogs.find((l: HabitLog) => l.habitId === habitId && l.date === d);
    const next = existing
      ? habitLogs.filter((l: HabitLog) => !(l.habitId === habitId && l.date === d))
      : [...habitLogs, { id: crypto.randomUUID(), habitId, date: d, value: 1 as const }];
    setHabitLogs(next);
  };

  const currentStreak = (habitId: ID) => {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const date = daysAgoISO(i);
      const has = habitLogs.some((l: HabitLog) => l.habitId === habitId && l.date === date && l.value === 1);
      if (i === 0 && !has) break;
      if (!has) break;
      streak++;
    }
    return streak;
  };

  const completionPct = (habitId: ID, days = 30) => {
    let done = 0;
    for (let i = 0; i < days; i++) {
      const date = daysAgoISO(i);
      if (habitLogs.some((l: HabitLog) => l.habitId === habitId && l.date === date && l.value === 1)) done++;
    }
    return Math.round((done / days) * 100);
  };

  /* Mood */
  const logMood = (score: number, note?: string) => {
    const d = todayISO();
    const existing = moods.find((m: MoodEntry) => m.date === d);
    const next = existing
      ? moods.map((m: MoodEntry) => (m.date === d ? { ...m, score: score as 1|2|3|4|5|6|7, note } : m))
      : [...moods, { id: crypto.randomUUID(), date: d, score: score as 1|2|3|4|5|6|7, note }];
    setMoods(next);
  };

  /* Tasks */
  const addTask = (title: string) => {
    if (!title.trim()) return;
    setTasks([{ id: crypto.randomUUID(), title: title.trim(), createdAt: Date.now() }, ...tasks]);
  };

  const toggleTask = (id: ID) => {
    const wasComplete = !!tasks.find((t: Task) => t.id === id)?.completedAt;
    const next = tasks.map((t: Task) =>
      t.id === id ? { ...t, completedAt: t.completedAt ? undefined : Date.now() } : t
    );
    setTasks(next);
    const nowComplete = !!next.find((t: Task) => t.id === id)?.completedAt;
    if (!wasComplete && nowComplete) {
      celebrate(prefs.confetti.palette, prefs.confetti.enabled, reduced);
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  const clearCompleted = () => setTasks(tasks.filter((t: Task) => !t.completedAt));

  /* Render */
  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-screen-sm w-full mx-auto flex-1 pb-24 p-4">
        {tab === "Home" && <HomeScreen habits={habits} habitLogs={habitLogs} moods={moods} tasks={tasks} />}
        {tab === "Habits" && (
          <HabitsScreen
            habits={habits}
            setHabits={setHabits}
            logs={habitLogs}
            toggleHabitToday={toggleHabitToday}
            currentStreak={currentStreak}
            completionPct={completionPct}
          />
        )}
        {tab === "Mood" && <MoodScreen moods={moods} logMood={logMood} />}
        {tab === "Tasks" && (
          <TasksScreen tasks={tasks} addTask={addTask} toggleTask={toggleTask} clearCompleted={clearCompleted} />
        )}
        {tab === "Settings" && <SettingsScreen prefs={prefs} setPrefs={setPrefs} reduced={reduced} />}
      </div>
      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}

/* Screens (typed) */
function HomeScreen({
  habits, habitLogs, moods, tasks,
}: { habits: Habit[]; habitLogs: HabitLog[]; moods: MoodEntry[]; tasks: Task[]; }) {
  const todaysMood = moods.find((m: MoodEntry) => m.date === todayISO());
  const completedToday = tasks.filter((t: Task) =>
    t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()
  ).length;
  const totalToday = tasks.filter((t: Task) =>
    !t.completedAt || new Date(t.completedAt ?? 0).toDateString() === new Date().toDateString()
  ).length;
  const habitDoneCount = useMemo(
    () => habits.filter((h: Habit) => habitLogs.some((l: HabitLog) => l.habitId === h.id && l.date === todayISO())).length,
    [habits, habitLogs]
  );

  return (
    <section className="space-y-4">
      <Header title="Today" subtitle="Quick snapshot" />
      <Card>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Habits done" value={`${habitDoneCount}/${habits.length}`} />
          <Stat label="Tasks done" value={`${completedToday}`} />
          <Stat label="Mood" value={todaysMood ? `${todaysMood.score}/7` : "—"} />
          <Stat label="Total tasks" value={`${totalToday}`} />
        </div>
      </Card>
      <Card><div className="text-sm text-gray-600">Keep going!</div></Card>
    </section>
  );
}

function HabitsScreen({
  habits, setHabits, logs, toggleHabitToday, currentStreak, completionPct,
}:{
  habits: Habit[]; setHabits: (h: Habit[]) => void; logs: HabitLog[];
  toggleHabitToday: (id: ID) => void; currentStreak: (id: ID)=>number; completionPct: (id: ID, days?: number)=>number;
}) {
  const [name, setName] = useState("");

  const addHabit = () => {
    const n = name.trim(); if (!n) return;
    setHabits([{ id: crypto.randomUUID(), name: n, createdAt: Date.now() }, ...habits]);
    setName("");
  };
  const removeHabit = (id: ID) => setHabits(habits.filter((h: Habit) => h.id !== id));

  return (
    <section className="space-y-4">
      <Header title="Habits" subtitle="Tap to mark today done" />
      <Card>
        <div className="flex gap-2">
          <input className="flex-1 border rounded-xl px-3 py-2" placeholder="New habit..."
            value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setName(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>)=> e.key==="Enter" && addHabit()} />
          <button className="px-4 py-2 rounded-xl bg-gray-900 text-white" onClick={addHabit}>Add</button>
        </div>
      </Card>

      <div className="space-y-2">
        {habits.length===0 && <div className="text-gray-500">No habits yet. Add one above.</div>}
        {habits.map((h: Habit) => {
          const done = logs.some((l: HabitLog) => l.habitId === h.id && l.date === todayISO());
          const streak = currentStreak(h.id);
          const pct30 = completionPct(h.id, 30);
          return (
            <Card key={h.id}>
              <div className="flex items-center gap-3">
                <button aria-label="Toggle today" onClick={()=>toggleHabitToday(h.id)}
                        className={`w-6 h-6 rounded border ${done? "bg-green-500 border-green-600":"bg-white"}`} />
                <div className="flex-1">
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-gray-500">Streak: <b>{streak}</b> • 30-day: <b>{pct30}%</b></div>
                  <Heatline logs={logs.filter((l: HabitLog)=>l.habitId===h.id)} />
                </div>
                <button className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm" onClick={()=>removeHabit(h.id)}>Delete</button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function MoodScreen({ moods, logMood }:{ moods: MoodEntry[]; logMood: (score:number, note?: string)=>void }) {
  const todays = moods.find((m: MoodEntry) => m.date === todayISO());
  const [note, setNote] = useState<string>(todays?.note || "");
  const [score, setScore] = useState<number>(todays?.score || 0);

  useEffect(()=>{ setNote(todays?.note || ""); setScore(todays?.score || 0); }, [todays?.note, todays?.score]);

  const save = () => { if (score>=1 && score<=7) logMood(score, note.trim() || undefined); };

  return (
    <section className="space-y-4">
      <Header title="Mood" subtitle="One entry per day" />
      <Card>
        <div className="text-sm mb-2">Pick today’s mood:</div>
        <div className="flex gap-2 flex-wrap">
          {[1,2,3,4,5,6,7].map((n: number) => (
            <button key={n} className={`px-3 py-2 rounded-xl ${score===n? "bg-black text-white":"bg-gray-200"}`} onClick={()=>setScore(n)}>{n}</button>
          ))}
        </div>
        <textarea className="mt-3 w-full border rounded-xl px-3 py-2" rows={3} placeholder="Optional note"
          value={note} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setNote(e.target.value)} />
        <div className="mt-3 flex gap-2">
          <button className="px-4 py-2 rounded-xl bg-gray-900 text-white" onClick={save}>Save</button>
          <span className="text-sm text-gray-500 self-center">{todays? "Saved for today" : "No entry yet"}</span>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium mb-2">Last 14 days</div>
        <Sparkline data={Array.from({length:14}, (_,i)=> {
          const d = daysAgoISO(13-i);
          const m = moods.find((x: MoodEntry)=>x.date===d);
          return m?.score ?? 0;
        })} />
      </Card>
    </section>
  );
}

function TasksScreen({
  tasks, addTask, toggleTask, clearCompleted
}:{
  tasks: Task[]; addTask: (title:string)=>void; toggleTask: (id:ID)=>void; clearCompleted: ()=>void;
}) {
  const [title, setTitle] = useState("");

  return (
    <section className="space-y-4">
      <Header title="Tasks" subtitle="Quick add and complete" />
      <Card>
        <div className="flex gap-2">
          <input className="flex-1 border rounded-xl px-3 py-2" placeholder="Quick add task..."
            value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setTitle(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>)=> e.key==="Enter" && (addTask(title), setTitle(""))} />
          <button className="px-4 py-2 rounded-xl bg-gray-900 text-white" onClick={()=>{ addTask(title); setTitle(""); }}>Add</button>
        </div>
      </Card>

      <div className="space-y-2">
        {tasks.length===0 && <div className="text-gray-500">No tasks yet. Add one above.</div>}
        {tasks.map((t: Task) => (
          <Card key={t.id}>
            <div className="flex items-center gap-3">
              <input type="checkbox" className="w-5 h-5" checked={!!t.completedAt} onChange={()=>toggleTask(t.id)} />
              <div className={`flex-1 ${t.completedAt? "line-through text-gray-400":""}`}>{t.title}</div>
              <button className="px-3 py-2 rounded-xl bg-gray-200" onClick={()=>toggleTask(t.id)}>{t.completedAt? "Undo":"Done"}</button>
            </div>
          </Card>
        ))}
      </div>

      {tasks.some((t: Task)=>t.completedAt) && (
        <div className="flex justify-end">
          <button className="px-3 py-2 rounded-xl bg-gray-200" onClick={clearCompleted}>Clear Completed</button>
        </div>
      )}
    </section>
  );
}

function SettingsScreen({ prefs, setPrefs, reduced }:{ prefs: Prefs; setPrefs: (p: Prefs)=>void; reduced: boolean }) {
  const PRESETS: Record<string, string[]> = {
    Vibrant: ["#ff6b6b","#ffd166","#06d6a0","#118ab2","#9b5de5"],
    Pastel:  ["#ffd1dc","#cde7ff","#e3ffd6","#fff1c1","#e9d6ff"],
    Monochrome: ["#111111","#444444","#888888","#bbbbbb","#eeeeee"],
  };
  const [custom, setCustom] = useState<string>(prefs.confetti.palette.join(","));

  return (
    <section className="space-y-6">
      <Header title="Settings" />

      <Card>
        <div className="font-medium mb-2">Theme</div>
        <div className="flex gap-2 flex-wrap">
          {(["light","dark","mint","sunset","orchid","sand"] as Prefs["theme"][]).map((t) => (
            <button key={t} className={`px-3 py-2 rounded-xl ${prefs.theme===t? "bg-black text-white":"bg-gray-200"}`} onClick={()=>setPrefs({ ...prefs, theme: t })}>{t}</button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="font-medium mb-2">Font size</div>
        <div className="flex gap-2">
          {(["sm","md","lg"] as Prefs["fontScale"][]).map((s) => (
            <button key={s} className={`px-3 py-2 rounded-xl ${prefs.fontScale===s? "bg-black text-white":"bg-gray-200"}`} onClick={()=>setPrefs({ ...prefs, fontScale: s })}>{s.toUpperCase()}</button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="font-medium mb-2">Confetti</div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={prefs.confetti.enabled}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setPrefs({ ...prefs, confetti: { ...prefs.confetti, enabled: e.target.checked } })} />
          <span>Enabled</span>
          {reduced && <span className="text-xs text-gray-500">(Reduced-motion is ON system-wide)</span>}
        </label>
        <div className="mt-3 flex gap-2 flex-wrap">
          {Object.entries(PRESETS).map(([name, pal]: [string, string[]]) => (
            <button key={name} className="px-3 py-2 rounded-xl bg-gray-200"
                    onClick={()=>{ setPrefs({ ...prefs, confetti: { ...prefs.confetti, palette: pal } }); setCustom(pal.join(",")); }}>
              {name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="flex-1 border rounded-xl px-3 py-2" value={custom} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setCustom(e.target.value)} placeholder="#aabbcc,#ddeeff, ..." />
          <button className="px-4 py-2 rounded-xl bg-gray-900 text-white" onClick={()=>{
            const pal = custom.split(",").map((s)=>s.trim()).filter(Boolean);
            if (pal.length) setPrefs({ ...prefs, confetti: { ...prefs.confetti, palette: pal } });
          }}>Set Custom</button>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          {prefs.confetti.palette.map((c: string) => (
            <span key={c} className="inline-flex items-center px-3 py-1 rounded-full text-sm border" style={{ backgroundColor: c }}>
              <span className="mix-blend-difference text-white" style={{ filter: "invert(1) hue-rotate(180deg)" }}>{c}</span>
            </span>
          ))}
        </div>
      </Card>
    </section>
  );
}

/* UI bits */
function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
    </div>
  );
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl shadow p-4 border">{children}</div>;
}
function Stat({ label, value }:{ label: string; value: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl border">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
function Heatline({ logs }:{ logs: HabitLog[] }) {
  const cells = Array.from({length:30}, (_,i)=> {
    const d = daysAgoISO(29-i);
    return logs.some((l: HabitLog)=>l.date===d && l.value===1) ? 1 : 0;
  });
  return (
    <div className="mt-2 flex gap-1 flex-wrap max-w-[240px]">
      {cells.map((v: number, i: number)=> (
        <div key={i} className={`w-3 h-3 rounded ${v? "bg-green-500":"bg-gray-200"}`} />
      ))}
    </div>
  );
}
function Sparkline({ data }:{ data: number[] }) {
  const width = 240, height = 48, pad = 6, max = 7;
  const points = data.map((y: number, i: number) => {
    const x = pad + (i * (width - pad*2)) / (data.length - 1 || 1);
    const yy = height - pad - (clamp(y,0,max) * (height - pad*2)) / max;
    return `${x},${yy}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="block">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} opacity={0.7} />
      <line x1={pad} x2={width-pad} y1={height-pad} y2={height-pad} stroke="currentColor" opacity={0.2} />
    </svg>
  );
}
function TabBar({ tab, setTab }:{ tab: "Home"|"Habits"|"Mood"|"Tasks"|"Settings"; setTab: (t: "Home"|"Habits"|"Mood"|"Tasks"|"Settings")=>void }) {
  const items: typeof tab[] = ["Home","Habits","Mood","Tasks","Settings"];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t p-2 flex justify-around"
         style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
      {items.map((label: typeof tab) => (
        <button key={label} className={`px-3 py-2 rounded-xl text-sm ${tab===label? "bg-gray-200":""}`} onClick={()=>setTab(label)}>
          {label}
        </button>
      ))}
    </nav>
  );
}
