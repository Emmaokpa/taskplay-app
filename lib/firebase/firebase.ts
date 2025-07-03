// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCqdKJZpfJkcJMJDVjNjL0sW-aAwiBGJfs",
  authDomain: "taskplay-8d1c5.firebaseapp.com",
  projectId: "taskplay-8d1c5",
  storageBucket: "taskplay-8d1c5.firebasestorage.app",
  messagingSenderId: "25162436982",
  appId: "1:25162436982:web:1000bc678daa77b23bea57",
  measurementId: "G-2ZZV8SM0XR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);