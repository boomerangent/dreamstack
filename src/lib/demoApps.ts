/** Small self-contained apps shown live on the landing page. */

export interface DemoApp {
  title: string;
  prompt: string;
  html: string;
}

export const DEMO_APPS: DemoApp[] = [
  {
    title: "Focus timer",
    prompt: "a beautiful pomodoro focus timer with a glowing progress ring",
    html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{margin:0;box-sizing:border-box;font-family:'Segoe UI',system-ui,sans-serif}
body{background:#0b0f1a;color:#e8ecf7;display:flex;align-items:center;justify-content:center;min-height:100vh}
.wrap{text-align:center}
.ring{position:relative;width:170px;height:170px;margin:0 auto 18px}
svg{transform:rotate(-90deg)}
.bg{stroke:#1d2740;fill:none;stroke-width:9}
.fg{stroke:url(#g);fill:none;stroke-width:9;stroke-linecap:round;transition:stroke-dashoffset .5s linear}
.time{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:600;letter-spacing:1px}
button{margin:4px;padding:10px 22px;border:0;border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;background:#22d3ee;color:#06202a}
button.alt{background:#1d2740;color:#8ea2c9}
p{color:#5d6c8f;font-size:12px;margin-top:14px;letter-spacing:2px;text-transform:uppercase}
</style></head><body><div class="wrap"><div class="ring"><svg width="170" height="170"><defs><linearGradient id="g"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs><circle class="bg" cx="85" cy="85" r="76"/><circle class="fg" id="fg" cx="85" cy="85" r="76"/></svg><div class="time" id="t">25:00</div></div><button id="go">Start</button><button class="alt" id="rs">Reset</button><p id="ph">Focus session</p></div><script>
const FULL=25*60,C=2*Math.PI*76;let left=FULL,run=false,iv;const fg=document.getElementById('fg');fg.style.strokeDasharray=C;
function draw(){const m=String(Math.floor(left/60)).padStart(2,'0'),s=String(left%60).padStart(2,'0');document.getElementById('t').textContent=m+':'+s;fg.style.strokeDashoffset=C*(1-left/FULL)}
document.getElementById('go').onclick=e=>{run=!run;e.target.textContent=run?'Pause':'Start';if(run){iv=setInterval(()=>{if(--left<=0){left=0;clearInterval(iv);run=false;document.getElementById('go').textContent='Start';document.getElementById('ph').textContent='Done — take a break ✦'}draw()},1000)}else clearInterval(iv)};
document.getElementById('rs').onclick=()=>{clearInterval(iv);run=false;left=FULL;document.getElementById('go').textContent='Start';document.getElementById('ph').textContent='Focus session';draw()};draw();
</script></body></html>`,
  },
  {
    title: "Mood tracker",
    prompt: "a daily mood tracker with emoji and a week view that remembers my entries",
    html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{margin:0;box-sizing:border-box;font-family:'Segoe UI',system-ui,sans-serif}
body{background:#0d0a14;color:#f0eaff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
.card{width:100%;max-width:330px;background:#161022;border:1px solid #2b2140;border-radius:18px;padding:22px;text-align:center}
h2{font-size:17px;margin-bottom:14px}
.moods{display:flex;justify-content:space-between;margin-bottom:18px}
.moods button{font-size:26px;background:none;border:2px solid transparent;border-radius:12px;padding:7px;cursor:pointer;transition:.15s}
.moods button:hover{transform:scale(1.2)}
.moods button.on{border-color:#c084fc;background:#251a38}
.week{display:flex;gap:6px;justify-content:center}
.day{width:34px;height:44px;border-radius:9px;background:#1e1630;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:9px;color:#7a6f96}
.day span{font-size:16px}
</style></head><body><div class="card"><h2>How do you feel today?</h2><div class="moods" id="m"></div><div class="week" id="w"></div></div><script>
const MOODS=['😄','🙂','😐','😔','😭'],KEY='ds-mood';
const store=JSON.parse(localStorage.getItem(KEY)||'{}');
const today=new Date().toISOString().slice(0,10);
const mdiv=document.getElementById('m');
MOODS.forEach((e,i)=>{const b=document.createElement('button');b.textContent=e;if(store[today]===i)b.classList.add('on');b.onclick=()=>{store[today]=i;localStorage.setItem(KEY,JSON.stringify(store));render()};mdiv.appendChild(b)});
function render(){[...mdiv.children].forEach((b,i)=>b.classList.toggle('on',store[today]===i));const w=document.getElementById('w');w.innerHTML='';for(let d=6;d>=0;d--){const dt=new Date(Date.now()-d*864e5),k=dt.toISOString().slice(0,10),el=document.createElement('div');el.className='day';el.innerHTML='<span>'+(store[k]!=null?MOODS[store[k]]:'·')+'</span>'+dt.toLocaleDateString(undefined,{weekday:'short'}).slice(0,2);w.appendChild(el)}}
render();
</script></body></html>`,
  },
  {
    title: "Split the bill",
    prompt: "a tip calculator and bill splitter for dinners with friends",
    html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{margin:0;box-sizing:border-box;font-family:'Segoe UI',system-ui,sans-serif}
body{background:#071210;color:#eafff8;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
.card{width:100%;max-width:320px;background:#0d1f1b;border:1px solid #1d3a33;border-radius:18px;padding:22px}
label{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#4fa08d;display:block;margin:12px 0 5px}
input,select{width:100%;padding:11px;border-radius:10px;border:1px solid #1d3a33;background:#081713;color:#eafff8;font-size:15px}
.out{margin-top:18px;background:#10291f;border-radius:12px;padding:14px;display:flex;justify-content:space-between;align-items:center}
.out b{font-size:24px;color:#34d399}
.out span{font-size:12px;color:#4fa08d}
</style></head><body><div class="card"><label>Bill total</label><input id="b" type="number" placeholder="120.00"><label>Tip</label><select id="t"><option value="0.1">10% — okay</option><option value="0.15" selected>15% — good</option><option value="0.2">20% — great</option><option value="0.25">25% — amazing</option></select><label>People</label><input id="p" type="number" value="2" min="1"><div class="out"><span>Each pays</span><b id="o">$0.00</b></div></div><script>
const $=id=>document.getElementById(id);
function calc(){const b=parseFloat($('b').value)||0,t=parseFloat($('t').value),p=Math.max(1,parseInt($('p').value)||1);$('o').textContent='$'+(b*(1+t)/p).toFixed(2)}
['b','t','p'].forEach(id=>$(id).addEventListener('input',calc));calc();
</script></body></html>`,
  },
];
