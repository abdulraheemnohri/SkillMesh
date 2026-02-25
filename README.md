# SkillMesh – Professional P2P Task Network

SkillMesh is a fully decentralized professional task network that connects users posting tasks with local professionals (Electricians, Plumbers, Tutors, etc.) using a P2P mesh network. It is lightweight, offline-first, and cross-platform (Termux, Desktop, Browser).

---

## 🚀 Features

- **Modern & Responsive UI:** Card-based design for tasks with status badges and filtering.
- **Decentralized Task Posting:** Users broadcast tasks to the mesh with location metadata.
- **Professional Dashboard:** Real-time task board with category and location filtering.
- **P2P Mesh Sync:** Built on `libp2p`, ensuring tasks and claims sync automatically across peers.
- **Profile Management:** Displays professional skills, ratings, and profile images.
- **Integrated Donations:** Support for MetaMask (Crypto) and Bank transfer details.
- **Offline-First:** Works locally and syncs as soon as the mesh network is reachable.

---

## 🧠 How it Works

1.  **Node Discovery:** When a SkillMesh node starts, it uses **mDNS** to find other nodes on the local network. It can also be configured with bootstrap nodes for wider discovery.
2.  **Task Broadcasting:** When a user posts a task, it is published to the `skillmesh-tasks` **GossipSub** topic. All connected peers receive this task and store it in their local `tasks.json`.
3.  **Claiming Logic:** When a professional claims a task, a `task-claim` message is broadcasted.
4.  **Conflict Resolution:** SkillMesh uses a **"First-Claim-Wins"** strategy. The first claim received for an unassigned task is accepted and persisted across the mesh. Subsequent claims for the same task are ignored by other nodes.
5.  **Data Persistence:** Every node maintains its own copy of the mesh state in local JSON files, ensuring full functionality even when disconnected.

---

## 📂 Folder Structure

```text
SkillMesh/
├── frontend/             # Browser UI (Modern HTML/CSS/JS)
├── professional-node/    # Node.js P2P Service
│   ├── node.js           # Express API + P2P PubSub logic
│   ├── libp2p-network.js # libp2p Stack Configuration
│   ├── profile.json      # Your Professional Profile
│   ├── tasks.json        # Synced Mesh Tasks
│   └── package.json      # Backend Dependencies
├── images/               # Media & Profile Pictures
└── README.md             # This Documentation
```

---

## 🛠️ Installation Guide

### 💻 Desktop (Windows / macOS / Linux)

1.  **Prerequisites:** Install [Node.js](https://nodejs.org/) (v18 or higher).
2.  **Clone Repository:**
    ```bash
    git clone https://github.com/abdulraheemnohri/SkillMesh.git
    cd SkillMesh
    ```
3.  **Install Dependencies:**
    ```bash
    cd professional-node
    npm install
    ```
4.  **Launch:**
    ```bash
    node node.js
    ```

### 📱 Android (via Termux)

1.  **Environment Setup:**
    ```bash
    pkg update && pkg upgrade
    pkg install nodejs git
    ```
2.  **Clone & Install:**
    ```bash
    git clone https://github.com/abdulraheemnohri/SkillMesh.git
    cd SkillMesh/professional-node
    npm install
    ```
3.  **Run:**
    ```bash
    node node.js
    ```

---

## ⚙️ Setup & Configuration

### 1. Configure Your Professional Profile
Edit `professional-node/profile.json` to showcase your skills:
```json
{
  "id": "node-unique-id",
  "name": "Ali Khan",
  "profession": "Electrician",
  "skills": ["Inverter Repair", "House Wiring", "Solar Setup"],
  "profileImage": "ali.jpg",
  "rating": 4.9
}
```
*Note: Place your profile image in the `/images` folder.*

### 2. Set Your Donation Address
To receive crypto tips, update `frontend/app.js`:
- Search for `YOUR_CRYPTO_WALLET_ADDRESS` and replace it with your actual Ethereum/EVM wallet address.

### 3. Customize Task Categories
You can add or remove professions by editing the `<select>` elements in `frontend/index.html` (search for `id="type"` and `id="filter-type"`).

---

## 🌐 Usage Guide

1.  **Starting Up:** Once the node is running, open `http://localhost:3000` in your browser.
2.  **Posting a Task:** Fill the "Post a Task" form. Once submitted, your task will be visible on your board and broadcasted to all peers.
3.  **Filtering:** Use the filter bar to narrow down tasks by Country, City, or Profession.
4.  **Claiming:** Click "Claim Task" on any open task. The status will update to **ASSIGNED** across the network.
5.  **Completion:** Once the job is done, mark it as **COMPLETED** to update your reputation and notify the mesh.

---

## 🤝 Contributing
SkillMesh is decentralized and open-source. Feel free to fork and submit PRs to improve the mesh!

---

## 📝 License
Apache-2.0 OR MIT
