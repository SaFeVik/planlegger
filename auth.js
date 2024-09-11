import { db } from './firebase.js';
import { collection, addDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import taskManager from './taskManager.js';

let currentUser = null;

async function login(username, password) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        // User doesn't exist, create a new one
        await addDoc(usersRef, { username, password });
        currentUser = username;
    } else {
        // User exists, check password
        const userDoc = querySnapshot.docs[0];
        if (userDoc.data().password === password) {
            currentUser = username;
        } else {
            throw new Error("Incorrect password");
        }
    }

    // Save username to localStorage
    localStorage.setItem('currentUser', currentUser);

    return currentUser;
}

function logout() {
    currentUser = null;
    // Remove username from localStorage
    localStorage.removeItem('currentUser');
    location.reload();
}

function getCurrentUser() {
    return currentUser || localStorage.getItem('currentUser');
}

// New function to check if user is logged in
function isLoggedIn() {
    return !!getCurrentUser();
}

export { login, logout, getCurrentUser, isLoggedIn };

