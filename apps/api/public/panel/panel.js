class PanelApplication {
  constructor() {
    this.apiBase = `${window.location.origin}/api/v1`;
    this.tokenStorageKey = "nakliyeborsasi_panel_token";
    this.loginSection = document.getElementById("login-section");
    this.dashboardSection = document.getElementById("dashboard-section");
    this.errorElement = document.getElementById("error");
    this.listingsElement = document.getElementById("listings");
    this.integrationOutput = document.getElementById("integration-output");
    this.bindEvents();
    this.restoreSession();
  }

  bindEvents() {
    document.getElementById("login-button").addEventListener("click", () => {
      void this.handleLogin();
    });
    document.getElementById("load-listings").addEventListener("click", () => {
      void this.loadListings();
    });
    document.getElementById("load-integrations").addEventListener("click", () => {
      void this.loadIntegrations();
    });
    document.getElementById("logout-button").addEventListener("click", () => {
      this.handleLogout();
    });
  }

  restoreSession() {
    const token = window.localStorage.getItem(this.tokenStorageKey);
    if (token) {
      this.showDashboard();
    }
  }

  readLocale() {
    return document.getElementById("locale").value;
  }

  readToken() {
    return window.localStorage.getItem(this.tokenStorageKey) ?? "";
  }

  showError(message) {
    this.errorElement.hidden = false;
    this.errorElement.textContent = message;
  }

  clearError() {
    this.errorElement.hidden = true;
    this.errorElement.textContent = "";
  }

  showDashboard() {
    this.loginSection.hidden = true;
    this.dashboardSection.hidden = false;
    this.clearError();
  }

  handleLogout() {
    window.localStorage.removeItem(this.tokenStorageKey);
    this.dashboardSection.hidden = true;
    this.loginSection.hidden = false;
    this.listingsElement.innerHTML = "";
    this.integrationOutput.hidden = true;
    this.integrationOutput.textContent = "";
  }

  async handleLogin() {
    this.clearError();
    const emailAddress = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const response = await fetch(`${this.apiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailAddress, password }),
    });
    if (!response.ok) {
      this.showError("Giriş başarısız");
      return;
    }
    const payload = await response.json();
    window.localStorage.setItem(this.tokenStorageKey, payload.accessToken);
    this.showDashboard();
  }

  async loadListings() {
    const response = await fetch(
      `${this.apiBase}/marketplace/listings?lang=${this.readLocale()}`,
      {
        headers: { Authorization: `Bearer ${this.readToken()}` },
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      this.showError(JSON.stringify(payload));
      return;
    }
    this.listingsElement.innerHTML = "";
    for (const listing of payload.listings ?? []) {
      const article = document.createElement("article");
      article.className = "listing";
      const priceText = listing.price
        ? `${listing.price.amount} ${listing.price.currencyCode}`
        : "Fiyat yok";
      article.innerHTML = `<strong>${listing.origin.cityName} → ${listing.destination.cityName}</strong><br/>${listing.equipmentType} · ${listing.weightTonnes} t · ${priceText}`;
      this.listingsElement.appendChild(article);
    }
  }

  async loadIntegrations() {
    const response = await fetch(
      `${this.apiBase}/integrations/freight-offers?lang=${this.readLocale()}&limit=8`,
      {
        headers: { Authorization: `Bearer ${this.readToken()}` },
      },
    );
    const payload = await response.json();
    this.integrationOutput.hidden = false;
    this.integrationOutput.textContent = JSON.stringify(payload, null, 2);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new PanelApplication();
});
