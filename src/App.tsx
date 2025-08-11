
import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
const todayISO = () => new Date().toISOString().slice(0,10);
function useReducedMotion(){const [p,setP]=useState(false);useEffect(()=>{const mq=window.matchMedia("(prefers-reduced-motion: reduce)");const u=()=>setP(mq.matches);u();mq.addEventListener?.("change",u);return()=>mq.removeEventListener?.("change",u)},[]);return p;}
function celebrate(colors, enabled, reduced){ if(!enabled||reduced) return; const end=Date.now()+2500; (function frame(){ confetti({particleCount:40, spread:70, startVelocity:40, origin:{x:0.5,y:1.05}, colors}); if(Date.now()<end) requestAnimationFrame(frame); })(); }
export default function App(){
  const reduced=useReducedMotion();
  const [tab,setTab]=useState("Home");
  const [tasks,setTasks]=useState(()=>{try{return JSON.parse(localStorage.getItem("tasks")||"[]")}catch{return []}});
  const [prefs,setPrefs]=useState(()=>{try{return JSON.parse(localStorage.getItem("prefs")||'{"confetti":{"enabled":true,"palette":["#ffd1dc","#cde7ff","#e3ffd6","#fff1c1","#e9d6ff"]}}')}catch{return {"confetti":{"enabled":true,"palette":["#ffd1dc","#cde7ff","#e3ffd6","#fff1c1","#e9d6ff"]}}}});
  useEffect(()=>localStorage.setItem("tasks",JSON.stringify(tasks)),[tasks]);
  useEffect(()=>localStorage.setItem("prefs",JSON.stringify(prefs)),[prefs]);
  const [title,setTitle]=useState("");
  const doneToday=tasks.filter(t=>t.completedAt && new Date(t.completedAt).toDateString()===new Date().toDateString()).length;
  function addTask(){ if(!title.trim()) return; setTasks([{id:crypto.randomUUID(),title:title.trim(),createdAt:Date.now()},...tasks]); setTitle(""); }
  function toggleTask(id){ const was=!!tasks.find(t=>t.id===id)?.completedAt; const next=tasks.map(t=>t.id===id?{...t,completedAt:t.completedAt?undefined:Date.now()}:t); setTasks(next); const now=!!next.find(t=>t.id===id)?.completedAt; if(!was&&now){celebrate(prefs.confetti.palette,prefs.confetti.enabled,reduced); if(navigator.vibrate) navigator.vibrate(10);} }
  return <div className="min-h-screen p-4 pb-24 max-w-screen-sm mx-auto">
    {tab==="Home" && <div><h1 className="text-2xl font-semibold">Today</h1><div className="mt-2 border rounded-2xl p-4">Tasks done today: <b>{doneToday}</b></div></div>}
    {tab==="Tasks" && <div>
      <h1 className="text-2xl font-semibold">Tasks</h1>
      <div className="mt-3 flex gap-2">
        <input className="flex-1 border rounded-xl px-3 py-2" placeholder="Quick add task..." value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} />
        <button className="px-4 py-2 rounded-xl bg-gray-900 text-white" onClick={addTask}>Add</button>
      </div>
      <div className="mt-3 space-y-2">
        {tasks.length===0 && <div className="text-gray-500">No tasks yet. Add one above.</div>}
        {tasks.map(t=><div key={t.id} className="border rounded-2xl p-3 flex items-center gap-3">
          <input type="checkbox" className="w-5 h-5" checked={!!t.completedAt} onChange={()=>toggleTask(t.id)} />
          <div className={"flex-1 "+(t.completedAt?"line-through text-gray-400":"")}>{t.title}</div>
          <button className="px-3 py-2 rounded-xl bg-gray-200" onClick={()=>toggleTask(t.id)}>{t.completedAt?"Undo":"Done"}</button>
        </div>)}
      </div>
    </div>}
    {tab==="Settings" && <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="mt-3 border rounded-2xl p-4">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={!!prefs.confetti?.enabled} onChange={e=>setPrefs({...prefs, confetti:{...prefs.confetti, enabled:e.target.checked}})} />
          <span>Confetti enabled</span>
        </label>
        <div className="mt-2 text-sm text-gray-600">Palette: {prefs.confetti.palette.join(", ")}</div>
      </div>
    </div>}
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t p-2 flex justify-around" style={{paddingBottom:"calc(0.5rem + env(safe-area-inset-bottom))"}}>
      {["Home","Tasks","Settings"].map(l=><button key={l} className={"px-3 py-2 rounded-xl text-sm "+(tab===l?"bg-gray-200":"")} onClick={()=>setTab(l)}>{l}</button>)}
    </nav>
  </div>
}
