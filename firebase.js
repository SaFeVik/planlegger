import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB8AuDscPcxRkRQXbNJqAwjSJuJ-EdwG_g",
    authDomain: "planlegger-2d81c.firebaseapp.com",
    projectId: "planlegger-2d81c",
    storageBucket: "planlegger-2d81c.appspot.com",
    messagingSenderId: "38434169268",
    appId: "1:38434169268:web:778187ed018ae4bd2592e1",
    measurementId: "G-V9XGW70HVY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };