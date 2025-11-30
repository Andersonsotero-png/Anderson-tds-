// ================== TROCA DE ABAS ==================
document.querySelectorAll("nav button").forEach(btn => {
  btn.onclick = e => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");

    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  };
});

// Exibir categorias da meia
document.getElementById("tpIngresso").onchange = () => {
  let tipo = document.getElementById("tpIngresso").value;
  document.getElementById("boxMeia").style.display = 
      tipo === "meia" ? "block" : "none";
};

// Valores
const VALORES = {
  inteira: 35.90,
  meia: 17.95,
  cortesia: 0
};

// ================== CADASTRO ==================
document.getElementById("btnCadastrar").onclick = () => {
  let nome = nomeCrianca.value.trim();
  let resp = responsavel.value.trim();
  let cont = contato.value.trim();
  let obs  = obs.value.trim();

  let tipoIngresso = tpIngresso.value;
  let categoriaMeia = tipoIngresso === "meia" ? catMeia.value : "";

  if(!nome || !cont){
    alert("Preencha nome e contato.");
    return;
  }

  let registro = {
    nome,
    responsavel: resp,
    contato: cont,
    observacoes: obs,
    ingresso: tipoIngresso,
    categoria: categoriaMeia,
    valor: VALORES[tipoIngresso],
    criado: new Date().toLocaleString()
  };

  salvarHistorico(registro);
  gerarQRCode(registro);
};

// ================== QR CODE ==================
function gerarQRCode(dados){
  let box = document.getElementById("qrCodeCadastro");
  box.innerHTML = "";

  QRCode.toCanvas(JSON.stringify(dados), {width:220}, (err, canvas)=>{
    box.appendChild(canvas);
  });
}

// ================== HISTÓRICO ==================
function salvarHistorico(obj){
  let banco = JSON.parse(localStorage.getItem("historico")||"[]");
  banco.push(obj);
  localStorage.setItem("historico", JSON.stringify(banco));
  carregarHistorico();
}

function carregarHistorico(){
  let banco = JSON.parse(localStorage.getItem("historico")||"[]");
  let cont = document.getElementById("listaHistoricoContainer");
  cont.innerHTML = "";

  banco.forEach(item=>{
    let div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <b>${item.nome}</b><br>
      ${item.contato}<br>
      Ingresso: ${item.ingresso} - R$ ${item.valor.toFixed(2)}<br>
      <i>${item.criado}</i>
    `;
    cont.appendChild(div);
  });
}
carregarHistorico();

// ================== BUSCA ==================
function buscarCadastro(){
  let termo = inputBusca.value.toLowerCase();
  let banco = JSON.parse(localStorage.getItem("historico")||"[]");

  listaBusca.innerHTML = "";

  banco
    .filter(c => c.nome.toLowerCase().includes(termo))
    .forEach(c => {
      listaBusca.innerHTML += `
        <li><div class="card">
          <b>${c.nome}</b><br>${c.contato}
        </div></li>`;
    });
}

// ================== EXPORTAR EXCEL ==================
function exportarExcel(){
  let banco = JSON.parse(localStorage.getItem("historico")||"[]");

  let wb = XLSX.utils.book_new();
  let ws = XLSX.utils.json_to_sheet(banco);

  XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
  XLSX.writeFile(wb, "relatorio_parquinho.xlsx");
}

// ================== RELATÓRIO IMPRESSÃO ==================
document.getElementById("btnImprimirFiltro").onclick = () => {
  let banco = JSON.parse(localStorage.getItem("historico")||"[]");

  let hoje = new Date().toLocaleDateString();
  let doDia = banco.filter(r => r.criado.includes(hoje));

  let totInteira = doDia.filter(r=>r.ingresso==="inteira").length;
  let totMeia    = doDia.filter(r=>r.ingresso==="meia").length;
  let totCortesia= doDia.filter(r=>r.ingresso==="cortesia").length;

  let valorTotal = doDia.reduce((s,r)=>s+r.valor,0);

  relatorioPreview.innerHTML = `
    <h3>Relatório do dia</h3>
    <b>Inteira:</b> ${totInteira} crianças<br>
    <b>Meia:</b> ${totMeia} crianças<br>
    <b>Cortesia:</b> ${totCortesia} crianças<br>
    <hr>
    <b>Total arrecadado:</b> R$ ${valorTotal.toFixed(2)}
  `;
};

// botão VOLTAR funcionando
document.getElementById("btnVoltarImpressao").onclick = () => {
  document.querySelector("[data-tab='cadastro']").click();
};
