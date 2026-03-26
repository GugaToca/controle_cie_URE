/* ================= FIREBASE ================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaFK0vEACoCETtl-_SbUB5_47RPd7qKoU",
  authDomain: "cie-escolas.firebaseapp.com",
  projectId: "cie-escolas",
  storageBucket: "cie-escolas.firebasestorage.app",
  messagingSenderId: "396731204195",
  appId: "1:396731204195:web:728732f81caf71e0a16e56"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ================= DOM ================= */

const $ = (id) => document.getElementById(id);

/* login */
const loginScreen = $("loginScreen");
const appScreen = $("appScreen");
const loginForm = $("loginForm");
const logoutBtn = $("logoutBtn");
const loginError = $("loginError");

/* sistema */
const schoolCount = $("schoolCount");

const form = $("schoolForm");
const cieEl = $("cie");
const nomeEl = $("nome");
const ureEl = $("ure");
const municipioEl = $("municipio");
const formMsg = $("formMsg");

const tbody = $("tbody");
const btnReload = $("btnReload");
const btnClear = $("btnClear");

const searchCie = $("searchCie");
const btnSearchCie = $("btnSearchCie");

const searchNome = $("searchNome");
const btnSearchNome = $("btnSearchNome");

const result = $("result");

const bulk = $("bulk");
const btnBulk = $("btnBulk");
const bulkMsg = $("bulkMsg");

const toggleDark = $("toggleDark");

const userDisplay = $("userDisplay");

/* histórico (novo) */
const cardsHistorico = $("cardsHistorico");
const modalHistorico = $("modalHistorico");
const modalSchool = $("modalSchool");
const historicoLista = $("historicoLista");
const historicoTexto = $("historicoTexto");
const btnSalvarHistorico = $("btnSalvarHistorico");
const btnFecharModal = $("btnFecharModal");
const searchHistorico = $("searchHistorico");

let currentCIE = null;
let historicoEscolas = [];

/* ================= HELPERS ================= */

function onlyDigits(str){
  return (str || "").toString().replace(/\D/g,"");
}

function normalizeName(str){
  return (str || "").toString().trim().replace(/\s+/g," ");
}

function normalizeSearch(str){
  return (str || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .trim();
}

function setMsg(el,text,type){
  if(!el) return;
  el.className = "msg" + (type ? ` ${type}` : "");
  el.textContent = text || "";
}

function schoolDocRef(cie){
  return doc(db,"escolas",cie);
}

function escapeHtml(str){
  return (str ?? "")
    .toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function currentUid(){
  return auth.currentUser ? auth.currentUser.uid : null;
}

function getUserFirstName(){
  const user = auth.currentUser;
  if(!user || !user.email) return "";

  const email = user.email.toLowerCase();
  const beforeAt = email.split("@")[0];
  const firstPart = beforeAt.split(".")[0];

  return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
}

/* ================= LOGIN ================= */

loginForm?.addEventListener("submit", async (e)=>{

  e.preventDefault();

  if(loginError) loginError.textContent = "";

  const email = $("loginEmail")?.value || "";
  const password = $("loginPassword")?.value || "";

  try{
    await signInWithEmailAndPassword(auth, email, password);
  }catch(err){
    if(loginError) loginError.textContent = "Email ou senha inválidos";
  }

});

logoutBtn?.addEventListener("click", async ()=>{

  await signOut(auth);

});

onAuthStateChanged(auth, (user)=>{

  if(user){

    if(loginScreen) loginScreen.style.display = "none";
    if(appScreen) appScreen.style.display = "block";

    if(userDisplay){
      userDisplay.textContent = "👤 " + getUserFirstName();
    }

    loadList();

  }else{

    if(loginScreen) loginScreen.style.display = "flex";
    if(appScreen) appScreen.style.display = "none";

    if(userDisplay){
      userDisplay.textContent = "";
    }

  }

});

/* ================= SALVAR ================= */

form?.addEventListener("submit", async (e)=>{

  e.preventDefault();

  setMsg(formMsg,"","");

  const cie = onlyDigits(cieEl?.value);
  const nome = normalizeName(nomeEl?.value);
  const ure = normalizeName(ureEl?.value) || "São José do Rio Preto";
  const municipio = normalizeName(municipioEl?.value);

  if(!cie) return setMsg(formMsg,"CIE inválido","err");
  if(!nome) return setMsg(formMsg,"Nome inválido","err");

  const ref = schoolDocRef(cie);
  const now = Date.now();

  await setDoc(ref,{
    cie,
    nome,
    nomeLower: nome.toLowerCase(),
    municipio,
    ure,
    updatedAt: now,
    updatedBy: currentUid()
  }, { merge:true });

  setMsg(formMsg,"Salvo com sucesso","ok");

  if(cieEl) cieEl.value = "";
  if(nomeEl) nomeEl.value = "";
  if(municipioEl) municipioEl.value = "";

  loadList();

});

/* ================= LIMPAR ================= */

btnClear?.addEventListener("click", ()=>{

  if(cieEl) cieEl.value = "";
  if(nomeEl) nomeEl.value = "";
  if(municipioEl) municipioEl.value = "";

});

/* ================= LISTA ================= */

async function loadList(){

  const q = query(collection(db,"escolas"), orderBy("nomeLower"));
  const snap = await getDocs(q);

  if(schoolCount){
    schoolCount.textContent = snap.size + " escolas cadastradas";
  }

  let rows = "";

  snap.forEach(d=>{

    const s = d.data();

    rows += `
    <tr>
      <td data-label="Escola">${escapeHtml(s.nome)}</td>
      <td data-label="CIE"><code>${escapeHtml(s.cie)}</code></td>
      <td data-label="Município">${escapeHtml(s.municipio)}</td>
      <td data-label="URE">${escapeHtml(s.ure)}</td>
      <td>
        <button class="btn" data-edit="${escapeHtml(s.cie)}">Editar</button>
        <button class="btn" data-del="${escapeHtml(s.cie)}">Excluir</button>
      </td>
    </tr>
    `;

  });

  if(tbody) tbody.innerHTML = rows;

  /* IMPORTANTÍSSIMO: re-ligar eventos toda vez que renderiza a lista */
  tbody?.querySelectorAll("[data-edit]").forEach(btn=>{
    btn.addEventListener("click", ()=>fillForm(btn.dataset.edit));
  });

  tbody?.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{

      const cie = btn.dataset.del;

      if(!confirm("Excluir escola " + cie + " ?")) return;

      await deleteDoc(schoolDocRef(cie));

      loadList();

    });
  });

}

/* ================= EDITAR ================= */

async function fillForm(cie){

  const snap = await getDoc(schoolDocRef(cie));

  if(!snap.exists()) return;

  const s = snap.data();

  if(cieEl) cieEl.value = s.cie || "";
  if(nomeEl) nomeEl.value = s.nome || "";
  if(municipioEl) municipioEl.value = s.municipio || "";
  if(ureEl) ureEl.value = s.ure || "São José do Rio Preto";

  window.scrollTo({ top:0, behavior:"smooth" });

}

/* ================= BUSCA CIE ================= */

btnSearchCie?.addEventListener("click", async ()=>{

  if(result) result.innerHTML = "";

  const cie = onlyDigits(searchCie?.value);

  if(!cie) return;

  const snap = await getDoc(schoolDocRef(cie));

  if(!snap.exists()){
    if(result) result.innerHTML = "Não encontrado";
    return;
  }

  const s = snap.data();

  if(result){
    result.innerHTML = `
      <strong>${escapeHtml(s.nome)}</strong><br>
      CIE: ${escapeHtml(s.cie)}<br>
      Município: ${escapeHtml(s.municipio)}
    `;
  }

});

/* ================= BUSCA NOME OU MUNICÍPIO ================= */

btnSearchNome?.addEventListener("click", async ()=>{

  if(result) result.innerHTML = "";

  const termRaw = normalizeSearch(searchNome?.value);

  if(termRaw.length < 2) return;

  const termos = termRaw.split(" ").filter(t => t.length > 0);

  const snap = await getDocs(collection(db,"escolas"));

  let html = "";
  let found = 0;

  snap.forEach(d=>{

    const s = d.data();

    const nome = normalizeSearch(s.nome);
    const municipio = normalizeSearch(s.municipio);
    const combinado = nome + " " + municipio;

    const match = termos.every(t => combinado.includes(t));

    if(match){

      html += `
        <div>
          <strong>${escapeHtml(s.nome)}</strong>
          — ${escapeHtml(s.cie)}
          — ${escapeHtml(s.municipio)}
        </div>
      `;

      found++;

    }

  });

  if(found === 0){
    if(result) result.innerHTML = "Nenhum resultado";
    return;
  }

  if(result) result.innerHTML = html;

});

/* ================= ENTER BUSCA ================= */

searchCie?.addEventListener("keypress",(e)=>{
  if(e.key === "Enter") btnSearchCie?.click();
});

searchNome?.addEventListener("keypress",(e)=>{
  if(e.key === "Enter") btnSearchNome?.click();
});

/* ================= BULK ================= */

btnBulk?.addEventListener("click", async ()=>{

  const text = (bulk?.value || "").trim();

  if(!text) return;

  const lines = text.split("\n");

  let ok = 0;

  for(const line of lines){

    const parts = line.split(/;|,|\t/).map(p=>p.trim());

    const nome = normalizeName(parts[0]);
    const cie = onlyDigits(parts[1]);
    const municipio = normalizeName(parts[2]);

    if(!nome || !cie) continue;

    await setDoc(schoolDocRef(cie),{
      cie,
      nome,
      nomeLower: nome.toLowerCase(),
      municipio,
      ure: "São José do Rio Preto",
      updatedAt: Date.now(),
      updatedBy: currentUid()
    }, { merge:true });

    ok++;

  }

  setMsg(bulkMsg,"Importadas " + ok + " escolas","ok");

  loadList();

});

/* ================= RELOAD ================= */

btnReload?.addEventListener("click", loadList);

/* ================= DARK MODE ================= */

if(localStorage.getItem("darkMode") === "true"){
  document.body.classList.add("dark");
}

toggleDark?.addEventListener("click", ()=>{

  document.body.classList.toggle("dark");

  const active = document.body.classList.contains("dark");

  localStorage.setItem("darkMode", active);

});

/* ================= TABS (Busca: CIE/NOME) ================= */

const tabs = document.querySelectorAll(".tab");

tabs.forEach(tab=>{

  tab.addEventListener("click", ()=>{

    tabs.forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");

    document.querySelectorAll(".tabpanel")
      .forEach(p=>p.classList.remove("active"));

    const target = document.getElementById("tab-" + tab.dataset.tab);

    if(target){
      target.classList.add("active");
    }

  });

});

/* ================= MENU PRINCIPAL (Sistema / Histórico) ================= */

document.querySelectorAll(".mainTab").forEach(tab=>{

  tab.addEventListener("click", ()=>{

    document.querySelectorAll(".mainTab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");

    const page = tab.dataset.page;

    const pageSistema = document.getElementById("page-sistema");
    const pageHistorico = document.getElementById("page-historico");

    if(pageSistema) pageSistema.style.display = page === "sistema" ? "block" : "none";
    if(pageHistorico) pageHistorico.style.display = page === "historico" ? "block" : "none";

    if(page === "historico"){
      loadHistoricoCards();
    }

  });

});

/* ================= HISTÓRICO DE ATENDIMENTO ================= */

async function loadHistoricoCards(){

  if(!cardsHistorico) return;

  const q = query(collection(db,"escolas"), orderBy("nomeLower"));
  const snap = await getDocs(q);

  historicoEscolas = [];

  snap.forEach(d=>{
    historicoEscolas.push(d.data());
  });

  renderHistoricoCards(historicoEscolas);

}

function renderHistoricoCards(lista){

  if(!cardsHistorico) return;

  let html = "";

  lista.forEach(s=>{

    html += `
      <div class="cardSchool" data-cie="${escapeHtml(s.cie)}">
        <strong>${escapeHtml(s.nome)}</strong><br>
        CIE: ${escapeHtml(s.cie)}<br>
        ${escapeHtml(s.municipio)}
      </div>
    `;

  });

  if(lista.length === 0){
    html = `<div class="msg err">Nenhuma escola encontrada</div>`;
  }

  cardsHistorico.innerHTML = html;

  document.querySelectorAll(".cardSchool").forEach(card=>{
    card.addEventListener("click", ()=>openHistorico(card.dataset.cie));
  });

}

searchHistorico?.addEventListener("input", ()=>{

  const term = searchHistorico.value.toLowerCase().trim();

  if(!term){
    renderHistoricoCards(historicoEscolas);
    return;
  }

  const filtradas = historicoEscolas.filter(s=>{

    const nome = (s.nome || "").toLowerCase();
    const municipio = (s.municipio || "").toLowerCase();
    const cie = (s.cie || "").toString();

    return (
      nome.includes(term) ||
      municipio.includes(term) ||
      cie.includes(term)
    );

  });

  renderHistoricoCards(filtradas);

});

async function openHistorico(cie){

  currentCIE = cie;

  if(modalHistorico) modalHistorico.style.display = "flex";
  if(historicoTexto) historicoTexto.value = "";

  // título do modal
  const schoolSnap = await getDoc(schoolDocRef(cie));
  if(modalSchool){
    if(schoolSnap.exists()){
      const s = schoolSnap.data();
      modalSchool.textContent = `${s.nome} (CIE: ${s.cie})`;
    }else{
      modalSchool.textContent = `Escola (CIE: ${cie})`;
    }
  }

  // lista de históricos
  const histCol = collection(db,"escolas",cie,"historico");
  const histSnap = await getDocs(histCol);

  if(!historicoLista) return;

  if(histSnap.empty){
    historicoLista.innerHTML = `<div class="msg err">Sem histórico</div>`;
    return;
  }

  // ordena no front por dataHora (se existir) ou por data string
  const items = [];
  histSnap.forEach(d=>{
    items.push({ id:d.id, ...d.data() });
  });

  items.sort((a,b)=> (b.dataHora || 0) - (a.dataHora || 0));

  let html = "";
  for(const h of items){
    html += `
  <div class="histItem" data-id="${h.id}">
    <div class="histHeader">
      <strong>${escapeHtml(h.data || "")}</strong>
      <button class="btnDeleteHist">🗑️</button>
    </div>
    ${escapeHtml(h.tecnico || "") ? `<em>${escapeHtml(h.tecnico)}</em><br>` : ``}
    <div>${escapeHtml(h.texto || "")}</div>
  </div>
`;
  }

  historicoLista.innerHTML = html;

  historicoLista.querySelectorAll(".btnDeleteHist").forEach(btn=>{
    btn.addEventListener("click", async (e)=>{

      e.stopPropagation();

      const item = btn.closest(".histItem");
      const id = item.dataset.id;

      if(!confirm("Excluir esta anotação?")) return;

      await deleteDoc(doc(db,"escolas",currentCIE,"historico",id));

      openHistorico(currentCIE); // recarrega

    });
  });

}

if(btnSalvarHistorico){

  btnSalvarHistorico.addEventListener("click", async ()=>{

    if(!currentCIE){
      alert("Erro: escola não selecionada");
      return;
    }

    const texto = historicoTexto.value.trim();

    if(!texto){
      alert("Digite uma anotação");
      return;
    }

    try{

      await addDoc(collection(db,"escolas",currentCIE,"historico"),{
  texto: texto,
  tecnico: getUserFirstName(),
  email: auth.currentUser.email,
  data: new Date().toLocaleDateString(),
  dataHora: Date.now()
});

      historicoTexto.value = "";

      openHistorico(currentCIE);

    }catch(err){

      console.error(err);
      alert("Erro ao salvar anotação");

    }

  });

}

btnFecharModal?.addEventListener("click", ()=>{
  if(modalHistorico) modalHistorico.style.display = "none";
});

// fecha modal clicando no fundo (opcional, não quebra nada)
modalHistorico?.addEventListener("click",(e)=>{
  if(e.target === modalHistorico){
    modalHistorico.style.display = "none";
  }
});