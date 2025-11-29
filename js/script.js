function openTab(tab){
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(tab).classList.add("active");

  document.querySelectorAll("nav button").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");
}

// ================================
//  GERAR QR CODE
// ================================
function gerarQRCode(){
  let nome = document.getElementById("nomeCrianca").value.trim();
  let resp = document.getElementById("responsavel").value.trim();
  let cont = document.getElementById("contato").value.trim();
  let obs  = document.getElementById("obs").value.trim();

  if(!nome || !resp || !cont){
    alert("Preencha todos os campos obrigatórios!");
    return;
  }

  let dados = {
    nome, responsavel:resp, contato:cont, observacoes:obs,
    criado: new Date().toLocaleString()
  };

  let textoQR = JSON.stringify(dados);

  let qrDiv = document.getElementById("qrCodeCadastro");
  qrDiv.innerHTML = "";

  QRCode.toCanvas(textoQR, { width:230 }, function(err, canvas){
    qrDiv.appendChild(canvas);

    // botão de imprimir
    let btnPrint = document.createElement("button");
    btnPrint.innerText = "Visualizar QR / Imprimir";
    btnPrint.onclick = () => abrirPrint(dados, canvas.toDataURL());
    qrDiv.appendChild(btnPrint);
  });

  salvarHistorico(dados);
}

// ================================
//  LIMPAR
// ================================
function limparCadastro(){
  document.getElementById("formCadastro").reset();
  document.getElementById("qrCodeCadastro").innerHTML = "";
}

// ================================
//  SALVAR HISTÓRICO
// ================================
function salvarHistorico(obj){
  let banco = JSON.parse(localStorage.getItem("historico") || "[]");
  banco.push(obj);
  localStorage.setItem("historico", JSON.stringify(banco));
  carregarHistorico();
}

// ================================
//  CARREGAR HISTÓRICO
// ================================
function carregarHistorico(){
  let banco = JSON.parse(localStorage.getItem("historico") || "[]");
  let cont = document.getElementById("listaHistoricoContainer");
  cont.innerHTML = "";

  banco.forEach(item =>{
    let div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <b>${item.nome}</b><br>
      Responsável: ${item.responsavel}<br>
      Contato: ${item.contato}<br>
      <i>${item.criado}</i>
    `;

    cont.appendChild(div);
  });
}
carregarHistorico();

// ================================
//  BUSCAR
// ================================
function buscarCadastro(){
  let termo = document.getElementById("inputBusca").value.toLowerCase();
  let banco = JSON.parse(localStorage.getItem("historico") || "[]");

  let lista = document.getElementById("listaBusca");
  lista.innerHTML = "";

  banco
  .filter(c => c.nome.toLowerCase().includes(termo))
  .forEach(c =>{
    let li = document.createElement("li");
    li.innerHTML = `<div class="card"><b>${c.nome}</b><br>${c.contato}</div>`;
    lista.appendChild(li);
  });
}

// ================================
//  EXPORTAR EXCEL
// ================================
function exportarExcel(){
  let banco = JSON.parse(localStorage.getItem("historico") || "[]");
  let wb = XLSX.utils.book_new();
  let ws = XLSX.utils.json_to_sheet(banco);
  XLSX.utils.book_append_sheet(wb, ws, "Historico");
  XLSX.writeFile(wb, "historico_parquinho.xlsx");
}

// ================================
//  TELA DE IMPRESSÃO
// ================================
function abrirPrint(dados, qrBase64){
  
  openTab("printPage");

  let area = document.getElementById("relatorioPrint");

  area.innerHTML = `
    <div class="report-wrapper">
      <img src="img/logo.png" class="report-watermark">

      <div class="report-header">
        <img src="img/logo.png">
        <div>
          <div class="report-title">TERRA DO SOL</div>
          <div class="report-meta">Ficha de Identificação - Parquinho</div>
        </div>
      </div>

      <table class="report-table">
        <tr><th>Nome</th><td>${dados.nome}</td></tr>
        <tr><th>Responsável</th><td>${dados.responsavel}</td></tr>
        <tr><th>Contato</th><td>${dados.contato}</td></tr>
        <tr><th>Observações</th><td>${dados.observacoes || "-"}</td></tr>
        <tr><th>Data</th><td>${dados.criado}</td></tr>
      </table>

      <br>

      <img src="${qrBase64}" width="220"/>
    </div>
  `;
}

function voltarAoApp(){
  openTab("cadastro");
}
