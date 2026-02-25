# SkillMesh – Professional P2P Task Network

SkillMesh is a fully decentralized professional task network that connects users posting tasks with local professionals (Electricians, Plumbers, Tutors, etc.) using a P2P mesh network.

The ecosystem consists of two variants:
1.  **Professional Node (Pro Dashboard):** For service providers (electricians, plumbers, etc.) to host the mesh and manage tasks.
2.  **User Client (HTML App):** A lightweight standalone app for normal users to post tasks and track status.

---

## 🚀 Features

- **Decentralized Architecture:** No central server; tasks sync directly between professional nodes.
- **Dual-App Ecosystem:** Optimized UI for both professionals (full dashboard) and users (simplified posting).
- **Mesh Heartbeat & Discovery:** See online professionals and network status in real-time.
- **P2P Sync & Conflict Resolution:** Built on `libp2p` with "First-Claim-Wins" logic.
- **Multi-Location Filtering:** Filter tasks by Country, City, and Specific Area.
- **Reputation System:** Professionals earn points and level up (Beginner to Expert).
- **Donation Ready:** Integrated Crypto (MetaMask) and Bank payment options.

---

## 📂 Project Structure

```text
SkillMesh/
├── professional-node/    # The Mesh Core (Backend + Pro UI)
│   ├── node.js           # P2P Node & Gateway API
│   ├── profile.json      # Professional Identity
│   ├── tasks.json        # Synced Mesh Database
│   └── frontend/         # Professional Dashboard UI
├── client-app/           # Standalone User Client (HTML App)
│   ├── index.html        # Task Posting UI
│   └── app.js            # Node Connection Logic
├── images/               # Shared Media Assets
└── README.md             # This Documentation
```

---

## 🛠️ Installation & Setup

### 1. The Professional Node (Gateway)
Professionals install this to participate in the mesh and provide a gateway for users.

**Desktop / Laptop:**
1.  Install [Node.js](https://nodejs.org/) (v18+).
2.  Navigate to `professional-node/` and run `npm install`.
3.  Start the node: `node node.js`.
4.  Access dashboard: `http://localhost:3000`.

**Android (via Termux):**
1.  `pkg update && pkg install nodejs git`.
2.  `cd professional-node && npm install`.
3.  `node node.js`.

---

### 2. The User Client (Mobile / Standalone)
Normal users open this to post tasks. It can be hosted on a static server or used as a local HTML app.

1.  Open `client-app/index.html` in any browser.
2.  Click the ⚙️ (Settings) icon.
3.  Set the **Mesh Node URL** to the IP/URL of a running Professional Node (default: `http://localhost:3000`).
4.  Start posting tasks!

---

## 🧠 Core Concepts

### Mesh Connectivity
Professional nodes form a mesh using **mDNS** (local) and **PubSub**. They act as "gateways" for user clients. When a user posts a task to a node, that node broadcasts it to all other peers in the mesh.

### Conflict Resolution
If two professionals claim the same task at the same time, SkillMesh uses **Timestamp-based Priority**. The claim with the earlier `assignedAt` timestamp is accepted by the network, ensuring a single professional is assigned.

### Reputation & Stats
Professionals earn **10 points** per completed task.
- **0-19 pts:** Beginner
- **20-49 pts:** Intermediate
- **50-99 pts:** Pro
- **100+ pts:** Expert

---

## ⚙️ Configuration

- **Profile:** Edit `professional-node/profile.json` to set your name, profession, and skills.
- **Donations:** Replace `YOUR_CRYPTO_WALLET_ADDRESS` in both `professional-node/node.js` (or `app.js`) and `client-app/app.js` with your EVM address.
- **CORS:** The Pro Node has built-in CORS support to allow any User Client to connect securely.

---

## 🤝 Contributing
SkillMesh is decentralized and open-source. Feel free to fork and improve the mesh!

---

## 📝 License
Apache-2.0 OR MIT
