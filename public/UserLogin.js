import { firebaseAuth, firestoreDb, firebaseCollections } from "./FirebaseService.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export default class UserLogin {
  constructor() {
    // Local account storage exists to preserve the app's current login flow
    // while Firebase Auth remains the source of truth for Firestore access.
    this.storageKey = "accounts";
    this.adminUsername = "admin123";
    this.adminPassword = "admin123";
    this.adminEmail = "admin123@omnilink.local";
    this.authDomain = "omnilink.local";
  }

  // =========================
  // Identity Helpers
  // =========================

  normalizeUsername(username) {
    return String(username || "").trim().toLowerCase();
  }

  buildAuthEmail(username) {
    return `${this.normalizeUsername(username)}@${this.authDomain}`;
  }

  isValidUsername(username) {
    const candidate = String(username || "");
    return /^[a-zA-Z0-9._-]+$/.test(candidate)
      && !candidate.startsWith(".")
      && !candidate.endsWith(".")
      && !candidate.includes("..");
  }

  isRecoverableAuthError(error) {
    return error?.code === "auth/user-not-found" || error?.code === "auth/invalid-credential";
  }

  setCurrentSession({ username, role, firstName = "", lastName = "", email = "" }) {
    localStorage.setItem("currentUser", username);
    localStorage.setItem("currentRole", role);
    localStorage.setItem("currentFirstName", firstName);
    localStorage.setItem("currentLastName", lastName);
    localStorage.setItem("currentEmail", email);
  }

  clearCurrentSession() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentRole");
    localStorage.removeItem("currentFirstName");
    localStorage.removeItem("currentLastName");
    localStorage.removeItem("currentEmail");
  }

  async ensureFirebaseSession(authEmail, password, debugLabel, debugContext = {}) {
    try {
      await signInWithEmailAndPassword(firebaseAuth, authEmail, password);
      console.info(`[DEBUG][Auth] ${debugLabel} sign-in successful`, {
        ...debugContext,
        authEmail,
        uid: firebaseAuth.currentUser?.uid || null
      });
      return;
    } catch (authErr) {
      console.warn(`[DEBUG][Auth] ${debugLabel} sign-in failed; trying create`, {
        ...debugContext,
        authEmail,
        code: authErr?.code,
        message: authErr?.message
      });

      if (!this.isRecoverableAuthError(authErr)) {
        return;
      }
    }

    try {
      await createUserWithEmailAndPassword(firebaseAuth, authEmail, password);
      console.info(`[DEBUG][Auth] ${debugLabel} account created in Firebase Auth`, {
        ...debugContext,
        authEmail,
        uid: firebaseAuth.currentUser?.uid || null
      });
    } catch (createErr) {
      console.error(`[DEBUG][Auth] ${debugLabel} account create failed`, {
        ...debugContext,
        authEmail,
        code: createErr?.code,
        message: createErr?.message
      });
    }
  }

  // =========================
  // Local Account Persistence
  // =========================

  getAccounts() {
    const accounts = localStorage.getItem(this.storageKey);
    const parsedAccounts = accounts ? JSON.parse(accounts) : [];

    // Never trust persisted roles for UI-created accounts.
    return parsedAccounts.map((account) => ({
      ...account,
      role: "user"
    }));
  }

  saveAccounts(accounts) {
    localStorage.setItem(this.storageKey, JSON.stringify(accounts));
  }

  // =========================
  // Account Creation
  // =========================

  async createAccount({
    firstName,
    lastName,
    email,
    username,
    password,
    confirmPassword
  }) {
    const safeFirstName = (firstName || "").trim();
    const safeLastName = (lastName || "").trim();
    const safeEmail = (email || "").trim().toLowerCase();
    const safeUsername = (username || "").trim();
    const normalizedUsername = this.normalizeUsername(safeUsername);
    const safePassword = (password || "").trim();
    const safeConfirmPassword = (confirmPassword || "").trim();
    const authEmail = this.buildAuthEmail(normalizedUsername);

    if (
      !safeFirstName ||
      !safeLastName ||
      !safeEmail ||
      !normalizedUsername ||
      !safePassword ||
      !safeConfirmPassword
    ) {
      return {
        success: false,
        message: "All fields are required."
      };
    }

    if (
      safeFirstName.length > 30 ||
      safeLastName.length > 30 ||
      safeEmail.length > 120 ||
      normalizedUsername.length > 15 ||
      safePassword.length > 15
    ) {
      return {
        success: false,
        message: "One or more fields are too long."
      };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(safeEmail)) {
      return {
        success: false,
        message: "Please enter a valid email address."
      };
    }

    if (safePassword !== safeConfirmPassword) {
      return {
        success: false,
        message: "Password and confirm password do not match."
      };
    }

    if (!this.isValidUsername(normalizedUsername)) {
      return {
        success: false,
        message: "Username can only include letters, numbers, dots, underscores, and hyphens."
      };
    }

    if (normalizedUsername === this.adminUsername.toLowerCase()) {
      return {
        success: false,
        message: "The username admin123 is reserved and cannot be created."
      };
    }

    const accounts = this.getAccounts();

    const usernameExists = accounts.some(
      (account) => this.normalizeUsername(account.username) === normalizedUsername
    );

    if (usernameExists) {
      return {
        success: false,
        message: "Username already exists. Pick another."
      };
    }

    const emailExists = accounts.some(
      (account) => (account.email || "").toLowerCase() === safeEmail
    );

    if (emailExists) {
      return {
        success: false,
        message: "An account with that email already exists."
      };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, authEmail, safePassword);
      const uid = userCredential.user.uid;
      const now = new Date().toISOString();

      await setDoc(doc(firestoreDb, firebaseCollections.users, uid), {
        uid,
        username: normalizedUsername,
        authEmail,
        email: safeEmail,
        firstName: safeFirstName,
        lastName: safeLastName,
        role: "user",
        isActive: true,
        createdAt: now,
        lastLoginAt: now
      });

      await signOut(firebaseAuth);
      console.info("[DEBUG][Auth] Account created in Firebase Auth", {
        username: normalizedUsername,
        authEmail
      });
      console.info("[DEBUG][Auth] User profile saved to Firestore", {
        uid,
        collection: firebaseCollections.users
      });
    } catch (authErr) {
      const authCode = authErr?.code || "unknown";
      const authMessage = authErr?.message || "No error message provided by Firebase Auth";
      console.error(
        `[DEBUG][Auth] Firebase account creation failed | code=${authCode} | message=${authMessage} | authEmail=${authEmail}`
      );
      console.error("[DEBUG][Auth] Firebase account creation failed", {
        username: normalizedUsername,
        authEmail,
        code: authCode,
        message: authMessage
      });
      return {
        success: false,
        message: `Firebase account creation failed (${authCode}). Check Auth provider setup and console logs.`
      };
    }

    accounts.push({
      firstName: safeFirstName,
      lastName: safeLastName,
      email: safeEmail,
      username: normalizedUsername,
      authEmail,
      password: safePassword,
      role: "user"
    });

    this.saveAccounts(accounts);

    return {
      success: true,
      message: "Account created successfully. Please log in."
    };
  }

  // =========================
  // Login / Logout
  // =========================

  async login(username, password) {
    const safeUsername = (username || "").trim();
    const normalizedUsername = this.normalizeUsername(safeUsername);
    const safePassword = (password || "").trim();

    if (!normalizedUsername || !safePassword) {
      return {
        success: false,
        message: "Enter username and password."
      };
    }

    if (normalizedUsername.length > 15 || safePassword.length > 15) {
      return {
        success: false,
        message: "Username or password is too long. Max 15 characters."
      };
    }

    if (!this.isValidUsername(normalizedUsername)) {
      return {
        success: false,
        message: "Invalid username format."
      };
    }

    if (
      normalizedUsername === this.adminUsername &&
      safePassword === this.adminPassword
    ) {
      console.info("[DEBUG][Auth] Admin login attempt", { username: normalizedUsername });
      this.setCurrentSession({
        username: this.adminUsername,
        role: "admin",
        firstName: "System",
        lastName: "Administrator",
        email: this.adminEmail
      });

      await this.ensureFirebaseSession(this.adminEmail, this.adminPassword, "Admin");

      if (!firebaseAuth.currentUser) {
        await this.logout();
        return {
          success: false,
          message: "Admin login did not create a Firebase Auth session. Check console logs."
        };
      }

      return {
        success: true,
        message: "Admin logged in successfully.",
        role: "admin"
      };
    }

    const accounts = this.getAccounts();
    const foundUser = accounts.find(
      (account) =>
        this.normalizeUsername(account.username) === normalizedUsername && account.password === safePassword
    );

    if (foundUser) {
      console.info("[DEBUG][Auth] User login attempt", { username: normalizedUsername });
      const role = "user";
      const authEmail = foundUser.authEmail || this.buildAuthEmail(foundUser.username);

      this.setCurrentSession({
        username: this.normalizeUsername(foundUser.username),
        role,
        firstName: foundUser.firstName || "",
        lastName: foundUser.lastName || "",
        email: foundUser.email || ""
      });

      // Pre-migration local users may not have a Firebase Auth record yet.
      await this.ensureFirebaseSession(authEmail, safePassword, "User", {
        username: normalizedUsername
      });

      if (!firebaseAuth.currentUser) {
        await this.logout();
        return {
          success: false,
          message: "Login succeeded locally but Firebase Auth session was not established. Check console logs."
        };
      }

      return {
        success: true,
        message: "Logged in successfully.",
        role
      };
    }

    return {
      success: false,
      message: "Invalid login credentials."
    };
  }

  async logout() {
    this.clearCurrentSession();

    try {
      await signOut(firebaseAuth);
    } catch {
      // Firebase Auth sign-out failure is non-blocking.
    }

    return {
      success: true,
      message: "Logged out successfully."
    };
  }

  isAuthenticated() {
    return localStorage.getItem("currentUser") !== null;
  }

  getCurrentUser() {
    return localStorage.getItem("currentUser");
  }

  getCurrentRole() {
    const currentUser = localStorage.getItem("currentUser");
    const currentRole = localStorage.getItem("currentRole");

    if (!currentUser) {
      return null;
    }

    if (currentUser === this.adminUsername && currentRole === "admin") {
      return "admin";
    }

    return "user";
  }

  getCurrentFirstName() {
    return localStorage.getItem("currentFirstName");
  }

  getCurrentLastName() {
    return localStorage.getItem("currentLastName");
  }

  getCurrentEmail() {
    return localStorage.getItem("currentEmail");
  }
}