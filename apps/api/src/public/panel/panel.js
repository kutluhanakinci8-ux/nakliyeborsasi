class PanelApplication {
  constructor() {
    this.apiBase = `${window.location.origin}/api/v1`;
    this.tokenStorageKey = "nakliyeborsasi_panel_token";
    this.session = null;
    this.activeThreadId = null;
    this.loginSection = document.getElementById("login-section");
    this.dashboardSection = document.getElementById("dashboard-section");
    this.errorElement = document.getElementById("error");
    this.sessionInfo = document.getElementById("session-info");
    this.listingsElement = document.getElementById("listings");
    this.auctionsElement = document.getElementById("auctions");
    this.messagingPanel = document.getElementById("messaging");
    this.threadsElement = document.getElementById("threads");
    this.messagesOutput = document.getElementById("messages-output");
    this.integrationOutput = document.getElementById("integration-output");
    this.trustOutput = document.getElementById("trust-output");
    this.bindEvents();
    void this.restoreSession();
  }

  bindEvents() {
    document.getElementById("login-button").addEventListener("click", () => {
      void this.handleLogin();
    });
    document.getElementById("load-listings").addEventListener("click", () => {
      void this.loadListings();
    });
    document.getElementById("load-auctions").addEventListener("click", () => {
      void this.loadAuctions();
    });
    document.getElementById("load-threads").addEventListener("click", () => {
      void this.loadThreads();
    });
    document.getElementById("open-thread").addEventListener("click", () => {
      void this.openThread();
    });
    document.getElementById("send-message").addEventListener("click", () => {
      void this.sendMessage();
    });
    document.getElementById("load-trust").addEventListener("click", () => {
      void this.loadTrust();
    });
    document.getElementById("submit-trust").addEventListener("click", () => {
      void this.submitTrust();
    });
    document.getElementById("load-integrations").addEventListener("click", () => {
      void this.loadIntegrations();
    });
    document.getElementById("logout-button").addEventListener("click", () => {
      this.handleLogout();
    });
    document.getElementById("copy-company-id").addEventListener("click", () => {
      void this.copyCompanyId();
    });
  }

  async copyCompanyId() {
    if (!this.session?.companyId) {
      return;
    }
    await navigator.clipboard.writeText(this.session.companyId);
    this.clearError();
  }

  async copyText(value) {
    await navigator.clipboard.writeText(value);
  }

  async restoreSession() {
    const token = window.localStorage.getItem(this.tokenStorageKey);
    if (token) {
      await this.refreshSession();
      if (this.session) {
        this.showDashboard();
      }
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

  async apiFetch(path, options = {}) {
    const headers = {
      ...(options.headers ?? {}),
    };
    if (this.readToken()) {
      headers.Authorization = `Bearer ${this.readToken()}`;
    }
    return fetch(`${this.apiBase}${path}`, { ...options, headers });
  }

  showDashboard() {
    this.loginSection.hidden = true;
    this.dashboardSection.hidden = false;
    this.clearError();
    if (this.session) {
      this.sessionInfo.textContent = `Firmanız: ${this.session.companyId} · ${this.session.emailAddress}`;
      document.getElementById("copy-company-id").hidden = false;
    }
  }

  handleLogout() {
    window.localStorage.removeItem(this.tokenStorageKey);
    this.session = null;
    this.dashboardSection.hidden = true;
    this.loginSection.hidden = false;
    this.listingsElement.innerHTML = "";
    this.auctionsElement.innerHTML = "";
    this.threadsElement.innerHTML = "";
    this.integrationOutput.hidden = true;
    this.integrationOutput.textContent = "";
    this.messagesOutput.hidden = true;
    this.trustOutput.hidden = true;
  }

  async refreshSession() {
    const response = await this.apiFetch("/auth/session");
    if (!response.ok) {
      window.localStorage.removeItem(this.tokenStorageKey);
      this.session = null;
      return;
    }
    const payload = await response.json();
    this.session = payload.session;
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
    await this.refreshSession();
    this.showDashboard();
  }

  async loadListings() {
    const response = await this.apiFetch(
      `/marketplace/listings?lang=${this.readLocale()}`,
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
      const listingId = listing.listingId ?? listing.id;
      const ownerCompanyId = listing.ownerCompanyId ?? "";
      article.innerHTML = `<strong>${listing.origin.cityName} → ${listing.destination.cityName}</strong><br/>${listing.equipmentType} · ${listing.weightTonnes} t · ${priceText}<br/><small>${listingId}</small>`;
      if (ownerCompanyId) {
        const meta = document.createElement("p");
        meta.className = "listing-meta";
        meta.textContent = `Firma: ${ownerCompanyId}`;
        article.appendChild(meta);
        const copyOwnerButton = document.createElement("button");
        copyOwnerButton.type = "button";
        copyOwnerButton.className = "secondary";
        copyOwnerButton.textContent = "Firma ID kopyala (mesaj/güven)";
        copyOwnerButton.addEventListener("click", () => {
          void this.copyText(ownerCompanyId);
          document.getElementById("counterparty-id").value = ownerCompanyId;
          document.getElementById("trust-company-id").value = ownerCompanyId;
        });
        article.appendChild(copyOwnerButton);
      }
      const auctionButton = document.createElement("button");
      auctionButton.type = "button";
      auctionButton.textContent = "Açık artırma aç";
      auctionButton.addEventListener("click", () => {
        void this.createAuction(listingId);
      });
      article.appendChild(auctionButton);
      this.listingsElement.appendChild(article);
    }
  }

  async createAuction(freightListingId) {
    const minimumBidAmount = Number(window.prompt("Minimum teklif (EUR)", "2000"));
    if (!minimumBidAmount) {
      return;
    }
    const response = await this.apiFetch(
      `/auctions/sessions?lang=${this.readLocale()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freightListingId,
          minimumBidAmount,
          currencyCode: "EUR",
          durationHours: 24,
        }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      this.showError(JSON.stringify(payload));
      return;
    }
    await this.loadAuctions();
  }

  formatAuctionWinner(session) {
    if (!session.winningBidId || !session.bids) {
      return session.statusCode === "CLOSED" ? "Kazanan yok" : "";
    }
    const winningBid = session.bids.find(
      (bid) => bid.id === session.winningBidId,
    );
    if (!winningBid) {
      return "Kazanan teklif";
    }
    return `Kazanan: ${winningBid.bidAmount} · ${winningBid.bidderCompanyId.slice(0, 8)}…`;
  }

  async loadAuctions() {
    this.auctionsElement.innerHTML = "";
    for (const status of ["open", "closed"]) {
      const response = await this.apiFetch(
        `/auctions/sessions?status=${status}&lang=${this.readLocale()}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        this.showError(JSON.stringify(payload));
        return;
      }
      const heading = document.createElement("h3");
      heading.textContent =
        status === "open" ? "Açık artırmalar" : "Kapanmış artırmalar";
      this.auctionsElement.appendChild(heading);
      for (const session of payload.sessions ?? []) {
        const article = document.createElement("article");
        article.className = "listing";
        const bidCount = session.bids?.length ?? 0;
        const winnerLine = this.formatAuctionWinner(session);
        article.innerHTML = `<strong>${session.id.slice(0, 8)}…</strong><br/>Min: ${session.minimumBidAmount} ${session.currencyCode} · Bitiş: ${session.endsAt}<br/>Teklif: ${bidCount}${winnerLine ? `<br/>${winnerLine}` : ""}`;
        if (status === "open") {
          const bidButton = document.createElement("button");
          bidButton.type = "button";
          bidButton.textContent = "Teklif ver";
          bidButton.addEventListener("click", () => {
            void this.placeBid(session.id, session.minimumBidAmount);
          });
          article.appendChild(bidButton);
        }
        this.auctionsElement.appendChild(article);
      }
    }
  }

  async placeBid(auctionSessionId, minimumBidAmount) {
    const bidAmount = Number(
      window.prompt("Teklif tutarı", String(minimumBidAmount)),
    );
    if (!bidAmount) {
      return;
    }
    const response = await this.apiFetch(
      `/auctions/sessions/${auctionSessionId}/bids?lang=${this.readLocale()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidAmount }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      this.showError(JSON.stringify(payload));
      return;
    }
    await this.loadAuctions();
  }

  async loadThreads() {
    this.messagingPanel.hidden = false;
    const response = await this.apiFetch(
      `/messaging/threads?lang=${this.readLocale()}`,
    );
    const payload = await response.json();
    if (!response.ok) {
      this.showError(JSON.stringify(payload));
      return;
    }
    this.threadsElement.innerHTML = "";
    for (const thread of payload.threads ?? []) {
      const row = document.createElement("div");
      row.className = "thread-row";
      row.innerHTML = `<button type="button" class="secondary">${thread.threadId.slice(0, 8)}… → ${thread.counterpartyCompanyId.slice(0, 8)}…</button>`;
      row.querySelector("button").addEventListener("click", () => {
        this.activeThreadId = thread.threadId;
        document.getElementById("counterparty-id").value =
          thread.counterpartyCompanyId;
        void this.loadMessages(thread.threadId);
      });
      this.threadsElement.appendChild(row);
    }
  }

  async openThread() {
    const counterpartyCompanyId =
      document.getElementById("counterparty-id").value.trim();
    if (!counterpartyCompanyId) {
      this.showError("Karşı firma ID girin");
      return;
    }
    const response = await this.apiFetch(
      `/messaging/threads?lang=${this.readLocale()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterpartyCompanyId }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      this.showError(JSON.stringify(payload));
      return;
    }
    this.activeThreadId = payload.thread.id;
    await this.loadThreads();
    await this.loadMessages(this.activeThreadId);
  }

  async loadMessages(threadId) {
    const response = await this.apiFetch(
      `/messaging/threads/${threadId}/messages?lang=${this.readLocale()}`,
    );
    const payload = await response.json();
    this.messagesOutput.hidden = false;
    this.messagesOutput.textContent = JSON.stringify(payload.messages, null, 2);
  }

  async sendMessage() {
    if (!this.activeThreadId) {
      this.showError("Önce bir sohbet seçin veya açın");
      return;
    }
    const bodyText = document.getElementById("message-body").value.trim();
    if (!bodyText) {
      return;
    }
    const response = await this.apiFetch(
      `/messaging/threads/${this.activeThreadId}/messages?lang=${this.readLocale()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyText }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      this.showError(JSON.stringify(payload));
      return;
    }
    document.getElementById("message-body").value = "";
    await this.loadMessages(this.activeThreadId);
  }

  async loadTrust() {
    const companyId = document.getElementById("trust-company-id").value.trim();
    if (!companyId) {
      this.showError("Firma ID girin");
      return;
    }
    const response = await this.apiFetch(`/trust-scores/companies/${companyId}`);
    const payload = await response.json();
    this.trustOutput.hidden = false;
    this.trustOutput.textContent = JSON.stringify(payload.snapshot, null, 2);
  }

  async submitTrust() {
    const companyId = document.getElementById("trust-company-id").value.trim();
    const scoreValue = Number(document.getElementById("trust-score").value);
    const commentText = document.getElementById("trust-comment").value.trim();
    if (!companyId) {
      this.showError("Firma ID girin");
      return;
    }
    const response = await this.apiFetch(
      `/trust-scores/companies/${companyId}/reviews?lang=${this.readLocale()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreValue, commentText }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      this.showError(JSON.stringify(payload));
      return;
    }
    await this.loadTrust();
  }

  async loadIntegrations() {
    const response = await this.apiFetch(
      `/integrations/freight-offers?lang=${this.readLocale()}&limit=8`,
    );
    const payload = await response.json();
    this.integrationOutput.hidden = false;
    this.integrationOutput.textContent = JSON.stringify(payload, null, 2);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new PanelApplication();
});
