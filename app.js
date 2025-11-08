const API_BASE = 'YOUR_WORKER_ENDPOINT_BASE'; // 例: https://washroom.example.workers.dev

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

const $ = (id) => document.getElementById(id);
const displayNameEl = $('displayName');
const saveNameBtn = $('saveName');
const enablePushBtn = $('enablePush');
const pushStatus = $('pushStatus');
const startEl = $('start');
const endEl = $('end');
const regBtn = $('register');
const cancelBtn = $('cancelReg');
const regStatus = $('regStatus');
const summaryDateEl = $('summaryDate');
const showSummaryBtn = $('showSummary');
const summaryEl = $('summary');
const openToday = $('openToday');
const openTomorrow = $('openTomorrow');

function ymd(d){return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10);}
const today = new Date();
const tomorrow = new Date(Date.now()+86400000);
summaryDateEl.value = ymd(tomorrow);

openToday.onclick = (e)=>{e.preventDefault(); summaryDateEl.value = ymd(today); showSummaryBtn.click();};
openTomorrow.onclick = (e)=>{e.preventDefault(); summaryDateEl.value = ymd(tomorrow); showSummaryBtn.click();};

saveNameBtn.onclick = async () => {
  const name = displayNameEl.value.trim();
  if (!name) return;
  localStorage.setItem('displayName', name);
  pushStatus.textContent = '名前を保存しました。';
  pushStatus.className = 'ok';
};
displayNameEl.value = localStorage.getItem('displayName') || '';

async function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
async function getPublicKey(){ const r = await fetch(API_BASE + '/vapidPublicKey'); return (await r.json()).key; }

enablePushBtn.onclick = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('通知が許可されていません。');
    const reg = await navigator.serviceWorker.ready;
    const vapidKey = await getPublicKey();
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: await urlBase64ToUint8Array(vapidKey) });
    const name = localStorage.getItem('displayName') || '';
    const res = await fetch(API_BASE + '/subscribe', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ subscription: sub, displayName: name }) });
    if (!res.ok) throw new Error('購読登録に失敗');
    pushStatus.textContent = '通知の有効化に成功しました。';
    pushStatus.className = 'ok';
  } catch (e) {
    pushStatus.textContent = '通知の有効化に失敗：' + e.message;
    pushStatus.className = 'err';
  }
};

function normalize(t){
  if (!t) return null;
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return t;
}
function tomorrowYMD(){ return ymd(new Date(Date.now()+86400000)); }

regBtn.onclick = async () => {
  regStatus.textContent = '';
  const start = normalize(startEl.value);
  const end = normalize(endEl.value);
  if (!start || !end) { regStatus.textContent='時間を選択してください'; regStatus.className='err'; return; }
  if (end <= start) { regStatus.textContent='終了は開始より後にしてください'; regStatus.className='err'; return; }
  const name = localStorage.getItem('displayName') || '';
  const body = { date: tomorrowYMD(), start, end, displayName: name };
  const res = await fetch(API_BASE + '/register', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
  if (!res.ok) { regStatus.textContent = '登録に失敗しました'; regStatus.className='err'; return; }
  const d = await res.json();
  regStatus.textContent = `${start}–${end}（${d.durationMin}分）で登録しました。`;
  regStatus.className = 'ok';
};

cancelBtn.onclick = async () => {
  regStatus.textContent = '';
  const res = await fetch(API_BASE + '/cancel', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ date: tomorrowYMD() }) });
  if (!res.ok) { regStatus.textContent = '取消に失敗しました'; regStatus.className='err'; return; }
  regStatus.textContent = '登録を取り消しました。';
  regStatus.className = 'ok';
};

showSummaryBtn.onclick = async () => {
  summaryEl.textContent = '読み込み中…';
  const date = summaryDateEl.value;
  const r = await fetch(API_BASE + '/summary?date=' + encodeURIComponent(date));
  if (!r.ok) { summaryEl.textContent = '取得に失敗しました。'; return; }
  const items = await r.json();
  if (!items || items.length === 0) { summaryEl.innerHTML = '<b>登録されていません。</b>'; return; }
  items.sort((a,b) => a.start.localeCompare(b.start) || (a.displayName||'').localeCompare(b.displayName||''));
  const overlaps = [];
  for (let i=0;i<items.length-1;i++){
    const a = items[i], b = items[i+1];
    if (a.end > b.start) overlaps.push([i, i+1]);
  }
  const ul = items.map((x,idx) => {
    const warn = overlaps.some(pair => pair.includes(idx)) ? ' <span class="warn">⚠︎重なり</span>' : '';
    return `<li>${escapeHtml(x.displayName||'（名前未設定）')} ${x.start}–${x.end}${warn}</li>`;
  }).join('');
  summaryEl.innerHTML = '<ul>'+ul+'</ul>';
};
function escapeHtml(s){return (s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
