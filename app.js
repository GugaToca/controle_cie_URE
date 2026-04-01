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
  addDoc,
  where
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

    registrarUsuario(user);
    loadList();

    // Aviso de novidades — exibe apenas na primeira vez de cada usuário após a atualização
    const NOVIDADES_KEY = `novidadesAgenda_v1_${user.uid}`;
    if(!localStorage.getItem(NOVIDADES_KEY)){
      const modalNovidades = $("modalNovidades");
      if(modalNovidades) modalNovidades.style.display = "flex";
      $("btnFecharNovidades")?.addEventListener("click", ()=>{
        modalNovidades.style.display = "none";
        localStorage.setItem(NOVIDADES_KEY, "1");
      });
    }

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

    const pageAgendaEl = document.getElementById("page-agenda");
    if(pageAgendaEl) pageAgendaEl.style.display = page === "agenda" ? "block" : "none";

    if(page === "historico"){
      loadHistoricoCards();
    }

    if(page === "agenda"){
      loadAgendaSelector().then(() => loadAgendaPage());
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

/* ================= AGENDA ================= */

// --- Estado ---
let agendaViewUid = null;
let agendaMes = new Date().getMonth();
let agendaAno = new Date().getFullYear();
let agendaView = "calendario";
let currentEventoEditId = null;
let agendaEventos = [];
let agendaEscolasCached = [];

// --- Refs DOM ---
const agendaSelector       = $("agendaSelector");
const btnCompartilharAgenda= $("btnCompartilharAgenda");
const btnNovoEvento        = $("btnNovoEvento");
const btnViewCalendario    = $("btnViewCalendario");
const btnViewLista         = $("btnViewLista");
const calendarioGrid       = $("calendarioGrid");
const calendarioMesAno     = $("calendarioMesAno");
const btnMesAnterior       = $("btnMesAnterior");
const btnProximoMes        = $("btnProximoMes");
const agendaCalendario     = $("agendaCalendario");
const agendaListaEl        = $("agendaLista");

const modalEvento          = $("modalEvento");
const formEvento           = $("formEvento");
const eventoTitulo         = $("eventoTitulo");
const eventoDataHora       = $("eventoDataHora");
const eventoEscola         = $("eventoEscola");
const eventoDescricao      = $("eventoDescricao");
const eventoFormMsg        = $("eventoFormMsg");
const btnFecharModalEvento = $("btnFecharModalEvento");
const btnCancelarEvento    = $("btnCancelarEvento");

const modalEventoDetalhe   = $("modalEventoDetalhe");
const detalheEventoTitle   = $("detalheEventoTitle");
const detalheEventoBody    = $("detalheEventoBody");
const detalheEventoAcoes   = $("detalheEventoAcoes");
const detalheComentarios   = $("detalheComentarios");
const novoComentarioTexto  = $("novoComentarioTexto");
const btnSalvarComentario  = $("btnSalvarComentario");
const btnFecharDetalhe     = $("btnFecharDetalhe");

const modalCompartilhar        = $("modalCompartilhar");
const listaUsuariosCompartilhar= $("listaUsuariosCompartilhar");
const btnConfirmarCompartilhar = $("btnConfirmarCompartilhar");
const btnFecharCompartilhar    = $("btnFecharCompartilhar");

// --- Helpers ---

function isDono(){
  return agendaViewUid === currentUid();
}

function padZ(n){ return String(n).padStart(2,"0"); }

function dtLocalValue(ms){
  const d = new Date(ms);
  return `${d.getFullYear()}-${padZ(d.getMonth()+1)}-${padZ(d.getDate())}T${padZ(d.getHours())}:${padZ(d.getMinutes())}`;
}

// --- Registrar usuário ---

async function registrarUsuario(user){
  try{
    await setDoc(doc(db,"usuarios",user.uid),{
      uid: user.uid,
      email: user.email,
      nome: getUserFirstName()
    },{ merge:true });
  }catch(e){ console.error("registrarUsuario",e); }
}

// --- Carregar usuários ---

async function loadUsuarios(){
  const snap = await getDocs(collection(db,"usuarios"));
  const lista = [];
  snap.forEach(d => lista.push(d.data()));
  return lista;
}

// --- Seletor de agenda ---

async function loadAgendaSelector(){
  if(!agendaSelector) return;
  const meuUid = currentUid();
  agendaSelector.innerHTML = `<option value="${meuUid}">📅 Minha Agenda</option>`;

  try{
    const q = query(collection(db,"agenda"), where("compartilhadoCom","array-contains",meuUid));
    const snap = await getDocs(q);
    snap.forEach(d => {
      const donoUid = d.id;
      if(donoUid === meuUid) return;
      const data = d.data();
      const nome = data.nomeProprietario || data.emailProprietario || donoUid;
      agendaSelector.innerHTML += `<option value="${escapeHtml(donoUid)}">👤 ${escapeHtml(nome)}</option>`;
    });
  }catch(e){ console.error("loadAgendaSelector",e); }
}

// --- Carregar página da agenda ---

async function loadAgendaPage(){
  agendaViewUid = agendaSelector?.value || currentUid();

  // Escolas para o select do formulário
  try{
    const snap = await getDocs(query(collection(db,"escolas"), orderBy("nomeLower")));
    agendaEscolasCached = [];
    snap.forEach(d => agendaEscolasCached.push(d.data()));
    if(eventoEscola){
      eventoEscola.innerHTML = '<option value="">— Nenhuma —</option>';
      agendaEscolasCached.forEach(s => {
        eventoEscola.innerHTML += `<option value="${escapeHtml(s.cie)}">${escapeHtml(s.nome)} (${escapeHtml(s.cie)})</option>`;
      });
    }
  }catch(e){ console.error("loadEscolas",e); }

  // Mostrar/ocultar botão de novo evento
  if(btnNovoEvento) btnNovoEvento.style.display = isDono() ? "inline-flex" : "none";

  await loadEventos();
}

async function loadEventos(){
  agendaViewUid = agendaSelector?.value || currentUid();
  try{
    const q = query(collection(db,"agenda",agendaViewUid,"eventos"), orderBy("dataHoraMs"));
    const snap = await getDocs(q);
    agendaEventos = [];
    snap.forEach(d => agendaEventos.push({ id:d.id, ...d.data() }));
  }catch(e){
    agendaEventos = [];
  }

  if(agendaView === "calendario"){
    renderCalendario(agendaEventos, agendaMes, agendaAno);
  }else{
    renderListaEventos(agendaEventos);
  }
}

// --- Calendário ---

function renderCalendario(eventos, mes, ano){
  if(!calendarioGrid || !calendarioMesAno) return;

  const nomeMeses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                     "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  calendarioMesAno.textContent = `${nomeMeses[mes]} ${ano}`;

  const hoje = new Date();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const ultimoDia   = new Date(ano, mes + 1, 0).getDate();

  // Mapa dia → eventos
  const eventosPorDia = {};
  eventos.forEach(ev => {
    if(!ev.dataHoraMs) return;
    const d = new Date(ev.dataHoraMs);
    if(d.getMonth() === mes && d.getFullYear() === ano){
      const dia = d.getDate();
      if(!eventosPorDia[dia]) eventosPorDia[dia] = [];
      eventosPorDia[dia].push(ev);
    }
  });

  let html = "";
  ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].forEach(d => {
    html += `<div class="diaHeader">${d}</div>`;
  });

  for(let i = 0; i < primeiroDia; i++){
    html += `<div class="diaCell vazio"></div>`;
  }

  for(let dia = 1; dia <= ultimoDia; dia++){
    const isHoje = hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano;
    const evsDia = eventosPorDia[dia] || [];
    const temEvento = evsDia.length > 0;

    let chips = "";
    evsDia.slice(0,2).forEach(ev => {
      chips += `<div class="eventoChip" data-id="${escapeHtml(ev.id)}">${escapeHtml(ev.titulo)}</div>`;
    });
    if(evsDia.length > 2){
      chips += `<div class="eventoChipMais">+${evsDia.length - 2} mais</div>`;
    }

    html += `
      <div class="diaCell${isHoje ? " hoje" : ""}${temEvento ? " temEvento" : ""}" data-dia="${dia}">
        <span class="diaNumer">${dia}</span>
        ${chips}
      </div>`;
  }

  calendarioGrid.innerHTML = html;

  // Clique nos chips
  calendarioGrid.querySelectorAll(".eventoChip").forEach(chip => {
    chip.addEventListener("click", e => {
      e.stopPropagation();
      openEventoDetalhe(chip.dataset.id);
    });
  });

  // Clique no dia para criar evento (somente dono)
  if(isDono()){
    calendarioGrid.querySelectorAll(".diaCell:not(.vazio)").forEach(cell => {
      cell.addEventListener("click", () => {
        const dia = parseInt(cell.dataset.dia);
        abrirModalNovoEvento(new Date(ano, mes, dia, 9, 0));
      });
    });
  }
}

// --- Lista ---

function renderListaEventos(eventos){
  if(!agendaListaEl) return;

  if(eventos.length === 0){
    agendaListaEl.innerHTML = `<div class="msg err" style="display:block">Nenhum evento cadastrado.</div>`;
    return;
  }

  const sorted = [...eventos].sort((a,b) => (a.dataHoraMs||0) - (b.dataHoraMs||0));
  let html = "";

  sorted.forEach(ev => {
    const dt = ev.dataHoraMs
      ? new Date(ev.dataHoraMs).toLocaleString("pt-BR",{ dateStyle:"short", timeStyle:"short" })
      : "—";
    const escola = ev.cie ? agendaEscolasCached.find(s => s.cie === ev.cie) : null;
    const escolaNome = escola ? escola.nome : (ev.cie || "");

    html += `
      <div class="listaEvento" data-id="${escapeHtml(ev.id)}" role="listitem" tabindex="0">
        <div class="listaEventoData">${dt}</div>
        <div class="listaEventoInfo">
          <strong>${escapeHtml(ev.titulo)}</strong>
          ${escolaNome ? `<span class="listaEventoEscola">🏫 ${escapeHtml(escolaNome)}</span>` : ""}
          ${ev.descricao ? `<span class="listaEventoDesc">${escapeHtml(ev.descricao)}</span>` : ""}
        </div>
      </div>`;
  });

  agendaListaEl.innerHTML = html;

  agendaListaEl.querySelectorAll(".listaEvento").forEach(item => {
    item.addEventListener("click", () => openEventoDetalhe(item.dataset.id));
    item.addEventListener("keypress", e => { if(e.key === "Enter") openEventoDetalhe(item.dataset.id); });
  });
}

// --- Modal criar/editar evento ---

function abrirModalNovoEvento(dataInicial){
  currentEventoEditId = null;
  if(formEvento) formEvento.reset();
  const titleEl = $("modalEventoTitle");
  if(titleEl) titleEl.textContent = "Novo Evento";
  if(dataInicial && eventoDataHora){
    eventoDataHora.value = dtLocalValue(dataInicial.getTime());
  }
  setMsg(eventoFormMsg,"","");
  if(modalEvento) modalEvento.style.display = "flex";
}

function abrirModalEditarEvento(ev){
  currentEventoEditId = ev.id;
  if(eventoTitulo)   eventoTitulo.value    = ev.titulo    || "";
  if(eventoDescricao) eventoDescricao.value = ev.descricao || "";
  if(eventoEscola)   eventoEscola.value    = ev.cie       || "";
  if(eventoDataHora && ev.dataHoraMs){
    eventoDataHora.value = dtLocalValue(ev.dataHoraMs);
  }
  const titleEl = $("modalEventoTitle");
  if(titleEl) titleEl.textContent = "Editar Evento";
  setMsg(eventoFormMsg,"","");
  if(modalEventoDetalhe) modalEventoDetalhe.style.display = "none";
  if(modalEvento)        modalEvento.style.display = "flex";
}

formEvento?.addEventListener("submit", async e => {
  e.preventDefault();

  const titulo     = eventoTitulo?.value.trim()   || "";
  const dataHoraVal= eventoDataHora?.value         || "";
  const cie        = eventoEscola?.value           || "";
  const descricao  = eventoDescricao?.value.trim() || "";

  if(!titulo)      return setMsg(eventoFormMsg,"Informe o título","err");
  if(!dataHoraVal) return setMsg(eventoFormMsg,"Informe a data e hora","err");

  const dataHoraMs = new Date(dataHoraVal).getTime();
  const dados = { titulo, dataHoraMs, cie, descricao, criadoPor: currentUid(), criadoEm: Date.now() };

  try{
    if(currentEventoEditId){
      await setDoc(doc(db,"agenda",currentUid(),"eventos",currentEventoEditId), dados, { merge:true });
    }else{
      await addDoc(collection(db,"agenda",currentUid(),"eventos"), dados);
    }
    if(modalEvento) modalEvento.style.display = "none";
    await loadEventos();
  }catch(err){
    console.error(err);
    setMsg(eventoFormMsg,"Erro ao salvar evento","err");
  }
});

// --- Modal detalhe do evento ---

async function openEventoDetalhe(eventoId){
  const ev = agendaEventos.find(e => e.id === eventoId);
  if(!ev) return;

  if(detalheEventoTitle) detalheEventoTitle.textContent = ev.titulo;

  const dt = ev.dataHoraMs
    ? new Date(ev.dataHoraMs).toLocaleString("pt-BR",{ dateStyle:"full", timeStyle:"short" })
    : "—";
  const escola = ev.cie ? agendaEscolasCached.find(s => s.cie === ev.cie) : null;
  const escolaNome = escola ? escola.nome : (ev.cie || "");

  if(detalheEventoBody){
    detalheEventoBody.innerHTML = `
      <div class="detalheItem"><span class="detalheLabel">📆 Data/Hora:</span>${escapeHtml(dt)}</div>
      ${escolaNome ? `<div class="detalheItem"><span class="detalheLabel">🏫 Escola:</span>${escapeHtml(escolaNome)}</div>` : ""}
      ${ev.descricao ? `<div class="detalheItem"><span class="detalheLabel">📝 Descrição:</span>${escapeHtml(ev.descricao)}</div>` : ""}`;
  }

  if(detalheEventoAcoes){
    if(isDono()){
      detalheEventoAcoes.innerHTML = `
        <button class="btn primary" id="btnEditarEvento">✏️ Editar</button>
        <button class="btn" id="btnExcluirEvento" style="background:var(--error);color:white">🗑️ Excluir</button>`;

      $("btnEditarEvento")?.addEventListener("click", () => abrirModalEditarEvento(ev));
      $("btnExcluirEvento")?.addEventListener("click", async () => {
        if(!confirm("Excluir este evento?")) return;
        await deleteDoc(doc(db,"agenda",currentUid(),"eventos",eventoId));
        if(modalEventoDetalhe) modalEventoDetalhe.style.display = "none";
        await loadEventos();
      });
    }else{
      detalheEventoAcoes.innerHTML = "";
    }
  }

  await loadComentarios(eventoId);

  if(novoComentarioTexto) novoComentarioTexto.value = "";

  if(btnSalvarComentario){
    btnSalvarComentario.onclick = async () => {
      const texto = novoComentarioTexto?.value.trim();
      if(!texto) return;
      await salvarComentario(eventoId, texto);
      if(novoComentarioTexto) novoComentarioTexto.value = "";
      await loadComentarios(eventoId);
    };
  }

  if(modalEventoDetalhe) modalEventoDetalhe.style.display = "flex";
}

// --- Comentários ---

async function loadComentarios(eventoId){
  if(!detalheComentarios) return;
  try{
    const colRef = collection(db,"agenda",agendaViewUid,"eventos",eventoId,"comentarios");
    const snap   = await getDocs(colRef);
    const items  = [];
    snap.forEach(d => items.push({ id:d.id, ...d.data() }));
    items.sort((a,b) => (a.criadoEm||0) - (b.criadoEm||0));

    if(items.length === 0){
      detalheComentarios.innerHTML = `<div class="msg err" style="display:block;margin-bottom:12px">Sem comentários ainda.</div>`;
      return;
    }

    let html = "";
    items.forEach(c => {
      const dt = c.criadoEm
        ? new Date(c.criadoEm).toLocaleString("pt-BR",{ dateStyle:"short", timeStyle:"short" })
        : "";
      const isMeu = c.autorUid === currentUid();
      html += `
        <div class="commentItem${isMeu ? " meu" : ""}">
          <div class="commentHeader">
            <strong>${escapeHtml(c.autorNome || c.autorUid)}</strong>
            <span class="commentDate">${dt}</span>
            ${isMeu
              ? `<button class="btnDeleteComment" data-comment-id="${escapeHtml(c.id)}" data-evento-id="${escapeHtml(eventoId)}">🗑️</button>`
              : ""}
          </div>
          <div class="commentBody">${escapeHtml(c.texto)}</div>
        </div>`;
    });

    detalheComentarios.innerHTML = html;

    detalheComentarios.querySelectorAll(".btnDeleteComment").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        if(!confirm("Excluir comentário?")) return;
        await deleteDoc(doc(db,"agenda",agendaViewUid,"eventos",btn.dataset.eventoId,"comentarios",btn.dataset.commentId));
        await loadComentarios(btn.dataset.eventoId);
      });
    });
  }catch(err){
    console.error(err);
    detalheComentarios.innerHTML = `<div class="msg err" style="display:block">Erro ao carregar comentários.</div>`;
  }
}

async function salvarComentario(eventoId, texto){
  await addDoc(collection(db,"agenda",agendaViewUid,"eventos",eventoId,"comentarios"),{
    texto,
    autorUid: currentUid(),
    autorNome: getUserFirstName(),
    criadoEm: Date.now()
  });
}

// --- Modal compartilhamento ---

async function abrirModalCompartilhar(){
  if(!listaUsuariosCompartilhar) return;
  listaUsuariosCompartilhar.innerHTML = "<p>Carregando...</p>";
  if(modalCompartilhar) modalCompartilhar.style.display = "flex";

  const meuUid = currentUid();

  let compartilhadoCom = [];
  try{
    const agendaDoc = await getDoc(doc(db,"agenda",meuUid));
    if(agendaDoc.exists()) compartilhadoCom = agendaDoc.data().compartilhadoCom || [];
  }catch(e){}

  const usuarios = await loadUsuarios();
  const outros   = usuarios.filter(u => u.uid !== meuUid);

  if(outros.length === 0){
    listaUsuariosCompartilhar.innerHTML = `<p class="hint">Nenhum outro usuário cadastrado no sistema.</p>`;
    return;
  }

  let html = "";
  outros.forEach(u => {
    const checked = compartilhadoCom.includes(u.uid) ? "checked" : "";
    html += `
      <label class="usuarioShareItem" role="listitem">
        <input type="checkbox" value="${escapeHtml(u.uid)}" ${checked}>
        <span>${escapeHtml(u.nome)} <small>${escapeHtml(u.email)}</small></span>
      </label>`;
  });
  listaUsuariosCompartilhar.innerHTML = html;
}

btnConfirmarCompartilhar?.addEventListener("click", async () => {
  const meuUid    = currentUid();
  const checkboxes= listaUsuariosCompartilhar?.querySelectorAll("input[type=checkbox]") || [];
  const selecionados = [];
  checkboxes.forEach(cb => { if(cb.checked) selecionados.push(cb.value); });

  try{
    await setDoc(doc(db,"agenda",meuUid),{
      compartilhadoCom: selecionados,
      nomeProprietario: getUserFirstName(),
      emailProprietario: auth.currentUser?.email || ""
    },{ merge:true });

    if(modalCompartilhar) modalCompartilhar.style.display = "none";
    await loadAgendaSelector();
  }catch(err){
    console.error(err);
    alert("Erro ao salvar compartilhamento");
  }
});

// --- View toggle ---

btnViewCalendario?.addEventListener("click", () => {
  agendaView = "calendario";
  btnViewCalendario.classList.add("active");
  btnViewLista?.classList.remove("active");
  if(agendaCalendario) agendaCalendario.style.display = "block";
  if(agendaListaEl)    agendaListaEl.style.display    = "none";
  renderCalendario(agendaEventos, agendaMes, agendaAno);
});

btnViewLista?.addEventListener("click", () => {
  agendaView = "lista";
  btnViewLista.classList.add("active");
  btnViewCalendario?.classList.remove("active");
  if(agendaCalendario) agendaCalendario.style.display = "none";
  if(agendaListaEl)    agendaListaEl.style.display    = "block";
  renderListaEventos(agendaEventos);
});

// --- Navegação de mês ---

btnMesAnterior?.addEventListener("click", () => {
  agendaMes--;
  if(agendaMes < 0){ agendaMes = 11; agendaAno--; }
  renderCalendario(agendaEventos, agendaMes, agendaAno);
});

btnProximoMes?.addEventListener("click", () => {
  agendaMes++;
  if(agendaMes > 11){ agendaMes = 0; agendaAno++; }
  renderCalendario(agendaEventos, agendaMes, agendaAno);
});

// --- Seletor de agenda ---

agendaSelector?.addEventListener("change", () => {
  agendaViewUid = agendaSelector.value;
  if(btnNovoEvento) btnNovoEvento.style.display = isDono() ? "inline-flex" : "none";
  loadEventos();
});

// --- Botões globais ---

btnNovoEvento?.addEventListener("click", () => {
  if(!isDono()) return;
  abrirModalNovoEvento(new Date());
});

btnCompartilharAgenda?.addEventListener("click", abrirModalCompartilhar);

btnFecharModalEvento?.addEventListener("click", () => { if(modalEvento) modalEvento.style.display = "none"; });
btnCancelarEvento?.addEventListener("click",    () => { if(modalEvento) modalEvento.style.display = "none"; });
modalEvento?.addEventListener("click", e => { if(e.target === modalEvento) modalEvento.style.display = "none"; });

btnFecharDetalhe?.addEventListener("click", () => { if(modalEventoDetalhe) modalEventoDetalhe.style.display = "none"; });
modalEventoDetalhe?.addEventListener("click", e => { if(e.target === modalEventoDetalhe) modalEventoDetalhe.style.display = "none"; });

btnFecharCompartilhar?.addEventListener("click", () => { if(modalCompartilhar) modalCompartilhar.style.display = "none"; });
modalCompartilhar?.addEventListener("click", e => { if(e.target === modalCompartilhar) modalCompartilhar.style.display = "none"; });