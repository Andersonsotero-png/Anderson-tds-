// firebase-sync.js
// -------------------------------------------------------
// SINCRONIZAÇÃO EM TEMPO REAL (Modelo A - Prioridade Nuvem)
// -------------------------------------------------------

const col = db.collection("cadastros");

// ===========================================
// 1) ENVIAR LOCAL → FIREBASE
// ===========================================
async function syncUpload(cadastros) {
  try {
    for (const c of cadastros) {
      await col.doc(c.id).set(c, { merge: true });
    }
    console.log("⬆️ UPLOAD concluído");
  } catch (e) {
    console.error("Erro no upload:", e);
  }
}

// ===========================================
// 2) RECEBER FIREBASE → LOCAL
// ===========================================
function syncRealtime() {
  col.orderBy("createdAt", "desc").onSnapshot((snap) => {
    const lista = [];
    snap.forEach((doc) => lista.push(doc.data()));

    // Atualiza storage
    localStorage.setItem("cadastros", JSON.stringify(lista));

    // Atualiza lista global
    cadastros = lista;

    // Atualiza telas
    if (typeof renderHistorico === "function") renderHistorico();
    if (typeof renderMarketingList === "function") renderMarketingList();

    console.log("🔄 SINCRONIZAÇÃO EM TEMPO REAL OK");
  });
}

// inicia sync ao carregar
syncRealtime();

// ===========================================
// 3) SALVAR LOCAL + UPLOAD AUTOMÁTICO
// ===========================================
function saveCadastrosFirebase() {
  saveCadastros();      // salva storage
  syncUpload(cadastros); // envia p/ Firestore
}
