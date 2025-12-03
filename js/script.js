// script.js — Versão final solicitada (com as alterações pedidas)

// utilitários
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const nowISO = () => new Date().toISOString();
const uid = () => Date.now().toString();
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// constantes de preço
const PRICE_INTEIRA = 35.90;
const PRICE_MEIA = 17.95;
const PRICE_CORTESIA = 0;

// estado
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
const btnScanNow = $('#btnScanNow'); // texto: "Registrar Entrada/Saída"
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
    if (tipoIngressoSel.value === 'meia') meiaMotivoWrapper.style.display = 'block';
    else { meiaMotivoWrapper.style.display = 'none'; meiaMotivoSel.value = ''; }
  });
}

/* alergia toggle */
if (temAlergiaSelect) {
  temAlergiaSelect.addEventListener('change', () => {
    alergiaLabel.style.display = (temAlergiaSelect.value === 'sim') ? 'block' : 'none';
  });
}

/* live badge — atualiza no formulário quando altera altura/sai sozinho */
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

/* persistence */
function saveCadastros(){ localStorage.setItem('cadastros', JSON.stringify(cadastros)); }

/* form submit (criar ou salvar edição) */
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();

    // coletar dados do form
    const tipoIngresso = (form.elements['tipoIngresso'].value || 'inteira');
    const meiaMotivo = (form.elements['meiaMotivo'] && form.elements['meiaMotivo'].value) || '';
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

    if (!nome || !dataNascimento) { alert('Preencha nome e data de nascimento'); return; }

    if (idEmEdicao) {
      // salvar edição
      const idx = cadastros.findIndex(c => c.id === idEmEdicao);
      if (idx === -1) { alert('Erro ao salvar edição.'); idEmEdicao = null; return; }
      const atual = cadastros[idx];
      cadastros[idx] = {
        ...atual,
        tipoIngresso, meiaMotivo, nome, dataNascimento, idade, responsavel, telefone, email,
        setor, mesa, temAlergia, qualAlergia, altura, saiSozinho, observacoes
      };
      saveCadastros();
      idEmEdicao = null;
      alert('Cadastro atualizado!');
      form.reset();
      if (idadeInput) idadeInput.value = '';
      alergiaLabel.style.display = 'none';
      meiaMotivoWrapper.style.display = 'none';
      updateLiveBadge();
      renderHistorico();
      renderMarketingList();
      return;
    }

    // criação nova entrada
    const exists = cadastros.find(c =>
      (c.nome && c.nome.toLowerCase() === nome.toLowerCase() && c.dataNascimento === dataNascimento) ||
      (c.telefone && telefone && c.telefone === telefone)
    );
    if (exists) {
      if (!confirm('Já existe um cadastro semelhante. Deseja criar mesmo assim?')) return;
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
    saveCadastros();
    generateQRCodeCanvas(novo.id);
    alert('Cadastro salvo!');
    form.reset();
    if (idadeInput) idadeInput.value = '';
    alergiaLabel.style.display = 'none';
    meiaMotivoWrapper.style.display = 'none';
    updateLiveBadge();
    renderHistorico();
    renderMarketingList();
  });
}

/* QR gen */
function generateQRCodeCanvas(id){
  if(!qrDiv) return;
  qrDiv.innerHTML = '';
  QRCode.toCanvas(String(id), { width: 160 }, (err, canvasEl) => {
    if (err) { qrDiv.textContent = 'Erro ao gerar QR'; console.error(err); return; }
    qrDiv.appendChild(canvasEl);
  });
}

/* download QR */
if (btnDownloadQR) btnDownloadQR.addEventListener('click', () => {
  const c = qrDiv.querySelector('canvas');
  if (!c) return alert('Nenhum QR disponível. Gere um cadastro primeiro.');
  const url = c.toDataURL('image/png');
  const a = document.createElement('a'); a.href = url; a.download = 'qr-cadastro.png'; a.click();
});

/* print label wrappers */
function getBadgeClass(c){
  if (c.saiSozinho === 'sim') return 'green';
  if (c.altura === 'maior' && c.saiSozinho === 'nao') return 'yellow';
  return 'red';
}
function getBadgeText(c){
  if (c.saiSozinho === 'sim') return 'SAI SOZINHO';
  if (c.altura === 'maior' && c.saiSozinho === 'nao') return 'MAIOR > 1m';
  return 'NÃO SAI SOZINHO';
}
function buildLabelHTML(cadastro, size='large'){
  return `
  <html><head><meta charset="utf-8"><title>Etiqueta</title>
  <style>body{font-family:Arial;margin:6px}.label{width:${size==='large'?'4cm':'2.5cm'};height:${size==='large'?'4cm':'2.5cm'};display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px dashed #333;padding:6px}.name{font-weight:700;margin-top:6px;font-size:${size==='large'?'12px':'10px'}}.meta{font-size:${size==='large'?'10px':'8px'};margin-top:4px}.badge{display:inline-block;padding:4px 8px;border-radius:6px;color:#fff;font-weight:700;margin-top:6px}</style>
  </head><body>
    <div class="label">
      <div id="qrImgWrap"></div>
      <div class="name">${escapeHtml(cadastro.nome)}</div>
      <div class="meta">ID: ${cadastro.id} • Tel: ${escapeHtml(cadastro.telefone||'-')}</div>
      <div class="meta">Setor: ${escapeHtml(cadastro.setor||'-')} • ${escapeHtml(cadastro.mesa||'-')}</div>
      <div class="meta">${(cadastro.altura==='maior')? 'Maior que 1m' : 'Menor que 1m'}</div>
      <div class="meta">${(cadastro.saiSozinho==='sim')? 'Sai sozinho' : 'Não sai sozinho'}</div>
      <div style="margin-top:6px"><span class="badge ${getBadgeClass(cadastro)}">${getBadgeText(cadastro)}</span></div>
    </div>
    <script>
      window.addEventListener('message', e => {
        try {
          if (e.data && e.data.qrDataURL) {
            var img = new Image(); img.src = e.data.qrDataURL; img.style.width='70%'; img.style.height='auto';
            document.getElementById('qrImgWrap').appendChild(img);
          }
        } catch(err){ console.error(err); }
      }, false);
      window.onload = () => { setTimeout(()=>{ window.print(); }, 300); };
    </script>
  </body></html>
  `;
}
function printLabelForCadastro(cadastro, qrDataURL, size='large'){
  const w = window.open('', '_blank');
  const html = buildLabelHTML(cadastro, size);
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.postMessage({ qrDataURL }, '*'); } catch(e){} }, 500);
}
if (btnPrintLabel) btnPrintLabel.addEventListener('click', () => {
  const c = cadastros[0];
  if (!c) return alert('Nenhum cadastro disponível para imprimir etiqueta.');
  QRCode.toDataURL(String(c.id), { width:400 }).then(url => printLabelForCadastro(c, url, 'large'));
});
if (btnPrintLabelSmall) btnPrintLabelSmall.addEventListener('click', () => {
  const c = cadastros[0];
  if (!c) return alert('Nenhum cadastro disponível para imprimir etiqueta.');
  QRCode.toDataURL(String(c.id), { width:200 }).then(url => printLabelForCadastro(c, url, 'small'));
});

/* gerar todos QRs */
if (btnGerarTodosQR) btnGerarTodosQR.addEventListener('click', () => {
  if(!cadastros.length){ alert('Sem cadastros.'); return; }
  qrDiv.innerHTML = '';
  cadastros.forEach(c => {
    const wrap = document.createElement('div'); wrap.className = 'card';
    const name = document.createElement('div'); name.textContent = c.nome + ' — ' + (c.mesa || '-');
    const holder = document.createElement('div');
    QRCode.toCanvas(c.id, { width: 110 }, (err, cv) => { if(!err) holder.appendChild(cv); });
    wrap.appendChild(name); wrap.appendChild(holder);
    qrDiv.appendChild(wrap);
  });
});

/* busca (adicionada opção de Alterar Cadastro) */
/* NOTA: busca agora consulta nome, telefone, email, mesa, id; sem zoom/focus automático */
if (inputBusca) inputBusca.addEventListener('input', () => {
  const termo = inputBusca.value.toLowerCase().trim();
  if (!listaBusca) return;
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
    const li = document.createElement('li'); li.className = 'card';
    const tipoLabel = (c.tipoIngresso === 'inteira') ? 'Inteira' : (c.tipoIngresso === 'meia' ? `Meia (${c.meiaMotivo||'-'})` : 'Cortesia');
    const badgeHTML = `<span class="badge ${getBadgeClass(c)}">${getBadgeText(c)}</span>`;
    li.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div><strong>${escapeHtml(c.nome)}</strong> <small>(${escapeHtml(c.idade)} anos)</small><br>
        <small>Setor: ${escapeHtml(c.setor||'-')} • Mesa: ${escapeHtml(c.mesa||'-')}</small><br>
        <small>Tipo: <strong>${tipoLabel}</strong></small>
        <div>Tel: ${escapeHtml(c.telefone||'-')} • Status: ${(c.status==='dentro')? 'No parque' : 'Fora do parque'}</div>
      </div>
      <div style="text-align:right">
        ${badgeHTML}<br>
        <button data-id="${c.id}" class="btnRegistrar">Entrada/Saída</button><br>
        <button data-id="${c.id}" class="btnPrintSmall">Imprimir etiqueta</button><br>
        <button data-id="${c.id}" class="btnAlterar">Alterar Cadastro</button>
      </div>
    </div>`;
    listaBusca.appendChild(li);
  });
  // ligar eventos
  $$('.btnRegistrar').forEach(b => b.addEventListener('click', ev => registrarEntradaSaida(ev.target.dataset.id)));
  $$('.btnPrintSmall').forEach(b => b.addEventListener('click', ev => {
    const id = ev.target.dataset.id;
    const c = cadastros.find(x=>x.id===id);
    if (!c) return;
    QRCode.toDataURL(String(c.id), { width:200 }).then(url => printLabelForCadastro(c, url, 'small'));
  }));
  $$('.btnAlterar').forEach(b => b.addEventListener('click', ev => abrirEdicao(ev.target.dataset.id)));
});

/* histórico */
function renderHistorico(filteredList = null){
  if(!listaHistoricoContainer) return;
  listaHistoricoContainer.innerHTML = '';
  const list = filteredList || cadastros;
  if (!list.length){ listaHistoricoContainer.textContent = 'Nenhum cadastro ainda.'; return; }
  list.forEach(c => {
    const div = document.createElement('div'); div.className='card';
    const entradasList = (c.entradas||[]).map(t => `${new Date(t.ts).toLocaleString()} — ${escapeHtml(t.operator||'')}`).join('<br>') || '-';
    const saidasList = (c.saidas||[]).map(t => `${new Date(t.ts).toLocaleString()} — ${escapeHtml(t.operator||'')}`).join('<br>') || '-';
    const tipoLabel = (c.tipoIngresso === 'inteira') ? 'Inteira' : (c.tipoIngresso === 'meia' ? `Meia (${c.meiaMotivo||'-'})` : 'Cortesia');
    const badgeHTML = `<span class="badge ${getBadgeClass(c)}">${getBadgeText(c)}</span>`;
    div.innerHTML = `<strong>${escapeHtml(c.nome)}</strong> <small>${escapeHtml(c.idade)} anos</small>
      <div>Tipo: <strong>${tipoLabel}</strong></div>
      <div>Responsável: ${escapeHtml(c.responsavel||'-')} | Tel: ${escapeHtml(c.telefone||'-')}</div>
      <div>Setor: ${escapeHtml(c.setor || '-')} | Mesa: ${escapeHtml(c.mesa || '-')}</div>
      <div>Alergia: ${(c.temAlergia === 'sim') ? (escapeHtml(c.qualAlergia) || 'Sim') : 'Não'}</div>
      <div>Status atual: <strong>${c.status === 'dentro' ? '🟢 No parque' : '🔴 Fora do parque'}</strong> ${badgeHTML}</div>
      <div style="margin-top:8px"><strong>Entradas:</strong><br>${entradasList}</div>
      <div style="margin-top:8px"><strong>Saídas:</strong><br>${saidasList}</div>
      <div style="margin-top:8px">
        <button data-id="${c.id}" class="btnRegistrar">Entrada/Saída</button>
        <button data-id="${c.id}" class="btnImprimirFicha">Imprimir ficha</button>
        <button data-id="${c.id}" class="btnPrintSmall">Imprimir etiqueta</button>
        <button data-id="${c.id}" class="btnAlterar">Alterar Cadastro</button>
        <button data-id="${c.id}" class="btnPrintQR">Imprimir QR</button>
        <button data-id="${c.id}" class="btnExcluir">Excluir</button>
      </div>`;
    listaHistoricoContainer.appendChild(div);
  });
  $$('.btnRegistrar').forEach(b => b.addEventListener('click', ev => registrarEntradaSaida(ev.target.dataset.id)));
  $$('.btnExcluir').forEach(b => b.addEventListener('click', ev => excluirCadastro(ev.target.dataset.id)));
  $$('.btnImprimirFicha').forEach(b => b.addEventListener('click', ev => imprimirFicha(ev.target.dataset.id)));
  $$('.btnPrintSmall').forEach(b => b.addEventListener('click', ev => {
    const id = ev.target.dataset.id;
    const c = cadastros.find(x=>x.id===id);
    if (!c) return;
    QRCode.toDataURL(String(c.id), { width:200 }).then(url => printLabelForCadastro(c, url, 'small'));
  }));
  $$('.btnAlterar').forEach(b => b.addEventListener('click', ev => abrirEdicao(ev.target.dataset.id)));
  $$('.btnPrintQR').forEach(b => b.addEventListener('click', ev => {
    const id = ev.target.dataset.id;
    const c = cadastros.find(x=>x.id===id);
    if (!c) return;
    // abrir nova janela com o QR e botão fechar (voltar)
    QRCode.toDataURL(String(c.id), { width:300 }).then(url => {
      const w = window.open('','_blank');
      const html = `<html><head><meta charset="utf-8"><title>QR ${escapeHtml(c.nome)}</title>
        <style>body{font-family:Arial;padding:18px;text-align:center}button{padding:8px 12px;margin:8px;border-radius:6px}</style></head><body>
        <button id="btnVoltar" onclick="window.close()">Voltar ao App</button>
        <h3>${escapeHtml(c.nome)}</h3><img src="${url}" style="max-width:240px"><div style="margin-top:8px">ID: ${c.id}</div>
        <script>window.onload=function(){/* nada */}</script>
        </body></html>`;
      w.document.write(html); w.document.close();
    });
  }));
}

/* excluir — agora pede senha (tds_1992) */
function excluirCadastro(id){
  const senha = prompt('Para excluir o cadastro, insira a senha de autorização:','');
  if (senha !== 'tds_1992') { alert('Senha incorreta — ação cancelada.'); return; }
  if(!confirm('Excluir cadastro permanentemente?')) return;
  cadastros = cadastros.filter(c => c.id !== id);
  saveCadastros();
  renderHistorico();
  renderMarketingList();
}

/* imprimir ficha */
function imprimirFicha(id){
  const c = cadastros.find(x => x.id === id);
  if(!c){ alert('Cadastro não encontrado'); return; }
  const w = window.open('', '_blank');
  const html = `<html><head><meta charset="utf-8"><title>Ficha - ${escapeHtml(c.nome)}</title>
      <style>body{font-family:Arial;padding:16px}</style></head><body>
      <button onclick="window.close()">Voltar ao App</button>
      <h2>${escapeHtml(c.nome)}</h2>
      <div>Tipo: ${(c.tipoIngresso||'')} ${c.meiaMotivo?('('+c.meiaMotivo+')'):''}</div>
      <div>Idade: ${escapeHtml(c.idade)}</div>
      <div>Nascido em: ${escapeHtml(c.dataNascimento)}</div>
      <div>Setor: ${escapeHtml(c.setor||'-')} | Mesa: ${escapeHtml(c.mesa||'-')}</div>
      <div>Alergia: ${(c.temAlergia === 'sim') ? (escapeHtml(c.qualAlergia) || 'Sim') : 'Não'}</div>
      <div>Responsável: ${escapeHtml(c.responsavel || '-') } | Tel: ${escapeHtml(c.telefone || '-')}</div>
      <hr>
      <div><strong>Entradas:</strong><br>${(c.entradas||[]).map(t => new Date(t.ts).toLocaleString()+" — "+escapeHtml(t.operator||'')).join('<br>') || '-'}</div>
      <div><strong>Saídas:</strong><br>${(c.saidas||[]).map(t => new Date(t.ts).toLocaleString()+" — "+escapeHtml(t.operator||'')).join('<br>') || '-'}</div>
      </body></html>`;
  w.document.write(html);
  w.document.close();
  setTimeout(()=> w.print(), 500);
}

/* registrar entrada/saída with operator and exit protection */
function registrarEntradaSaida(id, operatorNameOverride=null){
  const c = cadastros.find(x => x.id === id);
  if(!c){ alert('Cadastro não encontrado'); return; }
  const operator = operatorNameOverride || currentOperator || prompt('Nome do operador (funcionário) que está registrando:', '') || 'Operador';
  if (c.status === 'fora' || !c.status) {
    c.entradas = c.entradas || [];
    c.entradas.push({ ts: nowISO(), operator });
    c.status = 'dentro';
    alert(`Entrada registrada para ${c.nome} — Operador: ${operator}`);
  } else {
    // tentativa de saída
    if (c.saiSozinho !== 'sim') {
      const opt = confirm(`${c.nome} NÃO está autorizado a sair sozinho. Deseja contatar o responsável agora?`);
      if (opt) {
        contactResponsibleOptions(c);
      }
      c.saidas = c.saidas || [];
      c.saidas.push({ ts: nowISO(), operator, blocked: true });
      alert('Saída BLOQUEADA — contato acionado (se confirmado).');
    } else {
      c.saidas = c.saidas || [];
      c.saidas.push({ ts: nowISO(), operator });
      c.status = 'fora';
      alert(`Saída registrada para ${c.nome} — Operador: ${operator}`);
    }
  }
  saveCadastros(); renderHistorico(); renderMarketingList();
}

/* contact options for responsible */
function contactResponsibleOptions(c) {
  const phone = c.telefone || '';
  const email = c.email || '';
  const choice = prompt(`Contato para ${c.nome} — escolha:
1 - Ligar
2 - WhatsApp
3 - SMS
4 - E-mail
Digite 1-4`, '1');
  if (!choice) return;
  if (choice === '1') {
    if (!phone) return alert('Telefone não disponível.');
    window.open(`tel:${phone}`, '_self');
  } else if (choice === '2') {
    if (!phone) return alert('Telefone não disponível.');
    openWhatsApp(phone, `Atenção: Tentativa de saída de ${c.nome}. Favor confirmar.`);
  } else if (choice === '3') {
    if (!phone) return alert('Telefone não disponível.');
    openSMS(phone, `Atenção: Tentativa de saída de ${c.nome}. Favor confirmar.`);
  } else if (choice === '4') {
    if (!email) return alert('Email não disponível.');
    openMail(email, 'Tentativa de saída', `Tentativa de saída para ${c.nome}. Favor verificar.`);
  } else {
    alert('Opção inválida.');
  }
}

/* Camera & QR scan (modo B: escanear por botão) */
const ctx = canvas ? canvas.getContext('2d') : null;
btnStartCamera && btnStartCamera.addEventListener('click', async () => {
  if (cameraStream) return;
  currentOperator = prompt('Digite seu nome (operador):', '') || 'Operador';
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio:false });
    video.srcObject = cameraStream; video.play();
    btnStartCamera.disabled = true; btnStopCamera.disabled = false; btnScanNow.disabled = false;
    scanMessage.textContent = `Câmera aberta — Operador: ${currentOperator}. Clique em "Registrar Entrada/Saída" para ler.`;
  } catch(err) {
    console.error(err); alert('Erro ao acessar câmera: ' + (err.message || err));
  }
});
btnStopCamera && btnStopCamera.addEventListener('click', () => {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  if (video) { video.pause(); video.srcObject = null; }
  btnStartCamera.disabled = false; btnStopCamera.disabled = true; btnScanNow.disabled = true;
  scanMessage.textContent = 'Câmera fechada';
});

// scan once when user clicks btnScanNow
btnScanNow && btnScanNow.addEventListener('click', () => {
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) { alert('Câmera ainda não pronta.'); return; }
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
  if (code) {
    scanMessage.textContent = `QR detectado: ${code.data}`;
    handleScannedPayload(code.data);
  } else {
    alert('Nenhum QR detectado nesta captura. Ajuste a posição e tente novamente.');
  }
});

function handleScannedPayload(payload){
  const c = cadastros.find(x => x.id === String(payload));
  if (!c) { alert('QR não corresponde a nenhum cadastro.'); return; }
  if (c.status === 'fora' || !c.status) {
    c.entradas = c.entradas || [];
    c.entradas.push({ ts: nowISO(), operator: currentOperator || 'Operador' });
    c.status = 'dentro';
    saveCadastros(); renderHistorico(); renderMarketingList();
    alert(`Entrada registrada para ${c.nome} — Operador: ${currentOperator}`);
    return;
  }
  if (c.saiSozinho !== 'sim') {
    alert(`${c.nome} NÃO está autorizado a sair sozinho. A saída foi bloqueada.`);
    contactResponsibleOptions(c);
    c.saidas = c.saidas || [];
    c.saidas.push({ ts: nowISO(), operator: currentOperator || 'Operador', blocked: true });
    saveCadastros(); renderHistorico(); renderMarketingList();
  } else {
    c.saidas = c.saidas || [];
    c.saidas.push({ ts: nowISO(), operator: currentOperator || 'Operador' });
    c.status = 'fora';
    saveCadastros(); renderHistorico(); renderMarketingList();
    alert(`Saída registrada para ${c.nome} — Operador: ${currentOperator}`);
  }
}

/* manual register */
if (btnRegistrarManual) btnRegistrarManual.addEventListener('click', () => {
  const termo = inputBusca ? inputBusca.value.trim() : '';
  if (!termo) { alert('Digite nome/telefone/pulseira no campo de busca para registrar manualmente.'); return; }
  const found = cadastros.find(c => (c.nome||'').toLowerCase().includes(termo.toLowerCase()) || (c.telefone||'').includes(termo) || (c.id||'').includes(termo));
  if (!found) { alert('Nenhum cadastro encontrado para: ' + termo); return; }
  registrarEntradaSaida(found.id);
});

/* imprimir lista (botão geral, se necessário) */
const btnImprimir = $('#btnImprimir');
if (btnImprimir) btnImprimir.addEventListener('click', () => {
  if (!cadastros.length){ alert('Nenhum cadastro para imprimir'); return; }
  const w = window.open('', '_blank');
  let html = `<html><head><meta charset="utf-8"><title>Cadastros</title>
    <style>body{font-family:Arial;padding:16px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px}</style></head><body>
    <button onclick="window.close()">Voltar ao App</button>
    <h2>Lista de Cadastros</h2><table><thead><tr><th>Nome</th><th>Idade</th><th>Tel</th><th>Email</th><th>Setor/Mesa</th><th>Status</th></tr></thead><tbody>`;
  cadastros.forEach(c => {
    html += `<tr><td>${escapeHtml(c.nome)}</td><td>${escapeHtml(c.idade)}</td><td>${escapeHtml(c.telefone||'-')}</td><td>${escapeHtml(c.email||'-')}</td>
      <td>${escapeHtml(c.setor||'-')} / ${escapeHtml(c.mesa||'-')}</td><td>${c.status==='dentro' ? 'No parque' : 'Fora do parque'}</td></tr>`;
  });
  html += '</tbody></table></body></html>';
  w.document.write(html); w.document.close();
  setTimeout(()=> w.print(), 500);
});

/* MARKETING: render list */
function renderMarketingList(){
  if (!marketingList) return;
  marketingList.innerHTML = '';
  if (!cadastros.length) { marketingList.textContent = 'Nenhum contato cadastrado.'; return; }
  cadastros.forEach((c, idx) => {
    const row = document.createElement('div'); row.className = 'contact-row';
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.dataset.id = c.id;
    const meta = document.createElement('div'); meta.className = 'contact-meta';
    meta.innerHTML = `<strong>${escapeHtml(c.nome)}</strong><br><small>Tel: ${escapeHtml(c.telefone||'-')} • Email: ${escapeHtml(c.email||'-')} • Mesa: ${escapeHtml(c.mesa||'-')}</small>`;
    const actions = document.createElement('div'); actions.className = 'contact-actions';

    const telBtn = document.createElement('button'); telBtn.textContent='Ligar'; telBtn.className='btn-small'; telBtn.addEventListener('click', ()=> window.open(`tel:${c.telefone||''}`));
    const waBtn = document.createElement('button'); waBtn.textContent='WhatsApp'; waBtn.className='btn-small'; waBtn.addEventListener('click', ()=> openWhatsApp(c.telefone));
    const smsBtn = document.createElement('button'); smsBtn.textContent='SMS'; smsBtn.className='btn-small'; smsBtn.addEventListener('click', ()=> openSMS(c.telefone, ''));
    const mailBtn = document.createElement('button'); mailBtn.textContent='E-mail'; mailBtn.className='btn-small'; mailBtn.addEventListener('click', ()=> openMail(c.email, 'Promoção', ''));

    const vcfBtn = document.createElement('button'); vcfBtn.textContent='Salvar (.vcf)'; vcfBtn.className='btn-small btn-vcf'; 
    vcfBtn.addEventListener('click', ()=> baixarVCFIndividualById(c.id));

    actions.appendChild(telBtn); actions.appendChild(waBtn); actions.appendChild(smsBtn); actions.appendChild(mailBtn); actions.appendChild(vcfBtn);
    row.appendChild(chk); row.appendChild(meta); row.appendChild(actions);
    marketingList.appendChild(row);
  });
}
renderMarketingList();

if (btnSelectAll) btnSelectAll.addEventListener('click', () => { $$('#marketingList input[type="checkbox"]').forEach(i => i.checked = true); });
if (btnClearAll) btnClearAll.addEventListener('click', () => { $$('#marketingList input[type="checkbox"]').forEach(i => i.checked = false); });

function openWhatsApp(number, text=''){
  if (!number) return alert('Número ausente.');
  const digits = number.replace(/\D/g,'');
  const encoded = encodeURIComponent(text);
  // abrir conversa com número específico (funciona sem salvar se usar wa.me/número)
  window.open(`https://wa.me/${digits}?text=${encoded}`, '_blank');
}
function openSMS(number, body=''){
  if (!number) return alert('Número ausente.');
  const encoded = encodeURIComponent(body);
  window.open(`sms:${number}?body=${encoded}`, '_blank');
}
function openMail(email, subject='', body=''){
  if (!email) return alert('Email ausente.');
  const s = encodeURIComponent(subject); const b = encodeURIComponent(body);
  window.open(`mailto:${email}?subject=${s}&body=${b}`, '_blank');
}

/* Send to selected (fallback behavior) */
if (btnSendToSelected) btnSendToSelected.addEventListener('click', async () => {
  const message = (marketingMessage.value || '').trim();
  const selected = $$('#marketingList input[type="checkbox"]:checked').map(i => i.dataset.id);
  if (!selected.length) { alert('Selecione ao menos um contato.'); return; }
  const file = marketingImage.files[0] || null;
  const canShareFiles = navigator.canShare && file && navigator.canShare({ files: [file] });
  if (canShareFiles) {
    try {
      await navigator.share({ files: [file], text: message });
      alert('Compartilhamento aberto — finalize no app.');
      return;
    } catch(e){
      console.warn('Share error', e);
    }
  }
  for (const id of selected) {
    const c = cadastros.find(x => x.id === id);
    if (!c) continue;
    if (c.telefone) {
      const text = `${message}\n\n— ${c.nome}`;
      openWhatsApp(c.telefone, text);
      await new Promise(r => setTimeout(r, 600));
    } else if (c.email) {
      openMail(c.email, 'Promoção', message);
      await new Promise(r => setTimeout(r, 600));
    }
  }
  alert('Links abertos para envio. Finalize no app correspondente.');
});

/* Export / clear */
// btnExportJSON agora gera Excel (.xlsx) usando SheetJS
if (btnExportJSON) btnExportJSON.addEventListener('click', () => {
  if (!cadastros.length) { alert('Sem dados para exportar.'); return; }
  const dataForExport = cadastros.map(c => ({
    id: c.id,
    tipoIngresso: c.tipoIngresso,
    meiaMotivo: c.meiaMotivo,
    nome: c.nome,
    dataNascimento: c.dataNascimento,
    idade: c.idade,
    responsavel: c.responsavel,
    telefone: c.telefone,
    email: c.email,
    setor: c.setor,
    mesa: c.mesa,
    temAlergia: c.temAlergia,
    qualAlergia: c.qualAlergia,
    altura: c.altura,
    saiSozinho: c.saiSozinho,
    observacoes: c.observacoes,
    status: c.status,
    createdAt: c.createdAt
  }));
  const worksheet = XLSX.utils.json_to_sheet(dataForExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico");
  XLSX.writeFile(workbook, "historico-parquinho.xlsx");
});

// Limpar tudo
if (btnLimparTudo) btnLimparTudo.addEventListener('click', () => {
  if (!confirm('Apagar todos os dados locais?')) return;
  localStorage.removeItem('cadastros');
  cadastros = [];
  renderHistorico();
  renderMarketingList();
  alert('Dados apagados.');
});

/* Service worker (se existir) */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').then(()=> console.log('SW registrado')).catch(e=>console.warn('SW erro', e));
}

/* init */
(function init(){
  cadastros = cadastros.map(c => ({ entradas: c.entradas || [], saidas: c.saidas || [], status: c.status || 'fora', createdAt: c.createdAt || nowISO(), ...c }));
  renderHistorico();
  renderMarketingList();
  attachPrintFilterEvents();
  attachMarketingImageHandlers();
})();

/* --------- Impressão / Relatórios --------- */

function toDateOnly(iso){
  if(!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0,10); // yyyy-mm-dd
}

function filtrarPorPeriodo(from, to){
  const start = from ? new Date(from + "T00:00:00") : null;
  const end = to ? new Date(to + "T23:59:59") : null;
  return cadastros.filter(c => {
    const d = new Date(c.createdAt);
    if (isNaN(d.getTime())) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

function formatDateBr(iso){
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function buildReportHTML(list, periodLabel, observacoesText){
  const total = list.length;

  // contar por tipoIngresso
  let cntInteira = 0, cntMeia = 0, cntCortesia = 0;
  let bruto = 0;
  list.forEach(c => {
    if (c.tipoIngresso === 'inteira') { cntInteira++; bruto += PRICE_INTEIRA; }
    else if (c.tipoIngresso === 'meia') { cntMeia++; bruto += PRICE_MEIA; }
    else { cntCortesia++; bruto += PRICE_CORTESIA; }
  });

  // group counts by day (apenas resumo)
  const byDay = {};
  list.forEach(c => {
    const day = toDateOnly(c.createdAt) || 'unknown';
    byDay[day] = (byDay[day] || 0) + 1;
  });
  let perDayHtml = '';
  Object.keys(byDay).sort().forEach(day => {
    perDayHtml += `<div><strong>${day}</strong> — ${byDay[day]} crianças</div>`;
  });

  let html = `<div id="relatorioPrint" class="report-wrapper">
    <img class="report-watermark" src="assets/icons/icon-512.png" alt="marca" />
    <div style="display:flex;gap:12px;justify-content:space-between;align-items:center">
      <div style="display:flex;gap:12px;align-items:center">
        <img src="assets/icons/icon-512.png" alt="logo" style="width:70px;height:auto" />
        <div>
          <div class="report-title">Relatório – Terra do Sol – Parquinho Infantil</div>
          <div class="report-meta">Período: ${periodLabel}</div>
          <div class="report-meta">Crianças registradas: <strong>${total}</strong></div>
        </div>
      </div>
      <div style="text-align:right">
        <button onclick="window.close()" style="padding:8px 10px;border-radius:6px">Fechar (Voltar)</button>
      </div>
    </div>

    <div style="margin-top:12px">${perDayHtml}</div>

    <table class="report-table" style="margin-top:12px">
      <thead><tr><th>Nome</th><th>Idade</th><th>Setor</th><th>Pulseira</th></tr></thead>
      <tbody>`;

  list.forEach(c => {
    const pulseira = (c.saiSozinho === 'sim') ? 'VERDE' : (c.altura === 'maior' ? 'AMARELA' : 'VERMELHA');
    const tipoLabel = (c.tipoIngresso === 'inteira') ? 'Inteira' : (c.tipoIngresso === 'meia' ? `Meia (${c.meiaMotivo||'-'})` : 'Cortesia');
    html += `<tr>
      <td>${escapeHtml(c.nome)}</td>
      <td>${escapeHtml(c.idade)}</td>
      <td>${escapeHtml(c.setor||'-')}</td>
      <td>${pulseira} • ${tipoLabel}</td>
    </tr>`;
  });

  html += `</tbody></table>

    <div style="margin-top:12px">
      <h4>Resumo Financeiro</h4>
      <div>Entradas inteiras: <strong>${cntInteira}</strong></div>
      <div>Entradas meias: <strong>${cntMeia}</strong></div>
      <div>Entradas cortesia: <strong>${cntCortesia}</strong></div>
      <div style="margin-top:6px">Valor bruto: <strong>R$ ${bruto.toFixed(2)}</strong></div>
      <div style="margin-top:10px"><strong>Ocorrências / Demandas:</strong><div class="small-muted">${escapeHtml(observacoesText||'-')}</div></div>
    </div>
  </div>`;
  return { html, resumo: { cntInteira, cntMeia, cntCortesia, bruto } };
}

function attachPrintFilterEvents(){
  if (!quickFilter) return;
  quickFilter.addEventListener('change', () => {
    const v = quickFilter.value;
    const today = new Date();
    if (v === 'hoje') {
      const d = today.toISOString().slice(0,10);
      filterFrom.value = d; filterTo.value = d;
    } else if (v === 'ontem') {
      const t = new Date(today); t.setDate(today.getDate()-1);
      const d = t.toISOString().slice(0,10);
      filterFrom.value = d; filterTo.value = d;
    } else if (v === 'ult7') {
      const t = new Date(today); t.setDate(today.getDate()-6);
      filterFrom.value = t.toISOString().slice(0,10); filterTo.value = today.toISOString().slice(0,10);
    } else if (v === 'mesAtual') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      filterFrom.value = start.toISOString().slice(0,10); filterTo.value = today.toISOString().slice(0,10);
    } else if (v === 'intervalo') {
      filterFrom.value = ''; filterTo.value = '';
    }
  });

  btnFiltrar.addEventListener('click', () => {
    const from = filterFrom.value;
    const to = filterTo.value || from;
    if (!from) return alert('Escolha a data inicial.');
    const list = filtrarPorPeriodo(from, to);
    const periodLabel = (from === to) ? formatDateBr(from) : `${formatDateBr(from)} → ${formatDateBr(to)}`;
    const observ = (impressaoObservacoes && impressaoObservacoes.value) || '';
    const res = buildReportHTML(list, periodLabel, observ);
    relatorioPreview.innerHTML = res.html;
    // atualizar painel de faturamento resumo
    faturamentoResumo.innerHTML = `<strong>Resumo:</strong>
      <div>Inteiras: ${res.resumo.cntInteira} — Meias: ${res.resumo.cntMeia} — Cortesias: ${res.resumo.cntCortesia}</div>
      <div style="margin-top:6px">Valor bruto: <strong>R$ ${res.resumo.bruto.toFixed(2)}</strong></div>`;
  });

  btnImprimirFiltro.addEventListener('click', () => {
    const from = filterFrom.value;
    const to = filterTo.value || from;
    if (!from) return alert('Escolha a data inicial para imprimir.');
    const list = filtrarPorPeriodo(from, to);
    const periodLabel = (from === to) ? formatDateBr(from) : `${formatDateBr(from)} → ${formatDateBr(to)}`;
    const observ = (impressaoObservacoes && impressaoObservacoes.value) || '';
    const res = buildReportHTML(list, periodLabel, observ);
    // abrir nova janela com toolbar "Voltar ao App" e conteudo do relatório
    const w = window.open('','_blank');
    w.document.write(`<html><head><meta charset="utf-8"><title>Relatório</title>
      <style>body{font-family:Arial;padding:18px} button{padding:8px 10px;border-radius:6px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div></div>
        <div><button onclick="window.close()">Voltar ao App</button></div>
      </div>
      ${res.html}
      </body></html>`);
    w.document.close();
    // dar tempo para a janela carregar e depois chamar print
    setTimeout(()=> w.print(), 600);
  });

  // botão voltar impressão local (na aba Impressão)
  if (btnVoltarImpressao) btnVoltarImpressao.addEventListener('click', () => {
    document.querySelector('nav button[data-tab="cadastro"]').click();
  });
}

/* ---------- FUNÇÕES DE EDIÇÃO (nova) ---------- */

function abrirEdicao(id){
  const c = cadastros.find(x => x.id === id);
  if (!c) { alert('Cadastro não encontrado para edição'); return; }

  idEmEdicao = id;

  try {
    if (form.elements['tipoIngresso']) form.elements['tipoIngresso'].value = c.tipoIngresso || 'inteira';
    if (form.elements['meiaMotivo']) form.elements['meiaMotivo'].value = c.meiaMotivo || '';
    if (form.elements['nome']) form.elements['nome'].value = c.nome || '';
    if (form.elements['dataNascimento']) form.elements['dataNascimento'].value = c.dataNascimento || '';
    if (form.elements['idade']) form.elements['idade'].value = c.idade || '';
    if (form.elements['responsavel']) form.elements['responsavel'].value = c.responsavel || '';
    if (form.elements['telefone']) form.elements['telefone'].value = c.telefone || '';
    if (form.elements['email']) form.elements['email'].value = c.email || '';
    if (form.elements['setor']) form.elements['setor'].value = c.setor || '';
    if (form.elements['mesa']) form.elements['mesa'].value = c.mesa || '';
    if (form.elements['temAlergia']) form.elements['temAlergia'].value = c.temAlergia || 'nao';
    if (form.elements['qualAlergia']) form.elements['qualAlergia'].value = c.qualAlergia || '';
    if (form.elements['altura']) form.elements['altura'].value = c.altura || 'menor';
    if (form.elements['saiSozinho']) form.elements['saiSozinho'].value = c.saiSozinho || 'nao';
    if (form.elements['observacoes']) form.elements['observacoes'].value = c.observacoes || '';
  } catch(e){
    console.warn('Erro ao preencher form para edição', e);
  }

  alergiaLabel.style.display = (c.temAlergia === 'sim') ? 'block' : 'none';
  meiaMotivoWrapper.style.display = (c.tipoIngresso === 'meia') ? 'block' : 'none';
  updateLiveBadge();

  // ir para a aba Cadastro
  document.querySelector('nav button.active')?.classList.remove('active');
  document.querySelector("nav button[data-tab='cadastro']")?.classList.add('active');
  document.querySelector('.tab.active')?.classList.remove('active');
  document.getElementById('cadastro').classList.add('active');
}

/* end edição */

/* Histórico filtro de datas (aplica) */
if (btnFilterHistorico) btnFilterHistorico.addEventListener('click', () => {
  const from = histFrom.value;
  const to = histTo.value || from;
  if (!from) { alert('Escolha a data inicial.'); return; }
  const start = new Date(from + 'T00:00:00');
  const end = new Date((to || from) + 'T23:59:59');
  const filtered = cadastros.filter(c => {
    const d = new Date(c.createdAt);
    return d >= start && d <= end;
  });
  renderHistorico(filtered);
});
if (btnResetHistorico) btnResetHistorico.addEventListener('click', () => {
  histFrom.value = ''; histTo.value = ''; renderHistorico();
});

/* ------------------------------
   ADIÇÕES: VCF + Marketing Image
   ------------------------------*/

/** Gera string VCF para um cadastro */
function gerarVCFString(c) {
  const nome = (c.responsavel && c.responsavel.trim()) ? `${c.responsavel} (Resp.) — ${c.nome}` : c.nome;
  const tel = c.telefone || '';
  const email = c.email || '';
  const noteParts = [];
  if (c.mesa) noteParts.push(`Mesa: ${c.mesa}`);
  if (c.setor) noteParts.push(`Setor: ${c.setor}`);
  if (c.observacoes) noteParts.push(`Obs: ${c.observacoes}`);
  const note = noteParts.join(' • ');
  return `BEGIN:VCARD
VERSION:3.0
FN:${nome}
TEL;TYPE=CELL:${tel}
EMAIL:${email}
NOTE:${note}
END:VCARD`;
}

/** Baixa VCF de um cadastro (por objeto) */
function baixarVCFIndividualObj(c) {
  const content = gerarVCFString(c);
  const blob = new Blob([content], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // safe filename
  const fname = (c.nome || 'contato').replace(/[^\w\- ]+/g,'').trim();
  a.download = `${fname}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Baixa VCF de um cadastro por id */
function baixarVCFIndividualById(id){
  const c = cadastros.find(x => x.id === id);
  if (!c) return alert('Cadastro não encontrado para VCF.');
  baixarVCFIndividualObj(c);
}

/** Baixa VCF com os selecionados (checkboxes) */
function baixarVCFSelecionados(){
  const selectedIds = $$('#marketingList input[type="checkbox"]:checked').map(ch => ch.dataset.id);
  if (!selectedIds.length) return alert('Selecione ao menos um contato.');
  const contents = selectedIds.map(id => {
    const c = cadastros.find(x => x.id === id);
    return c ? gerarVCFString(c) : '';
  }).filter(Boolean).join('\n');
  const blob = new Blob([contents], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'contatos_parquinho.vcf';
  a.click();
  URL.revokeObjectURL(url);
}

/** Baixa VCF com todos os cadastros */
function baixarVCFTodos(){
  if (!cadastros.length) return alert('Nenhum cadastro para exportar.');
  const contents = cadastros.map(c => gerarVCFString(c)).join('\n');
  const blob = new Blob([contents], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'todos_contatos_parquinho.vcf';
  a.click();
  URL.revokeObjectURL(url);
}

/* Marketing image preview & remove */
function attachMarketingImageHandlers(){
  const previewWrap = $('#marketingImagePreview');
  const previewImg = $('#marketingPreviewImg');
  const removeBtn = $('#marketingRemoveImg');

  if (marketingImage) {
    marketingImage.addEventListener('change', (ev) => {
      const file = ev.target.files[0];
      if (!file) {
        if (previewWrap) previewWrap.style.display = 'none';
        return;
      }
      const reader = new FileReader();
      reader.onload = function(e) {
        if (previewImg) previewImg.src = e.target.result;
        if (previewWrap) previewWrap.style.display = 'inline-block';
      };
      reader.readAsDataURL(file);
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      if (marketingImage) marketingImage.value = '';
      if (previewImg) previewImg.src = '';
      if (previewWrap) previewWrap.style.display = 'none';
    });
  }

  // hook VCF buttons
  const btnSaveSelected = $('#btnSaveSelectedVCF');
  const btnSaveAll = $('#btnSaveAllVCF');
  if (btnSaveSelected) btnSaveSelected.addEventListener('click', baixarVCFSelecionados);
  if (btnSaveAll) btnSaveAll.addEventListener('click', baixarVCFTodos);
}

/* end of additions */

/* Service worker (se existir) */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').then(()=> console.log('SW registrado')).catch(e=>console.warn('SW erro', e));
}

/* Fim do arquivo */
