// script.js — Versão final com integração Firebase (MODELO 1 – Opção A)

// -------------------------------------------------------------
// UTILITÁRIOS
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// CONSTANTES DE PREÇO
// -------------------------------------------------------------
const PRICE_INTEIRA = 35.90;
const PRICE_MEIA = 17.95;
const PRICE_CORTESIA = 0;

// -------------------------------------------------------------
// ESTADO INICIAL (CARREGA LOCAL + FIREBASE IRÁ ATUALIZAR)
// -------------------------------------------------------------
let cadastros = JSON.parse(localStorage.getItem('cadastros') || '[]');
let cameraStream = null;
let currentOperator = '';
let idEmEdicao = null;

// -------------------------------------------------------------
// UI REFERENCES
// -------------------------------------------------------------
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

// IMPRESSÃO
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

// -------------------------------------------------------------
// TABS
// -------------------------------------------------------------
tabs.forEach(t =>
  t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');

    sections.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(t.dataset.tab);
    if (target) target.classList.add('active');
  })
);

// -------------------------------------------------------------
// CALCULAR IDADE AUTOMÁTICO
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// MOSTRAR CAMPO "MOTIVO DA MEIA"
// -------------------------------------------------------------
if (tipoIngressoSel) {
  tipoIngressoSel.addEventListener('change', () => {
    if (tipoIngressoSel.value === 'meia') {
      meiaMotivoWrapper.style.display = 'block';
    } else {
      meiaMotivoWrapper.style.display = 'none';
      meiaMotivoSel.value = '';
    }
  });
}

// -------------------------------------------------------------
// MOSTRAR CAMPO ALERGIA
// -------------------------------------------------------------
if (temAlergiaSelect) {
  temAlergiaSelect.addEventListener('change', () => {
    alergiaLabel.style.display = (temAlergiaSelect.value === 'sim') ? 'block' : 'none';
  });
}

// -------------------------------------------------------------
// BADGE AO VIVO DO FORMULÁRIO
// -------------------------------------------------------------
function updateLiveBadge(){
  const altura = alturaSelect?.value || 'menor';
  const saiSozinho = saiSozinhoSelect?.value || 'nao';

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

alturaSelect?.addEventListener('change', updateLiveBadge);
saiSozinhoSelect?.addEventListener('change', updateLiveBadge);
updateLiveBadge();

// -------------------------------------------------------------
// SALVAR LOCAL
// -------------------------------------------------------------
function saveCadastros(){
  localStorage.setItem('cadastros', JSON.stringify(cadastros));
}

// -------------------------------------------------------------
// MOVER CADASTRO PARA O TOPO (MELHOR VISUALIZAÇÃO)
// -------------------------------------------------------------
function bringToTop(id){
  const idx = cadastros.findIndex(c => c.id === id);
  if (idx === -1) return;
  const [item] = cadastros.splice(idx,1);
  cadastros.unshift(item);
}

// -------------------------------------------------------------
// A PARTIR DAQUI VEM O FORM SUBMIT (CRIAR OU EDITAR)
// -------------------------------------------------------------
//  👉 ESTA PARTE CONTINUA NA "PARTE 2"
// -------------------------------------------------------------
// -------------------------------------------------------------
// FORM SUBMIT (CRIAR NOVO CADASTRO OU EDITAR EXISTENTE)
// -------------------------------------------------------------
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();

    const tipoIngresso = form.elements['tipoIngresso'].value;
    const meiaMotivo = form.elements['meiaMotivo'].value;
    const nome = form.elements['nome'].value.trim();
    const dataNascimento = form.elements['dataNascimento'].value;
    const idade = form.elements['idade'].value;
    const responsavel = form.elements['responsavel'].value.trim();
    const telefone = form.elements['telefone'].value.trim();
    const email = form.elements['email'].value.trim();
    const setor = form.elements['setor'].value;
    const mesa = form.elements['mesa'].value.trim();
    const temAlergia = form.elements['temAlergia'].value;
    const qualAlergia = form.elements['qualAlergia'].value.trim();
    const altura = form.elements['altura'].value;
    const saiSozinho = form.elements['saiSozinho'].value;
    const observacoes = form.elements['observacoes'].value.trim();

    if (!nome || !dataNascimento) {
      alert("Preencha nome e data de nascimento!");
      return;
    }

    // -------------------------------------------------------------
    // EDIÇÃO DE CADASTRO EXISTENTE
    // -------------------------------------------------------------
    if (idEmEdicao) {
      const idx = cadastros.findIndex(c => c.id === idEmEdicao);
      if (idx === -1) return alert("Erro ao editar!");

      cadastros[idx] = {
        ...cadastros[idx],
        tipoIngresso, meiaMotivo, nome, dataNascimento, idade,
        responsavel, telefone, email, setor, mesa,
        temAlergia, qualAlergia, altura, saiSozinho, observacoes
      };

      saveCadastros();
      uploadCadastrosToFirebase(); // SYNC PARA NUVEM

      idEmEdicao = null;
      alert("Cadastro atualizado!");
      form.reset();
      updateLiveBadge();
      renderHistorico();
      renderMarketingList();
      return;
    }

    // -------------------------------------------------------------
    // CRIAÇÃO DE NOVO CADASTRO
    // -------------------------------------------------------------
    const novo = {
      id: uid(),
      tipoIngresso,
      meiaMotivo,
      nome,
      dataNascimento,
      idade,
      responsavel,
      telefone,
      email,
      setor,
      mesa,
      temAlergia,
      qualAlergia,
      altura,
      saiSozinho,
      observacoes,
      entradas: [],
      saidas: [],
      status: "fora",
      createdAt: nowISO()
    };

    cadastros.unshift(novo);
    saveCadastros();
    uploadCadastrosToFirebase(); // SYNC PARA NUVEM

    generateQRCodeCanvas(novo.id);

    alert("Cadastro criado!");
    form.reset();
    updateLiveBadge();
    renderHistorico();
    renderMarketingList();
  });
}

// -------------------------------------------------------------
// GERAR QR CODE INDIVIDUAL
// -------------------------------------------------------------
function generateQRCodeCanvas(id){
  qrDiv.innerHTML = "";
  QRCode.toCanvas(id, { width: 160 }, (err, canvasEl) => {
    if (err) return;
    qrDiv.appendChild(canvasEl);
  });
}

// -------------------------------------------------------------
// DOWNLOAD DO QR CODE
// -------------------------------------------------------------
if (btnDownloadQR) btnDownloadQR.addEventListener("click", () => {
  const c = qrDiv.querySelector("canvas");
  if (!c) return alert("Nenhum QR disponível.");

  const url = c.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "qr.png";
  a.click();
});

// -------------------------------------------------------------
// IMPRESSÃO DE ETIQUETAS (NORMAL E PEQUENA)
// -------------------------------------------------------------
function getBadgeClass(c){
  if (c.saiSozinho === "sim") return "green";
  if (c.altura === "maior") return "yellow";
  return "red";
}

function getBadgeText(c){
  if (c.saiSozinho === "sim") return "SAI SOZINHO";
  if (c.altura === "maior") return "MAIOR > 1m";
  return "NÃO SAI SOZINHO";
}

function buildLabelHTML(cadastro, size="large"){
  return `
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial; margin: 6px; }
      .label{ width:${size==="large"?"4cm":"2.5cm"}; height:${size==="large"?"4cm":"2.5cm"};
              border:1px dashed #444; display:flex; flex-direction:column;
              justify-content:center; align-items:center; }
      .name{ font-weight:700; margin-top:4px; font-size:12px; }
      .meta{ font-size:9px; }
      .badge{ padding:3px 6px; border-radius:6px; color:#fff; font-size:9px; }
      .green{ background:#2ecc71; }
      .yellow{ background:#f1c40f; color:#000; }
      .red{ background:#e74c3c; }
    </style>
  </head>
  <body>
    <div class="label">
      <div id="qrwrap"></div>
      <div class="name">${escapeHtml(cadastro.nome)}</div>
      <div class="meta">ID: ${cadastro.id}</div>
      <div class="badge ${getBadgeClass(cadastro)}">${getBadgeText(cadastro)}</div>
    </div>

    <script>
      window.addEventListener("message", e => {
        if (e.data.qr) {
          var img = new Image();
          img.src = e.data.qr;
          img.style.width = "70%";
          document.getElementById("qrwrap").appendChild(img);
        }
      });
      window.onload = () => setTimeout(() => print(), 300);
    </script>
  </body>
  </html>`;
}

function printLabelForCadastro(cadastro, qrDataURL, size="large"){
  const w = window.open("", "_blank");
  w.document.write(buildLabelHTML(cadastro, size));
  w.document.close();
  setTimeout(() => w.postMessage({ qr: qrDataURL }, "*"), 500);
}

if (btnPrintLabel)
  btnPrintLabel.addEventListener("click", () => {
    const c = cadastros[0];
    if (!c) return;
    QRCode.toDataURL(c.id, { width: 300 })
      .then(url => printLabelForCadastro(c, url, "large"));
  });

if (btnPrintLabelSmall)
  btnPrintLabelSmall.addEventListener("click", () => {
    const c = cadastros[0];
    if (!c) return;
    QRCode.toDataURL(c.id, { width: 200 })
      .then(url => printLabelForCadastro(c, url, "small"));
  });
// -------------------------------------------------------------
// REGISTRAR ENTRADA / SAÍDA (manual ou QR)
// -------------------------------------------------------------
function registrarEntradaSaida(id, operadorManual = null){
  const c = cadastros.find(x => x.id === id);
  if (!c) return alert("Cadastro não encontrado!");

  const operador = operadorManual || currentOperator || prompt("Operador:", "") || "Operador";

  // ENTRADA
  if (c.status === "fora") {
    c.entradas.push({ ts: nowISO(), operator: operador });
    c.status = "dentro";

    bringToTop(c.id);
    saveCadastros();
    uploadCadastrosToFirebase(); // SYNC

    alert(`Entrada registrada para ${c.nome}`);
    renderHistorico();
    renderMarketingList();
    return;
  }

  // SAÍDA (bloqueada ou liberada)
  if (c.saiSozinho !== "sim") {
    alert(`${c.nome} NÃO está autorizado a sair sozinho!`);
    c.saidas.push({ ts: nowISO(), operator: operador, blocked: true });
  } else {
    c.saidas.push({ ts: nowISO(), operator: operador });
    c.status = "fora";
  }

  bringToTop(c.id);
  saveCadastros();
  uploadCadastrosToFirebase(); // SYNC

  alert(`Saída registrada para ${c.nome}`);
  renderHistorico();
  renderMarketingList();
}

// -------------------------------------------------------------
// BUSCA (nome / telefone / mesa / ID)
// -------------------------------------------------------------
inputBusca?.addEventListener("input", () => {
  const termo = inputBusca.value.toLowerCase().trim();
  listaBusca.innerHTML = "";

  if (!termo) return;

  const results = cadastros.filter(c =>
    (c.nome || "").toLowerCase().includes(termo) ||
    (c.telefone || "").includes(termo) ||
    (c.mesa || "").includes(termo) ||
    String(c.id).includes(termo)
  );

  results.forEach(c => {
    const li = document.createElement("li");
    li.className = "card";

    li.innerHTML = `
      <div>
        <strong>${escapeHtml(c.nome)}</strong><br>
        Tel: ${escapeHtml(c.telefone || "-")}<br>
        Mesa: ${escapeHtml(c.mesa || "-")}
      </div>
      <div style="margin-top:6px">
        <button data-id="${c.id}" class="btnRegistrar">Entrada/Saída</button>
        <button data-id="${c.id}" class="btnAlterar">Alterar</button>
        <button data-id="${c.id}" class="btnPrintSmall">Etiqueta</button>
      </div>
    `;

    listaBusca.appendChild(li);
  });

  // Eventos dos botões
  document.querySelectorAll(".btnRegistrar").forEach(b =>
    b.addEventListener("click", ev => registrarEntradaSaida(ev.target.dataset.id))
  );

  document.querySelectorAll(".btnAlterar").forEach(b =>
    b.addEventListener("click", ev => abrirEdicao(ev.target.dataset.id))
  );

  document.querySelectorAll(".btnPrintSmall").forEach(b =>
    b.addEventListener("click", ev => {
      const c = cadastros.find(x => x.id === ev.target.dataset.id);
      if (!c) return;
      QRCode.toDataURL(c.id, { width: 200 }).then(url =>
        printLabelForCadastro(c, url, "small")
      );
    })
  );
});

// -------------------------------------------------------------
// RENDERIZAR HISTÓRICO COMPLETO
// -------------------------------------------------------------
function renderHistorico(list = null){
  const arr = list || cadastros;
  listaHistoricoContainer.innerHTML = "";

  if (!arr.length){
    listaHistoricoContainer.textContent = "Nenhum cadastro ainda.";
    return;
  }

  arr.forEach(c => {
    const div = document.createElement("div");
    div.className = "card";

    const entradas = c.entradas.slice().reverse()
      .map(t => `${new Date(t.ts).toLocaleString()} — ${t.operator}`)
      .join("<br>") || "-";

    const saidas = c.saidas.slice().reverse()
      .map(t => `${new Date(t.ts).toLocaleString()} — ${t.operator}${t.blocked?" (BLOQUEADA)":""}`)
      .join("<br>") || "-";

    div.innerHTML = `
      <strong>${escapeHtml(c.nome)}</strong> • ${c.idade} anos  
      <div>Tel: ${escapeHtml(c.telefone || "-")} | Mesa: ${escapeHtml(c.mesa || "-")}</div>
      <div><strong>Status:</strong> ${c.status === "dentro" ? "🟢 Dentro" : "🔴 Fora"}</div>

      <div style="margin-top:6px"><strong>Entradas:</strong><br>${entradas}</div>
      <div style="margin-top:6px"><strong>Saídas:</strong><br>${saidas}</div>

      <div style="margin-top:10px">
        <button data-id="${c.id}" class="btnRegistrar">Entrada/Saída</button>
        <button data-id="${c.id}" class="btnImprimirFicha">Ficha</button>
        <button data-id="${c.id}" class="btnAlterar">Alterar</button>
        <button data-id="${c.id}" class="btnPrintQR">QR</button>
        <button data-id="${c.id}" class="btnExcluir">Excluir</button>
      </div>
    `;

    listaHistoricoContainer.appendChild(div);
  });

  // eventos
  document.querySelectorAll(".btnRegistrar").forEach(btn =>
    btn.addEventListener("click", ev => registrarEntradaSaida(ev.target.dataset.id))
  );

  document.querySelectorAll(".btnAlterar").forEach(btn =>
    btn.addEventListener("click", ev => abrirEdicao(ev.target.dataset.id))
  );

  document.querySelectorAll(".btnExcluir").forEach(btn =>
    btn.addEventListener("click", ev => excluirCadastro(ev.target.dataset.id))
  );

  document.querySelectorAll(".btnImprimirFicha").forEach(btn =>
    btn.addEventListener("click", ev => imprimirFicha(ev.target.dataset.id))
  );

  document.querySelectorAll(".btnPrintQR").forEach(btn =>
    btn.addEventListener("click", ev => {
      const id = ev.target.dataset.id;
      const c = cadastros.find(x => x.id === id);
      QRCode.toDataURL(id, { width: 300 }).then(url => {
        const w = window.open("", "_blank");
        w.document.write(`<img src="${url}" style="width:260px">`);
        w.document.close();
      });
    })
  );
}

// -------------------------------------------------------------
// IMPRESSÃO DE FICHA INDIVIDUAL
// -------------------------------------------------------------
function imprimirFicha(id){
  const c = cadastros.find(x => x.id === id);
  if (!c) return alert("Cadastro não encontrado!");

  const tempo = calcularTempoTotal(c);

  const w = window.open("", "_blank");
  w.document.write(`
    <h2>${escapeHtml(c.nome)}</h2>
    <div>Idade: ${c.idade}</div>
    <div>Telefone: ${escapeHtml(c.telefone || "-")}</div>
    <div>Mesa: ${escapeHtml(c.mesa || "-")}</div>
    <div>Tempo total: ${tempo}</div>
    <button onclick="window.print()">Imprimir</button>
  `);
  w.document.close();
}

// -------------------------------------------------------------
// CALCULAR TEMPO TOTAL DE PERMANÊNCIA
// -------------------------------------------------------------
function calcularTempoTotal(c){
  let total = 0;

  for (let i = 0; i < c.entradas.length; i++) {
    const entrada = new Date(c.entradas[i].ts);
    const saida = c.saidas[i] ? new Date(c.saidas[i].ts) : new Date();

    if (c.saidas[i] && c.saidas[i].blocked) continue;

    total += (saida - entrada) / 1000;
  }

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);

  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
} 
// -------------------------------------------------------------
// FILTRO DE DATAS (HISTÓRICO)
// -------------------------------------------------------------
btnFilterHistorico?.addEventListener("click", () => {
  const from = histFrom.value;
  const to = histTo.value || from;

  if (!from) return alert("Escolha a data inicial.");

  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T23:59:59");

  const filtrados = cadastros.filter(c => {
    const d = new Date(c.createdAt);
    return d >= start && d <= end;
  });

  renderHistorico(filtrados);
});

btnResetHistorico?.addEventListener("click", () => {
  histFrom.value = "";
  histTo.value = "";
  renderHistorico();
});

// -------------------------------------------------------------
// FILTRO DE RELATÓRIO / IMPRESSÃO
// -------------------------------------------------------------
quickFilter?.addEventListener("change", () => {
  const v = quickFilter.value;
  const today = new Date();

  if (v === "hoje") {
    const d = today.toISOString().slice(0,10);
    filterFrom.value = d;
    filterTo.value = d;
  } 
  else if (v === "ontem") {
    const t = new Date(today);
    t.setDate(today.getDate() - 1);
    const d = t.toISOString().slice(0,10);
    filterFrom.value = d;
    filterTo.value = d;
  }
  else if (v === "ult7") {
    const t = new Date(today);
    t.setDate(today.getDate() - 6);
    filterFrom.value = t.toISOString().slice(0,10);
    filterTo.value = today.toISOString().slice(0,10);
  }
  else if (v === "mesAtual") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    filterFrom.value = start.toISOString().slice(0,10);
    filterTo.value = today.toISOString().slice(0,10);
  }
  else {
    filterFrom.value = "";
    filterTo.value = "";
  }
});

// -------------------------------------------------------------
// CONSTRUIR RELATÓRIO (HTML)
// -------------------------------------------------------------
function buildReportHTML(lista, periodoTexto, ocorrencias){
  const total = lista.length;

  let inteiras = 0, meias = 0, cortesias = 0, bruto = 0;

  lista.forEach(c => {
    if (c.tipoIngresso === "inteira") { inteiras++; bruto += 35.90; }
    else if (c.tipoIngresso === "meia") { meias++; bruto += 17.95; }
    else { cortesias++; }
  });

  let linhas = "";
  lista.forEach(c => {
    linhas += `
      <tr>
        <td>${escapeHtml(c.nome)}</td>
        <td>${c.idade}</td>
        <td>${escapeHtml(c.setor || "-")}</td>
        <td>${c.tipoIngresso}</td>
        <td>${calcularTempoTotal(c)}</td>
      </tr>
    `;
  });

  return {
    html: `
      <h2>Relatório – Terra do Sol</h2>
      <div>Período: <strong>${periodoTexto}</strong></div>
      <div>Total de crianças: <strong>${total}</strong></div>

      <table border="1" cellspacing="0" cellpadding="6" style="margin-top:10px;width:100%">
        <tr><th>Nome</th><th>Idade</th><th>Setor</th><th>Entrada</th><th>Permanência</th></tr>
        ${linhas}
      </table>

      <h3>Resumo Financeiro</h3>
      <div>Inteiras: ${inteiras}</div>
      <div>Meias: ${meias}</div>
      <div>Cortesias: ${cortesias}</div>
      <div style="margin-top:4px">Total Bruto: <strong>R$ ${bruto.toFixed(2)}</strong></div>

      <h3>Ocorrências / Demandas</h3>
      <div>${escapeHtml(ocorrencias || "-")}</div>
    `,
    resumo: { inteiras, meias, cortesias, bruto }
  };
}

// -------------------------------------------------------------
// GERAR RELATÓRIO NA TELA
// -------------------------------------------------------------
btnFiltrar?.addEventListener("click", () => {
  const from = filterFrom.value;
  const to = filterTo.value || from;

  if (!from) return alert("Escolha a data inicial.");

  const inicio = new Date(from + "T00:00:00");
  const fim = new Date(to + "T23:59:59");

  const lista = cadastros.filter(c => {
    const d = new Date(c.createdAt);
    return d >= inicio && d <= fim;
  });

  const periodoLabel = (from === to)
    ? new Date(from).toLocaleDateString()
    : `${new Date(from).toLocaleDateString()} → ${new Date(to).toLocaleDateString()}`;

  const ocorr = impressaoObservacoes.value;

  const r = buildReportHTML(lista, periodoLabel, ocorr);
  relatorioPreview.innerHTML = r.html;

  faturamentoResumo.innerHTML = `
    <strong>Resumo:</strong><br>
    Inteiras: ${r.resumo.inteiras}<br>
    Meias: ${r.resumo.meias}<br>
    Cortesias: ${r.resumo.cortesias}<br>
    <strong>Total Bruto:</strong> R$ ${r.resumo.bruto.toFixed(2)}
  `;
});

// -------------------------------------------------------------
// IMPRIMIR RELATÓRIO
// -------------------------------------------------------------
btnImprimirFiltro?.addEventListener("click", () => {
  const conteudo = relatorioPreview.innerHTML;
  if (!conteudo.trim()) return alert("Nenhum relatório gerado.");

  const w = window.open("", "_blank");
  w.document.write(`
    <button onclick="window.close()">Fechar</button>
    ${conteudo}
  `);
  w.document.close();
  setTimeout(() => w.print(), 500);
});

// -------------------------------------------------------------
// MARKETING – SELECIONAR TODOS
// -------------------------------------------------------------
btnSelectAll?.addEventListener("click", () => {
  document.querySelectorAll("#marketingList input[type='checkbox']")
    .forEach(c => c.checked = true);
});

// -------------------------------------------------------------
// MARKETING – LIMPAR SELEÇÃO
// -------------------------------------------------------------
btnClearAll?.addEventListener("click", () => {
  document.querySelectorAll("#marketingList input[type='checkbox']")
    .forEach(c => c.checked = false);
});

// -------------------------------------------------------------
// EXPORTAÇÃO PARA EXCEL
// -------------------------------------------------------------
btnExportJSON?.addEventListener("click", () => {
  if (!cadastros.length) return alert("Sem dados para exportar.");

  const arr = cadastros.map(c => ({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    mesa: c.mesa,
    setor: c.setor,
    idade: c.idade,
    tipoIngresso: c.tipoIngresso,
    createdAt: c.createdAt
  }));

  const ws = XLSX.utils.json_to_sheet(arr);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Histórico");
  XLSX.writeFile(wb, "historico-parquinho.xlsx");
});

// -------------------------------------------------------------
// EXCLUIR CADASTRO
// -------------------------------------------------------------
function excluirCadastro(id){
  const senha = prompt("Digite a senha para excluir:", "");
  if (senha !== "tds_1992") return alert("Senha incorreta.");

  cadastros = cadastros.filter(c => c.id !== id);
  saveCadastros();
  uploadCadastrosToFirebase(); // sync
  renderHistorico();
  renderMarketingList();
}

// -------------------------------------------------------------
// VCF – GERAR CONTATO
// -------------------------------------------------------------
function gerarVCF(c){
  return `
BEGIN:VCARD
VERSION:3.0
FN:${c.responsavel ? c.responsavel + " (Resp.) — " + c.nome : c.nome}
TEL:${c.telefone || ""}
EMAIL:${c.email || ""}
NOTE:Mesa: ${c.mesa || "-"} | Setor: ${c.setor || "-"}
END:VCARD
`;
}

function salvarVCFTodos(){
  const text = cadastros.map(c => gerarVCF(c)).join("\n");
  const blob = new Blob([text], { type: "text/vcard" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "contatos_parquinho.vcf";
  a.click();
}

// -------------------------------------------------------------
// INIT FINAL (chama histórico + marketing)
// -------------------------------------------------------------
(function init(){
  renderHistorico();
  renderMarketingList();
})();

// -------------------------------------------------------------
// 🔵 SINCRONIZAÇÃO FINAL COM FIREBASE (MODELO 1) 🔵
// -------------------------------------------------------------
function syncCadastrosRealtime(snapshot){
  const data = snapshot.val();
  if (!data) return;

  cadastros = Object.values(data).sort((a,b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  saveCadastros();
  renderHistorico();
  renderMarketingList();
}
