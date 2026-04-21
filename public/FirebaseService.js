import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Centralized Firebase configuration keeps the browser modules thin and makes
// collection names consistent across auth, travel planning, and admin flows.
export const firebaseConfig = {
  apiKey: "AIzaSyBy0XClQ65kVVGN9tf-byOGvsQCha0-hP4",
  authDomain: "omnilinktransit.firebaseapp.com",
  projectId: "omnilinktransit",
  storageBucket: "omnilinktransit.firebasestorage.app",
  messagingSenderId: "877800642968",
  appId: "1:877800642968:web:8dc7f6123d9e4a039673ed",
  measurementId: "G-8RJLP7X6BW"
};

export const firebaseCollections = Object.freeze({
  users: "users",
  buses: "buses",
  busStations: "busStations",
  fuelStations: "fuelStations",
  travelPlans: "travelPlans",
  activityLogs: "activityLogs"
});

export const travelPlanSubcollections = Object.freeze({
  segments: "segments",
  stops: "stops"
});

// Reuse the existing app instance when the module is imported multiple times.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);

console.info("[DEBUG][Firebase] Initialized", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  appName: firebaseApp.name
});
