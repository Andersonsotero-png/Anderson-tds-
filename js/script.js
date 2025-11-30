// ============================
// TROCA DE ABAS
// ============================
document.querySelectorAll("nav button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(btn.dataset.tab).classList.add("active");

    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  };
});


// ============================
// INGRESSO: valores + categorias de meia
// ============================
const VALORES = {
  inteira: 35.90,
  meia: 17.95,
  cortesia: 0
};

// cria o bloco da MEIA no topo do formulário
(function adicionarCamposMeia() {
  const form = document.querySelector("#formCadastro");

  const bloco = document.createElement("div");
  bloco.innerHTML = `
    <label>Tipo de ingresso:
      <select name="tpIngresso" id="tpIngresso">
        <option value="inteira">Inteira — R$ 35,90</option>
        <option value="meia">Meia — R$ 17,95</option>
        <option value="cortesia">Cortesia — R$ 0,00</option>
      </select>
    </label>

    <label id="boxMeia" style="display:none">
      Categoria da meia:
      <select id="catMeia">
        <option value="pcd">PCD</option>
        <option value="tea">TEA</option>
        <option value="down">Down</option>
      </select>
    </label>
  `;
  
  form.prepend(bloco);
})();

document.getElementById("tpIngresso").onchange = () => {
  document.getElementById("boxMeia").style.display =
    tpIngresso.value === "meia" ? "block" : "none";
};


// ============================
// CADASTRAR
// ============================
document.getElementById("formCadastro").onsubmit = (e) => {
  e.preventDefault();

  const fd = new FormData(e.target);

  const ingresso = fd.get("tpIngresso");
  const categoriaMeia = ingresso === "meia" ? document.getElementById("catMeia").value : "";

  const registro = {
    nome: fd.get("nome"),
    dataNascimento: fd.get("dataNascimento"),
    idade: fd.get("idade"),
    responsavel: fd.get("responsavel"),
    telefone: fd.get("telefone"),
    email: fd.get("email"),
    setor: fd.get("setor"),
    mesa: fd.get("mesa"),
    temAlergia: fd.get("temAlergia"),
    qualAlergia: fd.get("qualAlergia"),
    altura: fd.get("altura"),
    saiSozinho: fd.get("saiSozinho"),
    observacoes: fd.get("observacoes"),

    ingresso,
    categoriaMeia,
    valor: VALORES[ingresso],
    criado: new Date().toLocaleString()
  };

  salvarHistorico(registro);
  gerarQRCode(registro);
};


// ============================
// QR CODE
// ============================
function gerarQRCode(dados){
  let box = document.getElementById("qrCodeCadastro");
  box.innerHTML = "";

  QRCode.toCanvas(JSON.stringify(dados), {width:220}, (err, canvas)=>{
    box.appendChild(canvas);
  });
}


// ============================
// HISTÓRICO
// ============================
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
      ${item.telefone}<br>
      Ingresso: ${item.ingresso}${item.categoriaMeia ? " ("+item.categoriaMeia+")" : ""} — R$ ${item.valor.toFixed(2)}<br>
      <i>${item.criado}</i>
    `;
    cont.appendChild(div);
  });
}
carregarHistorico();


// ============================
// BUSCA
// ============================
function buscarCadastro(){
  let termo = inputBusca.value.toLowerCase();
  let banco = JSON.parse(localStorage.getItem("historico")||"[]");

  listaBusca.innerHTML = "";

  banco
    .filter(c =>
      c.nome.toLowerCase().includes(termo) ||
      c.telefone.toLowerCase().includes(termo) ||
      c.mesa.toLowerCase().includes(termo)
    )
    .forEach(c => {
      listaBusca.innerHTML += `
        <li><div class="card">
          <b>${c.nome}</b><br>${c.telefone}
        </div></li>`;
    });
}
inputBusca.oninput = buscarCadastro;


// ============================
// EXPORTAR EXCEL
// ============================
document.getElementById("btnExportJSON").onclick = () => {
  let banco = JSON.parse(localStorage.getItem("historico")||"[]");

  let wb = XLSX.utils.book_new();
  let ws = XLSX.utils.json_to_sheet(banco);

  XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
  XLSX.writeFile(wb, "relatorio_parquinho.xlsx");
};


// ============================
// RELATÓRIO IMPRESSÃO
// ============================
document.getElementById("btnImprimirFiltro").onclick = () => {
  let banco = JSON.parse(localStorage.getItem("historico")||"[]");

  let hoje = new Date().toLocaleDateString();
  let doDia = banco.filter(r => r.criado.includes(hoje));

  let totInteira = doDia.filter(r=>r.ingresso==="inteira").length;
  let totMeia    = doDia.filter(r=>r.ingresso==="meia").length;
  let totCortesia= doDia.filter(r=>r.ingresso==="cortesia").length;

  let totalBruto = doDia.reduce((s,r)=>s+r.valor,0);

  relatorioPreview.innerHTML = `
    <h3>Relatório do dia</h3>
    <b>Inteira:</b> ${totInteira} crianças<br>
    <b>Meia:</b> ${totMeia} crianças<br>
    <b>Cortesia:</b> ${totCortesia} crianças<br>
    <hr>
    <b>Total Bruto:</b> R$ ${totalBruto.toFixed(2)}
  `;
};


// ============================
// BOTÃO VOLTAR
// ============================
document.getElementById("btnVoltarImpressao").onclick = () => {
  document.querySelector("button[data-tab='cadastro']").click();
};
