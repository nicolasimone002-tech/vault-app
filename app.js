'use strict';
const STORE='vault.pwa.v1';const $=id=>document.getElementById(id);const encoder=new TextEncoder();const decoder=new TextDecoder();let entries=[],key=null,salt=null,editing=null,locked=true,lockTimer=null,clipboardTimer=null,clipboardValue=null,sessionEpoch=0,saving=false,unlocking=false,settingUp=false,importing=false,verifying=false;
const b64=bytes=>btoa(String.fromCharCode(...bytes));const un64=str=>Uint8Array.from(atob(str),c=>c.charCodeAt(0));const random=n=>crypto.getRandomValues(new Uint8Array(n));
function screen(name){for(const id of ['setup','unlock','vault','editor'])$(id).hidden=id!==name;$('lock').hidden=name==='setup'||name==='unlock'}
function message(s){$('status').textContent=s;setTimeout(()=>{if($('status').textContent===s)$('status').textContent=''},4500)}
async function derive(password,s){const base=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:s,iterations:600000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function seal(data,k,s){const iv=random(12);const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('Vault-PWA-v1')},k,encoder.encode(JSON.stringify(data)));return JSON.stringify({version:1,kdf:'PBKDF2-SHA256',iterations:600000,salt:b64(s),iv:b64(iv),ciphertext:b64(new Uint8Array(encrypted))})}
function validateBlob(blob){
 if(!blob||typeof blob!=='object'||Array.isArray(blob)||blob.version!==1||blob.kdf!=='PBKDF2-SHA256'||blob.iterations!==600000)throw Error('Formato non supportato');
 for(const [field,max] of [['salt',32],['iv',24],['ciphertext',7_000_000]])if(typeof blob[field]!=='string'||!blob[field].length||blob[field].length>max||!/^[A-Za-z0-9+/]*={0,2}$/.test(blob[field]))throw Error('Campo non valido');
 const saltBytes=un64(blob.salt),ivBytes=un64(blob.iv),cipherBytes=un64(blob.ciphertext);
 if(saltBytes.length!==16||ivBytes.length!==12||cipherBytes.length<16||cipherBytes.length>5_000_000)throw Error('Dimensioni non valide');
 return {saltBytes,ivBytes,cipherBytes};
}
function validateEntries(data){
 if(!Array.isArray(data)||data.length>10000)throw Error('Archivio non valido');
 const ids=new Set();
 for(const e of data){
  if(!e||typeof e!=='object'||Array.isArray(e)||typeof e.id!=='string'||!e.id||ids.has(e.id))throw Error('Credenziale non valida');
  ids.add(e.id);
  for(const [field,max] of [['service',100],['username',200],['password',500],['website',500],['notes',2000]])if(typeof e[field]!=='string'||e[field].length>max)throw Error('Campo credenziale non valido');
  if(!e.service||!e.password)throw Error('Credenziale incompleta');
  if(e.category!==undefined&&(!['Personale','Lavoro','Social','Finanza','Altro'].includes(e.category)))throw Error('Categoria non valida');
  if(e.favorite!==undefined&&typeof e.favorite!=='boolean')throw Error('Preferito non valido');
 }
 return data;
}
async function openVault(raw,password){const blob=JSON.parse(raw);if(blob.version!==1||blob.kdf!=='PBKDF2-SHA256'||blob.iterations!==600000)throw Error('Formato non supportato');const {saltBytes:s,ivBytes,cipherBytes}=validateBlob(blob);const k=await derive(password,s);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:ivBytes,additionalData:encoder.encode('Vault-PWA-v1')},k,cipherBytes);const data=validateEntries(JSON.parse(decoder.decode(plain)));return {data,k,s}}
async function save(allowSetup=false){
 if(saving||importing)throw Error('Operazione già in corso');
 if(!key||!salt||(!allowSetup&&locked))throw Error('Archivio bloccato');
 saving=true;
 const epoch=sessionEpoch, snapshot=structuredClone(entries), activeKey=key, activeSalt=salt;
 try{
  const raw=await seal(snapshot,activeKey,activeSalt);
  if(epoch!==sessionEpoch||activeKey!==key||(!allowSetup&&locked))throw Error('Sessione cambiata: salvataggio annullato');
  localStorage.setItem(STORE,raw);
 }finally{saving=false}
}
function clearEditor(){for(const id of ['service','username','password','website','notes'])$(id).value='';$('password').type='password';$('showPassword').textContent='Mostra';$('favorite').checked=false;$('strength').textContent='Sicurezza: inserisci una password';updateSpaceInfo()}
function lock(){sessionEpoch++;locked=true;clearTimeout(lockTimer);clearTimeout(clipboardTimer);clipboardValue=null;entries=[];key=null;salt=null;editing=null;clearEditor();$('master').value='';$('newMaster').value='';$('confirmMaster').value='';$('search').value='';$('verifyResult').textContent='';$('verifyResult').hidden=true;$('items').replaceChildren();$('audit').textContent='';$('count').textContent='Archivio personale';$('status').textContent='';screen(localStorage.getItem(STORE)?'unlock':'setup')}

function resetIdle(){if(locked)return;clearTimeout(lockTimer);lockTimer=setTimeout(lock,120000)}
function render(){const q=$('search').value.toLocaleLowerCase();const filtered=entries.filter(e=>(e.service+' '+e.username).toLocaleLowerCase().includes(q)&&(!$('categoryFilter').value||(e.category||'Personale')===$('categoryFilter').value)&&(!$('favoritesOnly').checked||e.favorite));$('count').textContent=`${entries.length} credenzial${entries.length===1?'e':'i'} salvate`;const root=$('items');root.replaceChildren();if(!filtered.length){const p=document.createElement('p');p.textContent=entries.length?'Nessun risultato.':'Non hai ancora aggiunto credenziali.';root.append(p)}for(const e of filtered){const btn=document.createElement('button');btn.className='item';const left=document.createElement('span');const name=document.createElement('strong');name.textContent=e.service;const sub=document.createElement('small');sub.textContent=e.username||'Nessun nome utente';left.append(name,sub);if(e.favorite){const star=document.createElement('small');star.textContent='★ Preferito';left.append(star)}const arrow=document.createElement('span');arrow.className='chevron';arrow.textContent='›';btn.append(left,arrow);btn.addEventListener('click',()=>edit(e.id));root.append(btn)}const counts=new Map();for(const e of entries){if(e.password)counts.set(e.password,(counts.get(e.password)||0)+1)}const duplicateCount=[...counts.values()].filter(n=>n>1).reduce((sum,n)=>sum+n,0);$('audit').textContent=duplicateCount?`Attenzione: ${duplicateCount} credenziali usano password ripetute.`:'Nessuna password ripetuta rilevata nell’archivio.'}
function edit(id=null){editing=id;const e=entries.find(x=>x.id===id)||{};$('editorTitle').textContent=id?'Modifica credenziale':'Nuova credenziale';for(const field of ['service','username','password','website','notes'])$(field).value=e[field]||'';$('password').type='password';$('showPassword').textContent='Mostra';$('category').value=e.category||'Personale';$('favorite').checked=!!e.favorite;$('delete').hidden=!id;updateStrength();updateSpaceInfo();screen('editor')}
$('setupForm').addEventListener('submit',async e=>{e.preventDefault();if(saving||settingUp)return;settingUp=true;const a=$('newMaster').value,b=$('confirmMaster').value;if(a.length<12||a!==b){settingUp=false;message('Usa almeno 12 caratteri e verifica la conferma.');return}try{const epoch=sessionEpoch;const nextSalt=random(16);const nextKey=await derive(a,nextSalt);if(epoch!==sessionEpoch||localStorage.getItem(STORE))return;salt=nextSalt;key=nextKey;entries=[];await save(true);locked=false;$('newMaster').value=$('confirmMaster').value='';screen('vault');render();resetIdle()}catch{message('Impossibile creare l’archivio.')}finally{settingUp=false}});
$('unlockForm').addEventListener('submit',async e=>{e.preventDefault();if(unlocking||!locked)return;unlocking=true;const epoch=sessionEpoch;const password=$('master').value;try{const result=await openVault(localStorage.getItem(STORE),password);if(epoch!==sessionEpoch||!locked)return;entries=result.data;key=result.k;salt=result.s;locked=false;$('master').value='';screen('vault');render();resetIdle()}catch{if(epoch===sessionEpoch)message('Password errata o archivio danneggiato.')}finally{unlocking=false}});
$('entryForm').addEventListener('submit',async e=>{e.preventDefault();if(locked||saving||importing||verifying)return;const data={};for(const f of ['service','username','password','website','notes'])data[f]=f==='password'?$(f).value:$(f).value.trim();data.category=$('category').value;data.favorite=$('favorite').checked;if(!data.service||!data.password)return message('Inserisci servizio e password.');const old=entries.slice();if(editing){const idx=entries.findIndex(x=>x.id===editing);if(idx<0)return;entries[idx]={...entries[idx],...data}}else entries.push({id:crypto.randomUUID(),...data});try{await save();if(locked)return;clearEditor();screen('vault');render();resetIdle()}catch{if(!locked)entries=old;message('Salvataggio non riuscito.')}});
$('delete').addEventListener('click',async()=>{if(locked||saving||importing||verifying||!editing||!confirm('Eliminare definitivamente questa credenziale?'))return;const old=entries;entries=entries.filter(x=>x.id!==editing);try{await save();if(locked)return;screen('vault');render()}catch{if(!locked)entries=old;message('Eliminazione non riuscita.')}});
$('passwordLength').addEventListener('input',()=>{$('lengthLabel').textContent=$('passwordLength').value});
$('generate').addEventListener('click',()=>{const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'+($('useSymbols').checked?'!@#$%^&*-_':'');let result='';const limit=Math.floor(256/alphabet.length)*alphabet.length;const length=Number($('passwordLength').value);while(result.length<length){for(const b of random(64)){if(b<limit&&result.length<length)result+=alphabet[b%alphabet.length]}}$('password').value=result;$('password').type='text';$('showPassword').textContent='Nascondi';updateStrength()});
$('showPassword').addEventListener('click',()=>{const visible=$('password').type==='text';$('password').type=visible?'password':'text';$('showPassword').textContent=visible?'Mostra':'Nascondi'});
$('add').addEventListener('click',()=>edit());$('cancel').addEventListener('click',()=>{clearEditor();screen('vault');render()});$('lock').addEventListener('click',lock);$('search').addEventListener('input',render);$('categoryFilter').addEventListener('change',render);$('favoritesOnly').addEventListener('change',render);document.addEventListener('pointerdown',resetIdle);document.addEventListener('keydown',resetIdle);document.addEventListener('visibilitychange',()=>{if(document.hidden&&!locked)lock()});window.addEventListener('pagehide',()=>{if(!locked)lock()});
if(!window.isSecureContext||!crypto.subtle){document.body.textContent='Vault richiede HTTPS o localhost per funzionare in sicurezza.'}else{screen(localStorage.getItem(STORE)?'unlock':'setup');if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{})}

// Backup: esporta soltanto il blob già cifrato, mai le credenziali in chiaro.
$('exportBackup').addEventListener('click',()=>{
 if(locked||saving||importing||verifying)return message('Attendi il completamento dell’operazione.');const raw=localStorage.getItem(STORE);if(!raw)return message('Archivio non disponibile.');
 const blob=new Blob([raw],{type:'application/json'});const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='vault-backup-'+new Date().toISOString().slice(0,10)+'.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 message('Backup cifrato esportato. Conservalo in un luogo sicuro.');
});
$('importBackup').addEventListener('click',()=>{if(!locked)$('backupFile').click()});
$('backupFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file||locked||saving||importing||verifying)return;importing=true;const epoch=sessionEpoch;
 if(file.size>5_000_000){importing=false;return message('Backup troppo grande (massimo 5 MB).')}
 try{const raw=await file.text();validateBlob(JSON.parse(raw));
 if(locked||epoch!==sessionEpoch)return;
 const password=prompt('Password principale del backup da importare:');if(password===null)return;
 const restored=await openVault(raw,password);
 if(locked||epoch!==sessionEpoch||saving)return;
 // Mostra solo il numero di voci: non esporre nomi o password nel dialogo.
 const currentCount=entries.length, incomingCount=restored.data.length;
 const confirmation=prompt(`ATTENZIONE: il ripristino SOSTITUIRÀ ${currentCount} credenziali attuali con ${incomingCount} credenziali del backup.\n\nPrima di continuare conserva una copia cifrata dell'archivio attuale.\n\nPer confermare digita IMPORTA (maiuscolo):`);
 if(confirmation!=='IMPORTA'){message('Importazione annullata. Archivio attuale invariato.');return}
 if(locked||epoch!==sessionEpoch||saving)return;
 const old=localStorage.getItem(STORE);
 if(locked||epoch!==sessionEpoch||saving)return;
 try{localStorage.setItem(STORE,raw)}catch(err){if(old!==null)localStorage.setItem(STORE,old);throw err}
 entries=restored.data;key=restored.k;salt=restored.s;render();resetIdle();message('Backup importato.');
 }catch{message('Importazione non riuscita: file o password non validi.')}finally{importing=false}
});

// v0.4: verifica non distruttiva. Non modifica localStorage, entries, key o salt.
$('verifyBackup').addEventListener('click',()=>{if(!locked)$('verifyFile').click()});
$('verifyFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file||locked||importing||verifying||saving)return;verifying=true;const epoch=sessionEpoch;
 const result=$('verifyResult');result.hidden=false;result.textContent='Verifica in corso…';
 if(file.size>5_000_000){result.textContent='Backup troppo grande (massimo 5 MB). Nessun dato modificato.';verifying=false;return}
 try{
  const raw=await file.text();
  validateBlob(JSON.parse(raw));
  const password=prompt('Inserisci la password principale del BACKUP per verificarlo (nessun dato verrà importato):');
  if(password===null){result.textContent='Verifica annullata. Nessun dato modificato.';return}
  const verified=await openVault(raw,password);
  const n=verified.data.length;
  if(locked||epoch!==sessionEpoch)return;
  result.textContent=`Backup verificato: decifratura riuscita, ${n} credenzial${n===1?'e':'i'} presenti. Archivio attuale invariato.`;
 }catch{if(locked||epoch!==sessionEpoch)return;result.textContent='Verifica fallita: password errata, backup danneggiato o formato non valido. Archivio attuale invariato.'}finally{verifying=false}
});

// Indicatori euristici solo locali: non equivalgono a una stima affidabile del tempo di cracking.
function updateStrength(){const p=$('password').value;let label='';if(!p)label='inserisci una password';else{const classes=[/[a-z]/,/[A-Z]/,/[0-9]/,/[^A-Za-z0-9]/].filter(r=>r.test(p)).length;const repeated=/(.)\1{3,}/.test(p);const common=/^(password|123456|qwerty|admin|letmein)/i.test(p);label=common||p.length<12||repeated?'debole':p.length>=20&&classes>=3?'robusta (stima)':p.length>=14&&classes>=3?'discreta (stima)':'da migliorare'}$('strength').textContent='Sicurezza: '+label}
function updateSpaceInfo(){
 const value=$('password').value;
 const leading=(value.match(/^ */)||[''])[0].length;
 const trailing=(value.match(/ *$/)||[''])[0].length;
 $('spaceInfo').textContent=`Spazi ai bordi: ${leading} iniziali, ${trailing} finali`;
}
function insertEdgeSpace(side){
 if(locked)return;
 const input=$('password');
 if(input.value.length>=input.maxLength)return message('Lunghezza massima della password raggiunta.');
 input.value=side==='start'?' '+input.value:input.value+' ';
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.blur();
}
$('prependSpace').addEventListener('click',()=>insertEdgeSpace('start'));
$('appendSpace').addEventListener('click',()=>insertEdgeSpace('end'));
$('password').addEventListener('input',()=>{updateStrength();updateSpaceInfo()});

// Non sovrascrive gli appunti se l'utente ha copiato altro nel frattempo.
$('copyPassword').addEventListener('click',async()=>{if(locked)return;const value=$('password').value;const epoch=sessionEpoch;if(!value)return message('Nessuna password da copiare.');if(!navigator.clipboard?.writeText)return message('Copia non disponibile su questo dispositivo.');try{await navigator.clipboard.writeText(value);if(locked||epoch!==sessionEpoch)return;clipboardValue=value;clearTimeout(clipboardTimer);clipboardTimer=setTimeout(async()=>{const expected=clipboardValue;clipboardValue=null;if(!expected)return;try{if(navigator.clipboard.readText&&await navigator.clipboard.readText()===expected)await navigator.clipboard.writeText('')}catch{/* iOS può impedire la lettura degli appunti: nessuna garanzia di cancellazione */}},20000);message('Copiata. La pulizia automatica degli appunti non è garantita su iPhone.')}catch{message('Impossibile copiare: verifica i permessi degli appunti.')}});
