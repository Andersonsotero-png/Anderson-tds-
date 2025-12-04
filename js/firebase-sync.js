// firebase-sync.js
// -------------------------------------------------------
// SINCRONIZAÇÃO EM TEMPO REAL (Modelo A - Prioridade Nuvem)
// -------------------------------------------------------

// Coleção principal no Firestore
const col = db.collection("cadastros");

// ===========================================
// 🔥 1) ENVIAR LOCAL → FIREBASE  (UPLOAD)
// ===========================================
async function syncUpload(cadastros) {
  try {
    for (const c of cadastros) {
      await col.doc(c.id).set(c, { merge: true });
    }
    console.log("UPLOAD → Firebase concluído");
  } catch (e) {
    console.error("Erro no upload:", e);
  }
}

// ===========================================
// 🔥 2) RECEBER FIREBASE → LOCAL (DOWNLOAD)
// ===========================================
function syncRealtime() {
  col.orderBy("createdAt", "desc").onSnapshot((snap) => {
    const lista = [];
    snap.forEach((doc) => lista.push(doc.data()));

    // Atualiza localStorage
    localStorage.setItem("cadastros", JSON.stringify(lista));

    // Atualiza variáveis globais
    cadastros = lista;

    // Atualiza telas
    if (typeof renderHistorico === "function") renderHistorico();
    if (typeof renderMarketingList === "function") renderMarketingList();

    console.log("SINCRONIZAÇÃO EM TEMPO REAL ✔");
  });
}

// Inicia sincronização ao carregar
syncRealtime();

// ===========================================
// 🔥 3) AUTO-UPLOAD SEMPRE QUE ALTERAR LOCAL
// ===========================================
function saveCadastrosFirebase() {
  saveCadastros();  // salva local
  syncUpload(cadastros); // sobe p/ Firebase
}
