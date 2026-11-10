// EduXPlay 3D - Game Logic, 3D Rendering & UI Engine
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* ---------- state & network ---------- */
let SRC='ai',SJ='ai',JM=20,TP='',mode='',sk=0,mv='home',NM='',ifp=false,iq=0,QS='',net=null,solo=false,isHost=false,code='',G={ph:'menu'},name='',lastR=-9,qi=0,qk='',cur=null,stun=0,hostT=0,localEnd=0,localStart=0,mp={p:0,tt:0,r:-1},bots=[],endingRound=false;
let pCols=[0,1,2,3],pNames=['','','',''],myColIdx=0;
let JJ='SD',KL='5',MP='Matematika',DF='Sedang';
const hostOnly=()=>isHost&&!solo;
try{
 QS=localStorage.getItem('lk_qs')||'';
 TP=localStorage.getItem('lk_tp')||'';
 const defaultOldTopics=['Matematika','IPA & Sains','Pancasila','Sejarah','Pengetahuan Umum','Bahasa Inggris','IPAS / Sains','IPAS'];
 if(defaultOldTopics.includes((TP||'').trim())){
  TP='';
  try{localStorage.setItem('lk_tp','')}catch(_){}
 }
 if(localStorage.getItem('lk_jj'))JJ=localStorage.getItem('lk_jj');
 if(localStorage.getItem('lk_kl'))KL=localStorage.getItem('lk_kl');
 if(localStorage.getItem('lk_mp'))MP=localStorage.getItem('lk_mp');
 if(localStorage.getItem('lk_df'))DF=localStorage.getItem('lk_df');
 const initQ=QS.split('\n').filter(l=>l.split('|').length>=3).length;
 if(initQ){JM=initQ;TRACK=calcTrackFromQuestions(initQ)}
}catch(e){}

const JENJANG_LIST=[
 ['SD','SD / Madrasah (MI)'],
 ['SMP','SMP / MTs'],
 ['SMA','SMA / SMK / MA'],
 ['UMUM','Umum / Bebas']
];

function getKelasList(jenjang){
 if(jenjang==='SD') return [
  ['1','Kelas 1 (Fase A)'],
  ['2','Kelas 2 (Fase A)'],
  ['3','Kelas 3 (Fase B)'],
  ['4','Kelas 4 (Fase B)'],
  ['5','Kelas 5 (Fase C)'],
  ['6','Kelas 6 (Fase C)'],
  ['Semua SD','Semua Kelas SD']
 ];
 if(jenjang==='SMP') return [
  ['7','Kelas 7 (Fase D)'],
  ['8','Kelas 8 (Fase D)'],
  ['9','Kelas 9 (Fase D)'],
  ['Semua SMP','Semua Kelas SMP']
 ];
 if(jenjang==='SMA') return [
  ['10','Kelas 10 (Fase E)'],
  ['11','Kelas 11 (Fase F)'],
  ['12','Kelas 12 (Fase F)'],
  ['Semua SMA','Semua Kelas SMA']
 ];
 return [['Umum','Semua Umur / Umum']];
}

const MAPEL_LIST=[
 ['Matematika','Matematika'],
 ['IPAS / Sains','IPAS / Sains (IPA)'],
 ['Bahasa Indonesia','Bahasa Indonesia'],
 ['Bahasa Inggris','Bahasa Inggris'],
 ['Pendidikan Pancasila','Pendidikan Pancasila (PPKn)'],
 ['IPS / Sejarah','IPS / Sejarah'],
 ['Pendidikan Agama','Pendidikan Agama & Budi Pekerti'],
 ['Informatika','Informatika / Komputer'],
 ['Seni Budaya','Seni Budaya'],
 ['PJOK','PJOK (Penjas)'],
 ['Pengetahuan Umum','Pengetahuan Umum']
];

const DIFFICULTY_LIST=[
 ['Mudah','Mudah (Konsep Dasar)'],
 ['Sedang','Sedang (Standar Kurikulum)'],
 ['Sulit','Sulit (HOTS / Penalaran)']
];

function onJenjangChange(val){
 JJ=val;
 const kList=getKelasList(JJ);
 KL=kList[0][0];
 const sel=$('#kl');
 if(sel){
  sel.innerHTML=kList.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
  sel.value=KL;
 }
 saveQS();
}
function peersL(){return solo?[...(ifp?[]:[{id:'me',isMe:true,pr:mp,col:mp.col}]),...bots.map(b=>({id:b.id,isMe:false,pr:b.pr,col:b.col}))]:net?net.peers().map(p=>({id:p.peer,isMe:!!(p.isMe||p.sameTab),pr:p.presence||{},col:(p.presence&&p.presence.col)||null})):[]}
const players=()=>peersL().filter(p=>!p.pr.h);
const meId=()=>peersL().find(p=>p.isMe)?.id;
const alive=()=>G.al&&G.al.includes(meId());
function pres(o){Object.assign(mp,o);if(!solo&&net)net.presence(o).catch(()=>{})}
function bc(){if(!solo&&net)net.emit('g',G).catch(()=>{});onG()}
async function enter(host,c){
 saveQS();
 const selCol=(typeof CHAR_COLORS!=='undefined'&&CHAR_COLORS[myColIdx])?CHAR_COLORS[myColIdx]:{name:'Pemain',hex:'#2f7de1',id:'biru'};
 name=($('#nm')?$('#nm').value.trim():NM).slice(0,14)||(host?'Guru (Host)':selCol.name);
 NM=name;
 isHost=!!host;
 code=String(c||'').trim().toUpperCase();
 if(!code){alert('Silakan masukkan Kode Ruang!');return}

 mp={n:name,col:host?'#ffb300':selCol.hex,colId:selCol.id||'biru',h:host?1:0,p:0,tt:0,r:-1};

 try{
  net=await RoomNet.join(code,host,mp);
 }catch(err){
  if(typeof SFX!=='undefined')SFX.wrong();
  alert(err.message||'Gagal masuk ke ruang permainan.');
  return;
 }

 solo=false;
 net.on('g',m=>{if(!isHost&&m.data){G=m.data;onG()}});

 let prevPeerCount=0;
 net.onPeers((peersList)=>{
  const studentCount=peersList.filter(p=>!p.presence||!p.presence.h).length;
  if(isHost&&G.ph==='lobby'&&studentCount>prevPeerCount){
   if(typeof SFX!=='undefined')SFX.correct();
  }
  prevPeerCount=studentCount;
  ovk='';
  ui();
 });

 const curQ=parseQ();
 G={ph:'lobby',q:curQ,sj:'ai',elim:[]};
 ovk='';
 onG();

 if(host){
  setInterval(()=>{
   if(isHost&&net&&G.ph==='lobby'){
    net.emit('g',G).catch(()=>{});
   }
  },1500);
 }
}

function createRoom(){
 if(typeof SFX!=='undefined')SFX.click();
 const c=newCode();
 enter(true,c);
}

function leaveRoom(){
 if(isHost){
  if(!confirm('Apakah Anda yakin ingin menutup ruang kelas ini? Semua siswa yang terhubung akan keluar.'))return;
 }
 if(net){
  try{net.leave();}catch(_){}
  net=null;
 }
 isHost=false;
 code='';
 solo=true;
 go('home');
}

function kickStudent(pid){
 if(!isHost||!net)return;
 const target=players().find(p=>p.id===pid);
 const targetName=target?target.pr.n:'siswa ini';
 if(confirm(`Keluarkan ${targetName} dari ruangan?`)){
  if(typeof SFX!=='undefined')SFX.click();
  net.kick(pid);
 }
}

function copyRoomCode(c){
 if(typeof SFX!=='undefined')SFX.click();
 const textToCopy=c||code;
 if(navigator.clipboard&&navigator.clipboard.writeText){
  navigator.clipboard.writeText(textToCopy).then(()=>{
   alert(`Kode Ruang "${textToCopy}" berhasil disalin ke clipboard!`);
  }).catch(()=>{
   prompt('Salin Kode Ruang berikut:',textToCopy);
  });
 }else{
  prompt('Salin Kode Ruang berikut:',textToCopy);
 }
}

function openFirebaseConfigModal(){
 if(typeof SFX!=='undefined')SFX.click();
 const existing=document.getElementById('fb-dialog');
 if(existing)existing.remove();

 const cfg=window.getFirebaseConfig?window.getFirebaseConfig():{};
 const isOnline=window.isFirebaseConfigured?window.isFirebaseConfigured():false;

 const div=document.createElement('div');
 div.id='fb-dialog';
 div.className='fb-dialog-overlay';
 div.innerHTML=`
  <div class="fb-dialog-box">
   <div class="fb-dialog-hdr">
    <h3 class="fb-dialog-title">⚙️ <span>Pengaturan Server &amp; Firebase RTDB</span></h3>
    <button type="button" class="fb-close-btn" onclick="closeFirebaseConfigModal()">✕</button>
   </div>

   <div class="fb-dialog-desc">
    Koneksi multiplayer real-time antara Guru (IFP/Laptop) dan Siswa (HP/Tablet):
   </div>

   <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
    <span class="fb-status-pill ${isOnline?'active':'fallback'}">
     ${isOnline?'🟢 Firebase Realtime DB Aktif (Multi-Device Internet)':'🔵 Mode Lokal (BroadcastChannel Multi-Tab)'}
    </span>
   </div>

   <div class="host-info-desc" style="background:#f5f2ff;border:2.5px solid #241454;border-radius:14px;padding:10px 14px;font-size:13px">
    <p><b>✨ Rekomendasi (Hosting Vercel + Firebase RTDB):</b></p>
    <p>Web di-hosting di <b>Vercel</b> (gratis &amp; cepat), dan data real-time kuis antar-perangkat menggunakan <b>Firebase Realtime Database</b> (100% gratis, support 100 siswa serentak).</p>
    <p>Jika form di bawah kosong, game otomatis memakai <b>Mode Lokal</b> (buka 2 tab di laptop yang sama untuk simulasi Guru &amp; Siswa).</p>
   </div>

   <label style="display:flex;flex-direction:column;gap:4px;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;color:#241454">
    Database URL (Wajib untuk Online):
    <input id="cfg-dburl" placeholder="https://proyek-anda-default-rtdb.asia-southeast1.firebasedatabase.app" value="${esc(cfg.databaseURL||'')}" style="font-size:13px;padding:8px 12px;border:2.5px solid #241454;border-radius:10px">
   </label>

   <div class="ifg" style="grid-template-columns:1fr 1fr;gap:10px">
    <label style="display:flex;flex-direction:column;gap:4px;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;color:#241454">
     API Key (Opsional):
     <input id="cfg-apikey" placeholder="AIzaSy..." value="${esc(cfg.apiKey||'')}" style="font-size:13px;padding:8px 12px;border:2.5px solid #241454;border-radius:10px">
    </label>
    <label style="display:flex;flex-direction:column;gap:4px;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;color:#241454">
     Project ID (Opsional):
     <input id="cfg-projid" placeholder="eduxplay-xxx" value="${esc(cfg.projectId||'')}" style="font-size:13px;padding:8px 12px;border:2.5px solid #241454;border-radius:10px">
    </label>
   </div>

   <div style="display:flex;gap:10px;margin-top:6px">
    <button type="button" class="gb g-a s" onclick="saveFirebaseModalConfig()" style="flex:1;min-height:44px;font-size:16px">
     <span>SIMPAN KONFIGURASI</span>
    </button>
    <button type="button" class="gb alt s" onclick="resetFirebaseModalConfig()" style="width:auto;min-height:44px;font-size:14px;padding:0 14px">
     <span>Reset</span>
    </button>
   </div>
  </div>
 `;
 document.body.appendChild(div);
}

function closeFirebaseConfigModal(){
 const el=document.getElementById('fb-dialog');
 if(el)el.remove();
}

function saveFirebaseModalConfig(){
 const dbUrl=($('#cfg-dburl')?.value||'').trim();
 const apiKey=($('#cfg-apikey')?.value||'').trim();
 const projid=($('#cfg-projid')?.value||'').trim();
 const cfg={databaseURL:dbUrl,apiKey:apiKey,projectId:projid};
 if(window.saveFirebaseConfig)window.saveFirebaseConfig(cfg);
 if(typeof SFX!=='undefined')SFX.correct();
 alert(dbUrl?'Konfigurasi Firebase berhasil disimpan! Game akan menggunakan Firebase Realtime Database.':'Konfigurasi dikosongkan. Game beralih ke Mode Lokal (BroadcastChannel).');
 closeFirebaseConfigModal();
 ovk='';
 ui();
}

function resetFirebaseModalConfig(){
 if(confirm('Reset konfigurasi Firebase kembali ke default (Mode Lokal)?')){
  if(window.saveFirebaseConfig)window.saveFirebaseConfig({databaseURL:'',apiKey:'',projectId:''});
  closeFirebaseConfigModal();
  ovk='';
  ui();
 }
}
function bc0(){}
let mq=0;
function updateMenuBtnText(txt){
 const b=$('#mb');
 if(b)b.innerHTML=`${gi('menu',22)}<span>${txt}</span>`;
}
function menuBtn(){
 if(Date.now()<mq){location.reload();return}
 mq=Date.now()+3000;
 updateMenuBtnText('Yakin? Ketuk lagi');
 setTimeout(()=>updateMenuBtnText('Menu'),3000);
}

/* ---------- Fullscreen & Minimize Toggle ---------- */
function isFullScreen() {
 return !!(
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.mozFullScreenElement ||
  document.msFullscreenElement
 );
}

function toggleFullScreen() {
 if (typeof SFX !== 'undefined') SFX.click();
 try {
  if (!isFullScreen()) {
   const docEl = document.documentElement;
   if (docEl.requestFullscreen) {
    docEl.requestFullscreen().catch(() => {});
   } else if (docEl.webkitRequestFullscreen) {
    docEl.webkitRequestFullscreen();
   } else if (docEl.mozRequestFullScreen) {
    docEl.mozRequestFullScreen();
   } else if (docEl.msRequestFullscreen) {
    docEl.msRequestFullscreen();
   }
  } else {
   if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
   } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
   } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
   } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
   }
  }
 } catch (e) {}
 updateFullScreenButton();
}

function updateFullScreenButton() {
 const btn = document.getElementById('fb');
 if (!btn) return;
 const fs = isFullScreen();
 const icon = fs
  ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z"/></svg>'
  : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
 btn.innerHTML = `${icon}<span>${fs ? 'Kecilkan' : 'Layar Penuh'}</span>`;
 btn.title = fs ? 'Keluar dari Layar Penuh (Perkecil)' : 'Tampilkan Layar Penuh';
 btn.className = 'gb ' + (fs ? 'g-b' : 'g-c');
}

['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(ev => {
 document.addEventListener(ev, updateFullScreenButton);
});

function setTopic(t){
 TP=t;
 if($('#tp'))$('#tp').value=t;
 try{localStorage.setItem('lk_tp',t)}catch(e){}
}

/* ---------- Pemilihan Karakter & Warna 3D (Tahap 1) ---------- */
function getCharCol(idx){
 const list=typeof CHAR_COLORS!=='undefined'?CHAR_COLORS:[
  {id:'merah',name:'Merah',hex:'#e5484d',light:'#ffe5e7'},
  {id:'biru',name:'Biru',hex:'#2f7de1',light:'#e3f0ff'},
  {id:'hijau',name:'Hijau',hex:'#2bb673',light:'#dcfce7'},
  {id:'kuning',name:'Kuning',hex:'#f5a623',light:'#fef3c7'}
 ];
 return list[((idx%list.length)+list.length)%list.length];
}

function pickCharCol(slot,colIdx){
 const list=typeof CHAR_COLORS!=='undefined'?CHAR_COLORS:[];
 const len=list.length||4;
 const nextIdx=((colIdx%len)+len)%len;
 if(slot==='me'){
  myColIdx=nextIdx;
 }else{
  pCols[slot]=nextIdx;
  if(typeof DEMO!=='undefined'&&DEMO[slot]){
   DEMO[slot].col=getCharCol(nextIdx).hex;
   const avKey='d'+slot;
   if(typeof avs!=='undefined'&&avs[avKey]){
    sc.remove(avs[avKey].g);
    sc.remove(avs[avKey].fx);
    delete avs[avKey];
   }
  }
 }
 const col=getCharCol(nextIdx);
 const card=$('#cc_'+slot);
 if(card){
  card.style.background=col.light;
  card.style.borderColor=col.hex;
 }
 const pill=$('#cp_'+slot);
 if(pill){
  pill.style.background=col.hex;
  pill.textContent='Warna '+col.name;
 }
 const img=$('#ci_'+slot);
 if(img&&typeof ICONS!=='undefined'&&ICONS['char_'+col.id]){
  img.src=ICONS['char_'+col.id];
  img.style.transform='scale(1.14)';
  setTimeout(()=>{if(img)img.style.transform='scale(1)';},160);
 }
 const lbl=$('#cl_'+slot);
 if(lbl){
  lbl.style.background=col.hex;
  lbl.textContent='Karakter '+col.name;
 }
 const sw=$('#cs_'+slot);
 if(sw){
  sw.querySelectorAll('.char-dot').forEach((d,i)=>{
   d.classList.toggle('active',i===nextIdx);
  });
 }
 const inp=slot==='me'?$('#nm'):$('#n'+slot);
 if(inp){
  inp.placeholder=`Ketik nama (${col.name})...`;
 }
}

function cycleCharCol(slot,dir){
 const curIdx=slot==='me'?myColIdx:(pCols[slot]||0);
 pickCharCol(slot,curIdx+dir);
}

function renderCharCard(slot,isSingle=false){
 const colIdx=slot==='me'?myColIdx:(pCols[slot]||0);
 const col=getCharCol(colIdx);
 const list=typeof CHAR_COLORS!=='undefined'?CHAR_COLORS:[col];
 const val=slot==='me'?NM:(pNames[slot]||'');
 const inpId=slot==='me'?'nm':'n'+slot;
 const onInp=slot==='me'?'NM=this.value':`pNames[${slot}]=this.value`;
 const titleTxt=slot==='me'?'Karakter Kamu':`Pemain ${slot+1}`;
 const charSrc=(typeof ICONS!=='undefined'&&ICONS['char_'+col.id])?ICONS['char_'+col.id]:'';
 return `<div class="char-card ${isSingle?'single':''}" id="cc_${slot}" style="background:${col.light};border-color:${col.hex}">
  <div class="char-card-top">
   <span>${titleTxt}</span>
   <span class="char-col-pill" id="cp_${slot}" style="background:${col.hex}">Warna ${col.name}</span>
  </div>
  <div class="char-stage">
   <button type="button" class="char-arrow" onclick="cycleCharCol(${slot==='me'?"'me'":slot},-1)" title="Ganti Warna Karakter">&#9664;</button>
   <div class="char-avatar-box">
    <img class="char-avatar-img" id="ci_${slot}" src="${charSrc}" alt="Karakter ${col.name}" draggable="false">
    <span class="char-model-label" id="cl_${slot}" style="background:${col.hex}">Karakter ${col.name}</span>
   </div>
   <button type="button" class="char-arrow" onclick="cycleCharCol(${slot==='me'?"'me'":slot},1)" title="Ganti Warna Karakter">&#9654;</button>
  </div>
  <div class="char-swatches" id="cs_${slot}">
   ${list.map((c,ci)=>`<button type="button" class="char-dot ${ci===colIdx?'active':''}" style="background:${c.hex}" title="Pilih Karakter ${c.name}" onclick="pickCharCol(${slot==='me'?"'me'":slot},${ci})"></button>`).join('')}
  </div>
  <input id="${inpId}" class="char-inp" placeholder="Ketik nama (${col.name})..." value="${esc(val)}" maxlength="12" oninput="${onInp}">
 </div>`;
}

function renderQuestionDeck(){
 const deck=$('#q-deck');
 if(!deck)return;
 const list=parseQ();
 if(!list.length){
  deck.innerHTML=`<div class="q-empty">Belum ada soal yang dibuat.</div>`;
  return;
 }
 const perRound=Math.max(1,Math.floor(list.length/TOTAL_ROUNDS));
 let html='';
 for(let r=0;r<TOTAL_ROUNDS;r++){
  const start=r*perRound;
  const end=r===TOTAL_ROUNDS-1?list.length:start+perRound;
  const sub=list.slice(start,end);
  html+=`<div class="q-round-hdr"><span>Babak ${r+1}: ${esc(MAPS[r].n)}</span><span>${sub.length} Soal</span></div>`;
  sub.forEach((item,idx)=>{
   const qNum=start+idx+1;
   const wrongs=item.slice(2,5).map(w=>`<span class="q-opt w">${esc(w)}</span>`).join('');
   html+=`<div class="q-item"><div class="q-item-top"><span class="q-num">#${qNum}</span><span>${esc(item[0])}</span></div><div class="q-opts"><span class="q-opt ok">${esc(item[1])}</span>${wrongs}</div></div>`;
  });
 }
 deck.innerHTML=html;
}

async function proceed(){
 saveQS();SJ='ai';
 if($('#cfd'))DUR=+$('#cfd').value;
 if($('#jm'))JM=parseInt($('#jm').value,10)||20;
 let q=parseQ();
 if(!q.length){
  const ok=await ai();
  if(!ok)return;
  q=parseQ();
  if(!q.length)return;
 }
 TRACK=calcTrackFromQuestions(q.length);
 mapI=-1;
 if(mode=='ifp')startIfp();else enter(true,newCode())
}

function cnt(){
 if($('#jm'))JM=parseInt($('#jm').value,10)||20;
 if($('#cq'))QS=$('#cq').value;
 const list=parseQ();
 const c=list.length;
 const trk=calcTrackFromQuestions(c||JM);
 if(c)TRACK=trk;
 const box=$('#cn2');
 if(box){
  if(c){
   box.className='status-box ready';
   box.innerHTML=`${gi('check',24)}<span><b>${c} Soal Siap Dimainkan!</b> (${trk} Soal per Babak)</span>`;
  }else{
   box.className='status-box';
   box.innerHTML=`${gi('ai',24)}<span>Tentukan mapel & topik di atas lalu klik <b>Buat Soal Otomatis</b></span>`;
  }
 }
 const det=$('#q-details');
 if(det)det.style.display=c?'block':'none';
 const sumEl=$('#q-sum-txt');
 if(sumEl)sumEl.innerHTML=`Lihat Daftar Soal (${c} Soal)`;
 renderQuestionDeck();
}

function go(v,m){
 saveQS();
 if($('#nm'))NM=$('#nm').value;
 [0,1,2,3].forEach(i=>{if($('#n'+i))pNames[i]=$('#n'+i).value;});
 if(m)mode=m;
 mv=v;ovk='';ui()
}
function saveQS(){
 if($('#cq'))QS=$('#cq').value;
 if($('#tp'))TP=$('#tp').value;
 if($('#jj'))JJ=$('#jj').value;
 if($('#kl'))KL=$('#kl').value;
 if($('#mp'))MP=$('#mp').value;
 if($('#df'))DF=$('#df').value;
 [0,1,2,3].forEach(i=>{if($('#n'+i))pNames[i]=$('#n'+i).value;});
 if($('#nm'))NM=$('#nm').value;
 try{
  localStorage.setItem('lk_qs',QS);
  localStorage.setItem('lk_tp',TP);
  localStorage.setItem('lk_jj',JJ);
  localStorage.setItem('lk_kl',KL);
  localStorage.setItem('lk_mp',MP);
  localStorage.setItem('lk_df',DF);
 }catch(e){}
}

async function ai(){
 const b=$('#aib'),
       jj=($('#jj')?$('#jj').value:JJ)||'SD',
       kl=($('#kl')?$('#kl').value:KL)||'5',
       mp=($('#mp')?$('#mp').value:MP)||'Matematika',
       df=($('#df')?$('#df').value:DF)||'Sedang',
       tp=($('#tp')?$('#tp').value.trim():TP),
       jm=parseInt($('#jm')?.value,10)||JM||20,
       box=$('#cn2');
 JJ=jj;KL=kl;MP=mp;DF=df;TP=tp;JM=jm;saveQS();
 if(b){b.disabled=true;b.innerHTML=`${gi('clock',28)}<span>Sedang Membuat Soal...</span>`;}
 const subjectLabel = mp + (tp ? ` - "${tp}"` : '');
 if(box){box.className='status-box';box.innerHTML=`${gi('clock',24)}<span>AI sedang menyusun ${jm} soal <b>${esc(subjectLabel)}</b> (${esc(jj)} Kelas ${esc(kl)} · ${esc(df)})...</span>`;}
 try{
  const config={
   jenjang:JJ,
   kelas:KL,
   mapel:MP,
   difficulty:DF,
   topic:TP
  };
  const questions=await generateQuestionsFromServer(config,jm,(statusMsg)=>{
   if(box)box.innerHTML=`${gi('clock',24)}<span>${esc(statusMsg)}</span>`;
  });
  const c=x=>String(x??'').replace(/[|\n\r]/g,' ').trim();
  const lines=questions.map(x=>[x.q,x.a,...x.w.slice(0,3)].map(c).join('|'));
  QS=lines.join('\n');
  if($('#cq'))$('#cq').value=QS;
  TRACK=calcTrackFromQuestions(lines.length);
  mapI=-1;
  cnt();saveQS();
  if(typeof SFX!=='undefined')SFX.correct();
  return true;
 }catch(e){
  if(typeof SFX!=='undefined')SFX.wrong();
  if(box){box.className='status-box';box.innerHTML=`${gi('cross',24)}<span style="color:var(--bad,#e5484d)">${esc(e.message)}</span>`;}
  alert(e.message);
  return false;
 }finally{
  if(b){b.disabled=false;b.innerHTML=`${gi('ai',30)}<span>BUAT SOAL OTOMATIS</span>`;}
 }
}

function startIfp(){
 saveQS();solo=true;ifp=true;isHost=true;code='MULAI';
 bots=[0,1,2,3].map(i=>{
  const col=getCharCol(pCols[i]||0);
  const typed=($('#n'+i)?$('#n'+i).value.trim():pNames[i].trim());
  return {
   id:'p'+i,
   col:col.hex,
   colId:col.id,
   st:0,
   pr:{n:typed||col.name,p:0,tt:0,r:-1,col:col.hex}
  };
 });
 const q=parseQ();
 TRACK=calcTrackFromQuestions(q.length);
 mapI=-1;
 G={ph:'lobby',q,sj:'ai',elim:[]};ovk='';onG()
}

function finishRank(id){
 const finPlayers=players().filter(p=>G.al&&G.al.includes(p.id)&&p.pr.r===G.r&&(p.pr.p||0)>=TRACK).sort((a,b)=>(a.pr.tt||1e9)-(b.pr.tt||1e9));
 const idx=finPlayers.findIndex(p=>p.id===id);
 return idx===-1?0:idx+1;
}

function ifpQ(){
 const el=$('#qp');
 if(G.ph!='play'){el.innerHTML='';$('#vl').innerHTML='';$('#rb').innerHTML='';return}
 const now=Date.now();
 const rk=G.al.map(id=>bots.find(x=>x.id==id)).filter(Boolean).sort((x,y)=>y.pr.p-x.pr.p||(x.pr.tt||1e9)-(y.pr.tt||1e9)),any=rk[0]&&rk[0].pr.p>0;
 const rb=$('#rb');
 if(rb.children.length!=G.al.length)rb.innerHTML=G.al.map(id=>{const b=bots.find(x=>x.id==id);return `<i class=rd id=rd_${id} style="background:${b.col}">${esc(b.pr.n[0]||'?')}</i>`}).join('');
 G.al.forEach(id=>{const b=bots.find(x=>x.id==id),e=$('#rd_'+id);if(b&&e){e.style.left=(5+90*b.pr.p/TRACK)+'%';e.className='rd'+(any&&rk[0]===b?' ld':'')}});
 el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(${G.al.length},minmax(0,1fr));gap:8px;width:100%">`+G.al.map((id,k)=>{
  const b=bots.find(x=>x.id==id),fin=b.pr.p>=TRACK,lock=now<b.st;
  if(!fin)b.cur=getQ(G.r,b.qi||0,k);
  const fRank=fin?finishRank(id):0;
  const fireBadge=(b.sk||0)%3==2&&!fin?gi('fire',20):'';
  return `<div class="card ic" style="border:6px solid ${b.col};padding:8px;text-align:center"><b><span>${esc(b.pr.n)} \u00b7 ${b.pr.p}/${TRACK}</span>${fireBadge}</b>${fin?`<h2 style="display:flex;align-items:center;justify-content:center;gap:6px">${gi('flag',26)}<span>LOLOS #${fRank}</span></h2><div style="font-size:14px;opacity:.85">${((b.pr.tt||0)/1000).toFixed(1)} dtk</div>`:`<div class=iq>${esc(b.cur.q)}</div><div class=o>${b.cur.o.map((t,i)=>`<button ${lock?'disabled':''} onclick="ifpA('${id}',${i})" class=ib>${esc(t)}</button>`).join('')}</div>`}</div>`
 }).join('')+'</div>'
}

function fit(){document.querySelectorAll('.iq,.ib').forEach(e=>{e.style.fontSize='';let f=parseFloat(getComputedStyle(e).fontSize),k=0;while(k++<10&&f>10&&(e.scrollHeight>e.clientHeight+1||e.scrollWidth>e.clientWidth+1)){f*=.92;e.style.fontSize=f+'px'}})}
let ftq=0;const ftr=()=>{cancelAnimationFrame(ftq);ftq=requestAnimationFrame(fit)};new MutationObserver(ftr).observe($('#qp'),{childList:true,subtree:true});addEventListener('resize',ftr);if(document.fonts)document.fonts.ready.then(ftr);

function ifpA(id,i){
 const b=bots.find(x=>x.id==id);
 if(!b||Date.now()<b.st||G.ph!='play'||!b.cur||b.pr.p>=TRACK)return;
 if(b.cur.o[i]==b.cur.a){
  b.sk=(b.sk||0)+1;
  const isTurbo=b.sk%3==0;
  b.pr.p=Math.min(TRACK,b.pr.p+(isTurbo?2:1));
  b.pr.tt=Date.now()-hostT;
  b.qi=(b.qi||0)+1;
  if(typeof SFX!=='undefined'){
   if(b.pr.p>=TRACK)SFX.qualify();
   else if(isTurbo)SFX.turbo();
   else SFX.correct();
  }
  hud();
  checkInstantEnd();
 }else{
  if(typeof SFX!=='undefined')SFX.wrong();
  const m=MAPS[G.r];b.sk=0;b.pr.w=(b.pr.w||0)+1;b.st=Date.now()+m.lk;
  if(m.back&&b.pr.p>0){b.pr.p--;b.pr.tt=Date.now()-hostT}
  setTimeout(ifpQ,m.lk+50)
 }
 ifpQ()
}

function newCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:5},()=>a[Math.floor(Math.random()*a.length)]).join('')}

/* ---------- Stumble Guys Elimination & Host Logic ---------- */
function keepFor(r,n){
 if(r===3)return 1;
 if(n<=2)return 2;
 if(n<=4)return n-1;
 const ratios=[0.75,0.65,0.5];
 const target=Math.ceil(n*ratios[r]);
 const minNext=Math.max(2,4-r);
 return Math.min(n-1,Math.max(minNext,target));
}

function stopFor(r,n,kp){
 if(r===3)return 1;
 if(kp<n)return kp;
 return Math.max(1,n-1);
}

function parseQ(){return QS.split('\n').map(l=>l.split('|').map(s=>s.trim())).filter(a=>a.length>=3&&a[0]&&a[1])}

function startRound(r){
 const pl=players();
 const al=r==0?pl.map(p=>p.id):G.sv;
 if(!al.length)return;
 endingRound=false;
 const kp=keepFor(r,al.length);
 const stopAt=stopFor(r,al.length,kp);
 G={ph:'play',r,al,kp,stopAt,q:G.q,sj:'ai',elim:r==0?[]:(G.elim||[]),cfg:{t:TRACK,d:DUR},left:DUR*1000};
 hostT=Date.now();
 if(typeof SFX!=='undefined'){
  SFX.roundStart();
  SFX.startBgm('race');
 }
 bc();
}

function startGame(){
 const q=parseQ();
 if(!q.length){alert('Belum ada soal. Silakan kembali dan buat soal terlebih dahulu.');return}
 TRACK=calcTrackFromQuestions(q.length);
 mapI=-1;
 G.q=q;G.sj='ai';G.elim=[];
 if(!players().length){alert('Belum ada pemain yang bergabung.');return}
 startRound(0)
}

function endRound(){
 if(endingRound||G.ph!='play')return;
 endingRound=true;
 const ps=peersL();
 const Lr=G.al.map(id=>{
  const p=ps.find(x=>x.id==id);
  const ok=p&&p.pr.r===G.r;
  const steps=ok?(p.pr.p||0):0;
  const timeMs=ok&&p.pr.tt?p.pr.tt:1e9;
  return{id,n:p?.pr.n||'?',p:steps,t:timeMs}
 }).sort((a,b)=>b.p-a.p||a.t-b.t);

 G.res=Lr.map(x=>[x.n,Math.max(0,x.p),x.t>=1e9?0:x.t]);
 G.sv=Lr.slice(0,G.kp).map(x=>x.id);
 G.out=Lr.slice(G.kp).map(x=>x.n);
 if(G.out.length){
  G.elim=[...G.out,...(G.elim||[])];
 }
 const podiumNames=[...Lr.map(x=>x.n),...(G.elim||[])];
 const uniquePodium=[];
 for(const nm of podiumNames){if(nm&&!uniquePodium.includes(nm))uniquePodium.push(nm)}
 G.top=uniquePodium.slice(0,3);
 G.ph=G.r==3?'end':'between';
 if(typeof SFX!=='undefined'){
  SFX.startBgm('menu');
  if(G.ph==='end')SFX.win();
  else SFX.qualify();
 }
 bc();
}

function checkInstantEnd(){
 if(!isHost||G.ph!='play'||endingRound)return;
 const pl=players().filter(p=>G.al.includes(p.id)&&p.pr.r===G.r);
 const fin=pl.filter(p=>(p.pr.p||0)>=TRACK).length;
 const targetStop=G.stopAt||G.kp;
 if(fin>=targetStop||(pl.length&&fin==pl.length)){
  setTimeout(()=>endRound(),350);
 }
}

function hostTick(){
 if(!isHost||G.ph!='play'||endingRound)return;
 G.left=Math.max(0,DUR*1000-(Date.now()-hostT));
 localEnd=Date.now()+G.left;
 const pl=players().filter(p=>G.al.includes(p.id)&&p.pr.r===G.r);
 const fin=pl.filter(p=>(p.pr.p||0)>=TRACK).length;
 const targetStop=G.stopAt||G.kp;
 if(G.left<=0||fin>=targetStop||(pl.length&&fin==pl.length))endRound();
}
setInterval(hostTick,250);
const next=()=>startRound(G.r+1);
const again=()=>{G={ph:'lobby',q:G.q,sj:'ai',elim:[]};lastR=-9;bc()};

/* ---------- client UI ---------- */
function onG(){if(G.cfg&&(G.cfg.t!==TRACK||G.cfg.d!==DUR)){TRACK=G.cfg.t;DUR=G.cfg.d;mapI=-1}if(G.ph=='play'&&G.r!==lastR){lastR=G.r;qi=0;qk='';sk=0;if(ifp){iq=0;bots.forEach(b=>{b.pr.r=G.r;b.pr.p=0;b.pr.tt=0;b.st=0;b.qi=0})}pres({p:0,tt:0,r:G.r});localStart=Date.now()}
 if(G.ph=='play'&&!isHost)localEnd=Date.now()+G.left;if(G.ph=='lobby')lastR=-9;ui()}
let ovk='';
function ui(){
 if(typeof SFX!=='undefined')SFX.updateMuteButton();
 updateFullScreenButton();
 updateMenuBtnText('Menu');
 const ps=players(),k=mv+G.ph+G.r+(G.al||[]).length+ps.length+(G.sv||[]).length;
 if(k!==ovk){ovk=k;ov(ps)}
 showQ();hud()
}
function ov(ps){
 const o=$('#ov'),old=$('#cq')?$('#cq').value:'';let h='';
 const selCol=(typeof CHAR_COLORS!=='undefined'&&CHAR_COLORS[myColIdx])?CHAR_COLORS[myColIdx]:{name:'Pemain',hex:'#2f7de1',id:'biru'};
 const nm=ps.map(p=>{
  const dot=p.col?`<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${p.col};border:2px solid #241454"></span>`:'';
  return `<i>${dot}<span>${esc(p.pr.n)}</span></i>`;
 }).join('');
 if(G.ph=='menu'){
  const bk=`<button class=bk onclick="go('home')"><span>KEMBALI KE MENU</span></button>`;
  const op=(a,c)=>a.map(([v,t])=>`<option value="${v}" ${v==c?'selected':''}>${t}</option>`).join('');
  h=mv=='setup'?`<div class=mn><div class="bd bd-land">
   <h2><span>MULAI MAIN (4 PEMAIN)</span></h2>

   <div class="setup-grid">
    <!-- GRID 1: 4 PEMAIN -->
    <div class="ed-card">
     <div class="ed-title"><span class="step-badge">1</span><span>Tahap 1: Pilih Karakter 4 Pemain</span></div>
     <div class="char-grid">
      ${[0,1,2,3].map(i=>renderCharCard(i,false)).join('')}
     </div>
    </div>

    <!-- GRID 2: BUAT SOAL & PENGATURAN GAME -->
    <div class="ed-card">
     <div class="ed-title"><span class="step-badge">2</span><span>Tahap 2: Buat Soal &amp; Pengaturan Game</span></div>

     <div class="setup-form-grid">
      <!-- Baris 1: Jenjang & Kelas -->
      <div class="ifg">
       <label>Jenjang Pendidikan
        <select id="jj" onchange="onJenjangChange(this.value)">
         ${op(JENJANG_LIST,JJ)}
        </select>
       </label>
       <label>Kelas
        <select id="kl" onchange="KL=this.value;saveQS()">
         ${op(getKelasList(JJ),KL)}
        </select>
       </label>
      </div>

      <!-- Baris 2: Mata Pelajaran & Tingkat Kesulitan -->
      <div class="ifg">
       <label>Mata Pelajaran (Mapel)
        <select id="mp" onchange="MP=this.value;saveQS()">
         ${op(MAPEL_LIST,MP)}
        </select>
       </label>
       <label>Tingkat Kesulitan
        <select id="df" onchange="DF=this.value;saveQS()">
         ${op(DIFFICULTY_LIST,DF)}
        </select>
       </label>
      </div>

      <!-- Baris 3: Topik Materi Spesifik -->
      <label>Topik / Bab Materi Spesifik
       <input id="tp" placeholder="Ketik topik materi (mis: Pecahan, Tata Surya, Proklamasi)..." value="${esc(TP)}" oninput="TP=this.value;saveQS()">
       <span class="setup-field-hint">Ketik topik materi yang ingin dibuat. Jika dikosongkan, AI otomatis membuat soal umum sesuai mata pelajaran & kelas.</span>
      </label>

      <!-- Baris 4: Jumlah Soal & Waktu per Babak -->
      <div class="ifg">
       <label>Jumlah Soal &amp; Lintasan
        <select id="jm" onchange="cnt()">${op([
         [12,'12 Soal (3 Soal / Babak)'],
         [20,'20 Soal (5 Soal / Babak)'],
         [32,'32 Soal (8 Soal / Babak)'],
         [48,'48 Soal (12 Soal / Babak)']
        ],JM)}</select>
       </label>
       <label>Waktu per Babak
        <select id="cfd">${op([
         [45,'45 Detik'],
         [70,'70 Detik'],
         [90,'90 Detik'],
         [120,'120 Detik']
        ],DUR)}</select>
       </label>
      </div>
     </div>

     <button id="aib" class="gb g-d s" onclick="ai()">${gi('ai',32)}<span>BUAT SOAL OTOMATIS</span></button>
     <div id="cn2" class="status-box"></div>
     <details id="q-details" style="display:none;margin:0">
      <summary id="q-sum-txt" style="font-size:16px;font-weight:900;cursor:pointer;color:#7c3aed;font-family:'Nunito',sans-serif">Lihat Daftar Soal</summary>
      <div id="q-deck" class="q-deck" style="margin-top:8px"></div>
     </details>
     <textarea id="cq" style="display:none"></textarea>
     <button class="gb g-b s" style="margin-top:auto" onclick="proceed()"><span>MULAI MAIN SEKARANG</span></button>
    </div>
   </div>
  </div>${bk}</div>`
  :mv=='join'?`<div class=mn><div class="bd" style="max-width:480px">
   <h2><span>GABUNG RUANG KELAS</span></h2>
   <div class="ed-title" style="margin-bottom:6px"><span class="step-badge">1</span><span>Pilih Karakter &amp; Warna Kamu</span></div>
   ${renderCharCard('me',true)}
   <div class="ed-title" style="margin:10px 0 6px"><span class="step-badge">2</span><span>Masukkan Kode Ruang</span></div>
   <label>Kode Ruang Permainan<input id=jc class=cd placeholder="KODE" maxlength=5 autocomplete="off" autocorrect="off" autocapitalize="characters" style="text-transform:uppercase"></label>
   <button class="gb g-c s" style="margin-top:10px" onclick="enter(false,$('#jc').value.trim().toUpperCase())"><span>MASUK KE RUANG</span></button>
   <button class=bk onclick="go('home')" style="margin-top:6px"><span>KEMBALI KE MENU</span></button>
  </div></div>`
  :`<div class=mn><div class=logo><span>EDUX</span><span class=l2>PLAY</span><b>3D</b></div><div class=tag>Jawab cepat, lompati rintangan, jadilah juara!</div>
   <button class="gb g-a" onclick="go('setup','ifp')"><span>MULAI</span></button>
   <button class="gb g-b" onclick="createRoom()"><span>BUAT RUANG</span></button>
   <button class="gb g-c" onclick="go('join')"><span>GABUNG RUANG</span></button></div>`
 }
 else if(G.ph=='lobby'){
  const firstQuota=keepFor(0,ps.length);
  const isFull=ps.length>=30;
  const op=(a,c)=>a.map(([v,t])=>`<option value="${v}" ${v==c?'selected':''}>${t}</option>`).join('');
  const isFirebase=window.isFirebaseConfigured&&window.isFirebaseConfigured();

  if(isHost){
   // TAMPILAN RUANG TUNGGU GURU / HOST ALA QUIZIZZ
   h=`<div class=mn><div class="bd bd-land">
    <h2><span>RUANG KELAS · GURU</span></h2>

    <!-- Top Info Bar: Kode & Panduan Siswa -->
    <div class="lobby-host-header">
     <div class="lobby-code-group">
      <div class="lobby-code-badge">
       <small>KODE RUANG</small>
       <b>${esc(code)}</b>
      </div>
      <button type="button" class="copy-pill-btn" onclick="copyRoomCode('${esc(code)}')">
       📋 Salin Kode
      </button>
     </div>
     <div class="lobby-instructions">
      📱 Minta siswa buka web di HP &gt; pilih <b>GABUNG RUANG</b> &gt; masukkan kode <b>${esc(code)}</b>
     </div>
     <span class="lobby-status-tag ${isFirebase?'online':'local'}">
      ${isFirebase?'🟢 Firebase RTDB Online':'🔵 Mode Lokal'}
     </span>
    </div>

    <!-- Body: 2 Kolom -->
    <div class="lobby-split-grid">
     <!-- Kolom Kiri: Roster Siswa Bergabung -->
     <div class="student-roster-pane">
      <div class="student-roster-hdr">
       <span style="display:inline-flex;align-items:center;gap:8px">${gi('users',22)} Siswa Bergabung</span>
       <span class="student-count-pill">${ps.length} / 30 Siswa</span>
      </div>

      <div class="student-list-container">
       ${ps.length===0?`
        <div class="lobby-empty-radar">
         <div class="radar-circle">
          ${gi('users',34)}
         </div>
         <div class="empty-txt-bold">Menunggu Siswa Bergabung...</div>
         <div class="empty-txt-sub">Siswa di kelas membuka browser di HP masing-masing, memilih <b>GABUNG RUANG</b>, dan mengetikkan kode <b>${esc(code)}</b>.</div>
        </div>
       `:`
        <div class="student-grid">
         ${ps.map(p=>{
          const col=p.col||'#2f7de1';
          const initial=(p.pr.n||'?')[0].toUpperCase();
          return `
           <div class="student-card" style="border-color:${col}">
            <span class="student-avatar-dot" style="background:${col}">${initial}</span>
            <span class="student-name" title="${esc(p.pr.n)}">${esc(p.pr.n)}</span>
            <button type="button" class="kick-btn" onclick="kickStudent('${p.id}')" title="Keluarkan Siswa">✕</button>
           </div>
          `;
         }).join('')}
        </div>
       `}
      </div>

      <div style="font-family:'Nunito',sans-serif;font-size:12.5px;color:#4a3672;font-weight:700;display:flex;justify-content:space-between;align-items:center;padding:0 4px">
       <span>Babak 1: <b>${firstQuota}/${Math.max(1,ps.length)} Tercepat Lolos</b></span>
       <span>Maksimal 30 Siswa</span>
      </div>
     </div>

     <!-- Kolom Kanan: Buat Soal & Pengaturan Game -->
     <div class="ed-card">
      <div class="ed-title"><span class="step-badge">2</span><span>Pengaturan Soal &amp; AI Generator</span></div>
      <div class="setup-form-grid">
       <!-- Baris 1: Jenjang & Kelas -->
       <div class="ifg">
        <label>Jenjang Pendidikan
         <select id="jj" onchange="onJenjangChange(this.value)">
          ${op(JENJANG_LIST,JJ)}
         </select>
        </label>
        <label>Kelas
         <select id="kl" onchange="KL=this.value;saveQS()">
          ${op(getKelasList(JJ),KL)}
         </select>
        </label>
       </div>

       <!-- Baris 2: Mapel & Tingkat Kesulitan -->
       <div class="ifg">
        <label>Mata Pelajaran (Mapel)
         <select id="mp" onchange="MP=this.value;saveQS()">
          ${op(MAPEL_LIST,MP)}
         </select>
        </label>
        <label>Tingkat Kesulitan
         <select id="df" onchange="DF=this.value;saveQS()">
          ${op(DIFFICULTY_LIST,DF)}
         </select>
        </label>
       </div>

       <!-- Baris 3: Topik -->
       <label>Topik / Bab Materi Spesifik
        <input id="tp" placeholder="Ketik topik materi (mis: Pecahan, Tata Surya)..." value="${esc(TP)}" oninput="TP=this.value;saveQS()">
       </label>

       <!-- Baris 4: Jumlah Soal & Waktu -->
       <div class="ifg">
        <label>Jumlah Soal &amp; Lintasan
         <select id="jm" onchange="cnt()">${op([
          [12,'12 Soal (3 Soal / Babak)'],
          [20,'20 Soal (5 Soal / Babak)'],
          [32,'32 Soal (8 Soal / Babak)'],
          [48,'48 Soal (12 Soal / Babak)']
         ],JM)}</select>
        </label>
        <label>Waktu per Babak
         <select id="cfd">${op([
          [45,'45 Detik'],
          [70,'70 Detik'],
          [90,'90 Detik'],
          [120,'120 Detik']
         ],DUR)}</select>
        </label>
       </div>
      </div>

      <button id="aib" class="gb g-d s" onclick="ai()">${gi('ai',28)}<span>BUAT SOAL OTOMATIS</span></button>
      <div id="cn2" class="status-box"></div>
      <details id="q-details" style="display:none;margin:0">
       <summary id="q-sum-txt" style="font-size:15px;font-weight:900;cursor:pointer;color:#7c3aed;font-family:'Nunito',sans-serif">Lihat Daftar Soal</summary>
       <div id="q-deck" class="q-deck" style="margin-top:8px"></div>
      </details>
      <textarea id="cq" style="display:none"></textarea>
     </div>
    </div>

    <!-- Bottom Actions -->
    <div style="display:flex;gap:12px;width:100%;align-items:center;margin-top:auto">
     <button class="gb g-a s" style="flex:1" onclick="startGame()">
      ${gi('play',28)}<span>MULAI PERMAINAN SEKARANG</span>
     </button>
     <button class="gb alt s" style="width:auto;min-height:50px;padding:0 22px" onclick="leaveRoom()">
      <span>Tutup Ruang</span>
     </button>
    </div>
   </div></div>`;
  } else if(!ifp){
   // TAMPILAN RUANG TUNGGU SISWA DI HP
   h=`<div class=mn><div class="bd" style="max-width:520px;text-align:center">
    <h2><span>RUANG TUNGGU SISWA</span></h2>
    <div class="student-badge-tag">Kode Ruang: <b>${esc(code)}</b></div>

    <div class="student-hero-banner" style="border-color:${mp.col}">
     <img src="${(typeof ICONS!=='undefined'&&ICONS['char_'+(mp.colId||'biru')])?ICONS['char_'+(mp.colId||'biru')]:''}" alt="Karakter Kamu">
     <div class="student-hero-col">
      <span class="student-hero-name">Halo, ${esc(mp.n)}!</span>
      <span class="student-hero-pill" style="background:${mp.col}">Karakter ${esc(selCol.name)}</span>
     </div>
    </div>

    <div class="student-wait-alert">
     ${gi('clock',24)}
     <div>
      <b>Menunggu Guru Memulai Permainan...</b><br>
      Kuis balapan 3D akan segera dimulai secara serentak di layar kelas!
     </div>
    </div>

    <div class="classmates-block">
     <div class="classmates-label">${gi('users',18)} Teman Sekelas (${ps.length} Siswa):</div>
     <div class="pl" style="max-height:120px;overflow-y:auto;justify-content:center">${nm||'Menunggu teman lain...'}</div>
    </div>

    <button class="gb alt s" onclick="leaveRoom()" style="margin-top:6px"><span>Keluar dari Ruang</span></button>
   </div></div>`;
  } else {
   // MODE IFP 4 PEMAIN LOKAL
   h=`<div class=mn><div class="bd" style="max-width:580px;text-align:center">
    <h2><span>SIAP BERLOMBA</span></h2>
    <div style="font-family:'Nunito',sans-serif;font-weight:800;font-size:16px;display:flex;gap:12px;justify-content:center">
     <span>${gi('clock',20)} ${DUR} dtk/babak</span>
     <span>${gi('flag',20)} ${TRACK} langkah/babak</span>
    </div>
    <div class="pl" style="justify-content:center">${nm}</div>
    <button class="gb g-a s" onclick="startGame()">${gi('play',28)}<span>MULAI BABAK 1</span></button>
    <button class="bk" onclick="go('home')"><span>KEMBALI KE MENU</span></button>
   </div></div>`;
  }
 }
 else if(G.ph=='between'){
  const nextR=Math.min(G.r+1,3);
  const nextQuota=keepFor(nextR,(G.sv||[]).length);
  h=`<div class=card>
   <h2 class="modal-ribbon">${gi('flag',28)}<span>BABAK ${G.r+1} SELESAI</span></h2>
   <div style="font-family:'Nunito',sans-serif;font-weight:800">Selanjutnya: <b>Babak ${G.r+2} (${MAPS[nextR].n})</b> · ${nextR===3?`<b>GRAND FINAL: 1 Tercepat Juara!</b>`:`Kuota Lolos: <b>${nextQuota} Tercepat</b>`}</div>
   <div class=rs>${(G.res||[]).map((x,i)=>{
    const qualified=i<G.kp;
    return `<div class="${qualified?'ok':'no'}"><b>#${i+1}</b><span>${esc(x[0])}</span><i>${x[1]>=TRACK?gi('flag',18)+' '+(x[2]/1000).toFixed(1)+' dtk':x[1]+'/'+TRACK+' langkah'}</i><u>${qualified?gi('check',18)+' LOLOS':gi('cross',18)+' GUGUR'}</u></div>`
   }).join('')}</div>
   ${isHost?`<button class="gb g-b s" onclick="next()">${gi('play',26)}<span>LANJUT BABAK ${G.r+2}: ${MAPS[nextR].n}</span></button>`:'<div>Menunggu babak berikutnya…</div>'}
  </div>`;
 }
 else if(G.ph=='end'){
  const T=G.top||[],c=['#ffd54f','#cfd8dc','#ffab76'],ht=[165,130,105],ord=[1,0,2],medals=['medal1','medal2','medal3'];
  h=`<div class=card>
   <h2 class="modal-ribbon">${gi('crown',30)}<span>JUARA EDUXPLAY</span></h2>
   <div class=pd>${ord.filter(i=>T[i]).map(i=>`<div style="background:${c[i]};height:${ht[i]}px">${gi(medals[i],48)}<span>#${i+1} ${esc(T[i])}</span></div>`).join('')}</div>
   <div class=rs style="width:100%">${(G.res||[]).map((x,i)=>`<div class="${i===0?'ok':'no'}"><b>#${i+1}</b><span>${esc(x[0])}</span><i>${x[1]>=TRACK?gi('flag',18)+' '+(x[2]/1000).toFixed(1)+' dtk':x[1]+'/'+TRACK+' langkah'}</i><u>${i===0?gi('crown',20)+' JUARA 1':'Finalis'}</u></div>`).join('')}</div>
   ${isHost?`<button class="gb g-a s" onclick="again()">${gi('play',26)}<span>MAIN LAGI</span></button>`:''}
  </div>`;
 }
 o.innerHTML=h;
 if($('#cq'))$('#cq').value=old||QS;
 if($('#cn2'))cnt();
}

function showQ(){
 const el=$('#qp');if(ifp){ifpQ();return}
 if(G.ph!='play'||hostOnly()||!alive()){el.innerHTML=G.ph=='play'&&!hostOnly()&&!alive()?`<div class=card>${gi('cross',24)} <b>Kamu sudah gugur · Menonton babak ini</b></div>`:'';qk='';return}
 if(mp.p>=TRACK){
  const fRank=finishRank(meId());
  el.innerHTML=`<div class=card><h2>${gi('flag',28)} LOLOS! (Tercepat #${fRank||1})</h2><div>Menunggu kuota babak terpenuhi…</div></div>`;
  qk='';return
 }
 const k=G.r+'-'+qi;if(k==qk)return;qk=k;cur=getQ(G.r,qi,0);
 el.innerHTML=`<div class=card id=qc><div class=q>${esc(cur.q)}</div><div class=o>${cur.o.map((t,i)=>`<button onclick="ans(${i},this)">${esc(t)}</button>`).join('')}</div></div>`
}

function ans(i,b){
 if(Date.now()<stun||!cur||mp.p>=TRACK)return;
 if(cur.o[i]==cur.a){
  b.className='ok';qi++;sk++;
  const isTurbo=sk%3==0;
  const nextP=Math.min(TRACK,mp.p+(isTurbo?2:1));
  pres({p:nextP,tt:Date.now()-localStart});
  if(typeof SFX!=='undefined'){
   if(nextP>=TRACK)SFX.qualify();
   else if(isTurbo)SFX.turbo();
   else SFX.correct();
  }
  hud();
  checkInstantEnd();
  setTimeout(showQ,250)
 }else{
  if(typeof SFX!=='undefined')SFX.wrong();
  b.className='bad';sk=0;const m=MAPS[G.r];stun=Date.now()+m.lk;
  pres({w:(mp.w||0)+1,p:m.back&&mp.p>0?mp.p-1:mp.p,tt:Date.now()-localStart});
  const bs=document.querySelectorAll('#qc button');bs.forEach(x=>x.disabled=true);$('#qc').classList.add('shake');
  setTimeout(()=>{bs.forEach(x=>{x.disabled=false;x.className=''});$('#qc')&&$('#qc').classList.remove('shake')},m.lk)
 }
}

function hud(){
 $('#rl').textContent=G.ph=='play'?MAPS[G.r].rule:'';
 document.body.classList.toggle('ifp',!!ifp&&G.ph=='play');
 const r=G.ph=='play'||G.ph=='between'||G.ph=='end'?G.r:0;
 let h='';
 if(G.ph!='menu'){
  const l=G.ph=='play'?Math.max(0,Math.ceil((localEnd-Date.now())/1000)):0;
  const pl=players().filter(p=>G.al&&G.al.includes(p.id)&&p.pr.r===r);
  const fin=pl.filter(p=>(p.pr.p||0)>=TRACK).length;
  const quota=G.stopAt||G.kp||1;
  const quotaLabel=r===3?`${gi('crown',20)}<b>Final: ${fin}/1</b>`:`${gi('flag',20)}<b>Lolos: ${fin}/${quota}</b>`;
  h=`<span>${MAPS[r].n} · Babak ${r+1}/4</span>${G.ph=='play'?`<span style="background:#1fa855">${quotaLabel}</span><span>${gi('clock',20)} ${l} dtk</span>`:''}<span>${gi('users',20)} ${(G.al&&G.ph!='lobby'?G.al:players()).length}/30 Siswa</span>`
 }
 if($('#hud').dataset.h!==h){$('#hud').innerHTML=h;$('#hud').dataset.h=h}
}
setInterval(()=>{if(G.ph=='play')hud();if(G.ph=='lobby'||!isHost)ui()},500);

/* ---------- 3D ---------- */
const cv=$('#cv'),rd=new THREE.WebGLRenderer({canvas:cv,antialias:true});rd.setPixelRatio(Math.min(devicePixelRatio,2));
const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(55,1,.1,200);
sc.add(new THREE.AmbientLight(0xffffff,.75));const dl=new THREE.DirectionalLight(0xffffff,.8);dl.position.set(8,20,10);sc.add(dl);
function size(){rd.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}addEventListener('resize',size);size();
const M=(c)=>new THREE.MeshLambertMaterial({color:c});
let mapG=null,mapI=-1,spin=[],pul=[],bob=[];
function setMap(k){if(k===mapI)return;mapI=k;if(mapG)sc.remove(mapG);const m=MAPS[k];mapG=new THREE.Group();spin=[];pul=[];bob=[];
 sc.background=new THREE.Color(m.sky);sc.fog=new THREE.Fog(m.sky,30,95);
 const g=new THREE.Mesh(new THREE.BoxGeometry(W+10,1,L+60),M(m.gr));g.position.set(0,-.5,-L/2-10);mapG.add(g);
 const fl=new THREE.Mesh(new THREE.BoxGeometry(W,.05,2),M(0xffffff));fl.position.set(0,.03,-L-1);mapG.add(fl);
 for(let i=0;i<W;i+=2){const s=new THREE.Mesh(new THREE.BoxGeometry(1,.06,1),M(0x111111));s.position.set(-W/2+i+(i/2%2),.07,-L-1.5+(i/2%2));mapG.add(s)}
 [-W/2,W/2].forEach(x=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,6),M(0xe53935));p.position.set(x,3,-L-1);mapG.add(p)});
 const bm=new THREE.Mesh(new THREE.BoxGeometry(W,1.2,.4),M(0xe53935));bm.position.set(0,6,-L-1);mapG.add(bm);
 for(let i=0;i<TRACK;i++){const z=-(i+.5)*L/TRACK,t=m.t,o=new THREE.Group();o.position.z=z;
  if(t==0){const b=new THREE.Mesh(AS.hurdle||new THREE.BoxGeometry(W,.6,.4),M(m.c));b.position.y=AS.hurdle?0:.5;o.add(b)}
  if(t==1){const b=new THREE.Mesh(new THREE.BoxGeometry(W*.5,1,.6),M(m.c));b.position.y=.5;o.add(b);spin.push(b)}
  if(t==2)for(let x=-W/2+1;x<W/2;x+=1.6){const c=new THREE.Mesh(new THREE.ConeGeometry(.5,1.2,6),M(m.c));c.position.set(x,.6,0);o.add(c)}
  if(t==3){[-W/2,W/2].forEach(x=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,2.4),M(m.c));p.position.set(x,1.2,0);o.add(p)});const b=new THREE.Mesh(new THREE.BoxGeometry(W,.5,.4),M(0xff4081));b.position.y=1;o.add(b);bob.push(b)}
  if(t==2)pul.push(o);mapG.add(o)}
 for(let i=0;i<24;i++){const s=i%2?1:-1,z=-Math.random()*(L+30),d=new THREE.Group();d.position.set(s*(W/2+1+Math.random()*3),0,z);
  const tr=new THREE.Mesh(AS.trunk||new THREE.CylinderGeometry(.25,.3,1.5),M(0x795548));tr.position.y=AS.trunk?0:.75;const lf=new THREE.Mesh(AS.leaves||new THREE.ConeGeometry(1.2,2.8,8),M(m.c));lf.position.y=AS.leaves?0:2.6;d.add(tr,lf);mapG.add(d)}
 sc.add(mapG)}
const avs={};function laneX(i,n,z){cam.updateMatrixWorld();const o=cam.position,p=new THREE.Vector3(0,0,z).project(cam),d=new THREE.Vector3(((i+.5)/n)*2-1,p.y,.5).unproject(cam).sub(o);if(!(d.y<-.001)||!isFinite(p.y))return (i-(n-1)/2)*4;return o.x+d.x*(-o.y/d.y)}
function ifCam(tz){const h=9,d=15,th=Math.atan(h/d)-.08;cam.position.set(0,h,tz+d);cam.lookAt(0,0,tz+d-h/Math.tan(th))}
function setOp(a,o){a.g.traverse(c=>{if(c.material&&c!==a.sp){c.material.transparent=o<1;c.material.opacity=o}})}const DEMO=['Bimo','Sasa','Kiko','Lala','Tono'].map((n,i)=>({id:'d'+i,pr:{n,p:0,r:-1},col:['#e5484d','#2f7de1','#2bb673','#f5a623','#b05cff'][i]}));
function hash(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h}
function mkAv(id,n,c){const g=new THREE.Group(),col=c?new THREE.Color(c):new THREE.Color().setHSL(hash(id)%360/360,.75,.55),m=M(col);
 const body=new THREE.Mesh(AS.torso||new THREE.CylinderGeometry(.35,.42,.8,12),m);body.position.y=AS.torso?.65:1.05;
 const head=new THREE.Mesh(AS.head||new THREE.SphereGeometry(.36,16,12),M(0xffe0bd));head.position.y=AS.head?1.34:1.7;
 const cap=new THREE.Mesh(AS.cap||new THREE.SphereGeometry(.38,16,8,0,6.3,0,1.2),m);cap.position.y=AS.cap?1.78:1.74;
 [-.14,.14].forEach(x=>{const e=new THREE.Mesh(AS.eye||new THREE.SphereGeometry(.05),M(0x111111));e.position.set(x,AS.eye?1.665:1.72,-.33);g.add(e)});
 const legs=[-.18,.18].map(x=>{const p=new THREE.Group();p.position.set(x,.65,0);const l=new THREE.Mesh(AS.leg||new THREE.BoxGeometry(.22,.65,.25),M(0x37474f));l.position.y=AS.leg?-.65:-.3;p.add(l);g.add(p);return p});
 const arms=[-.52,.52].map(x=>{const p=new THREE.Group();p.position.set(x,1.35,0);const l=new THREE.Mesh(AS.arm||new THREE.BoxGeometry(.16,.55,.16),m);l.position.y=AS.arm?-.55:-.25;p.add(l);g.add(p);return p});
 const cn=document.createElement('canvas');cn.width=256;cn.height=64;const x=cn.getContext('2d');x.font='bold 34px sans-serif';x.textAlign='center';x.fillStyle='#0009';x.fillRect(0,8,256,48);x.fillStyle='#fff';x.fillText(n,128,45);
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cn)}));sp.scale.set(2.4,.6,1);sp.position.y=2.6;const hm=new THREE.Group(),hh=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1.6),M(0x8d6e63)),hd=new THREE.Mesh(new THREE.BoxGeometry(1.1,.6,.6),M(0xff4081));hh.position.y=.9;if(AS.hammer){hh.geometry=AS.hammer;hh.material=M(0xff4081);hh.position.y=-.3;hm.add(hh)}else hm.add(hh,hd);hm.visible=false;g.add(hm);
 const cr=new THREE.Mesh(new THREE.ConeGeometry(.32,.4,5),M(0xffd54f)),rg=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,.06,28),new THREE.MeshBasicMaterial({color:col}));cr.position.y=2.35;cr.visible=false;rg.position.y=.04;rg.visible=false;g.add(cr,rg);
 const rk=new THREE.Group(),fl=new THREE.Mesh(new THREE.ConeGeometry(.3,.9,8),new THREE.MeshBasicMaterial({color:0xff9100}));fl.rotation.x=Math.PI;fl.position.y=-.6;
 if(AS.rocket){const rm=new THREE.Mesh(AS.rocket,M(0xdde3e8));rm.position.y=-.35;rk.add(rm)}else [-.2,.2].forEach(x=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.7,10),M(0xeceff1)),n=new THREE.Mesh(new THREE.ConeGeometry(.14,.3,10),M(0xe53935));c.position.x=x;n.position.set(x,.5,0);rk.add(c,n)});rk.add(fl);rk.position.set(0,1.15,.5);rk.visible=false;g.add(rk);
 const bd=new THREE.Mesh(new THREE.BoxGeometry(1,.1,1.9),M(0x29b6f6));bd.position.y=.05;bd.visible=false;g.add(bd);
 const fx=new THREE.Group(),tr=new THREE.Mesh(AS.tramp||new THREE.CylinderGeometry(.85,.85,.3,20),M(0xff4081)),l1=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,2.6,12),M(0x8d6e63)),l2=new THREE.Mesh(new THREE.SphereGeometry(1.1,16,12),M(0xffffff)),gg=new THREE.CylinderGeometry(.5,.8,3,10);gg.translate(0,1.5,0);const l3=new THREE.Mesh(gg,new THREE.MeshBasicMaterial({color:0xff6d00}));
 tr.position.y=AS.tramp?0:.15;l1.rotation.x=Math.PI/2;l1.position.y=1;l2.position.y=1.1;[tr,l1,l2,l3].forEach(o=>{o.visible=false;fx.add(o)});sc.add(fx);
 g.add(body,head,cap,sp);sc.add(g);
 return{g,fx,rk,fl,bd,tr,l1,l2,l3,sp,cr,rg,bm:m,hm,legs,arms,z:0,x:0,lp:0,jt:1,sc:1}}
let tm=performance.now(),ifd=19;
function frame(now){const dt=Math.min(.05,(now-tm)/1000);tm=now;
 setMap(G.ph=='play'||G.ph=='between'||G.ph=='end'?G.r||0:0);
 const ps=peersL(),want=G.ph=='menu'?DEMO:G.ph=='lobby'?players():(G.al||[]).map(id=>ps.find(p=>p.id==id)).filter(Boolean),n=Math.max(want.length,1),sp=ifp&&G.ph=='play'?Math.min(12.5,.9*2*ifd*.577*innerWidth/innerHeight/n):Math.min(2.2,(W-4)/n);
 const ids=new Set(want.map(p=>p.id));for(const id in avs)if(!ids.has(id)){sc.remove(avs[id].g);sc.remove(avs[id].fx);delete avs[id]}
 let lead=0,tail=-1e3,ldId=null;if(G.ph=='play'){let bp=0,bt=0;want.forEach(p=>{const q=p.pr.r===G.r?p.pr.p||0:0,t=p.pr.tt||0;if(q>bp||(q==bp&&q>0&&t<bt)){bp=q;bt=t;ldId=p.id}})}
 want.forEach((p,i)=>{const a=avs[p.id]||(avs[p.id]=mkAv(p.id,p.pr.n||'?',p.col||p.pr?.col));a.sp.visible=true;a.sp.scale.set(2.4,.6,1);a.cr.visible=p.id===ldId&&G.ph=='play';a.cr.rotation.y=now/300;const inR=p.pr.r===G.r&&G.ph!='lobby',pr=inR?Math.min(p.pr.p||0,TRACK):0;
  if(pr>a.lp){a.jt=0}a.lp=pr;if((p.pr.w||0)!==a.lw){if(a.lw!==undefined)a.tp=1;a.lw=p.pr.w||0}a.tp=Math.max(0,(a.tp||0)-dt*.8);const tz=-(pr/TRACK)*L,tx=ifp&&G.ph=='play'?laneX(i,n,0):(i-(n-1)/2)*sp,mv=Math.abs(tz-a.z)>.05;
  const hold=a.tp>0&&G.ph=='play'&&1-a.tp<[.4,.4,.3,.35][MAPS[Math.min(G.r||0,3)].mv];if(!hold)a.z+=(tz-a.z)*(1-Math.exp(-dt*7));a.x+=(tx-a.x)*(1-Math.exp(-dt*9));a.jt=Math.min(1,a.jt+dt*1.6);
  const out=G.ph=='between'&&G.sv&&!G.sv.includes(p.id);a.sc+=((out?.01:1)-a.sc)*Math.min(1,dt*3);
  const dm=G.ph=='menu',k=a.jt,sj=Math.sin(k*Math.PI),mk=MAPS[Math.min(G.r||0,3)].mv,pl=G.ph=='play',jm=pl&&k<1,tt=1-(a.tp||0),ef=a.tp>0&&pl,u=Math.max(0,tt-.5);
  if(dm)a.z=-((now/330+i*9)%40);
  let y=dm?Math.abs(Math.sin(now/170+i))*.6:0,rx=0,ry=0,rz=0,sy=1,kx=0,sq=1;
  if(jm){if(mk==0){y=sj*1.9;rx=-sj*.3}if(mk==1){y=sj*.3;rx=-.9*sj;sy=1-.35*sj}if(mk==2){y=sj*6.5;rx=-.7*sj}if(mk==3){y=sj*4.5;rz=k*6.283;sy=1+.15*sj}}
  a.rk.visible=jm&&mk==2;a.bd.visible=jm&&mk==1;a.fl.scale.set(1,.6+.8*Math.abs(Math.sin(now/45)),1);
  const f=a.fx;f.position.set(a.x,0,a.z);a.l1.visible=a.l2.visible=a.l3.visible=a.hm.visible=false;a.tr.visible=jm&&mk==3;if(a.tr.visible)a.tr.scale.y=.5+.5*Math.min(1,k*4);
  const E3=t=>t*t*(3-2*t),EO=t=>1-Math.pow(1-t,3),EI=t=>t*t*t;
  if(ef){const th=[.4,.4,.3,.35][mk],u=Math.max(0,Math.min(1,(tt-th)/(1-th))),pre=Math.min(1,tt/th),sn=Math.sin(Math.PI*u);
   if(mk==0){a.l1.visible=tt<.85;a.l1.position.x=tt<th?-6+6*(.5*pre+.5*pre*pre):7*EO(u);if(tt>=th){kx=2.8*sn;y=1.5*sn;rz=-6.283*EO(u)}else rx=.18*pre}
   if(mk==1){a.l2.visible=tt<.9;a.l2.position.z=tt<th?-9+9*(.3*pre+.7*EI(pre)):9*EO(u);a.l2.rotation.x=-tt*16;if(tt>=th){rx=-1.5*sn;y=.4*sn;sy=1-.2*Math.sin(Math.PI*Math.min(1,u*2))}}
   if(mk==2){a.l3.visible=tt<.8;a.l3.scale.set(1+.15*Math.sin(now/35),Math.max(.01,tt<.5?E3(Math.min(1,tt/.25)):1-E3(Math.min(1,(tt-.5)/.3))),1+.15*Math.cos(now/35));if(tt<th)kx=Math.sin(now/25)*.08*pre;else{y=6*sn;rz=-6.283*EO(u)}}
   if(mk==3){a.hm.visible=tt<.85;a.hm.position.y=tt<th?4.6-2.1*EI(pre):2.5+2.1*E3(Math.min(1,u*1.4));if(tt>=th)sq=1-.45*Math.exp(-u*5)*Math.cos(u*9)}}
  a.bm.emissive.setHex(ef&&mk==2&&tt>.25&&tt<.8?0xff2200:0);
  if(out)rz=.6*(1-a.sc);a.g.position.set(a.x+kx,y,a.z);a.g.scale.set(a.sc*(1+(1-sq)*.8),a.sc*sy*sq,a.sc*(1+(1-sq)*.8));a.g.rotation.set(rx,ry,rz);
  const w=now/110,sw=mv||dm?Math.sin(w)*.9:0;a.legs[0].rotation.x=sw;a.legs[1].rotation.x=-sw;a.arms[0].rotation.x=-sw;a.arms[1].rotation.x=sw;
  if(G.ph=='end'&&G.top&&p.pr.n==G.top[0])a.g.position.y=Math.abs(Math.sin(now/200))*.8;
  lead=Math.min(lead,a.z);tail=Math.max(tail,a.z)});
 spin.forEach((b,i)=>b.position.x=Math.sin(now/800+i*1.7)*W*.22);pul.forEach((o,i)=>o.scale.y=.7+.3*Math.abs(Math.sin(now/500+i)));bob.forEach((b,i)=>b.position.y=1+.5*Math.sin(now/400+i));
 if(G.ph=='menu')lead=tail=-14;
 if(tail<-900)tail=lead;
 const wd=n*(ifp&&G.ph=='play'?2.2:sp),sprd=Math.min(30,tail-lead),mid=(lead+tail)/2;

 const myId=meId();
 const myAv=(!isHost&&!ifp&&myId)?avs[myId]:null;

 if(myAv&&G.ph=='play'){
  // Sudut pandang kamera pemain di HP masing-masing 1 per 1 (3rd-person follow camera mengikuti karakter sendiri)
  const camX=myAv.x;
  const camY=Math.max(3.6,3.8+(myAv.g.position.y||0)*.35);
  const camZ=myAv.z+7.4;
  cam.position.set(camX,camY,camZ);
  cam.lookAt(camX,1.2,myAv.z-14);
 }else if(!isHost&&!ifp&&G.ph=='play'&&ldId&&avs[ldId]){
  // Pemain yang gugur dapat menonton pemimpin lomba
  const leadAv=avs[ldId];
  cam.position.set(leadAv.x,4.2,leadAv.z+8.5);
  cam.lookAt(leadAv.x,1.2,leadAv.z-14);
 }else if(ifp&&G.ph=='play'){
  // Mode 4 pemain lokal di layar IFP
  ifCam(0);
 }else{
  // Siaran overview untuk Host / Guru di layar IFP / Proyektor atau Menu/Lobby
  const ch=6+wd*.28+sprd*.45;
  cam.position.set(0,ch,mid+11+wd*.12+sprd*.4);
  cam.lookAt(0,0,mid-7);
 }
 cam.aspect=innerWidth/innerHeight;
 cam.fov=(!isHost&&!ifp&&G.ph=='play')?(innerWidth<innerHeight?62:55):55;
 cam.updateProjectionMatrix();
 rd.setViewport(0,0,innerWidth,innerHeight);
 rd.render(sc,cam);requestAnimationFrame(frame)}
loadAssets().then(()=>{
 if(typeof init3DIcons==='function'){
  init3DIcons();
  ovk='';
  ui();
 }
 requestAnimationFrame(frame);
});
ui();
