import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

const MODES = {
  refresh: {
    label: 'Starter Refresh',
    steps: [
      { title: 'Transfer 20g to clean jar', desc: 'Take out 20g of your starter into a clean container (mason jar ideal). Glass, plastic, or stainless steel only.', amounts: ['20g starter out'], checkWindow: null },
      { title: 'First feed — 20g water + 20g flour', desc: 'Add 20g filtered water and 20g unbleached flour (bread flour preferred). Stir, mark the line. Leave at 70–75°F.', amounts: ['20g water', '20g flour', '= 60g total'], checkWindow: [4, 6] },
      { title: 'Second feed — NO discard — 60g water + 60g flour', desc: 'Do NOT discard. Add 60g water and 60g flour directly. Stir and remark the new line.', amounts: ['60g water', '60g flour'], checkWindow: [4, 8] },
      { title: 'Check for 1.5× rise', desc: 'Look for at least 1.5× rise from your marked line after 4–8 hours. Bubbles and a dome are great signs. If active — refresh complete!', amounts: [], checkWindow: [4, 8] },
      { title: 'No activity? Emergency feed', desc: 'Discard half, feed 1:1:1 ratio, stir in ½–1 tsp sugar. Wait 4–8 more hours. Still nothing? Contact Sarver Farms!', amounts: ['Discard half', '= starter weight of water', '= starter weight of flour', '½–1 tsp sugar'], checkWindow: [4, 8], optional: true },
    ]
  },
  counter: {
    label: 'Counter / Daily Feeding',
    steps: [
      { title: 'Discard half your starter', desc: 'Remove half. Save in a fridge bowl for discard recipes (use within a week) or discard.', amounts: [], checkWindow: null },
      { title: 'Feed 1:1:1 — equal water + flour to remaining', desc: 'Add equal weight of water then flour to what remains. Example: 50g left → 50g water + 50g flour = 150g total. Stir and mark the line.', amounts: ['1:1:1 ratio', '= 3× remaining weight'], checkWindow: [4, 8] },
      { title: 'Watch for 2–3× rise', desc: 'Ready to bake in 4–8 hours at 75–80°F. Ready when risen 2–3× from your marked line.', amounts: [], checkWindow: [4, 8] },
    ]
  },
  fridge: {
    label: 'Fridge Storage',
    steps: [
      { title: 'Feed 1:1:1 then refrigerate immediately', desc: 'Feed first (discard half, add equal water + flour). Put in fridge immediately after — do not wait for rise.', amounts: ['1:1:1 ratio'], checkWindow: null },
      { title: 'Check every few days', desc: 'Lasts 1–2 weeks. If you see liquid (hooch) on top, stir or pour off and feed soon.', amounts: [], checkWindow: [48, 96] },
      { title: 'Revive: discard half + warm to room temp', desc: 'Pour off any liquid, discard half, leave at room temp 2–4 hours before feeding.', amounts: [], checkWindow: [2, 4] },
      { title: 'Feed 1:1:1 and watch for 2× rise', desc: 'Feed equal water + flour. Let sit 4–12 hours. Ready when 2× risen. Feed again before returning to fridge.', amounts: ['1:1:1 ratio'], checkWindow: [4, 12] },
    ]
  },
  longterm: {
    label: 'Long-Term Dry Storage',
    steps: [
      { title: 'Feed starter normally first', desc: 'Feed using 1:1:1 method. Let become active before drying.', amounts: ['1:1:1 ratio'], checkWindow: [4, 8] },
      { title: 'Spread thin — air dry 1–3 days', desc: 'Spread thinly on parchment or silicone mat. Air dry 1–3 days. Dehydrator ok — stay below 85–90°F.', amounts: [], checkWindow: [24, 72] },
      { title: 'Store chips — 1+ year shelf life', desc: 'Break into chips. Store in brown paper bag or plastic with silica gel in cool, dark, dry place.', amounts: [], checkWindow: null },
    ]
  },
}

const MODE_ICONS = { refresh: '🔄', counter: '🍞', fridge: '❄️', longterm: '📦' }
const OBS_LABELS = { rising: 'Rising 📈', peaked: 'Peaked 🏔️', falling: 'Falling 📉', 'no-activity': 'No activity 😴', liquid: 'Liquid on top 💧', ready: 'Ready to bake! 🎉' }

export default function Home() {
  const [email, setEmail] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [userId, setUserId] = useState(null)
  const [mode, setMode] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [entries, setEntries] = useState([])
  const [obs, setObs] = useState('')
  const [note, setNote] = useState('')
  const [starterWeight, setStarterWeight] = useState('')
  const [timeStr, setTimeStr] = useState('')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showEmailSetup, setShowEmailSetup] = useState(false)
  const [streak, setStreak] = useState(0)

  // Current time default
  useEffect(() => {
    const now = new Date()
    setTimeStr(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`)
  }, [mode, currentStep])

  // Load user from localStorage or Supabase
  useEffect(() => {
    const saved = localStorage.getItem('leven_uid')
    if (saved) loadUser(saved)
    else setShowEmailSetup(true)
  }, [])

  async function loadUser(uid) {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*, entries(*, mode, step_index, step_title, observation, note, amounts, created_at, email_sent)')
      .eq('id', uid)
      .order('created_at', { foreignTable: 'entries', ascending: false })
      .limit(20, { foreignTable: 'entries' })
      .single()

    if (data) {
      setUserId(data.id)
      setEmail(data.email)
      setMode(data.current_mode)
      setCurrentStep(data.current_step || 0)
      setEntries(data.entries || [])
      calcStreak(data.entries || [])
    } else {
      localStorage.removeItem('leven_uid')
      setShowEmailSetup(true)
    }
    setLoading(false)
  }

  function calcStreak(ents) {
    let s = 0
    const seen = new Set()
    ents.forEach(e => {
      const d = new Date(e.created_at).toISOString().slice(0, 10)
      seen.add(d)
    })
    const now = new Date()
    for (let i = 0; i < 60; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      if (seen.has(d.toISOString().slice(0, 10))) s++
      else if (i > 0) break
    }
    setStreak(s)
  }

  async function registerEmail() {
    if (!emailInput.trim() || !emailInput.includes('@')) { showToast('Please enter a valid email'); return }
    setSaving(true)
    const { data, error } = await supabase
      .from('users')
      .insert({ email: emailInput.trim(), current_mode: null, current_step: 0 })
      .select()
      .single()
    if (error) { showToast('Error saving — try again'); setSaving(false); return }
    localStorage.setItem('leven_uid', data.id)
    setUserId(data.id)
    setEmail(data.email)
    setShowEmailSetup(false)
    // Send welcome email via API
    await fetch('/api/welcome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.email }) })
    showToast('Welcome! Reminders are now active 📬')
    setSaving(false)
  }

  async function selectMode(m) {
    const newStep = mode !== m ? 0 : currentStep
    setMode(m)
    setCurrentStep(newStep)
    if (userId) {
      await supabase.from('users').update({ current_mode: m, current_step: newStep }).eq('id', userId)
    }
    showToast(MODES[m].label + ' selected')
  }

  async function logStep() {
    if (!userId || !mode) return
    const modeData = MODES[mode]
    const step = modeData.steps[currentStep]
    if (!step) return

    setSaving(true)
    let amounts = {}
    if (starterWeight && parseFloat(starterWeight)) {
      const w = parseFloat(starterWeight)
      amounts = { starter: w, water: w, flour: w, total: w * 3 }
    }

    // Save entry
    const { data: entry } = await supabase.from('entries').insert({
      user_id: userId,
      mode,
      step_index: currentStep,
      step_title: step.title,
      observation: obs || null,
      note: note || null,
      amounts,
      logged_time: timeStr,
      check_window_min: step.checkWindow ? step.checkWindow[0] : null,
      check_window_max: step.checkWindow ? step.checkWindow[1] : null,
    }).select().single()

    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    await supabase.from('users').update({ current_mode: mode, current_step: nextStep, last_entry_at: new Date().toISOString() }).eq('id', userId)

    // Reload entries
    const { data: newEntries } = await supabase.from('entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(15)
    setEntries(newEntries || [])
    calcStreak(newEntries || [])

    // Reset fields
    setObs(''); setNote(''); setStarterWeight('')
    const feedbacks = { 'no-activity': 'No activity yet — more time needed.', ready: '🎉 Ready to bake!', rising: 'Rising well — check back soon!', peaked: 'Perfect timing!', liquid: 'Hooch is fine — stir it in and feed!' }
    showToast(feedbacks[obs] || ['Logged! 🌾', 'Nice work!', 'Tracking!', 'Great care!'][Math.floor(Math.random()*4)])
    setSaving(false)
  }

  async function resetCycle() {
    setCurrentStep(0)
    if (userId) await supabase.from('users').update({ current_step: 0 }).eq('id', userId)
    showToast('New cycle started')
  }

  async function unsubscribe() {
    if (!userId) return
    await supabase.from('users').update({ reminders_active: false }).eq('id', userId)
    showToast('Reminders paused — reopen to re-enable')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const currentMode = mode ? MODES[mode] : null
  const currentStepData = currentMode ? currentMode.steps[currentStep] : null
  const hasWeight = currentStepData && (currentStepData.title.includes('Feed') || currentStepData.title.includes('Discard'))

  return (
    <>
      <Head>
        <title>Leven — Sarver Farms Starter Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--cream:#f5f0e8;--tan:#e8dcc8;--brown:#7a5c3a;--dark:#2c1f0e;--rust:#b84c2a;--sage:#6b7c5e;--warm:#faf7f2;--mid:#9e8060;--gold:#c9952a}
        body{background:var(--cream);color:var(--dark);font-family:'Courier Prime',monospace;min-height:100vh}
        header{background:var(--dark);color:var(--cream);padding:1.2rem 1.5rem;display:flex;align-items:center;gap:1rem;border-bottom:3px solid var(--brown)}
        .logo{font-family:'Playfair Display',serif;font-size:1.9rem;font-weight:700;color:var(--cream)}
        .logo em{color:var(--gold);font-style:normal}
        .logo-sub{font-size:0.6rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--mid);margin-top:2px}
        .hdr-r{margin-left:auto;text-align:right;font-size:0.72rem;color:var(--mid)}
        .streak{color:var(--gold);font-size:0.8rem;margin-top:3px}
        main{max-width:700px;margin:0 auto;padding:1.5rem 1.2rem 5rem}
        .sec-label{font-size:0.63rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--mid);margin-bottom:.8rem;display:flex;align-items:center;gap:.8rem}
        .sec-label::after{content:'';flex:1;height:1px;background:var(--tan)}
        .modes{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:1.5rem}
        .mode-btn{background:var(--warm);border:2px solid var(--tan);padding:.8rem .4rem;cursor:pointer;text-align:center;transition:all .2s;font-family:'Courier Prime',monospace}
        .mode-btn:hover{border-color:var(--brown)}
        .mode-btn.active{background:var(--dark);color:var(--cream);border-color:var(--dark)}
        .mode-icon{font-size:1.3rem;display:block;margin-bottom:.3rem}
        .mode-label{font-size:.63rem;letter-spacing:.08em;text-transform:uppercase;line-height:1.3}
        .step-card{background:var(--warm);border:2px solid var(--tan);padding:1.2rem 1.5rem;margin-bottom:.5rem;position:relative;transition:all .2s}
        .step-card.active{border-color:var(--brown);border-left:4px solid var(--brown);background:var(--cream)}
        .step-card.done{border-color:var(--sage);opacity:.65}
        .step-card.done::after{content:'✓';position:absolute;right:1rem;top:50%;transform:translateY(-50%);color:var(--sage);font-size:1.1rem}
        .step-card.future{opacity:.4}
        .step-num{font-size:.63rem;letter-spacing:.15em;text-transform:uppercase;color:var(--mid);margin-bottom:.3rem}
        .step-card.active .step-num{color:var(--brown)}
        .step-title{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;margin-bottom:.4rem}
        .step-desc{font-size:.78rem;line-height:1.6;color:#5a4030}
        .chips{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.7rem}
        .chip{background:var(--tan);padding:.2rem .55rem;font-size:.68rem;font-weight:700;border:1px solid var(--mid)}
        .log-panel{background:var(--dark);color:var(--cream);padding:1.4rem;margin-bottom:1.5rem;border-left:4px solid var(--gold)}
        .log-panel h3{font-family:'Playfair Display',serif;font-size:1.1rem;margin-bottom:.8rem}
        .log-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-bottom:.8rem;align-items:flex-end}
        .field{display:flex;flex-direction:column;gap:.3rem}
        .field label{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--mid)}
        .field input,.field select{background:#3a2a15;border:2px solid #5a4030;color:var(--cream);padding:.5rem .7rem;font-family:'Courier Prime',monospace;font-size:.85rem;outline:none;min-width:110px}
        .field input:focus,.field select:focus{border-color:var(--gold)}
        .field input[type=number]{width:90px}
        .log-btn{background:var(--brown);color:var(--cream);border:none;padding:.6rem 1.4rem;font-family:'Courier Prime',monospace;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:all .2s;align-self:flex-end}
        .log-btn:hover{background:var(--gold);color:var(--dark)}
        .log-btn:disabled{opacity:.5;cursor:not-allowed}
        .history-item{display:flex;gap:1rem;padding:.8rem 1rem;background:var(--warm);border:1px solid var(--tan);margin-bottom:.4rem;align-items:flex-start}
        .h-time{font-size:.7rem;color:var(--mid);min-width:75px;flex-shrink:0}
        .h-main{flex:1}
        .h-mode{font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--mid)}
        .h-step{font-size:.85rem;margin:.1rem 0}
        .h-amt{font-size:.7rem;color:var(--brown);font-weight:700}
        .badge{display:inline-block;font-size:.6rem;background:var(--sage);color:white;padding:.1rem .3rem;margin-left:.4rem;vertical-align:middle}
        .timer-card{background:var(--tan);border:2px solid var(--brown);padding:1.2rem 1.5rem;margin-bottom:1.5rem;display:flex;gap:1.2rem;align-items:center}
        .timer-icon{font-size:2rem;flex-shrink:0}
        .timer-body strong{font-family:'Playfair Display',serif;font-size:1rem;display:block;margin-bottom:.2rem}
        .timer-body p{font-size:.78rem;line-height:1.5;color:#5a3020}
        .progress{height:4px;background:#d4c4a8;margin-top:.5rem;border-radius:2px;overflow:hidden}
        .progress-bar{height:100%;background:var(--brown);transition:width .5s}
        .email-setup{background:var(--warm);border:2px dashed var(--mid);padding:1.5rem;margin-bottom:1.5rem}
        .email-setup h2{font-family:'Playfair Display',serif;font-size:1.3rem;margin-bottom:.4rem;color:var(--brown)}
        .email-setup p{font-size:.8rem;line-height:1.6;color:var(--mid);margin-bottom:1rem}
        .email-row{display:flex;gap:.8rem;flex-wrap:wrap}
        .email-input{flex:1;background:var(--cream);border:2px solid var(--tan);padding:.6rem .9rem;font-family:'Courier Prime',monospace;font-size:.9rem;color:var(--dark);outline:none;min-width:220px}
        .email-input:focus{border-color:var(--brown)}
        .email-btn{background:var(--brown);color:var(--cream);border:none;padding:.6rem 1.4rem;font-family:'Courier Prime',monospace;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:all .2s;white-space:nowrap}
        .email-btn:hover{background:var(--dark)}
        .email-btn:disabled{opacity:.5;cursor:not-allowed}
        .advice{background:var(--warm);border:2px dashed var(--mid);padding:1.2rem 1.5rem;margin-bottom:1.5rem;font-size:.78rem;line-height:1.7}
        .advice strong{font-family:'Playfair Display',serif;font-style:italic;font-size:.95rem;color:var(--brown);display:block;margin-bottom:.4rem}
        .toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(100px);background:var(--dark);color:var(--cream);padding:.9rem 1.8rem;font-family:'Playfair Display',serif;font-style:italic;font-size:1rem;border-left:4px solid var(--gold);transition:transform .4s cubic-bezier(.34,1.56,.64,1);z-index:9999;max-width:90vw;text-align:center;pointer-events:none}
        .toast.show{transform:translateX(-50%) translateY(0)}
        @media(max-width:500px){.modes{grid-template-columns:repeat(2,1fr)}.log-row{flex-direction:column}.log-btn{width:100%}}
      `}</style>

      <header>
        <div>
          <div className="logo">Le<em>ven</em></div>
          <div className="logo-sub">Sarver Farms · Starter Tracker</div>
        </div>
        <div className="hdr-r">
          <div>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
          {streak > 0 && <div className="streak">🌾 {streak} day streak</div>}
          {email && <div style={{marginTop:4,fontSize:'0.65rem',color:'#5a4030'}}>{email}</div>}
        </div>
      </header>

      <main>
        {/* Email setup */}
        {showEmailSetup && (
          <div className="email-setup">
            <h2>🌾 Welcome to Leven</h2>
            <p>Enter your email address to get started. That's all you need — the app will track your starter and send automatic reminders at every check window. No account, no password.</p>
            <div className="email-row">
              <input className="email-input" type="email" placeholder="your@email.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => e.key==='Enter' && registerEmail()} />
              <button className="email-btn" onClick={registerEmail} disabled={saving}>{saving ? 'Setting up…' : '→ Get Started'}</button>
            </div>
          </div>
        )}

        {/* Timer for current step */}
        <TimerCard entries={entries} mode={mode} currentStep={currentStep} />

        {/* Mode selector */}
        {!showEmailSetup && (
          <>
            <div className="sec-label">What are you doing with your starter?</div>
            <div className="modes">
              {Object.entries(MODES).map(([key, m]) => (
                <button key={key} className={`mode-btn${mode===key?' active':''}`} onClick={() => selectMode(key)}>
                  <span className="mode-icon">{MODE_ICONS[key]}</span>
                  <span className="mode-label">{m.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Advice */}
        {mode && <Advice mode={mode} />}

        {/* Steps */}
        {currentMode && (
          <>
            <div className="sec-label">{currentMode.label} — Steps</div>
            {currentMode.steps.map((step, i) => (
              <div key={i} className={`step-card${i===currentStep?' active':i<currentStep?' done':' future'}`}>
                <div className="step-num">Step {i+1} of {currentMode.steps.length}{step.optional&&<span style={{fontSize:'.6rem',background:'#b84c2a',color:'white',padding:'1px 5px',marginLeft:6}}>if needed</span>}</div>
                <div className="step-title">{step.title}</div>
                <div className="step-desc">{step.desc}</div>
                {step.amounts.length>0&&<div className="chips">{step.amounts.map((a,j)=><span key={j} className="chip">{a}</span>)}</div>}
              </div>
            ))}
          </>
        )}

        {/* Log panel */}
        {currentMode && currentStepData && (
          <div className="log-panel">
            <h3>Log: Step {currentStep+1} — {currentStepData.title}</h3>
            <div className="log-row">
              <div className="field">
                <label>Time done</label>
                <input type="time" value={timeStr} onChange={e=>setTimeStr(e.target.value)} />
              </div>
              {hasWeight && (
                <div className="field">
                  <label>Starter weight (g)</label>
                  <input type="number" placeholder="e.g. 50" value={starterWeight} onChange={e=>setStarterWeight(e.target.value)} min="1" max="2000" />
                </div>
              )}
              {currentStepData.title.toLowerCase().includes('check') || currentStepData.title.toLowerCase().includes('watch') || currentStepData.title.toLowerCase().includes('rise') ? (
                <div className="field">
                  <label>What did you observe?</label>
                  <select value={obs} onChange={e=>setObs(e.target.value)}>
                    <option value="">-- Select --</option>
                    <option value="rising">Rising well (bubbles, dome)</option>
                    <option value="peaked">Peaked / at max rise</option>
                    <option value="falling">Falling / deflating</option>
                    <option value="no-activity">No activity yet</option>
                    <option value="liquid">Liquid on top (hooch)</option>
                    <option value="ready">Ready to bake! (2×+ rise)</option>
                  </select>
                </div>
              ) : null}
              <div className="field" style={{flex:1}}>
                <label>Note (optional)</label>
                <input type="text" placeholder="smell, temp, activity..." value={note} onChange={e=>setNote(e.target.value)} />
              </div>
              <button className="log-btn" onClick={logStep} disabled={saving || !userId}>{saving?'Saving…':'→ Log It'}</button>
            </div>
            {currentStepData.checkWindow && email && (
              <div style={{fontSize:'.67rem',color:'#c9952a',marginTop:4}}>
                📬 Reminder email scheduled at the {currentStepData.checkWindow[0]}–{currentStepData.checkWindow[1]} hr mark
              </div>
            )}
          </div>
        )}

        {/* All done */}
        {currentMode && currentStep >= currentMode.steps.length && (
          <div className="log-panel" style={{borderColor:'#6b7c5e'}}>
            <h3>🎉 All steps complete!</h3>
            <p style={{fontSize:'.8rem',color:'#a8c8a0',marginBottom:'1rem'}}>You've finished the {currentMode.label} process.</p>
            <button className="log-btn" style={{background:'#6b7c5e'}} onClick={resetCycle}>Start New Cycle</button>
          </div>
        )}

        {/* History */}
        {entries.length > 0 && (
          <>
            <div className="sec-label" style={{marginTop:'1.5rem'}}>Activity log</div>
            {entries.slice(0,10).map((e,i) => {
              const d = new Date(e.created_at)
              const dateStr = d.toLocaleDateString('en-US',{month:'short',day:'numeric'})
              const timeStr = e.logged_time || d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
              let amtStr = ''
              if (e.amounts?.starter) amtStr = `${e.amounts.starter}g → +${e.amounts.water}g water + ${e.amounts.flour}g flour`
              return (
                <div key={i} className="history-item">
                  <div className="h-time">{dateStr}<br/>{timeStr}</div>
                  <div className="h-main">
                    <div className="h-mode">{MODE_ICONS[e.mode]||''} {MODES[e.mode]?.label||e.mode} · Step {(e.step_index||0)+1}{e.email_sent&&<span className="badge">📬</span>}</div>
                    <div className="h-step">{e.step_title}</div>
                    {amtStr&&<div className="h-amt">{amtStr}</div>}
                    {e.observation&&<div style={{fontSize:'.7rem',color:'#6b7c5e',marginTop:2}}>{OBS_LABELS[e.observation]||e.observation}</div>}
                    {e.note&&<div style={{fontSize:'.7rem',color:'var(--mid)',fontStyle:'italic',marginTop:2}}>"{e.note}"</div>}
                  </div>
                  <div>{MODE_ICONS[e.mode]||'📝'}</div>
                </div>
              )
            })}
          </>
        )}

        {/* Unsubscribe */}
        {email && <div style={{textAlign:'center',marginTop:'2rem'}}><button onClick={unsubscribe} style={{background:'none',border:'none',color:'var(--mid)',fontSize:'.7rem',cursor:'pointer',textDecoration:'underline'}}>Pause email reminders</button></div>}

      </main>

      <div className={`toast${toast?' show':''}`}>{toast}</div>
    </>
  )
}

function TimerCard({ entries, mode, currentStep }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t) }, [])

  if (!entries.length || !mode) return null
  const last = entries[0]
  if (last.mode !== mode) return null
  const modeData = MODES[mode]
  const si = last.step_index
  if (si >= modeData.steps.length) return null
  const step = modeData.steps[si]
  if (!step?.checkWindow) return null

  const [minH, maxH] = step.checkWindow
  const midH = (minH + maxH) / 2
  const elapsed = (now - new Date(last.created_at).getTime()) / 3600000
  const remaining = maxH - elapsed
  const pct = Math.min(100, (elapsed / maxH) * 100)

  let icon = '⏳', msg = '', overdue = false
  if (elapsed < minH) {
    const checkInH = minH - elapsed
    const h = Math.floor(checkInH), m = Math.round((checkInH%1)*60)
    msg = `Check back in ${h}h ${m}m — the ${minH}–${maxH} hour window begins then.`
  } else if (elapsed < midH) {
    const h = Math.floor(remaining), m = Math.round((remaining%1)*60)
    icon = '👁️'
    msg = `Time to check! You're in the early window. ${h}h ${m}m until peak.`
  } else if (elapsed < maxH) {
    const h = Math.floor(remaining), m = Math.round((remaining%1)*60)
    icon = '⏰'
    msg = `Feed now! Peak activity window. ${h}h ${m}m remaining.`
  } else {
    icon = '🚨'; msg = 'Window passed — check your starter and log now.'; overdue = true
  }

  return (
    <div className="timer-card" style={overdue?{borderColor:'#b84c2a',background:'#fff5f0'}:{}}>
      <div className="timer-icon">{icon}</div>
      <div className="timer-body">
        <strong>Step {si+1}: {step.title}</strong>
        <p>{msg}</p>
        <div className="progress"><div className="progress-bar" style={{width:`${pct}%`}} /></div>
      </div>
    </div>
  )
}

function Advice({ mode }) {
  const tips = {
    refresh: { title: 'About the Starter Refresh', text: 'Two feedings without discarding builds strength. Look for 1.5× rise as your green light. The sugar trick in Step 5 often revives sluggish starters — Sarver Farms will replace it if needed.' },
    counter: { title: 'Counter Starter Tips', text: 'Feed when you see it rise and fall — usually 4–12 hours. Cooler kitchens (55–65°F) need 1–2 feeds/day. Save discard in a fridge bowl for recipes; use within a week!' },
    fridge:  { title: 'Fridge Storage Tips', text: 'Always feed before refrigerating. Hooch on top means it\'s hungry — safe to use, stir in or pour off. Not active after a feeding? Try the Starter Refresh method.' },
    longterm:{ title: 'Long-Term Dry Storage', text: 'Keep drying below 85–90°F or you\'ll kill the yeast. Refresh dried starter once a year. Silica gel in sealed plastic keeps chips bone dry for 1+ year.' },
  }
  const t = tips[mode]
  if (!t) return null
  return <div className="advice"><strong>{t.title}</strong>{t.text}</div>
}
