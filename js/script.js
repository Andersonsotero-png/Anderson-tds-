// script.js — Versão final atualizada com Firebase Sync
// ------------------------------------------------------

// utilitários
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const nowISO = () => new Date().toISOString();
const uid = () => Date.now().toString();
function escapeHtml(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// preços
const PRICE_INTEIRA = 35.90;
const PRICE_MEIA = 17.95;
const PRICE_CORTESIA = 0;

// estado principal
let cadastros = JSON.parse(localStorage.getItem('cadastros') || '[]');
let cameraStream = null;
let currentOperator = '';
let idEmEdicao = null;

// referências UI
const tabs = $$('nav button');
const sections = $$('.tab');
const form = $('#formCadastro');
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
const qrDiv = $('#qrCodeCadastro');
const btnPrintLabel = $('#btnPrintLabel');
const btnPrintLabelSmall = $('#btnPrintLabelSmall');

// dados extras do form
const dataNascimentoInput = form ? form.elements['dataNascimento'] : null;
const idadeInput = form ? form.elements['idade'] : null;
const temAlergiaSelect = $('#temAlergia');
const alergiaLabel = $('#alergiaLabel');
const alturaSelect = $('#alturaSelect');
const saiSozinhoSelect = $('#saiSozinhoSelect');
const liveBadge = $('#liveBadge');
const tipoIngressoSel = $('#tipoIngresso');
const meiaMotivoWrapper = $('#meiaMotivoWrapper');
const meiaMotivoSel = $('#meiaMotivo');

// marketing
const marketingList = $('#marketingList');
const btnSelectAll = $('#btnSelectAll');
const btnClearAll = $('#btnClearAll');
const btnSendToSelected = $('#btnSendToSelected');
const marketingMessage = $('#marketingMessage');
const marketingImage = $('#marketingImage');

// impressão
const quickFilter = $('#quickFilter');
const filterFrom = $('#filterFrom');
const filterTo = $('#filterTo');
const btnFiltrar = $('#btnFiltrar');
const btnImprimirFiltro = $('#btnImprimirFiltro');
const relatorioPreview = $('#relatorioPreview');
const faturamentoResumo = $('#faturamentoResumo');
const btnVoltarImpressao = $('#btnVoltarImpressao');
const impressaoObservacoes = $('#impressaoObservacoes');
/* -----------------------------
      CONTINUAÇÃO PARTE 2
------------------------------*/

/* Controle das abas */
tabs.forEach(t => {
  t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');

    sections.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(t.dataset.tab);
    if (target) target.classList.add('active');
  });
});

/* Cálculo automático da idade */
if (dataNascimentoInput && idadeInput) {
  dataNascimentoInput.addEventListener('change', () => {
    const v = dataNascimentoInput.value;
    if (!v) { idadeInput.value = ''; return; }
    const d = new Date(v);
    if (isNaN(d.getTime())) { idadeInput.value = ''; return; }
    idadeInput.value = calcularIdade(d);
  });
}

function calcularIdade(dob) {
  const hoje = new Date();
  let idade = hoje.getFullYear() - dob.getFullYear();
  const m = hoje.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < dob.getDate())) idade--;
  return idade;
}

/* Alternância da meia-entrada */
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

/* Alergia */
if (temAlergiaSelect) {
  temAlergiaSelect.addEventListener('change', () => {
    alergiaLabel.style.display = (temAlergiaSelect.value === 'sim') ? 'block' : 'none';
  });
}

/* Atualiza a badge em tempo real */
function updateLiveBadge() {
  const altura = alturaSelect ? alturaSelect.value : 'menor';
  const saiSozinho = saiSozinhoSelect ? saiSozinhoSelect.value : 'nao';

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

/* Salvar local */
function saveCadastros() {
  localStorage.setItem('cadastros', JSON.stringify(cadastros));
}

/* Trazer item para o topo */
function bringToTop(id) {
  const idx = cadastros.findIndex(c => c.id === id);
  if (idx === -1) return;
  const [item] = cadastros.splice(idx, 1);
  cadastros.unshift(item);
}

/* SUBMIT DO FORMULÁRIO (CRIA OU EDITA CADASTRO) */
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
    const temAlergia = form.elements['temAlergia'].value || 'nao';
    const qualAlergia = (form.elements['qualAlergia'].value || '').trim();
    const altura = (form.elements['altura'].value || 'menor');
    const saiSozinho = (form.elements['saiSozinho'].value || 'nao');
    const observacoes = (form.elements['observacoes'].value || '').trim();

    if (!nome || !dataNascimento)
      return alert('Preencha nome e data de nascimento.');

    /* --- SALVAR EDIÇÃO --- */
    if (idEmEdicao) {
      const idx = cadastros.findIndex(c => c.id === idEmEdicao);
      if (idx === -1) {
        alert("Erro ao salvar edição.");
        idEmEdicao = null;
        return;
      }

      cadastros[idx] = {
        ...cadastros[idx],
        tipoIngresso, meiaMotivo, nome, dataNascimento, idade,
        responsavel, telefone, email, setor, mesa,
        temAlergia, qualAlergia, altura, saiSozinho, observacoes
      };

      saveCadastrosFirebase(); // SALVA FIREBASE AQUI
      idEmEdicao = null;
      alert("Cadastro atualizado!");

      form.reset();
      if (idadeInput) idadeInput.value = '';
      alergiaLabel.style.display = 'none';
      meiaMotivoWrapper.style.display = 'none';

      updateLiveBadge();
      renderHistorico();
      renderMarketingList();
      return;
    }

    /* --- NOVO CADASTRO --- */
    const exists = cadastros.find(c =>
      (c.nome && c.nome.toLowerCase() === nome.toLowerCase() && c.dataNascimento === dataNascimento) ||
      (c.telefone && telefone && c.telefone === telefone)
    );

    if (exists) {
      if (!confirm('Já existe um cadastro semelhante. Continuar mesmo assim?')) return;
    }

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
      status: 'fora',
      createdAt: nowISO()
    };

    cadastros.unshift(novo);
    saveCadastrosFirebase(); // SALVA FIREBASE

    generateQRCodeCanvas(novo.id);

    alert("Cadastro salvo!");

    form.reset();
    if (idadeInput) idadeInput.value = '';
    alergiaLabel.style.display = 'none';
    meiaMotivoWrapper.style.display = 'none';

    updateLiveBadge();
    renderHistorico();
    renderMarketingList();
  });
} 
/* -----------------------------------
        PARTE 3 — QR CODE / BUSCA
------------------------------------*/

/* Gerar QR Code */
function generateQRCodeCanvas(id) {
  if (!qrDiv) return;

  qrDiv.innerHTML = '';
  QRCode.toCanvas(String(id), { width: 160 }, (err, canvasEl) => {
    if (err) {
      qrDiv.textContent = 'Erro ao gerar QR';
      console.error(err);
      return;
    }
    qrDiv.appendChild(canvasEl);
  });
}

/* Download do QR */
if (btnDownloadQR) {
  btnDownloadQR.addEventListener('click', () => {
    const c = qrDiv.querySelector('canvas');
    if (!c) return alert('Nenhum QR encontrado.');

    const url = c.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qr.png';
    a.click();
  });
}

/* Impressão de etiqueta */
function getBadgeClass(c) {
  if (c.saiSozinho === 'sim') return 'green';
  if (c.altura === 'maior') return 'yellow';
  return 'red';
}

function getBadgeText(c) {
  if (c.saiSozinho === 'sim') return 'SAI SOZINHO';
  if (c.altura === 'maior') return 'MAIOR > 1m';
  return 'NÃO SAI SOZINHO';
}

function buildLabelHTML(cadastro, size = 'large') {
  return `
    <html><head><meta charset="utf-8"><title>Etiqueta</title>
      <style>
        body { font-family: Arial; margin: 6px; }
        .label {
          width: ${size === 'large' ? '4cm' : '2.5cm'};
          height: ${size === 'large' ? '4cm' : '2.5cm'};
          border: 1px dashed #333;
          padding: 4px;
          display:flex; flex-direction:column;
          justify-content:center; align-items:center;
        }
        .name { font-weight:700; font-size:${size === 'large' ? '12px':'10px'}; margin-top:4px }
        .meta { font-size:${size === 'large' ? '10px':'8px'}; }
        .badge {
          padding:3px 6px; border-radius:5px;
          color:#fff; font-size:10px; font-weight:bold;
        }
      </style>
    </head>
    <body>
      <div class="label">
        <div id="qrImgWrap"></div>
        <div class="name">${escapeHtml(cadastro.nome)}</div>
        <div class="meta">ID: ${cadastro.id}</div>
        <div class="meta">Setor: ${escapeHtml(cadastro.setor||'-')} — Mesa: ${escapeHtml(cadastro.mesa||'-')}</div>
        <div class="meta">${cadastro.altura === 'maior' ? 'Maior que 1m' : 'Menor que 1m'}</div>
        <div class="badge ${getBadgeClass(cadastro)}">${getBadgeText(cadastro)}</div>
      </div>

      <script>
        window.addEventListener('message', (e) => {
          if (e.data?.qrDataURL) {
            const img = new Image();
            img.src = e.data.qrDataURL;
            img.style.width = "70%";
            document.getElementById("qrImgWrap").appendChild(img);
          }
        });
        window.onload = () => setTimeout(() => window.print(), 400);
      </script>
    </body>
  </html>`;
}

function printLabelForCadastro(cadastro, qrDataURL, size = 'large') {
  const w = window.open('', '_blank');
  w.document.write(buildLabelHTML(cadastro, size));
  w.document.close();

  setTimeout(() => {
    w.postMessage({ qrDataURL }, '*');
  }, 600);
}

if (btnPrintLabel) {
  btnPrintLabel.addEventListener('click', () => {
    const c = cadastros[0];
    if (!c) return alert("Nenhum cadastro encontrado.");

    QRCode.toDataURL(String(c.id), { width: 300 })
      .then(url => printLabelForCadastro(c, url, 'large'));
  });
}

if (btnPrintLabelSmall) {
  btnPrintLabelSmall.addEventListener('click', () => {
    const c = cadastros[0];
    if (!c) return alert("Nenhum cadastro encontrado.");

    QRCode.toDataURL(String(c.id), { width: 200 })
      .then(url => printLabelForCadastro(c, url, 'small'));
  });
}

/* Gerar QR de todos */
if (btnGerarTodosQR) {
  btnGerarTodosQR.addEventListener('click', () => {
    if (!cadastros.length) return alert("Nenhum cadastro");

    qrDiv.innerHTML = '';

    cadastros.forEach(c => {
      const card = document.createElement('div');
      card.className = 'card';

      const n = document.createElement('div');
      n.textContent = c.nome + " — Mesa " + (c.mesa || '-');

      const qr = document.createElement('div');

      QRCode.toCanvas(c.id, { width: 100 }, (err, cv) => {
        if (!err) qr.appendChild(cv);
      });

      card.appendChild(n);
      card.appendChild(qr);
      qrDiv.appendChild(card);
    });
  });
}

/* BUSCA */
if (inputBusca) {
  inputBusca.addEventListener('input', () => {
    const termo = inputBusca.value.toLowerCase().trim();
    listaBusca.innerHTML = '';

    if (!termo) return;

    const results = cadastros.filter(c =>
      (c.nome||'').toLowerCase().includes(termo) ||
      (c.telefone||'').toLowerCase().includes(termo) ||
      (c.email||'').toLowerCase().includes(termo) ||
      (c.mesa||'').toLowerCase().includes(termo) ||
      (c.id||'').includes(termo)
    );

    results.forEach(c => {
      const li = document.createElement('li');
      li.className = 'card';

      const tipoLabel =
        c.tipoIngresso === 'inteira' ? 'Inteira' :
        c.tipoIngresso === 'meia' ? `Meia (${c.meiaMotivo||'-'})` :
        'Cortesia';

      li.innerHTML = `
        <div style="display:flex;justify-content:space-between;">
          <div>
            <strong>${escapeHtml(c.nome)}</strong><br>
            <small>Setor: ${escapeHtml(c.setor||'-')} — Mesa: ${escapeHtml(c.mesa||'-')}</small><br>
            <small>${tipoLabel}</small><br>
            <small>Status: ${c.status === 'dentro' ? '🟢 Dentro' : '🔴 Fora'}</small>
          </div>

          <div style="text-align:right">
            <span class="badge ${getBadgeClass(c)}">${getBadgeText(c)}</span><br>
            <button data-id="${c.id}" class="btnRegistrar">Entrada/Saída</button><br>
            <button data-id="${c.id}" class="btnAlterar">Alterar</button><br>
            <button data-id="${c.id}" class="btnPrintSmall">Etiqueta</button>
          </div>
        </div>`;

      listaBusca.appendChild(li);
    });

    /* Eventos */
    $$('.btnRegistrar').forEach(b =>
      b.addEventListener('click', ev => registrarEntradaSaida(ev.target.dataset.id))
    );

    $$('.btnAlterar').forEach(b =>
      b.addEventListener('click', ev => abrirEdicao(ev.target.dataset.id))
    );

    $$('.btnPrintSmall').forEach(b =>
      b.addEventListener('click', ev => {
        const id = ev.target.dataset.id;
        const c = cadastros.find(x => x.id === id);
        if (!c) return;

        QRCode.toDataURL(String(c.id), { width: 200 })
          .then(url => printLabelForCadastro(c, url, 'small'));
      })
    );
  });
}
/* -----------------------------------
      PARTE 4 — HISTÓRICO + IMPRESSÃO
------------------------------------*/

/* Histórico */
function renderHistorico(filtered = null) {
  if (!listaHistoricoContainer) return;

  const list = filtered || cadastros;
  listaHistoricoContainer.innerHTML = '';

  if (!list.length) {
    listaHistoricoContainer.textContent = "Nenhum registro.";
    return;
  }

  list.forEach(c => {
    const div = document.createElement('div');
    div.className = 'card';

    const entradasHtml =
      (c.entradas || [])
        .slice()
        .reverse()
        .map(t => `${new Date(t.ts).toLocaleString()} — ${escapeHtml(t.operator||'')}`)
        .join('<br>') || '-';

    const saidasHtml =
      (c.saidas || [])
        .slice()
        .reverse()
        .map(t => `${new Date(t.ts).toLocaleString()} — ${escapeHtml(t.operator||'')}${t.blocked ? ' (BLOQUEADA)' : ''}`)
        .join('<br>') || '-';

    const tipoLabel =
      c.tipoIngresso === 'inteira'
        ? 'Inteira'
        : c.tipoIngresso === 'meia'
        ? `Meia (${c.meiaMotivo || '-'})`
        : 'Cortesia';

    div.innerHTML = `
      <strong>${escapeHtml(c.nome)}</strong> (${escapeHtml(c.idade)} anos)<br>
      <div>Tipo: <strong>${tipoLabel}</strong></div>
      <div>Responsável: ${escapeHtml(c.responsavel||'-')} | Tel: ${escapeHtml(c.telefone||'-')}</div>
      <div>Setor: ${escapeHtml(c.setor||'-')} | Mesa: ${escapeHtml(c.mesa||'-')}</div>
      <div>Status: <strong>${c.status === 'dentro' ? '🟢 Dentro' : '🔴 Fora'}</strong></div>

      <div style="margin-top:8px"><strong>Entradas:</strong><br>${entradasHtml}</div>
      <div style="margin-top:8px"><strong>Saídas:</strong><br>${saidasHtml}</div>

      <div style="margin-top:10px">
        <button data-id="${c.id}" class="btnRegistrar">Entrada/Saída</button>
        <button data-id="${c.id}" class="btnImprimirFicha">Ficha</button>
        <button data-id="${c.id}" class="btnPrintSmall">Etiqueta</button>
        <button data-id="${c.id}" class="btnAlterar">Alterar</button>
        <button data-id="${c.id}" class="btnPrintQR">QR</button>
        <button data-id="${c.id}" class="btnExcluir">Excluir</button>
      </div>
    `;

    listaHistoricoContainer.appendChild(div);
  });

  $$('.btnRegistrar').forEach(b =>
    b.addEventListener('click', ev => registrarEntradaSaida(ev.target.dataset.id))
  );

  $$('.btnImprimirFicha').forEach(b =>
    b.addEventListener('click', ev => imprimirFicha(ev.target.dataset.id))
  );

  $$('.btnAlterar').forEach(b =>
    b.addEventListener('click', ev => abrirEdicao(ev.target.dataset.id))
  );

  $$('.btnPrintSmall').forEach(b =>
    b.addEventListener('click', ev => {
      const c = cadastros.find(x => x.id === ev.target.dataset.id);
      if (!c) return;

      QRCode.toDataURL(String(c.id), { width: 200 })
        .then(url => printLabelForCadastro(c, url, 'small'));
    })
  );

  $$('.btnPrintQR').forEach(b =>
    b.addEventListener('click', ev => {
      const id = ev.target.dataset.id;
      const c = cadastros.find(x => x.id === id);
      if (!c) return;

      QRCode.toDataURL(String(c.id), { width: 250 })
        .then(url => {
          const w = window.open('', '_blank');
          w.document.write(`
            <html><head><meta charset="utf-8">
              <style>body{text-align:center;font-family:Arial}</style>
            </head>
            <body>
              <button onclick="window.close()">Voltar</button>
              <h3>${escapeHtml(c.nome)}</h3>
              <img src="${url}" style="max-width:220px;">
              <div>ID: ${c.id}</div>
            </body>
            </html>
          `);
          w.document.close();
        });
    })
  );

  $$('.btnExcluir').forEach(b =>
    b.addEventListener('click', ev => excluirCadastro(ev.target.dataset.id))
  );
}

/* Excluir com senha */
function excluirCadastro(id) {
  const s = prompt("Digite a senha para excluir:", "");
  if (s !== "tds_1992") return alert("Senha incorreta.");

  if (!confirm("Excluir permanentemente?")) return;

  cadastros = cadastros.filter(c => c.id !== id);
  saveCadastrosFirebase();

  renderHistorico();
  renderMarketingList();
}

/* Ficha */
function imprimirFicha(id) {
  const c = cadastros.find(x => x.id === id);
  if (!c) return alert("Cadastro não encontrado");

  const entradas =
    (c.entradas || [])
      .map(t => `${new Date(t.ts).toLocaleString()} — ${escapeHtml(t.operator||'')}`)
      .join('<br>') || '-';

  const saidas =
    (c.saidas || [])
      .map(t => `${new Date(t.ts).toLocaleString()} — ${escapeHtml(t.operator||'')}${t.blocked?' (BLOQUEADA)':''}`)
      .join('<br>') || '-';

  const tempo = formatDuration(getTotalPermanenceSeconds(c));

  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><meta charset="utf-8">
      <style>body{font-family:Arial;padding:20px}</style>
    </head>
    <body>
      <button onclick="window.close()">Voltar</button>

      <h2>${escapeHtml(c.nome)}</h2>
      <p>Idade: ${c.idade}</p>
      <p>Data nasc.: ${c.dataNascimento}</p>
      <p>Setor: ${escapeHtml(c.setor)} | Mesa: ${escapeHtml(c.mesa)}</p>
      <p>Alergia: ${c.temAlergia === 'sim' ? escapeHtml(c.qualAlergia) : 'Não'}</p>
      <p>Responsável: ${escapeHtml(c.responsavel)} | Tel: ${escapeHtml(c.telefone)}</p>

      <h3>Tempo de Permanência</h3>
      <p>${tempo}</p>

      <h3>Entradas</h3>
      <p>${entradas}</p>

      <h3>Saídas</h3>
      <p>${saidas}</p>
    </body>
    </html>
  `);

  w.document.close();

  setTimeout(() => w.print(), 400);
}

/* Permanência */
function getTotalPermanenceSeconds(c) {
  let total = 0;

  const ent = (c.entradas || []);
  const sai = (c.saidas || []);

  const n = Math.min(ent.length, sai.length);

  for (let i = 0; i < n; i++) {
    const t1 = new Date(ent[i].ts);
    const t2 = new Date(sai[i].ts);
    if (sai[i].blocked) continue;
    if (!isNaN(t1) && !isNaN(t2)) total += (t2 - t1) / 1000;
  }

  if (ent.length > sai.length) {
    const last = new Date(ent[ent.length - 1].ts);
    total += (Date.now() - last.getTime()) / 1000;
  }

  return Math.floor(total);
}

function formatDuration(sec) {
  if (!sec) return "00:00";

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);

  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec % 60).padStart(2,'0')}`;
}

/* Impressão — filtros */
function toDateOnly(iso) {
  if (!iso) return null;
  return iso.slice(0, 10);
}

function filtrarPorPeriodo(from, to) {
  const a = new Date(from + "T00:00:00");
  const b = new Date(to + "T23:59:59");

  return cadastros.filter(c => {
    const d = new Date(c.createdAt);
    return d >= a && d <= b;
  });
}

function formatDateBr(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

/* Montagem do relatório */
function buildReportHTML(list, label, observacoes) {
  let inteiras = 0, meias = 0, cortesias = 0;
  let bruto = 0;

  list.forEach(c => {
    if (c.tipoIngresso === 'inteira') { inteiras++; bruto += 35.9; }
    else if (c.tipoIngresso === 'meia') { meias++; bruto += 17.95; }
    else cortesias++;
  });

  let linhas = '';

  list.forEach(c => {
    const tempo = formatDuration(getTotalPermanenceSeconds(c));
    const pulseira =
      c.saiSozinho === 'sim' ? 'VERDE' :
      c.altura === 'maior' ? 'AMARELA' :
      'VERMELHA';

    linhas += `
      <tr>
        <td>${escapeHtml(c.nome)}</td>
        <td>${c.idade}</td>
        <td>${escapeHtml(c.setor||'-')}</td>
        <td>${pulseira}</td>
        <td>${tempo}</td>
      </tr>`;
  });

  const html = `
    <div>
      <h2>Relatório Terra do Sol — Parquinho Infantil</h2>
      <p>Período: <strong>${label}</strong></p>

      <table border="1" cellpadding="6" cellspacing="0" width="100%">
        <tr>
          <th>Nome</th>
          <th>Idade</th>
          <th>Setor</th>
          <th>Pulseira</th>
          <th>Permanência</th>
        </tr>
        ${linhas}
      </table>

      <h3>Resumo Financeiro</h3>
      <p>Inteiras: ${inteiras} — Meias: ${meias} — Cortesias: ${cortesias}</p>
      <p><strong>Bruto: R$ ${bruto.toFixed(2)}</strong></p>

      <h3>Ocorrências / Demandas</h3>
      <p>${escapeHtml(observacoes || '-')}</p>
    </div>
  `;

  return { html, resumo: { inteiras, meias, cortesias, bruto } };
}

/* Botões da aba Impressão */
btnFiltrar.addEventListener('click', () => {
  const from = filterFrom.value;
  const to = filterTo.value || from;

  if (!from) return alert("Escolha a data inicial");

  const list = filtrarPorPeriodo(from, to);
  const label = from === to ? formatDateBr(from) : `${formatDateBr(from)} → ${formatDateBr(to)}`;
  const obs = impressaoObservacoes.value;

  const r = buildReportHTML(list, label, obs);

  relatorioPreview.innerHTML = r.html;

  faturamentoResumo.innerHTML = `
    <div><strong>Inteiras:</strong> ${r.resumo.inteiras}</div>
    <div><strong>Meias:</strong> ${r.resumo.meias}</div>
    <div><strong>Cortesias:</strong> ${r.resumo.cortesias}</div>
    <div style="margin-top:4px"><strong>Bruto:</strong> R$ ${r.resumo.bruto.toFixed(2)}</div>
  `;
});

/* Imprimir relatório */
btnImprimirFiltro.addEventListener('click', () => {
  const from = filterFrom.value;
  const to = filterTo.value || from;
  if (!from) return alert("Escolha a data");

  const list = filtrarPorPeriodo(from, to);
  const label = from === to ? formatDateBr(from) : `${formatDateBr(from)} → ${formatDateBr(to)}`;
  const obs = impressaoObservacoes.value;

  const r = buildReportHTML(list, label, obs);

  const w = window.open('', '_blank');
  w.document.write(`<html><head><meta charset="utf-8"></head><body>
    <button onclick="window.close()">Voltar</button>
    ${r.html}
  </body></html>`);
  w.document.close();

  setTimeout(() => w.print(), 600);
});

/* Histórico — filtro */
btnFilterHistorico.addEventListener('click', () => {
  const from = histFrom.value;
  const to = histTo.value || from;
  if (!from) return alert("Escolha a data");

  const list = filtrarPorPeriodo(from, to);
  renderHistorico(list);
});

btnResetHistorico.addEventListener('click', () => {
  histFrom.value = '';
  histTo.value = '';
  renderHistorico();
});

/* -----------------------------------
    MARKETING / LISTA / CONTATOS
------------------------------------*/

function renderMarketingList() {
  if (!marketingList) return;

  marketingList.innerHTML = '';

  if (!cadastros.length) {
    marketingList.textContent = "Nenhum cadastro.";
    return;
  }

  cadastros.forEach(c => {
    const row = document.createElement('div');
    row.className = 'contact-row';

    row.innerHTML = `
      <input type="checkbox" data-id="${c.id}">
      <div class="contact-meta">
        <strong>${escapeHtml(c.nome)}</strong><br>
        <small>Tel: ${escapeHtml(c.telefone||'-')} — Email: ${escapeHtml(c.email||'-')}</small>
      </div>

      <div class="contact-actions">
        <button onclick="window.open('tel:${c.telefone||''}')">Ligar</button>
        <button onclick="openWhatsApp('${c.telefone}','')">WhatsApp</button>
        <button onclick="openSMS('${c.telefone}','')">SMS</button>
        <button onclick="openMail('${c.email}','Promoção','')">E-mail</button>
        <button onclick="baixarVCFIndividualById('${c.id}')">VCF</button>
      </div>
    `;

    marketingList.appendChild(row);
  });
}

/* VCF */
function gerarVCFString(c) {
  return `BEGIN:VCARD
VERSION:3.0
FN:${c.nome}
TEL:${c.telefone||''}
EMAIL:${c.email||''}
NOTE:Setor ${c.setor||'-'} — Mesa ${c.mesa||'-'}
END:VCARD`;
}

function baixarVCFIndividualById(id) {
  const c = cadastros.find(x => x.id === id);
  if (!c) return;

  const vcf = gerarVCFString(c);
  const blob = new Blob([vcf], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${c.nome}.vcf`;
  a.click();

  URL.revokeObjectURL(url);
}

btnSaveSelectedVCF.addEventListener('click', () => {
  const ids = $$('#marketingList input[type=checkbox]:checked').map(x => x.dataset.id);

  if (!ids.length) return alert("Selecione ao menos um");

  const conteudo =
    ids.map(id => gerarVCFString(cadastros.find(c => c.id === id))).join('\n');

  const blob = new Blob([conteudo], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'contatos_selecionados.vcf';
  a.click();

  URL.revokeObjectURL(url);
});

btnSaveAllVCF.addEventListener('click', () => {
  if (!cadastros.length) return alert("Sem cadastros");

  const conteudo = cadastros.map(c => gerarVCFString(c)).join('\n');

  const blob = new Blob([conteudo], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'todos_contatos.vcf';
  a.click();

  URL.revokeObjectURL(url);
});

/* Marketing Image Preview */
function attachMarketingImageHandlers() {
  const previewWrap = $('#marketingImagePreview');
  const previewImg = $('#marketingPreviewImg');
  const removeBtn = $('#marketingRemoveImg');

  marketingImage.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) {
      previewWrap.style.display = 'none';
      return;
    }

    const r = new FileReader();
    r.onload = ev => {
      previewImg.src = ev.target.result;
      previewWrap.style.display = 'inline-block';
    };
    r.readAsDataURL(file);
  });

  removeBtn.addEventListener('click', () => {
    marketingImage.value = '';
    previewImg.src = '';
    previewWrap.style.display = 'none';
  });
}

/* WhatsApp / SMS / Email */
function openWhatsApp(num, msg = '') {
  if (!num) return alert("Sem número");
  const digits = num.replace(/\D/g, '');
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`);
}

function openSMS(num, msg = '') {
  window.open(`sms:${num}?body=${encodeURIComponent(msg)}`);
}

function openMail(mail, subject, body) {
  window.open(`mailto:${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
}

/* Compartilhamento */
btnSendToSelected.addEventListener('click', async () => {
  const ids = $$('#marketingList input[type=checkbox]:checked').map(x => x.dataset.id);
  const msg = marketingMessage.value.trim();

  if (!ids.length) return alert("Selecione ao menos um");

  for (const id of ids) {
    const c = cadastros.find(x => x.id === id);
    if (!c) continue;

    if (c.telefone)
      openWhatsApp(c.telefone, msg);
    else if (c.email)
      openMail(c.email, 'Promoção', msg);

    await new Promise(r => setTimeout(r, 600));
  }

  alert("Mensagens abertas — finalize no app.");
});

/* Exportar Excel */
btnExportJSON.addEventListener('click', () => {
  if (!cadastros.length) return alert("Sem dados");

  const data = cadastros.map(c => ({
    id: c.id,
    nome: c.nome,
    responsavel: c.responsavel,
    telefone: c.telefone,
    email: c.email,
    setor: c.setor,
    mesa: c.mesa,
    tipoIngresso: c.tipoIngresso,
    meiaMotivo: c.meiaMotivo,
    altura: c.altura,
    saiSozinho: c.saiSozinho,
    createdAt: c.createdAt
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
  XLSX.writeFile(wb, 'historico-parquinho.xlsx');
});

/* Limpar tudo */
btnLimparTudo.addEventListener('click', () => {
  if (!confirm("Apagar todos os dados locais?")) return;

  localStorage.removeItem('cadastros');
  cadastros = [];

  saveCadastrosFirebase();
  renderHistorico();
  renderMarketingList();

  alert("Dados apagados.");
});

/* Inicialização */
(function init() {
  cadastros = cadastros.map(c => ({
    entradas: c.entradas || [],
    saidas: c.saidas || [],
    status: c.status || 'fora',
    createdAt: c.createdAt || new Date().toISOString(),
    ...c
  }));

  renderHistorico();
  renderMarketingList();
  attachMarketingImageHandlers();
})();
