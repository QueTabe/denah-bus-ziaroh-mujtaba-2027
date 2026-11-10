// KONFIGURASI: isi dari Supabase > Project Settings > API.
const SUPABASE_URL = "https://etdaoxhocwaxboglhkzm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iQSudNjcuy4ICnZdhjy6XA_f9xw_KQa";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Data awal disalin dari DENAH KURSI.pdf halaman 1.
const initial = {
  1:["Ust. Rovi’I H.","filled","green"],2:["Ust. Ubaidah","filled","green"],3:["Gus Faiz","filled","green"],4:["Abah Mundzir","filled","green"],5:["Abah Mundzir","filled","green"],
  6:["Ust. Muttaqin","filled","green"],7:["Ust. Sukron F.","filled","green"],8:["Penderek","reserved","yellow"],9:["Pelapor","reserved","yellow"],10:["Pelapor","reserved","yellow"],
  11:["Nurul","filled",""],12:["Asfiya’","filled",""],13:["Nahar","filled",""],14:["Nahar","filled",""],15:["Nahar","filled",""],
  16:["Sela","filled",""],17:["Robi’ah","filled",""],18:["Hariri","filled","peach"],19:["Nahar","filled","peach"],20:["Dimas","filled",""],
  21:["","available",""],22:["","available",""],23:["","available",""],24:["","available",""],25:["Pak Khanif","filled",""],
  26:["","available",""],27:["","available",""],28:["","available",""],29:["","available",""],30:["","available",""],
  31:["","available",""],32:["","available",""],33:["Zaim","filled",""],34:["Mahbub","filled",""],35:["Ihsan","filled",""],
  36:["","available",""],37:["","available",""],38:["Fahmi","filled",""],39:["Zaki","filled",""],40:["Qosik","filled",""],
  41:["","available",""],42:["Aria","filled",""],43:["","available","peach"],44:["Akmal","filled",""],45:["Budiman","filled",""],
  46:["Pak Basyar","filled",""],47:["Pak Slamet","filled",""],48:["","available","peach"],49:["","available","peach"],50:["","available","peach"],
  51:["","available","peach"],52:["","available","peach"],53:["","available","peach"],54:["","available","peach"],55:["","available","peach"],56:["","available","peach"],57:["","available","peach"],58:["","available","peach"],59:["","available","peach"]
};
let seats = Object.fromEntries(Object.entries(initial).map(([n,v])=>[n,{number:+n,name:v[0],status:v[1],color:v[2]}]));
let selected=null, isAdmin=false, channel=null, lastSync=null;
const $=id=>document.getElementById(id);
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function setConnection(state,label){$("connection").className="connection "+state;$("connection").lastChild.textContent=" "+label;}
function seatButton(n){
 const s=seats[n],b=document.createElement("button");b.type="button";b.className=`seat ${s.status} ${s.color||""}`;
 b.innerHTML=`<span class="num">${n}</span><span class="name">${escapeHtml(s.name)}</span>`;
 b.setAttribute("aria-label",`Kursi ${n}${s.name?", "+s.name:""}, status ${s.status}`);b.title=`Kursi ${n}${s.name?" - "+s.name:""}`;
 b.onclick=()=>chooseSeat(n);return b;
}
function render(){
 const grid=$("seatGrid");grid.innerHTML="";
 const rows=[[1,2,null,3,4,5],[6,7,null,8,9,10],[11,12,null,13,14,15],[16,17,null,18,19,20],[21,22,null,23,24,25],[26,27,null,28,29,30],[31,32,null,33,34,35],[36,37,null,38,39,40],[41,42,null,43,44,45],[46,47,null,48,49,50]];
 rows.forEach((row,r)=>row.forEach((n,c)=>{
  if(n===null){const aisle=document.createElement("div");aisle.className="aisle";aisle.style.gridColumn=String(c+1);aisle.style.gridRow=String(r+1);grid.append(aisle);}
  else grid.append(seatButton(n));
 }));
 $("backRight").innerHTML="";[51,52,53].forEach(n=>$("backRight").append(seatButton(n)));
 $("backRow").innerHTML="";[54,55,56,57,58,59].forEach(n=>$("backRow").append(seatButton(n)));
 $("seatCount").textContent=`${Object.keys(seats).length} kursi`;
}
function showModal(id){$(id).classList.add("show");$(id).setAttribute("aria-hidden","false");}
function hideModal(id){$(id).classList.remove("show");$(id).setAttribute("aria-hidden","true");}
function chooseSeat(n){
 selected=n;const s=seats[n];
 if(isAdmin){$("editNumber").value=n;$("editName").value=s.name;$("editStatus").value=s.status;$("editColor").value=s.color||"";$("saveMsg").textContent="";return;}
 $("detailTitle").textContent=`Kursi ${n}`;
 $("detailInfo").textContent=s.name?`${s.name} · ${s.status==="reserved"?"Khusus":s.status==="filled"?"Terisi":"Kosong"}`:"Kursi ini belum diisi.";
 showModal("detailModal");
}
async function fetchSeats(){
 if(!db){setConnection("offline","Mode lokal");return;}
 setConnection("","Mengambil data…");
 const {data,error}=await db.from("bus_seats").select("number,name,status,color").order("number");
 if(error){console.error(error);setConnection("offline","Database belum tersambung");return;}
 if(data?.length){data.forEach(r=>{seats[r.number]={number:r.number,name:r.name||"",status:r.status||"available",color:r.color||""};});}
 render();lastSync=new Date();$("lastUpdated").textContent="Data tersinkronisasi: "+lastSync.toLocaleString("id-ID");
 setConnection("online","Online");
}
async function checkAdmin(session){
 isAdmin=false;
 if(session?.user && db){
  const {data,error}=await db.from("admin_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
  if(error)console.warn("Pemeriksaan admin:",error.message);
  isAdmin=!!data;
 }
 $("loginPanel").hidden=isAdmin;$("editorPanel").hidden=!isAdmin;
 $("adminOpen").textContent=isAdmin?"Panel Admin":"Login Admin";
 if(session && !isAdmin){$("loginMsg").textContent="Akun berhasil login, tetapi belum diberi hak admin.";await db.auth.signOut();}
}
function subscribeRealtime(){
 if(!db)return;
 if(channel)db.removeChannel(channel);
 channel=db.channel("public-bus-seats")
  .on("postgres_changes",{event:"*",schema:"public",table:"bus_seats"},payload=>{
   const row=payload.new;
   if(payload.eventType==="DELETE"){delete seats[payload.old.number];}
   else if(row?.number){seats[row.number]={number:row.number,name:row.name||"",status:row.status||"available",color:row.color||""};}
   render();$("lastUpdated").textContent="Denah diperbarui langsung: "+new Date().toLocaleTimeString("id-ID");
  })
  .subscribe(status=>{if(status==="SUBSCRIBED")setConnection("online","Realtime aktif");else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")setConnection("offline","Realtime terputus");});
}
async function saveSeat(){
 if(!isAdmin||!selected){$("saveMsg").textContent="Login admin dan pilih kursi terlebih dahulu.";return;}
 const row={number:selected,name:$("editName").value.trim(),status:$("editStatus").value,color:$("editColor").value};
 if(!db){$("saveMsg").textContent="Database belum dikonfigurasi.";return;}
 $("saveSeat").disabled=true;$("saveMsg").textContent="Menyimpan…";
 const {error}=await db.from("bus_seats").upsert(row,{onConflict:"number"});
 $("saveSeat").disabled=false;
 if(error){$("saveMsg").textContent="Gagal menyimpan: "+error.message;return;}
 seats[selected]=row;render();$("saveMsg").textContent="Tersimpan. Pengunjung akan menerima pembaruan realtime.";
}
async function importJson(file){
 try{const rows=JSON.parse(await file.text());if(!Array.isArray(rows))throw new Error("Format JSON harus berupa array.");
  for(const item of rows){const n=Number(item.number);if(!Number.isInteger(n)||n<1||n>59)continue;
   const row={number:n,name:String(item.name||""),status:["available","filled","reserved"].includes(item.status)?item.status:"available",color:["","green","yellow","peach"].includes(item.color)?item.color:""};
   const {error}=await db.from("bus_seats").upsert(row,{onConflict:"number"});if(error)throw error;seats[n]=row;
  }
  render();$("saveMsg").textContent="Impor berhasil. Data sudah disimpan.";
 }catch(e){$("saveMsg").textContent="Gagal impor: "+e.message;}
}
$("adminOpen").onclick=()=>{showModal("adminModal");};
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>hideModal(b.dataset.close)));
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)hideModal(m.id);}));
$("loginBtn").onclick=async()=>{
 if(!db){$("loginMsg").textContent="Konfigurasi Supabase belum diisi. Baca README.md.";return;}
 $("loginBtn").disabled=true;$("loginMsg").textContent="Memeriksa akun…";
 const {data,error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
 $("loginBtn").disabled=false;
 if(error){$("loginMsg").textContent=error.message;return;}
 await checkAdmin(data.session);
 if(isAdmin){$("loginMsg").textContent="Login admin berhasil.";await fetchSeats();}
};
$("logoutBtn").onclick=async()=>{if(db)await db.auth.signOut();isAdmin=false;$("loginPanel").hidden=false;$("editorPanel").hidden=true;$("adminOpen").textContent="Login Admin";$("password").value="";};
$("saveSeat").onclick=saveSeat;
$("clearSeat").onclick=()=>{if(!selected)return;$("editName").value="";$("editStatus").value="available";$("editColor").value="";saveSeat();};
$("printBtn").onclick=()=>window.print();
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(Object.values(seats).sort((a,b)=>a.number-b.number),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="cadangan-denah-bus.json";a.click();URL.revokeObjectURL(url);};
$("importFile").onchange=async e=>{const file=e.target.files?.[0];if(file){await importJson(file);e.target.value="";}};
render();
if(db){
 fetchSeats();subscribeRealtime();
 db.auth.getSession().then(async({data})=>{if(data.session)await checkAdmin(data.session);});
 db.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>checkAdmin(session),0);});
}else{setConnection("offline","Belum dikonfigurasi");$("lastUpdated").textContent="Menampilkan data contoh lokal. Hubungkan Supabase agar perubahan tersimpan online.";}
