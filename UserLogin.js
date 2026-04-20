export default class UserLogin {
  constructor() {
    this.storageKey = "accounts";
    this.adminUsername = "admin123";
    this.adminPassword = "admin123";
  }

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

  createAccount({
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
    const safePassword = (password || "").trim();
    const safeConfirmPassword = (confirmPassword || "").trim();

    if (
      !safeFirstName ||
      !safeLastName ||
      !safeEmail ||
      !safeUsername ||
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
      safeUsername.length > 15 ||
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

    if (safeUsername === this.adminUsername) {
      return {
        success: false,
        message: "The username admin123 is reserved and cannot be created."
      };
    }

    const accounts = this.getAccounts();

    const usernameExists = accounts.some(
      (account) => account.username.toLowerCase() === safeUsername.toLowerCase()
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

    accounts.push({
      firstName: safeFirstName,
      lastName: safeLastName,
      email: safeEmail,
      username: safeUsername,
      password: safePassword,
      role: "user"
    });

    this.saveAccounts(accounts);

    return {
      success: true,
      message: "Account created successfully. Please log in."
    };
  }

  login(username, password) {
    const safeUsername = (username || "").trim();
    const safePassword = (password || "").trim();

    if (!safeUsername || !safePassword) {
      return {
        success: false,
        message: "Enter username and password."
      };
    }

    if (safeUsername.length > 15 || safePassword.length > 15) {
      return {
        success: false,
        message: "Username or password is too long. Max 15 characters."
      };
    }

    if (
      safeUsername === this.adminUsername &&
      safePassword === this.adminPassword
    ) {
      localStorage.setItem("currentUser", this.adminUsername);
      localStorage.setItem("currentRole", "admin");
      localStorage.setItem("currentFirstName", "System");
      localStorage.setItem("currentLastName", "Administrator");
      localStorage.setItem("currentEmail", "admin@fictional.local");

      return {
        success: true,
        message: "Admin logged in successfully.",
        role: "admin"
      };
    }

    const accounts = this.getAccounts();
    const foundUser = accounts.find(
      (account) =>
        account.username === safeUsername && account.password === safePassword
    );

    if (foundUser) {
      const role = "user";

      localStorage.setItem("currentUser", foundUser.username);
      localStorage.setItem("currentRole", role);
      localStorage.setItem("currentFirstName", foundUser.firstName || "");
      localStorage.setItem("currentLastName", foundUser.lastName || "");
      localStorage.setItem("currentEmail", foundUser.email || "");

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

  logout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentRole");
    localStorage.removeItem("currentFirstName");
    localStorage.removeItem("currentLastName");
    localStorage.removeItem("currentEmail");

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