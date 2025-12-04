// script.js — Versão integrada com Firebase (Modelo A – Tempo Real)

// utilitários
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const nowISO = () => new Date().toISOString();
const uid = () => Date.now().toString();
function escapeHtml(s){ 
  return (s||'').toString()
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;'); 
}

// constantes de preço
const PRICE_INTEIRA = 35.90;
const PRICE_MEIA = 17.95;
const PRICE_CORTESIA = 0;

// ESTADO (será substituído pelo Firebase-sync.js)
let cadastros = JSON.parse(localStorage.getItem('cadastros') || '[]');
let cameraStream = null;
let currentOperator = '';
let idEmEdicao = null;

/* UI refs */
const tabs = $$('nav button');
const sections = $$('.tab');
const form = $('#formCadastro');
const dataNascimentoInput = form ? form.elements['dataNascimento'] : null;
const idadeInput = form ? form.elements['idade'] : null;
const temAlergiaSelect = $('#temAlergia');
const alergiaLabel = $('#alergiaLabel');
const alturaSelect = $('#alturaSelect');
const saiSozinhoSelect = $('#saiSozinhoSelect');
const liveBadge = $('#liveBadge');
const qrDiv = $('#qrCodeCadastro');
const inputBusca = $('#inputBusca');
const listaBusca = $('#listaBusca');
const listaHistoricoContainer = $('#listaHistoricoContainer');
const btnStartCamera = $('#btnStartCamera');
const btnStopCamera = $('#btnStopCamera');
const btnScanNow = $('#btnScanNow');
const video = $('#video');
const canvas = $('#scanCanvas');
const scanMessage = $('#scanMessage');
const btnRegistrarManual = $('#btnRegistrarManual');
const btnGerarTodosQR = $('#btnGerarTodosQR');
const btnDownloadQR = $('#btnDownloadQR');
const btnPrintLabel = $('#btnPrintLabel');
const btnPrintLabelSmall = $('#btnPrintLabelSmall');
const btnExportJSON = $('#btnExportJSON');
const btnLimparTudo = $('#btnLimparTudo');
const marketingList = $('#marketingList');
const btnSelectAll = $('#btnSelectAll');
const btnClearAll = $('#btnClearAll');
const btnSendToSelected = $('#btnSendToSelected');
const marketingMessage = $('#marketingMessage');
const marketingImage = $('#marketingImage');
const tipoIngressoSel = $('#tipoIngresso');
const meiaMotivoWrapper = $('#meiaMotivoWrapper');
const meiaMotivoSel = $('#meiaMotivo');

/* Impressão refs */
const quickFilter = $('#quickFilter');
const filterFrom = $('#filterFrom');
const filterTo = $('#filterTo');
const btnFiltrar = $('#btnFiltrar');
const btnImprimirFiltro = $('#btnImprimirFiltro');
const relatorioPreview = $('#relatorioPreview');
const faturamentoResumo = $('#faturamentoResumo');
const btnVoltarImpressao = $('#btnVoltarImpressao');
const impressaoObservacoes = $('#impressaoObservacoes');

const histFrom = $('#histFrom');
const histTo = $('#histTo');
const btnFilterHistorico = $('#btnFilterHistorico');
const btnResetHistorico = $('#btnResetHistorico');

/* Tabs */
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  sections.forEach(s => s.classList.remove('active'));
  const target = document.getElementById(t.dataset.tab);
  if (target) target.classList.add('active');
}));

/* Age calculation */
if (dataNascimentoInput && idadeInput) {
  dataNascimentoInput.addEventListener('change', () => {
    const v = dataNascimentoInput.value;
    if (!v) { idadeInput.value = ''; return; }
    const d = new Date(v);
    if (isNaN(d.getTime())) { idadeInput.value = ''; return; }
    idadeInput.value = calcularIdade(d);
  });
}

function calcularIdade(dob){
  const hoje = new Date();
  let idade = hoje.getFullYear() - dob.getFullYear();
  const m = hoje.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < dob.getDate())) idade--;
  return idade;
}

/* meia motivo toggle */
if (tipoIngressoSel) {
  tipoIngressoSel.addEventListener('change', () => {
    if (tipoIngressoSel.value === 'meia') 
      meiaMotivoWrapper.style.display = 'block';
    else { 
      meiaMotivoWrapper.style.display = 'none'; 
      meiaMotivoSel.value = ''; 
    }
  });
}

/* alergia toggle */
if (temAlergiaSelect) {
  temAlergiaSelect.addEventListener('change', () => {
    alergiaLabel.style.display = 
      (temAlergiaSelect.value === 'sim') ? 'block' : 'none';
  });
}

/* live badge */
function updateLiveBadge(){
  const altura = (alturaSelect && alturaSelect.value) || 'menor';
  const saiSozinho = (saiSozinhoSelect && saiSozinhoSelect.value) || 'nao';
  
  if (saiSozinho === 'sim') {
    liveBadge.className = 'badge green';
    liveBadge.textContent = 'SAI SOZINHO';
  } else {
    if (altura === 'maior') {
      liveBadge.className = 'badge yellow';
      liveBadge.textContent = 'MAIOR > 1m (NÃO SAI)';
    } else {
      liveBadge.className = 'badge red';
      liveBadge.textContent = 'NÃO SAI SOZINHO';
    }
  }
}
if (alturaSelect) alturaSelect.addEventListener('change', updateLiveBadge);
if (saiSozinhoSelect) saiSozinhoSelect.addEventListener('change', updateLiveBadge);
updateLiveBadge();

/* salvar local + enviar para firebase (altera TODA a lógica) */
function saveCadastros(){
  localStorage.setItem('cadastros', JSON.stringify(cadastros));
}

// 🔥 MODELO A: sempre salva local + sobe p/ firebase
function saveCadastrosFirebase(){
  saveCadastros();
  if (typeof syncUpload === "function") {
    syncUpload(cadastros); // sobe p/ nuvem
  }
}

/* helper: traz cadastro para o topo */
function bringToTop(id){
  const idx = cadastros.findIndex(c => c.id === id);
  if (idx === -1) return;
  const [item] = cadastros.splice(idx,1);
  cadastros.unshift(item);
} 
/* ============================================================
   FORM SUBMIT (criar ou editar)
   ============================================================ */
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();

    const tipoIngresso = form.elements['tipoIngresso'].value || 'inteira';
    const meiaMotivo = form.elements['meiaMotivo'].value || '';
    const nome = (form.elements['nome'].value || '').trim();
    const dataNascimento = form.elements['dataNascimento'].value;
    const idade = form.elements['idade'].value || calcularIdade(new Date(dataNascimento));
    const responsavel = (form.elements['responsavel'].value || '').trim();
    const telefone = (form.elements['telefone'].value || '').trim();
    const email = (form.elements['email'].value || '').trim();
    const setor = (form.elements['setor'].value || '').trim();
    const mesa = (form.elements['mesa'].value || '').trim();
    const temAlergia = (form.elements['temAlergia'].value || 'nao');
    const qualAlergia = (form.elements['qualAlergia'].value || '').trim();
    const altura = (form.elements['altura'].value || 'menor');
    const saiSozinho = (form.elements['saiSozinho'].value || 'nao');
    const observacoes = (form.elements['observacoes'].value || '').trim();

    if (!nome || !dataNascimento) {
      alert("Preencha nome e data de nascimento");
      return;
    }

    /* ---------- EDITAR ---------- */
    if (idEmEdicao) {
      const idx = cadastros.findIndex(c => c.id === idEmEdicao);
      if (idx === -1) { alert("Erro ao editar"); idEmEdicao = null; return; }

      cadastros[idx] = {
        ...cadastros[idx],
        tipoIngresso, meiaMotivo, nome, dataNascimento, idade,
        responsavel, telefone, email, setor, mesa,
        temAlergia, qualAlergia, altura, saiSozinho, observacoes
      };

      saveCadastrosFirebase();
      idEmEdicao = null;

      alert("Cadastro atualizado!");
      form.reset();
      idadeInput.value = "";
      alergiaLabel.style.display = "none";
      meiaMotivoWrapper.style.display = "none";
      updateLiveBadge();
      renderHistorico();
      renderMarketingList();
      return;
    }

    /* ---------- NOVO CADASTRO ---------- */
    const novo = {
      id: uid(),
      tipoIngresso, meiaMotivo, nome, dataNascimento, idade,
      responsavel, telefone, email, setor, mesa,
      temAlergia, qualAlergia, altura, saiSozinho, observacoes,
      entradas: [],
      saidas: [],
      status: "fora",
      createdAt: nowISO()
    };

    cadastros.unshift(novo);
    saveCadastrosFirebase();
    generateQRCodeCanvas(novo.id);

    alert("Cadastro salvo!");
    form.reset();
    idadeInput.value = "";
    alergiaLabel.style.display = "none";
    meiaMotivoWrapper.style.display = "none";
    updateLiveBadge();
    renderHistorico();
    renderMarketingList();
  });
}

/* ============================================================
   QR CODE
   ============================================================ */
function generateQRCodeCanvas(id){
  qrDiv.innerHTML = "";
  QRCode.toCanvas(id, { width: 160 }, (err, canvasEl) => {
    if (err) return console.error(err);
    qrDiv.appendChild(canvasEl);
  });
}

if (btnDownloadQR) {
  btnDownloadQR.addEventListener('click', () => {
    const c = qrDiv.querySelector("canvas");
    if (!c) return alert("Nenhum QR gerado.");
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "qr.png";
    a.click();
  });
}

/* ============================================================
   BUSCA
   ============================================================ */
if (inputBusca) {
  inputBusca.addEventListener('input', () => {
    const termo = inputBusca.value.toLowerCase().trim();
    listaBusca.innerHTML = "";
    if (!termo) return;

    const results = cadastros.filter(c =>
      (c.nome || '').toLowerCase().includes(termo) ||
      (c.telefone || '').includes(termo) ||
      (c.email || '').toLowerCase().includes(termo) ||
      (c.mesa || '').toLowerCase().includes(termo) ||
      (c.id || '').includes(termo)
    );

    results.forEach(c => {
      const li = document.createElement('li');
      li.className = "card";

      const tipoLabel = 
        c.tipoIngresso === "inteira" ? "Inteira" : 
        c.tipoIngresso === "meia" ? `Meia (${c.meiaMotivo})` :
        "Cortesia";

      li.innerHTML = `
        <strong>${escapeHtml(c.nome)}</strong><br>
        <small>${c.idade} anos</small><br>
        <small>Setor: ${escapeHtml(c.setor || '-')} • Mesa: ${escapeHtml(c.mesa || '-')}</small><br>
        <div class="row" style="margin-top:8px">
          <button data-id="${c.id}" class="btnRegistrar">Entrada/Saída</button>
          <button data-id="${c.id}" class="btnAlterar">Alterar</button>
          <button data-id="${c.id}" class="btnPrintSmall">Etiqueta</button>
        </div>
      `;

      listaBusca.appendChild(li);
    });

    $$('.btnAlterar').forEach(b => b.addEventListener('click', e => abrirEdicao(e.target.dataset.id)));
    $$('.btnRegistrar').forEach(b => b.addEventListener('click', e => registrarEntradaSaida(e.target.dataset.id)));
    $$('.btnPrintSmall').forEach(b => b.addEventListener('click', e => {
      const c = cadastros.find(x => x.id === e.target.dataset.id);
      if (c) {
        QRCode.toDataURL(String(c.id), { width: 200 }).then(url => {
          printLabelForCadastro(c, url, 'small');
        });
      }
    }));
  });
} 
/* ============================================================
   HISTÓRICO
   ============================================================ */
function renderHistorico(list = null) {
  if (!listaHistoricoContainer) return;
  const dados = list || cadastros;

  listaHistoricoContainer.innerHTML = "";

  if (!dados.length) {
    listaHistoricoContainer.innerHTML = "<p>Nenhum cadastro registrado.</p>";
    return;
  }

  dados.forEach(c => {
    const div = document.createElement("div");
    div.className = "card";

    const entradas = (c.entradas || []).slice().reverse();
    const saidas = (c.saidas || []).slice().reverse();

    div.innerHTML = `
      <strong>${escapeHtml(c.nome)}</strong> — ${c.idade} anos<br>
      <small>Setor: ${escapeHtml(c.setor || '-')} • Mesa: ${escapeHtml(c.mesa || '-')}</small><br>
      <small>Status: ${c.status === "dentro" ? "🟢 Dentro" : "🔴 Fora"}</small>
      <hr>
      <strong>Entradas:</strong><br>
      ${entradas.length ? entradas.map(e => `${new Date(e.ts).toLocaleString()} — ${escapeHtml(e.operator || '')}`).join("<br>") : "-"}
      <br><br>
      <strong>Saídas:</strong><br>
      ${saidas.length ? saidas.map(s => `${new Date(s.ts).toLocaleString()} — ${escapeHtml(s.operator || '')} ${s.blocked ? "(BLOQUEADA)" : ""}`).join("<br>") : "-"}
      <br><br>
      <div class="row">
        <button class="btnRegistrar" data-id="${c.id}">Entrada/Saída</button>
        <button class="btnImprimirFicha" data-id="${c.id}">Ficha</button>
        <button class="btnPrintSmall" data-id="${c.id}">Etiqueta</button>
        <button class="btnAlterar" data-id="${c.id}">Alterar</button>
        <button class="btnExcluir" data-id="${c.id}">Excluir</button>
      </div>
    `;

    listaHistoricoContainer.appendChild(div);
  });

  // Eventos
  $$('.btnRegistrar').forEach(b => b.addEventListener('click', e => registrarEntradaSaida(e.target.dataset.id)));
  $$('.btnAlterar').forEach(b => b.addEventListener('click', e => abrirEdicao(e.target.dataset.id)));
  $$('.btnImprimirFicha').forEach(b => b.addEventListener('click', e => imprimirFicha(e.target.dataset.id)));
  $$('.btnExcluir').forEach(b => b.addEventListener('click', e => excluirCadastro(e.target.dataset.id)));
  $$('.btnPrintSmall').forEach(b => b.addEventListener('click', e => {
    const c = cadastros.find(x => x.id === e.target.dataset.id);
    if (c) QRCode.toDataURL(String(c.id), { width: 200 }).then(url => printLabelForCadastro(c, url, 'small'));
  }));
}

/* ============================================================
   REGISTRAR ENTRADA / SAÍDA
   ============================================================ */
function registrarEntradaSaida(id) {
  const c = cadastros.find(x => x.id === id);
  if (!c) return alert("Cadastro não encontrado.");

  const operador = prompt("Nome do operador:", "") || "Operador";

  if (c.status === "fora") {
    c.entradas.push({ ts: nowISO(), operator: operador });
    c.status = "dentro";
    alert(`Entrada registrada para ${c.nome}`);

  } else {
    if (c.saiSozinho !== "sim") {
      alert(`${c.nome} NÃO PODE sair sozinho!`);
      c.saidas.push({ ts: nowISO(), operator: operador, blocked: true });
    } else {
      c.saidas.push({ ts: nowISO(), operator: operador });
      c.status = "fora";
      alert(`Saída registrada para ${c.nome}`);
    }
  }

  bringToTop(id);
  saveCadastrosFirebase();
  renderHistorico();
  renderMarketingList();
}

/* ============================================================
   IMPRESSÃO
   ============================================================ */
function imprimirFicha(id) {
  const c = cadastros.find(x => x.id === id);
  if (!c) return alert("Erro ao imprimir.");

  const entradas = c.entradas.map(e => `${new Date(e.ts).toLocaleString()} — ${e.operator}`).join("<br>") || "-";
  const saidas = c.saidas.map(s => `${new Date(s.ts).toLocaleString()} — ${s.operator}`).join("<br>") || "-";

  const w = window.open("", "_blank");

  w.document.write(`
    <html>
    <head><meta charset="utf-8"><title>Ficha</title></head>
    <body>
      <button onclick="window.close()">Voltar</button>
      <h2>${escapeHtml(c.nome)}</h2>
      <p><strong>Idade:</strong> ${c.idade}</p>
      <p><strong>Setor:</strong> ${escapeHtml(c.setor || '-')}</p>
      <p><strong>Mesa:</strong> ${escapeHtml(c.mesa || '-')}</p>

      <h3>Entradas</h3>
      ${entradas}

      <h3>Saídas</h3>
      ${saidas}
    </body>
    </html>
  `);

  w.document.close();
  setTimeout(() => w.print(), 300);
}

/* ============================================================
   EXCLUIR CADASTRO
   ============================================================ */
function excluirCadastro(id) {
  const senha = prompt("Digite a senha para excluir:", "");
  if (senha !== "tds_1992") return alert("Senha incorreta.");

  if (!confirm("Excluir permanentemente?")) return;

  cadastros = cadastros.filter(c => c.id !== id);

  saveCadastrosFirebase();
  renderHistorico();
  renderMarketingList();
}

/* ============================================================
   VCF — Salvar Contato
   ============================================================ */
function gerarVCF(c) {
  const nomeVCF = `${c.nome} (${c.responsavel || "Responsável"})`;
  return `BEGIN:VCARD
VERSION:3.0
FN:${nomeVCF}
TEL;TYPE=CELL:${c.telefone || ""}
EMAIL:${c.email || ""}
NOTE:Setor: ${c.setor || "-"} • Mesa: ${c.mesa || "-"}
END:VCARD`;
}

function baixarVCFIndividualById(id) {
  const c = cadastros.find(x => x.id === id);
  if (!c) return;

  const blob = new Blob([gerarVCF(c)], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${c.nome}.vcf`;
  a.click();

  URL.revokeObjectURL(url);
} 
/* ============================================================
   PARTE 4 — SINCRONIZAÇÃO FIREBASE (Realtime) + FINALIZAÇÃO
   (modo compat usando firebase-firestore-compat)
   ============================================================ */

// variáveis de controle da sincronização
let unsubscribeFirestore = null;
let suppressLocalSave = false; // evita loop simples entre local <-> firestore

/**
 * Salva todos os cadastros no Firestore (sincroniza)
 * - seta/atualiza cada doc com id = cadastro.id
 * - remove do Firestore docs que não existem mais localmente
 */
function saveCadastrosFirebase() {
  try {
    // primeiro salva local
    localStorage.setItem('cadastros', JSON.stringify(cadastros));

    // evita que o snapshot remova/colete durante escrita - simples debounce
    suppressLocalSave = true;

    // atualiza/insere cada cadastro no Firestore
    const batchPromises = cadastros.map(c => {
      const docRef = db.collection('cadastros').doc(String(c.id));
      // escreve o documento (sem campos pesados desnecessários)
      return docRef.set({
        id: c.id,
        nome: c.nome,
        dataNascimento: c.dataNascimento,
        idade: c.idade,
        responsavel: c.responsavel,
        telefone: c.telefone,
        email: c.email,
        setor: c.setor,
        mesa: c.mesa,
        tipoIngresso: c.tipoIngresso,
        meiaMotivo: c.meiaMotivo,
        temAlergia: c.temAlergia,
        qualAlergia: c.qualAlergia,
        altura: c.altura,
        saiSozinho: c.saiSozinho,
        observacoes: c.observacoes,
        entradas: c.entradas || [],
        saidas: c.saidas || [],
        status: c.status || 'fora',
        createdAt: c.createdAt || nowISO(),
        updatedAt: nowISO()
      }, { merge: true });
    });

    // após gravar todos, removemos do Firestore documentos que não existem mais localmente
    Promise.all(batchPromises)
      .then(() => {
        return db.collection('cadastros').get();
      })
      .then(snapshot => {
        const localIds = new Set(cadastros.map(x => String(x.id)));
        const removals = [];
        snapshot.forEach(doc => {
          if (!localIds.has(doc.id)) {
            removals.push(doc.ref.delete().catch(()=>{/* ignore */}));
          }
        });
        return Promise.all(removals);
      })
      .catch(err => console.warn('saveCadastrosFirebase erro:', err))
      .finally(() => {
        // liberar flag depois de curto delay
        setTimeout(()=> suppressLocalSave = false, 600);
      });

  } catch (err) {
    console.error('Erro ao salvar cadastros no Firebase', err);
    suppressLocalSave = false;
  }
}

/**
 * Inicia listener em tempo real (onSnapshot) para a coleção 'cadastros'
 * Recebe alterações remotas e aplica localmente.
 */
function startRealtimeSync() {
  if (!db) {
    console.warn('Firestore não inicializado. startRealtimeSync abortado.');
    return;
  }
  if (unsubscribeFirestore) unsubscribeFirestore();

  unsubscribeFirestore = db.collection('cadastros')
    .onSnapshot(snapshot => {
      if (suppressLocalSave) {
        // se estivermos no ciclo de escrita local->remote, ignoramos
        return;
      }

      // mapa local por id para fácil manipulação
      const localMap = new Map(cadastros.map(c => [String(c.id), c]));

      // aplicar mudanças do snapshot
      snapshot.docChanges().forEach(change => {
        const doc = change.doc;
        const data = doc.data();
        const id = String(doc.id);

        if (change.type === 'added' || change.type === 'modified') {
          // construir objeto compatível com o app
          const obj = {
            id: id,
            nome: data.nome || '',
            dataNascimento: data.dataNascimento || '',
            idade: data.idade || '',
            responsavel: data.responsavel || '',
            telefone: data.telefone || '',
            email: data.email || '',
            setor: data.setor || '',
            mesa: data.mesa || '',
            tipoIngresso: data.tipoIngresso || 'inteira',
            meiaMotivo: data.meiaMotivo || '',
            temAlergia: data.temAlergia || 'nao',
            qualAlergia: data.qualAlergia || '',
            altura: data.altura || 'menor',
            saiSozinho: data.saiSozinho || 'nao',
            observacoes: data.observacoes || '',
            entradas: data.entradas || [],
            saidas: data.saidas || [],
            status: data.status || 'fora',
            createdAt: data.createdAt || nowISO()
          };

          // replace or add in cadastros
          const idx = cadastros.findIndex(x => String(x.id) === id);
          if (idx === -1) {
            cadastros.unshift(obj);
          } else {
            cadastros[idx] = { ...cadastros[idx], ...obj };
          }
        } else if (change.type === 'removed') {
          cadastros = cadastros.filter(x => String(x.id) !== id);
        }
      });

      // garantir ordenação (mais recentes no topo)
      cadastros.sort((a,b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      // gravar local e atualizar UI
      localStorage.setItem('cadastros', JSON.stringify(cadastros));
      renderHistorico();
      renderMarketingList();
    }, err => {
      console.warn('onSnapshot erro:', err);
    });
}

/**
 * Para o listener (se necessário)
 */
function stopRealtimeSync() {
  if (unsubscribeFirestore) {
    unsubscribeFirestore();
    unsubscribeFirestore = null;
  }
}

/* Garantir salvar antes de fechar (fallback) */
window.addEventListener('beforeunload', () => {
  try { localStorage.setItem('cadastros', JSON.stringify(cadastros)); } catch(e){}
});

/* Inicialização / ligar sync automático */
(function startSyncIfConfigured(){
  // se db existir (firebase-config.js já carregado), inicia sync
  if (typeof db !== 'undefined' && db) {
    console.log('Iniciando sincronização Firestore (realtime)...');
    startRealtimeSync();
  } else {
    console.warn('Firestore não encontrado — certifique-se de carregar firebase-config.js antes do script.');
  }
})();

/* Hooks de UI: quando for feita alteração local (criar/editar/excluir/registro),
   os lugares que chamam saveCadastros() devem chamar saveCadastrosFirebase() ao invés.
   Para compatibilidade, sobrescrevemos saveCadastros para também enviar ao Firebase. */

function saveCadastros(){
  // salvamento local já existe, mas priorizamos a função Firebase
  try {
    localStorage.setItem('cadastros', JSON.stringify(cadastros));
  } catch(e){ console.warn('Erro ao gravar localStorage', e); }
  // se Firestore disponível, sincroniza
  if (typeof db !== 'undefined' && db) {
    saveCadastrosFirebase();
  }
}

/* Se o seu código já chamava saveCadastros(), agora ele chamará essa função que replica também no Firebase. */

/* Fim da Parte 4 */
