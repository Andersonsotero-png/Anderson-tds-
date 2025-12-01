/* app.js - Parquinho Terra do Sol */
/* util */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const nowISO = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().slice(0,10);
const uid = () => Date.now().toString(36);

/* state */
let cadastros = JSON.parse(localStorage.getItem('cadastros') || '[]');
cadastros = cadastros.map(c => ({ entradas: c.entradas||[], saidas: c.saidas||[], status: c.status||'fora', createdAt: c.createdAt||c.createdAt || nowISO(), ...c }));

/* UI refs */
const tabs = $$('.tabs .tab');
const panels = $$('.panel');

const tipoPulseira = $('#tipoPulseira');
const boxMotivoMeia = $('#boxMotivoMeia');
const motivoMeia = $('#motivoMeia');

const dataNasc = $('#dataNasc');
const idadeEl = $('#idade');
const temAlergia = $('#temAlergia');
const boxAlergia = $('#boxAlergia');

const btnSalvar = $('#btnSalvar');
const btnGerarQRTodos = $('#btnGerarQRTodos');
const qrArea = $('#qrArea');
const btnBaixarQR = $('#btnBaixarQR');
const btnImprimirEtiqueta = $('#btnImprimirEtiqueta');
const btnImprimirEtiquetaPeq = $('#btnImprimirEtiquetaPeq');

const inputBusca = $('#inputBusca');
const listaBusca = $('#listaBusca');

const histFrom = $('#histFrom');
const histTo = $('#histTo');
const btnFiltrarHistorico = $('#btnFiltrarHistorico');
const btnLimparFiltroHistorico = $('#btnLimparFiltroHistorico');
const listaHistorico = $('#listaHistorico');
const btnExportExcel = $('#btnExportExcel');

const listaMarketing = $('#listaMarketing');
const btnSelecionarTodos = $('#btnSelecionarTodos');
const btnLimparSelecao = $('#btnLimparSelecao');
const btnEnviarSelecionados = $('#btnEnviarSelecionados');

const relFrom = $('#relFrom');
const relTo = $('#relTo');
const ocorrenciasRel = $('#ocorrenciasRel');
const btnGerarRelatorio = $('#btnGerarRelatorio');
const btnImprimirRelatorio = $('#btnImprimirRelatorio');
const relatorioPreview = $('#relatorioPreview');
const btnVoltarImpressao = $('#btnVoltarImpressao');

const floatingBackBtn = $('#floatingBackBtn');

/* helpers */
function saveAll(){ localStorage.setItem('cadastros', JSON.stringify(cadastros)); }
function calcularIdadeFromDate(dStr){
  if(!dStr) return '';
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return '';
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade--;
  return idade;
}
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* navigation */
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  panels.forEach(p => p.classList.remove('active'));
  const id = t.dataset.tab;
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  // hide floating back when navigating
  showFloatingBack(false);
}));

/* UI interactivity */
tipoPulseira && tipoPulseira.addEventListener('change', () => {
  if (tipoPulseira.value === 'meia') boxMotivoMeia.style.display = 'block';
  else boxMotivoMeia.style.display = 'none';
});
temAlergia && temAlergia.addEventListener('change', () => {
  boxAlergia.style.display = (temAlergia.value === 'sim') ? 'block' : 'none';
});
dataNasc && dataNasc.addEventListener('change', () => {
  idadeEl.value = calcularIdadeFromDate(dataNasc.value);
});

/* Save / Create */
btnSalvar && btnSalvar.addEventListener('click', (e) => {
  e.preventDefault();
  const nome = $('#nome').value.trim();
  if (!nome) return alert('Informe o nome da criança.');
  const novo = {
    id: uid(),
    nome,
    dataNasc: dataNasc.value || '',
    idade: idadeEl.value || calcularIdadeFromDate(dataNasc.value),
    altura: $('#altura').value || 'menor',
    saiSozinho: $('#saiSozinho').value || 'nao',
    responsavel: $('#responsavel').value.trim(),
    telefone: $('#telefone').value.trim(),
    email: $('#email').value.trim(),
    setor: $('#setor').value || '',
    mesa: $('#mesa').value.trim(),
    temAlergia: temAlergia.value || 'nao',
    qualAlergia: $('#qualAlergia').value.trim(),
    observacoes: $('#observacoes').value.trim(),
    tipoPulseira: tipoPulseira.value || '',
    motivoMeia: motivoMeia.value || '',
    entradas: [],
    saidas: [],
    status: 'fora',
    createdAt: nowISO()
  };
  cadastros.unshift(novo);
  saveAll();
  gerarQR(novo.id, true);
  alert('Cadastro salvo!');
  // reset form fields (simple)
  document.querySelectorAll('#cadastro input:not([readonly]), #cadastro textarea').forEach(i=>i.value='');
  document.querySelectorAll('#cadastro select').forEach(s=>s.selectedIndex=0);
  boxAlergia.style.display = 'none';
  boxMotivoMeia.style.display = 'none';
  renderHistorico();
  renderMarketingList();
});

/* gerar/baixar/print QR */
function gerarQR(id, scrollTo = false){
  if(!qrArea) return;
  qrArea.innerHTML = '';
  try {
    const el = document.createElement('div');
    new QRCode(el, { text: String(id), width: 160, height: 160, correctLevel: QRCode.CorrectLevel.H });
    qrArea.appendChild(el);
    if(scrollTo) el.scrollIntoView({behavior:'smooth'});
  } catch(e){ console.warn(e); qrArea.textContent = 'Erro ao gerar QR'; }
}
btnBaixarQR && btnBaixarQR.addEventListener('click', () => {
  const c = qrArea.querySelector('img, canvas');
  if (!c) return alert('Gere um QR primeiro.');
  const url = c.tagName.toLowerCase()==='img' ? c.src : c.toDataURL('image/png');
  const a = document.createElement('a'); a.href = url; a.download = 'qr.png'; a.click();
});

/* print label */
function buildLabelHtml(c, qrDataURL, size='large'){
  const w = (size==='large') ? '4cm' : '2.5cm';
  const fontSizeName = (size==='large') ? '12px' : '10px';
  const metaSize = (size==='large') ? '10px' : '8px';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta</title>
    <style>body{font-family:Arial;margin:6px}.label{width:${w};height:${w};display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px dashed #333;padding:6px}.name{font-weight:700;margin-top:6px;font-size:${fontSizeName}}.meta{font-size:${metaSize};margin-top:4px}.badge{display:inline-block;padding:4px 8px;border-radius:6px;color:#fff;font-weight:700;margin-top:6px}</style>
    </head><body><div class="label"><div id="qrWrap"></div><div class="name">${escapeHtml(c.nome)}</div><div class="meta">ID: ${c.id} • Tel: ${escapeHtml(c.telefone||'-')}</div><div class="meta">Setor: ${escapeHtml(c.setor||'-')} • ${escapeHtml(c.mesa||'-')}</div><div class="meta">${(c.altura==='maior')? 'Maior que 1m' : 'Menor que 1m'}</div><div class="meta">${(c.saiSozinho==='sim')? 'Sai sozinho' : 'Não sai sozinho'}</div><div style="margin-top:6px"><span class="badge ${c.saiSozinho==='sim'?'green':(c.altura==='maior'?'yellow':'red')}">${(c.saiSozinho==='sim')?'SAI SOZINHO':(c.altura==='maior'?'MAIOR > 1m':'NÃO SAI SOZINHO')}</span></div></div>
    <script>window.addEventListener('message', e=>{try{if(e.data && e.data.qr){var img=new Image(); img.src=e.data.qr; img.style.width='70%'; document.getElementById('qrWrap').appendChild(img);} }catch(err){}}, false); window.onload=function(){ setTimeout(()=>window.print(),300); }</script></body></html>`;
}
function printLabel(c, size='large'){
  QRCode.toDataURL(String(c.id), { width: (size==='large'?400:200) }).then(url=>{
    const w = window.open('', '_blank');
    w.document.write(buildLabelHtml(c, url, size));
    w.document.close();
    setTimeout(()=> w.postMessage({qr: url}, '*'), 500);
  }).catch(e=>{ console.warn(e); alert('Erro ao gerar QR para impressão'); });
}
btnImprimirEtiqueta && btnImprimirEtiqueta.addEventListener('click', ()=> {
  if (!cadastros.length) return alert('Nenhum cadastro para imprimir.');
  printLabel(cadastros[0], 'large');
});
btnImprimirEtiquetaPeq && btnImprimirEtiquetaPeq.addEventListener('click', ()=> {
  if (!cadastros.length) return alert('Nenhum cadastro para imprimir.');
  printLabel(cadastros[0], 'small');
});

/* Gerar todos QRs (visual) */
btnGerarQRTodos && btnGerarQRTodos.addEventListener('click', () => {
  qrArea.innerHTML = '';
  if (!cadastros.length) return qrArea.textContent = 'Sem cadastros';
  cadastros.forEach(c => {
    const wrap = document.createElement('div'); wrap.className='card'; wrap.style.display='inline-block'; wrap.style.margin='6px'; wrap.style.padding='8px';
    const holder = document.createElement('div');
    new QRCode(holder, { text: c.id, width:110, height:110, correctLevel: QRCode.CorrectLevel.H });
    const name = document.createElement('div'); name.textContent = `${c.nome} • ${c.mesa||'-'}`;
    wrap.appendChild(holder); wrap.appendChild(name); qrArea.appendChild(wrap);
  });
});

/* BUSCA */
inputBusca && inputBusca.addEventListener('input', () => {
  const termo = inputBusca.value.trim().toLowerCase();
  listaBusca.innerHTML = '';
  if (!termo) return;
  const results = cadastros.filter(c => (c.nome||'').toLowerCase().includes(termo) || (c.telefone||'').includes(termo) || (c.mesa||'').toLowerCase().includes(termo) || (c.id||'').includes(termo));
  results.forEach(c => {
    const li = document.createElement('li'); li.className='card';
    li.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div><strong>${escapeHtml(c.nome)}</strong><br><small>${escapeHtml(c.telefone||'-')} • ${escapeHtml(c.mesa||'-')}</small></div>
      <div style="text-align:right">
        <span class="badge ${c.saiSozinho==='sim'?'green':(c.altura==='maior'?'yellow':'red')}">${c.saiSozinho==='sim'?'SAI SOZINHO':(c.altura==='maior'?'MAIOR>1m':'NÃO SAI')}</span><br>
        <button class="hist-btn small" data-id="${c.id}" onclick="registrarEntradaSaida('${c.id}')">Registrar</button>
        <button class="hist-btn small" data-id="${c.id}" onclick="printLabelById('${c.id}')">Imprimir QR</button>
        <button class="hist-btn small" data-id="${c.id}" onclick="abrirEdicao('${c.id}')">Alterar</button>
      </div></div>`;
    listaBusca.appendChild(li);
  });
});

/* HISTÓRICO rendering + filter */
function renderHistorico(filterFrom, filterTo){
  listaHistorico.innerHTML = '';
  let list = cadastros.slice();
  if (filterFrom) {
    const f = new Date(filterFrom + 'T00:00:00');
    list = list.filter(c => new Date(c.createdAt) >= f);
  }
  if (filterTo) {
    const t = new Date(filterTo + 'T23:59:59');
    list = list.filter(c => new Date(c.createdAt) <= t);
  }
  if (!list.length) return listaHistorico.textContent = 'Nenhum cadastro.';
  list.forEach(c => {
    const div = document.createElement('div'); div.className='card';
    const entradas = (c.entradas||[]).map(x=>new Date(x.ts).toLocaleString()).join('<br>') || '-';
    const saidas = (c.saidas||[]).map(x=>new Date(x.ts).toLocaleString()).join('<br>') || '-';
    div.innerHTML = `<strong>${escapeHtml(c.nome)}</strong> <div>Tel: ${escapeHtml(c.telefone||'-')} • Mesa: ${escapeHtml(c.mesa||'-')}</div>
      <div>Status: ${c.status==='dentro'?'🟢 No parque':'🔴 Fora do parque'} • Pulseira: ${escapeHtml(c.tipoPulseira||'-')}</div>
      <div style="margin-top:8px">
        <button class="hist-btn" onclick="registrarEntradaSaida('${c.id}')">Registrar</button>
        <button class="hist-btn" onclick="printLabelById('${c.id}')">Imprimir QR</button>
        <button class="hist-btn" onclick="confirmDelete('${c.id}')">Excluir</button>
      </div>
      <div style="margin-top:8px"><strong>Entradas:</strong><br>${entradas}</div>
      <div style="margin-top:8px"><strong>Saídas:</strong><br>${saidas}</div>`;
    listaHistorico.appendChild(div);
  });
}
btnFiltrarHistorico && btnFiltrarHistorico.addEventListener('click', ()=> renderHistorico(histFrom.value, histTo.value));
btnLimparFiltroHistorico && btnLimparFiltroHistorico.addEventListener('click', ()=> { histFrom.value=''; histTo.value=''; renderHistorico(); });

/* Export Excel using SheetJS */
btnExportExcel && btnExportExcel.addEventListener('click', () => {
  if (!cadastros.length) return alert('Sem dados.');
  const sheetData = cadastros.map(c=>({
    id:c.id,nome:c.nome,dataNasc:c.dataNasc,idade:c.idade,telefone:c.telefone,email:c.email,setor:c.setor,mesa:c.mesa,tipoPulseira:c.tipoPulseira,createdAt:c.createdAt
  }));
  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cadastros');
  XLSX.writeFile(wb, `cadastros_${todayDate()}.xlsx`);
  showFloatingBack(true);
});

/* Marketing list rendering */
function renderMarketingList(){
  if (!listaMarketing) return;
  listaMarketing.innerHTML = '';
  cadastros.forEach(c => {
    const row = document.createElement('div'); row.className='card';
    row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center';
    const left = document.createElement('div'); left.innerHTML = `<strong>${escapeHtml(c.nome)}</strong><br><small>${escapeHtml(c.telefone||'-')} • ${escapeHtml(c.email||'-')}</small>`;
    const right = document.createElement('div');
    right.innerHTML = `<input type="checkbox" data-id="${c.id}" style="margin-right:8px"><button class="hist-btn small" onclick="openWhatsApp('${c.telefone}')">WA</button>`;
    row.appendChild(left); row.appendChild(right);
    listaMarketing.appendChild(row);
  });
}
btnSelecionarTodos && btnSelecionarTodos.addEventListener('click', ()=> $$('#listaMarketing input[type="checkbox"]').forEach(i=>i.checked=true));
btnLimparSelecao && btnLimparSelecao.addEventListener('click', ()=> $$('#listaMarketing input[type="checkbox"]').forEach(i=>i.checked=false));
btnEnviarSelecionados && btnEnviarSelecionados.addEventListener('click', ()=> {
  const selected = $$('#listaMarketing input[type="checkbox"]:checked').map(i=>i.dataset.id);
  if (!selected.length) return alert('Selecione ao menos um contato.');
  // fallback: open WA links
  selected.forEach(id=>{
    const c = cadastros.find(x=>x.id===id);
    if (c && c.telefone) openWhatsApp(c.telefone, `Olá ${c.nome}, confira nossa promoção!`);
  });
  showFloatingBack(true);
});

/* registrar entrada/saida */
function registrarEntradaSaida(id){
  const c = cadastros.find(x=>x.id===id);
  if (!c) return alert('Cadastro não encontrado.');
  const operator = prompt('Nome do operador:', '') || 'Operador';
  if (c.status === 'fora' || !c.status) {
    c.entradas = c.entradas || [];
    c.entradas.push({ ts: nowISO(), operator });
    c.status = 'dentro';
    alert(`Entrada registrada: ${c.nome}`);
  } else {
    if (c.saiSozinho !== 'sim') {
      const ok = confirm(`${c.nome} NÃO pode sair sozinho. Deseja contatar responsável?`);
      if (ok) contactResponsible(c);
      c.saidas = c.saidas || [];
      c.saidas.push({ ts: nowISO(), operator, blocked: true });
      alert('Saída bloqueada e registrada como tentativa.');
    } else {
      c.saidas = c.saidas || [];
      c.saidas.push({ ts: nowISO(), operator });
      c.status = 'fora';
      alert(`Saída registrada: ${c.nome}`);
    }
  }
  saveAll(); renderHistorico(); renderMarketingList();
}

/* contact options */
function contactResponsible(c){
  const opt = prompt(`Contato para ${c.nome}:
1 - Ligar
2 - WhatsApp
3 - SMS
4 - Email
Digite 1-4`, '2');
  if (!opt) return;
  if (opt === '1') window.open(`tel:${c.telefone}`, '_self');
  else if (opt === '2') openWhatsApp(c.telefone, `Atenção: tentativa de saída de ${c.nome}`);
  else if (opt === '3') openSMS(c.telefone, `Tentativa de saída de ${c.nome}`);
  else if (opt === '4') openMail(c.email, 'Tentativa de saída', `Tentativa de saída de ${c.nome}`);
}

/* open helpers */
function openWhatsApp(num, text=''){ if(!num) return alert('Número ausente'); const d=num.replace(/\D/g,''); window.open(`https://wa.me/${d}?text=${encodeURIComponent(text||'')}`, '_blank'); }
function openSMS(num, body=''){ if(!num) return alert('Número ausente'); window.open(`sms:${num}?body=${encodeURIComponent(body)}`, '_blank'); }
function openMail(email, subj='', body=''){ if(!email) return alert('Email ausente'); window.open(`mailto:${email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`, '_blank'); }

/* imprimir etiqueta por id */
function printLabelById(id){
  const c = cadastros.find(x=>x.id===id);
  if (!c) return alert('Cadastro não encontrado');
  printLabel(c,'small');
  showFloatingBack(true);
}

/* excluir com senha */
function confirmDelete(id){
  const password = prompt('Senha para excluir cadastro:');
  if (password !== 'tds_1992') { alert('Senha incorreta.'); return; }
  cadastros = cadastros.filter(x=>x.id!==id);
  saveAll(); renderHistorico(); renderMarketingList();
  alert('Cadastro excluído.');
}

/* edição */
function abrirEdicao(id){
  const c = cadastros.find(x=>x.id===id);
  if (!c) return alert('Cadastro não encontrado.');
  // preencher formulário
  $('#tipoPulseira').value = c.tipoPulseira || '';
  if (c.tipoPulseira === 'meia') boxMotivoMeia.style.display = 'block';
  $('#motivoMeia').value = c.motivoMeia || '';
  $('#nome').value = c.nome || '';
  $('#dataNasc').value = c.dataNasc || '';
  $('#idade').value = c.idade || calcularIdadeFromDate(c.dataNasc);
  $('#altura').value = c.altura || 'menor';
  $('#saiSozinho').value = c.saiSozinho || 'nao';
  $('#responsavel').value = c.responsavel || '';
  $('#telefone').value = c.telefone || '';
  $('#email').value = c.email || '';
  $('#setor').value = c.setor || '';
  $('#mesa').value = c.mesa || '';
  $('#temAlergia').value = c.temAlergia || 'nao';
  $('#qualAlergia').value = c.qualAlergia || '';
  $('#observacoes').value = c.observacoes || '';
  // scroll to cadastro
  document.querySelector('.tabs .tab[data-tab="cadastro"]').click();
  // remove the old and replace on save: simple approach = delete old and let save create new with new id
  // Alternative: better to update in-place — implement update flow:
  if (confirm('Deseja editar este cadastro? Ao salvar, o cadastro será atualizado (mesmo ID).')) {
    // attach one-time handler to override save process
    const original = btnSalvar.onclick;
    btnSalvar.onclick = function(ev){
      ev && ev.preventDefault && ev.preventDefault();
      // update properties
      c.tipoPulseira = $('#tipoPulseira').value;
      c.motivoMeia = $('#motivoMeia').value;
      c.nome = $('#nome').value.trim();
      c.dataNasc = $('#dataNasc').value || '';
      c.idade = $('#idade').value || calcularIdadeFromDate(c.dataNasc);
      c.altura = $('#altura').value;
      c.saiSozinho = $('#saiSozinho').value;
      c.responsavel = $('#responsavel').value.trim();
      c.telefone = $('#telefone').value.trim();
      c.email = $('#email').value.trim();
      c.setor = $('#setor').value;
      c.mesa = $('#mesa').value;
      c.temAlergia = $('#temAlergia').value;
      c.qualAlergia = $('#qualAlergia').value;
      c.observacoes = $('#observacoes').value;
      saveAll();
      renderHistorico();
      renderMarketingList();
      alert('Cadastro atualizado.');
      // restore original handler
      btnSalvar.onclick = original;
      // reset form simple
      document.querySelectorAll('#cadastro input:not([readonly]), #cadastro textarea').forEach(i=>i.value='');
      document.querySelectorAll('#cadastro select').forEach(s=>s.selectedIndex=0);
      boxAlergia.style.display='none';
      boxMotivoMeia.style.display='none';
    };
  }
}

/* Relatório: gerar e imprimir (apenas resultados, sem listar cadastros) */
function gerarRelatorio(){
  const from = relFrom.value || todayDate();
  const to = relTo.value || relFrom.value || from;
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T23:59:59');
  const slice = cadastros.filter(c => { const d = new Date(c.createdAt); return d >= start && d <= end; });
  const totalInteira = slice.filter(c=>c.tipoPulseira==='inteira').length;
  const totalMeia = slice.filter(c=>c.tipoPulseira==='meia').length;
  const totalCortesia = slice.filter(c=>c.tipoPulseira==='cortesia').length;
  const valorInteira = totalInteira * 35.90;
  const valorMeia = totalMeia * 17.95;
  const valorTotal = (valorInteira + valorMeia);
  const ocorr = ocorrenciasRel.value || '';
  // build summary HTML
  const html = `<div id="relatorioPrint" class="report-wrapper">
    <img src="assets/icons/icon-512.png" class="report-watermark" alt="logo" />
    <div class="report-header" style="display:flex;align-items:center;gap:12px">
      <img src="assets/icons/icon-512.png" alt="logo" style="width:80px">
      <div>
        <div style="font-weight:800;font-size:18px">Relatório — Terra do Sol</div>
        <div style="color:#666">Período: ${from} → ${to}</div>
        <div style="color:#666">Gerado em: ${new Date().toLocaleString()}</div>
      </div>
    </div>
    <hr>
    <div style="margin-top:8px">
      <div><strong>Totais</strong></div>
      <div>Inteiras: ${totalInteira} • Valor: R$ ${valorInteira.toFixed(2)}</div>
      <div>Meias: ${totalMeia} • Valor: R$ ${valorMeia.toFixed(2)}</div>
      <div>Cortesias: ${totalCortesia}</div>
      <div style="margin-top:8px"><strong>Faturamento bruto: R$ ${valorTotal.toFixed(2)}</strong></div>
    </div>
    <div style="margin-top:12px">
      <strong>Ocorrências / Demandas:</strong>
      <div style="white-space:pre-wrap;margin-top:6px">${escapeHtml(ocorr)}</div>
    </div>
    </div>`;
  relatorioPreview.innerHTML = html;
  showFloatingBack(true);
}

/* print report window (prints what's in relatorioPreview but we already open a new window) */
btnImprimirRelatorio && btnImprimirRelatorio.addEventListener('click', ()=> {
  const from = relFrom.value || todayDate();
  const to = relTo.value || relFrom.value || from;
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T23:59:59');
  const slice = cadastros.filter(c => { const d = new Date(c.createdAt); return d >= start && d <= end; });
  const totalInteira = slice.filter(c=>c.tipoPulseira==='inteira').length;
  const totalMeia = slice.filter(c=>c.tipoPulseira==='meia').length;
  const totalCortesia = slice.filter(c=>c.tipoPulseira==='cortesia').length;
  const valorInteira = totalInteira * 35.90;
  const valorMeia = totalMeia * 17.95;
  const valorTotal = (valorInteira + valorMeia);
  const ocorr = ocorrenciasRel.value || '';
  const reportHtml = `<html><head><meta charset="utf-8"><title>Relatório</title>
    <style>body{font-family:Arial;padding:18px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px}</style></head><body>
    <h2>Relatório — Terra do Sol</h2>
    <div>Período: ${from} → ${to}</div>
    <hr>
    <div>Inteiras: ${totalInteira} — R$ ${valorInteira.toFixed(2)}</div>
    <div>Meias: ${totalMeia} — R$ ${valorMeia.toFixed(2)}</div>
    <div>Cortesias: ${totalCortesia}</div>
    <div style="margin-top:10px"><strong>Faturamento bruto: R$ ${valorTotal.toFixed(2)}</strong></div>
    <div style="margin-top:12px"><strong>Ocorrências / Demandas:</strong><div style="white-space:pre-wrap;margin-top:6px">${escapeHtml(ocorr)}</div></div>
    </body></html>`;
  const w = window.open('','_blank');
  w.document.write(reportHtml);
  w.document.close();
  setTimeout(()=> w.print(), 600);
  showFloatingBack(true);
});

/* floating back btn behavior */
function showFloatingBack(show=true){
  if (!floatingBackBtn) return;
  floatingBackBtn.style.display = show ? 'block' : 'none';
}
floatingBackBtn && floatingBackBtn.addEventListener('click', ()=>{
  showFloatingBack(false);
  document.querySelector('.tabs .tab[data-tab="cadastro"]').click();
  relatorioPreview.innerHTML = '';
  window.scrollTo(0,0);
});

/* Camera scanning (modo botão - captura frame e usa jsQR) */
let cameraStream = null;
const video = document.createElement('video');
video.setAttribute('playsinline','true');
video.style.display='none';
document.body.appendChild(video);
const scanCanvas = document.createElement('canvas');
const scanCtx = scanCanvas.getContext && scanCanvas.getContext('2d');

let cameraOpen = false;
function openCameraForScan(){
  if (cameraOpen) return;
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(stream=>{
    cameraStream = stream;
    video.srcObject = stream;
    video.play();
    cameraOpen = true;
    alert('Câmera aberta. Aperte OK e depois use o botão "Registrar" na busca/histórico para capturar frame.');
  }).catch(e=> alert('Erro ao abrir câmera: ' + e.message));
}
function closeCamera(){
  if (!cameraOpen) return;
  cameraStream.getTracks().forEach(t=>t.stop());
  cameraOpen = false;
}
window.openCameraForScan = openCameraForScan;
window.closeCamera = closeCamera;

/* simple auto render on start */
function renderAll(){
  renderHistorico();
  renderMarketingList();
}
renderAll();

/* helper to print label outside scope */
window.printLabelById = printLabelById;
window.abrirEdicao = abrirEdicao;
window.registrarEntradaSaida = registrarEntradaSaida;

/* initial setup: set default date inputs to today */
histFrom.value = ''; histTo.value = '';
relFrom.value = todayDate(); relTo.value = todayDate();

/* expose for debug */
window._app = { cadastros, saveAll, gerarQR };

/* end of file */
