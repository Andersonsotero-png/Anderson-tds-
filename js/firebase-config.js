// firebase-config.js
// -------------------------------------------
// Inicialização do Firebase (Modo Normal - compat)
// -------------------------------------------

// 🔥 CONFIG DO SEU PROJETO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDO9p1eYNtw-JRZ1QVpapRgtuz5wQ3JgBA",
  authDomain: "parquinho-app.firebaseapp.com",
  projectId: "parquinho-app",
  storageBucket: "parquinho-app.firebasestorage.app",
  messagingSenderId: "384157492858",
  appId: "1:384157492858:web:14ac13cc017b5eae7efdc3",
  measurementId: "G-HMQ2REK0G9"
};

// 🔥 Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// 🔥 Instância do Firestore
const db = firebase.firestore();

console.log("Firebase carregado com sucesso!");
