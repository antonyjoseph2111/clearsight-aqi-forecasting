// Import from CDN for static site usage
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDWjCO7bdLGwITw0SpG0gRgmFND31mzn-o",
    authDomain: "clear-sight-auralis.firebaseapp.com",
    databaseURL: "https://clear-sight-auralis-default-rtdb.firebaseio.com",
    projectId: "clear-sight-auralis",
    storageBucket: "clear-sight-auralis.firebasestorage.app",
    messagingSenderId: "87017226699",
    appId: "1:87017226699:web:9a924c5bdd85e119cb764e",
    measurementId: "G-0RME42YDSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

console.log("Firebase Analytics Initialized 📈");
