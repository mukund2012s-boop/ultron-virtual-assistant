// ULTRON UI is intentionally independent from Firebase loading so the reactor/login screen always works.
let audioCtx=null, hum=null, firebase=null, signedIn=false;
let currentConversationId=null;
let memoryCache=[];

// STEP 4 — Voice command + per-response speech
let recognition = null;
let isListening = false;
let speechToken = 0;
let activeUtterance = null;
let activeSpeakButton = null;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const $=id=>document.getElementById(id);
function tone(f,d,type='sine',gain=.04,delay=0){setTimeout(()=>{try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),v=audioCtx.createGain();o.type=type;o.frequency.value=f;v.gain.setValueAtTime(gain,audioCtx.currentTime);v.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+d);o.connect(v).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d)}catch(e){}},delay)}
function powerSound(){tone(70,.8,'sawtooth',.06);tone(180,.65,'triangle',.05,160);tone(360,.5,'sine',.045,320);tone(720,.35,'sine',.035,500);setTimeout(()=>{try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();hum=audioCtx.createOscillator();const v=audioCtx.createGain();hum.type='sine';hum.frequency.value=58;v.gain.value=.016;hum.connect(v).connect(audioCtx.destination);hum.start()}catch(e){}},850)}
function stopHum(){try{if(hum){hum.stop();hum.disconnect();hum=null}}catch(e){}}
function powerOff(){document.body.classList.remove('powered');$('reactorStatus').textContent='ARC REACTOR OFFLINE';$('reactorStatus').classList.remove('powered-status');$('topStatus').textContent='SYSTEM STANDBY';$('instruction').classList.remove('hidden');$('loginPanel').classList.add('hidden');$('resetPanel').classList.add('hidden');stopHum();$('loginMsg').textContent='SYSTEM READY';$('loginMsg').style.color='';}
function clickReactor(){
  if(document.body.classList.contains('powered')){
    if(signedIn)return;
    powerOff();
    return;
  }
  document.body.classList.add('powered');
  $('reactorStatus').textContent='ARC REACTOR ONLINE';
  $('reactorStatus').classList.add('powered-status');
  $('topStatus').textContent='SYSTEM ONLINE';
  $('instruction').classList.add('hidden');
  $('loginPanel').classList.remove('hidden');
  $('loginMsg').textContent='SYSTEM READY — ENTER YOUR CREDENTIALS';
  powerSound();
  setTimeout(()=>$('loginId').focus(),80);
}
$('reactorButton').addEventListener('click',clickReactor);
$('toggleLogin').addEventListener('click',()=>{$('loginPassword').type=$('loginPassword').type==='password'?'text':'password'});
$('createBtn').addEventListener('click',()=>{$('modal').classList.remove('hidden');setTimeout(()=>$('newUsername').focus(),50)});
$('closeModal').addEventListener('click',()=>$('modal').classList.add('hidden'));
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))$('modal').classList.add('hidden')});

const firebaseConfig={apiKey:'AIzaSyB5BLek6F3aSL8L1gaBfbFaPyLXcrgLtbM',authDomain:'ultron-9ef8a.firebaseapp.com',projectId:'ultron-9ef8a',storageBucket:'ultron-9ef8a.firebasestorage.app',messagingSenderId:'575544343952',appId:'1:575544343952:web:587529cc094e59442f4715',measurementId:'G-JYQCCM3L8F'};
async function loadFirebase(){try{const appMod=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');const authMod=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');const fsMod=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');const app=appMod.initializeApp(firebaseConfig);const auth=authMod.getAuth(app);const db=fsMod.getFirestore(app);firebase={...authMod,...fsMod,auth,db};}catch(e){console.warn('Firebase could not load:',e)}}
loadFirebase();
async function resolveLogin(value){value=value.trim();if(!firebase)throw new Error('Firebase is still loading. Try again in a moment.');if(value.includes('@'))return value;const s=await firebase.getDoc(firebase.doc(firebase.db,'usernames',value.toLowerCase()));if(!s.exists())throw new Error('Username not found.');return s.data().email}
function requireLegalConsent(){
  const box=$('legalConsent');
  if(!box || !box.checked){
    $('loginMsg').textContent='PLEASE AGREE TO THE PRIVACY POLICY AND TERMS OF SERVICE.';
    $('loginMsg').style.color='#ffcc80';
    return false;
  }
  return true;
}
$('loginBtn').addEventListener('click',async()=>{if(!requireLegalConsent())return;const m=$('loginMsg');m.textContent='AUTHENTICATING...';try{const email=await resolveLogin($('loginId').value);await firebase.signInWithEmailAndPassword(firebase.auth,email,$('loginPassword').value);signedIn=true;m.textContent='ACCESS GRANTED';m.style.color='#72f5ff';showDashboard($('loginId').value.trim())}catch(e){m.textContent=e.message||'Login failed.';m.style.color='#ff9b9b'}});
$('googleBtn').addEventListener('click',async()=>{if(!requireLegalConsent())return;const m=$('loginMsg');m.textContent='CONNECTING TO GOOGLE...';m.style.color='';try{if(!firebase)throw new Error('Firebase is still loading. Try again in a moment.');const provider=new firebase.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await firebase.signInWithPopup(firebase.auth,provider);signedIn=true;m.textContent='GOOGLE ACCESS GRANTED';m.style.color='#72f5ff';$('topStatus').textContent='IDENTITY VERIFIED';showDashboard(firebase.auth.currentUser?.displayName || firebase.auth.currentUser?.email || 'OPERATOR');}catch(e){m.textContent=e.code==='auth/popup-closed-by-user'?'Google sign-in cancelled.':(e.message||'Google sign-in failed.');m.style.color='#ff9b9b'}});
$('forgotBtn').addEventListener('click',()=>{
  $('loginPanel').classList.add('hidden');
  $('resetPanel').classList.remove('hidden');
  $('resetMsg').textContent='';
  $('resetMsg').style.color='';
  $('resetResendBtn').classList.add('hidden');
  setTimeout(()=>$('resetEmail').focus(),80);
});
$('resetBackBtn').addEventListener('click',()=>{
  $('resetPanel').classList.add('hidden');
  $('loginPanel').classList.remove('hidden');
  $('loginMsg').textContent='SYSTEM READY';
  $('loginMsg').style.color='';
  setTimeout(()=>$('loginId').focus(),80);
});
async function sendResetEmail(){
  const m=$('resetMsg');
  const email=$('resetEmail').value.trim();
  m.style.color='';
  if(!email){m.textContent='ENTER YOUR EMAIL ADDRESS.';m.style.color='#ff9b9b';return;}
  if(!firebase){m.textContent='Firebase is still loading. Try again in a moment.';m.style.color='#ff9b9b';return;}
  m.textContent='SENDING RESET EMAIL...';
  try{
    await firebase.sendPasswordResetEmail(firebase.auth,email);
    m.textContent='RESET EMAIL SENT — CHECK YOUR EMAIL.';
    m.style.color='#72f5ff';
    $('resetResendBtn').classList.remove('hidden');
  }catch(e){
    const code=e.code||'';
    if(code==='auth/invalid-email') m.textContent='PLEASE ENTER A VALID EMAIL ADDRESS.';
    else if(code==='auth/user-not-found') m.textContent='NO ULTRON ACCOUNT WAS FOUND FOR THIS EMAIL.';
    else m.textContent=e.message||'COULD NOT SEND RESET EMAIL.';
    m.style.color='#ff9b9b';
  }
}
$('resetBtn').addEventListener('click',sendResetEmail);
$('resetResendBtn').addEventListener('click',sendResetEmail);
$('resetEmail').addEventListener('keydown',e=>{if(e.key==='Enter')sendResetEmail()});
$('registerBtn').addEventListener('click',async()=>{const m=$('registerMsg');m.style.color='';m.textContent='STARTING ACCOUNT CREATION...';console.log('[ULTRON REGISTER] button clicked');try{if(!$('registerConsent').checked){m.textContent='PLEASE AGREE TO THE PRIVACY POLICY AND TERMS OF SERVICE.';m.style.color='#ffcc80';return;}const u=$('newUsername').value.trim().toLowerCase(),email=$('newEmail').value.trim(),p=$('newPassword').value,c=$('confirmPassword').value;if(!u||!email||!p){m.textContent='FILL ALL FIELDS.';return}if(p!==c){m.textContent='PASSWORDS DO NOT MATCH.';return}if(!firebase)throw new Error('FIREBASE IS STILL LOADING. WAIT A MOMENT AND TRY AGAIN.');m.textContent='CHECKING USERNAME...';const existing=await firebase.getDoc(firebase.doc(firebase.db,'usernames',u));if(existing.exists()){m.textContent='USERNAME ALREADY TAKEN.';return}m.textContent='CREATING FIREBASE ACCOUNT...';console.log('[ULTRON REGISTER] creating auth account');const cred=await firebase.createUserWithEmailAndPassword(firebase.auth,email,p);const authEmail=cred.user.email||email;console.log('[ULTRON REGISTER] auth created',cred.user.uid);m.textContent='SAVING ULTRON ID...';await firebase.setDoc(firebase.doc(firebase.db,'usernames',u),{username:u,email:authEmail,uid:cred.user.uid});console.log('[ULTRON REGISTER] username saved');await firebase.setDoc(firebase.doc(firebase.db,'users',cred.user.uid),{uid:cred.user.uid,email:authEmail,username:u},{merge:true});console.log('[ULTRON REGISTER] profile saved');await firebase.signOut(firebase.auth);m.textContent='ACCOUNT CREATED — RETURNING TO LOGIN...';m.style.color='#72f5ff';setTimeout(()=>{ $('modal').classList.add('hidden'); $('loginPanel').classList.remove('hidden'); $('instruction').classList.add('hidden'); $('loginId').value=authEmail; $('loginPassword').value=''; $('loginMsg').textContent='ACCOUNT CREATED — YOU CAN NOW SIGN IN.'; $('loginMsg').style.color='#72f5ff'; $('loginId').focus(); },700)}catch(e){console.error('[ULTRON REGISTER ERROR]',e);m.textContent=(e.code?e.code.toUpperCase()+' — ':'')+(e.message||'COULD NOT CREATE ACCOUNT.');m.style.color='#ff9b9b'}});


// ---------- ULTRON ANIMATION + DATA CONTROLS ----------
function showThinkingAnimation(){
  $('thinkingAnimation')?.classList.remove('hidden');
  const video=$('thinkingAnimation')?.querySelector('video');
  try{if(video){video.currentTime=0;video.play();}}catch(e){}
}
function hideThinkingAnimation(){$('thinkingAnimation')?.classList.add('hidden');}
function playInitAnimation(){const overlay=$('ultronInitOverlay');if(!overlay)return;try{overlay.querySelector('video')?.play();}catch(e){}setTimeout(()=>overlay.classList.add('is-hidden'),3000);}
window.addEventListener('load',playInitAnimation);

function resetDeleteButton(button){
  button.classList.remove('deleting','lid-open','loading','deleted','text-falling');
  button.disabled=false;
  button.querySelector('.delete-text-wrapper')?.classList.remove('falling');
  const lid=button.querySelector('.delete-trash-lid');if(lid){lid.style.transform='';}
}
async function runDeleteAnimation(button, action, label, summary){
  if(button.disabled)return;
  const confirmed=window.confirm(`DELETE ${label}?\n\n${summary}\n\nThis action cannot be undone. Continue?`);
  if(!confirmed)return;
  button.disabled=true;button.classList.add('deleting','lid-open');
  const status=$('dataActionStatus');if(status){status.style.color='';status.textContent=`DELETING ${label}...`;}
  await new Promise(r=>setTimeout(r,650));
  button.classList.remove('lid-open');button.classList.add('loading');
  try{
    await action();
    button.classList.remove('loading','deleting');button.classList.add('deleted');
    if(status)status.textContent=`${label} DELETED.`;
    setTimeout(()=>resetDeleteButton(button),1800);
  }catch(e){
    resetDeleteButton(button);
    if(status){status.style.color='#ff9b9b';status.textContent=e.message||`COULD NOT DELETE ${label}.`;setTimeout(()=>{status.style.color='';},2500);}
  }
}

async function loadProfileOverview(){
  const box=$('profileDataList');if(!box)return;
  const user=firebase?.auth?.currentUser;if(!user){box.innerHTML='<div class="data-info-row"><span>STATUS</span><strong>NOT SIGNED IN</strong></div>';return;}
  try{const snap=await firebase.getDoc(firebase.doc(firebase.db,'users',user.uid));const d=snap.exists()?snap.data()||{}:{};const rows=[['USERNAME',d.username||'Not stored'],['EMAIL',d.email||user.email||'Not stored'],['DISPLAY NAME',d.displayName||d.name||user.displayName||'Not stored'],['PROFILE RECORD',snap.exists()?'Firestore /users':'No profile record']];box.innerHTML=rows.map(([k,v])=>`<div class="data-info-row"><span>${k}</span><strong title="${String(v).replace(/"/g,'&quot;')}">${String(v)}</strong></div>`).join('');}catch(e){box.innerHTML='<div class="data-info-row"><span>STATUS</span><strong>COULD NOT LOAD</strong></div>';}
}

async function initDataDeletion(){
  document.querySelectorAll('.purple-delete-action').forEach(button=>{
    button.addEventListener('click',async()=>{
      const type=button.dataset.deleteType;
      if(type==='profile'){
        const user=firebase?.auth?.currentUser;const summary=$('profileDataList')?.innerText||'Your stored ULTRON profile information.';
        await runDeleteAnimation(button,async()=>{
          if(!user)throw new Error('No signed-in operator.');
          // Keep Firebase Authentication intact so the operator is not unexpectedly signed out.
          const ref=firebase.doc(firebase.db,'users',user.uid);
          await firebase.setDoc(ref,{uid:user.uid,email:null,username:null,displayName:null,name:null,updatedAt:firebase.serverTimestamp()},{merge:true});
          await loadProfileOverview();
        },'PERSONAL INFORMATION',summary);
      }else if(type==='attachments'){
        const count=$('attachmentDataCount')?.textContent||'0';const preview=$('attachmentDataPreview')?.textContent||'No local attachment files uploaded.';
        await runDeleteAnimation(button,deleteAllAttachments,'ALL ATTACHMENTS',`${count} local file(s) are currently stored. ${preview}`);
      }
      await loadAttachments();
    });
  });
}
initDataDeletion();

async function askUltron(message,history=[],memories=[]){
  const user=firebase?.auth?.currentUser?.displayName||firebase?.auth?.currentUser?.email||'Operator';
  const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,user,history,memories})});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'ULTRON backend is unavailable.');return data.reply||'I received your command, but no response was returned.';
}
function stopCurrentSpeech(){try{window.speechSynthesis.cancel();}catch(e){}}
function addChatMessage(role,text){const box=$('chatMessages');if(!box)return null;const wrap=document.createElement('div');wrap.className='chat-msg '+role;const tag=document.createElement('div');tag.className='chat-tag';tag.textContent=role==='user'?'YOU':'ULTRON';const bubble=document.createElement('div');bubble.className='chat-bubble';bubble.textContent=text;if(role==='ultron'){const actions=document.createElement('div');actions.className='chat-actions';const b=document.createElement('button');b.type='button';b.className='response-speak-btn';b.textContent='🔊';b.title='Play response';b.addEventListener('click',()=>speakResponse(text,b));actions.appendChild(b);wrap.append(tag,bubble,actions);}else wrap.append(tag,bubble);box.appendChild(wrap);box.scrollTop=box.scrollHeight;return wrap;}
function getVisibleChatForModel(){return [...document.querySelectorAll('#chatMessages .chat-msg')].map(m=>({role:m.classList.contains('user')?'user':'model',text:m.querySelector('.chat-bubble')?.textContent?.trim()||''})).filter(x=>x.text).slice(-14);}
function getMemoryForModel(){return memoryCache.map(m=>({category:'Important Event',content:m.content||''})).filter(m=>m.content).slice(-30);}
async function loadMemories(){if(!firebase?.auth?.currentUser)return;const uid=firebase.auth.currentUser.uid;const q=firebase.query(firebase.collection(firebase.db,'users',uid,'memories'),firebase.orderBy('updatedAt','desc'));const snap=await firebase.getDocs(q);memoryCache=snap.docs.map(d=>({id:d.id,...d.data()}));renderMemoryList();}
function renderMemoryList(){const box=$('memoryList'),badge=$('memoryCountBadge');if(!box)return;box.innerHTML='';if(badge)badge.textContent=`${memoryCache.length} EVENT${memoryCache.length===1?'':'S'}`;if(!memoryCache.length){box.innerHTML='<div class="empty-state">No important events saved yet.</div>';return;}memoryCache.forEach(m=>{const item=document.createElement('div');item.className='memory-item';const top=document.createElement('div');top.className='memory-item-top';const cat=document.createElement('div');cat.className='memory-category';cat.textContent='IMPORTANT EVENT';const actions=document.createElement('div');actions.className='memory-actions';const edit=document.createElement('button');edit.type='button';edit.textContent='EDIT';edit.onclick=()=>editMemory(m);const del=document.createElement('button');del.type='button';del.textContent='DELETE';del.className='danger';del.onclick=()=>deleteMemory(m.id);actions.append(edit,del);top.append(cat,actions);const content=document.createElement('div');content.className='memory-content';content.textContent=m.content||'';item.append(top,content);box.appendChild(item);});}
async function saveMemory(){const input=$('memoryInput'),status=$('memoryStatus'),content=input?.value.trim();if(!content)return;if(!firebase?.auth?.currentUser){if(status)status.textContent='SIGN IN TO SAVE EVENT.';return;}try{const uid=firebase.auth.currentUser.uid;await firebase.addDoc(firebase.collection(firebase.db,'users',uid,'memories'),{content,category:'Important Event',createdAt:firebase.serverTimestamp(),updatedAt:firebase.serverTimestamp()});input.value='';await loadMemories();if(status)status.textContent='IMPORTANT EVENT SAVED.';setTimeout(()=>{if(status)status.textContent='';},1800);}catch(e){if(status)status.textContent=e.message||'COULD NOT SAVE EVENT.';}}
async function editMemory(memory){const next=prompt('Edit this important event:',memory.content||'');if(next===null)return;const content=next.trim();if(!content)return;try{await firebase.setDoc(firebase.doc(firebase.db,'users',firebase.auth.currentUser.uid,'memories',memory.id),{content,category:'Important Event',updatedAt:firebase.serverTimestamp()},{merge:true});await loadMemories();}catch(e){alert(e.message||'Could not update event.');}}
async function deleteMemory(id){if(!confirm('Delete this important event?'))return;try{await firebase.deleteDoc(firebase.doc(firebase.db,'users',firebase.auth.currentUser.uid,'memories',id));await loadMemories();}catch(e){alert(e.message||'Could not delete event.');}}

// ---------- LOCAL ATTACHMENT VAULT (IndexedDB — no Firebase Storage / Blaze required) ----------
const ATTACH_DB='ultron-local-attachments';
const ATTACH_STORE='files';
function openAttachmentDB(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(ATTACH_DB,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(ATTACH_STORE))request.result.createObjectStore(ATTACH_STORE,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Could not open local attachment storage.'));
  });
}
async function attachmentTx(mode,work){
  const db=await openAttachmentDB();
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(ATTACH_STORE,mode),store=tx.objectStore(ATTACH_STORE);
      let result;
      try{result=work(store);}catch(e){reject(e);return;}
      tx.oncomplete=()=>resolve(result);
      tx.onerror=()=>reject(tx.error||new Error('Attachment storage operation failed.'));
    });
  }finally{db.close();}
}
async function getLocalAttachments(){
  const db=await openAttachmentDB();
  try{return await new Promise((resolve,reject)=>{const req=db.transaction(ATTACH_STORE,'readonly').objectStore(ATTACH_STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);});}
  finally{db.close();}
}
async function loadAttachments(){
  const list=$('attachmentList');if(!list)return;
  try{
    const files=await getLocalAttachments();
    list.innerHTML='';
    const count=files.length;
    $('attachmentVaultCount').textContent=`${count} FILE${count===1?'':'S'}`;
    $('attachmentDataCount').textContent=String(count);
    if(!count){list.innerHTML='<div class="empty-state">No local attachments uploaded yet.</div>';$('attachmentDataPreview').textContent='No local attachment files uploaded.';return;}
    const total=files.reduce((n,f)=>n+(f.size||0),0);
    files.forEach(item=>{
      const row=document.createElement('div');row.className='attachment-row';
      const name=document.createElement('span');name.textContent=`${item.name} · ${formatBytes(item.size)}`;
      const actions=document.createElement('div');actions.className='attachment-actions';
      const open=document.createElement('button');open.type='button';open.textContent='OPEN';open.onclick=()=>{const url=URL.createObjectURL(item.blob);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);};
      const del=document.createElement('button');del.type='button';del.textContent='DELETE';del.className='danger';del.onclick=async()=>{if(!confirm(`Delete ${item.name}?`))return;try{await attachmentTx('readwrite',store=>store.delete(item.id));await loadAttachments();}catch(e){alert(e.message||'Could not delete file.');}};
      actions.append(open,del);row.append(name,actions);list.appendChild(row);
    });
    $('attachmentDataPreview').textContent=`${count} local file(s) · ${formatBytes(total)}. Files stay in this browser on this device.`;
  }catch(e){list.innerHTML=`<div class="empty-state">Local attachment storage unavailable: ${e.message||'browser storage error.'}</div>`;}
}
function formatBytes(bytes){if(!bytes)return '0 B';const units=['B','KB','MB','GB'];const i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),units.length-1);return `${(bytes/Math.pow(1024,i)).toFixed(i?1:0)} ${units[i]}`;}
async function uploadAttachments(){
  const input=$('attachmentInput'),status=$('attachmentStatus'),files=[...(input?.files||[])];if(!files.length)return;
  const button=$('uploadAttachmentBtn');button.disabled=true;if(status)status.textContent=`SAVING ${files.length} FILE${files.length===1?'':'S'} LOCALLY...`;
  try{
    for(const file of files){
      if(file.size>25*1024*1024)throw new Error(`${file.name} is larger than 25 MB.`);
      const id=crypto.randomUUID();
      await attachmentTx('readwrite',store=>store.put({id,name:file.name,size:file.size,type:file.type||'application/octet-stream',blob:file,createdAt:Date.now()}));
    }
    input.value='';if(status)status.textContent='LOCAL UPLOAD COMPLETE.';await loadAttachments();setTimeout(()=>{if(status)status.textContent='';},1800);
  }catch(e){if(status)status.textContent=e.message||'UPLOAD FAILED.';}finally{button.disabled=false;}
}
async function deleteAllAttachments(){
  await attachmentTx('readwrite',store=>store.clear());
  await loadAttachments();
}
$('saveMemoryBtn')?.addEventListener('click',saveMemory);$('memoryInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')saveMemory();});$('uploadAttachmentBtn')?.addEventListener('click',uploadAttachments);
async function initMemoryAndAttachments(){if(!firebase?.auth?.currentUser)return;try{await Promise.all([loadMemories(),loadAttachments()]);}catch(e){console.warn('Memory/attachment load failed:',e);}}



async function initMemoryAndAttachments(){if(!firebase?.auth?.currentUser)return;try{await Promise.all([loadMemories(),loadAttachments()]);}catch(e){console.warn('Memory/attachment load failed:',e);}}

async function sendChat(){
  const input=$('chatInput'),btn=$('sendChatBtn'),status=$('aiStatus');if(!input||!btn||!status)return;const message=input.value.trim();if(!message)return;stopCurrentSpeech();
  const memMatch=message.match(/^remember(?:\s+(?:event|important event))?\s*:\s*(.+)$/i);
  if(memMatch){$('memoryInput').value=memMatch[1].trim();await saveMemory();addChatMessage('user',message);addChatMessage('ultron','Important event saved to memory.');input.value='';return;}
  addChatMessage('user',message);input.value='';btn.disabled=true;status.classList.add('busy');status.classList.remove('error');status.innerHTML='<span></span> THINKING...';showThinkingAnimation();
  try{const reply=await askUltron(message,getVisibleChatForModel().slice(0,-1),getMemoryForModel());addChatMessage('ultron',reply);status.classList.remove('busy');status.innerHTML='<span></span> BRAIN READY';}
  catch(e){addChatMessage('ultron','I could not reach the ULTRON brain. '+e.message);status.classList.remove('busy');status.classList.add('error');status.innerHTML='<span></span> BRAIN ERROR';}
  finally{hideThinkingAnimation();btn.disabled=false;input.focus();}
}
$('sendChatBtn')?.addEventListener('click',sendChat);$('chatInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});

// ---------- STEP 4 VOICE INPUT ----------
function setVoiceUI(listening, message){
  const mic=$('voiceMicBtn');
  const cancel=$('voiceCancelBtn');
  const hint=$('voiceHint');
  const text=$('voiceText');
  const orb=$('voiceOrb');
  if(!mic||!cancel)return;

  if(listening){
    mic.classList.add('listening');
    mic.textContent='●';
    mic.title='Listening...';
    cancel.classList.remove('hidden');
    if(text)text.textContent='LISTENING...';
    if(hint)hint.textContent=message||'Speak your command now.';
    orb?.classList.add('voice-listening');
  }else{
    mic.classList.remove('listening');
    mic.textContent='🎤';
    mic.title='Start voice command';
    cancel.classList.add('hidden');
    if(text)text.textContent='ULTRON IS READY';
    if(hint)hint.textContent=message||'Press the microphone to give ULTRON one voice command.';
    orb?.classList.remove('voice-listening');
  }
}

function initVoiceRecognition(){
  if(!SpeechRecognition){
    setVoiceUI(false,'Voice recognition is not supported by this browser. Use Chrome or Edge.');
    $('voiceMicBtn')?.setAttribute('disabled','disabled');
    $('chatMicBtn')?.setAttribute('disabled','disabled');
    return;
  }

  recognition=new SpeechRecognition();
  recognition.lang='en-US';
  recognition.continuous=false;
  recognition.interimResults=true;
  recognition.maxAlternatives=1;

  recognition.onstart=()=>{
    isListening=true;
    setVoiceUI(true,'Listening for one command...');
    $('chatMicBtn')?.classList.add('listening');
  };

  recognition.onresult=(event)=>{
    let finalText='';
    let interimText='';

    for(let i=event.resultIndex;i<event.results.length;i++){
      const transcript=event.results[i][0].transcript;
      if(event.results[i].isFinal) finalText+=transcript;
      else interimText+=transcript;
    }

    const shown=(finalText||interimText).trim();
    if(shown){
      const hint=$('voiceHint');
      if(hint)hint.textContent='Heard: '+shown;
    }

    if(finalText.trim()){
      const message=finalText.trim();
      recognition.stop();
      $('chatInput').value=message;
      setTimeout(()=>sendChat(),50);
    }
  };

  recognition.onerror=(event)=>{
    const code=event.error||'unknown';
    if(code==='aborted') return;
    isListening=false;
    $('chatMicBtn')?.classList.remove('listening');

    let msg='Voice input error. Please try again.';
    if(code==='not-allowed'||code==='service-not-allowed') msg='Microphone permission was blocked. Allow microphone access and try again.';
    else if(code==='no-speech') msg='I did not hear anything. Press the microphone and try again.';
    else if(code==='audio-capture') msg='No microphone was available.';
    setVoiceUI(false,msg);
  };

  recognition.onend=()=>{
    isListening=false;
    $('chatMicBtn')?.classList.remove('listening');
    if($('voiceText')?.textContent==='LISTENING...') setVoiceUI(false);
  };
}

function startVoiceCommand(){
  if(!recognition){
    initVoiceRecognition();
    if(!recognition)return;
  }
  if(isListening)return;

  // Stop any currently playing ULTRON response before listening.
  stopCurrentSpeech();

  try{
    recognition.start();
  }catch(e){
    // Recognition can throw if start is called twice during browser teardown.
    isListening=false;
  }
}

function cancelVoiceCommand(){
  if(!recognition)return;
  try{recognition.abort();}catch(e){}
  isListening=false;
  $('chatMicBtn')?.classList.remove('listening');
  setVoiceUI(false,'Voice command cancelled.');
}

$('voiceMicBtn')?.addEventListener('click',startVoiceCommand);
$('voiceCancelBtn')?.addEventListener('click',cancelVoiceCommand);
$('chatMicBtn')?.addEventListener('click',startVoiceCommand);

if('speechSynthesis' in window){
  const preloadVoices=()=>window.speechSynthesis.getVoices();
  preloadVoices();
  window.speechSynthesis.onvoiceschanged=preloadVoices;
}
initVoiceRecognition();

function showDashboard(name){
  signedIn=true;
  document.body.classList.add('powered');
  document.getElementById('loginPanel').classList.add('hidden');
  document.getElementById('instruction').classList.add('hidden');
  const authScreen=document.querySelector('main');
  if(authScreen) authScreen.classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('chatInput')?.focus();
  document.getElementById('dashUser').textContent=(name||'OPERATOR').split('@')[0].toUpperCase();
  document.getElementById('reactorStatus').textContent='ARC REACTOR ONLINE';
  document.getElementById('topStatus').textContent='ULTRON ONLINE';
  loadProfileOverview();
  initMemoryAndAttachments();
}

document.getElementById('signOutBtn').addEventListener('click',async()=>{
  try{if(firebase) await firebase.signOut(firebase.auth);}catch(e){}
  location.reload();
});
