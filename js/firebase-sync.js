// firebase-sync.js
// -------------------------------------------------------
// Sincronização em tempo real • Firestore ↔ App (Opção A)
// -------------------------------------------------------

// GARANTE QUE O SCRIPT PRINCIPAL JÁ INICIALIZOU O ARRAY
if (!window.cadastros) window.cadastros = [];

// 🔥 Referência da coleção principal
const colRef = db.collection("cadastros_parquinho");

// 📌 Quando algo mudar no Firestore → atualizar no app
colRef.orderBy("createdAt", "desc").onSnapshot(snapshot => {
    const list = [];

    snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
    });

    console.log("🔥 Atualização em tempo real recebida:", list);

    // Atualiza array global
    window.cadastros = list;

    // Atualiza localStorage
    localStorage.setItem("cadastros", JSON.stringify(list));

    // Recarrega a tela
    if (typeof renderHistorico === "function") renderHistorico();
    if (typeof renderMarketingList === "function") renderMarketingList();
});

// -----------------------------------------------
// 🔥 FUNÇÃO: Enviar cadastro para o Firebase
// -----------------------------------------------
window.syncUploadCadastro = async function (cadastro) {
    try {
        await colRef.doc(cadastro.id).set(cadastro, { merge: true });
        console.log("✔ Enviado ao Firebase:", cadastro.id);
    } catch (err) {
        console.error("Erro ao enviar:", err);
        alert("Falha ao sincronizar com a nuvem!");
    }
};

// -----------------------------------------------
// 🔥 FUNÇÃO: Excluir do Firebase
// -----------------------------------------------
window.syncDeleteCadastro = async function(id){
    try {
        await colRef.doc(id).delete();
        console.log("✔ Excluído do Firebase:", id);
    } catch (err) {
        console.error("Erro ao excluir:", err);
    }
};
