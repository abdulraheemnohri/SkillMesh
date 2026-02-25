# SkillMesh – Professional P2P Task Network

SkillMesh is a fully decentralized professional task network that connects users posting tasks with local professionals (Electricians, Plumbers, Tutors, etc.) using a P2P mesh network. It is lightweight, offline-first, and cross-platform (Termux, Desktop, Browser).

---

## 🚀 Features

- **Decentralized Task Posting:** Users post tasks with Country, City, Location, and Task Type.
- **Professional Dashboard:** Professionals can view, filter, claim, and complete tasks.
- **P2P Mesh Network:** Syncs tasks and claims across nodes using `libp2p` and `GossipSub`.
- **Location & Type Filtering:** Real-time filtering by country, city, location, and task type.
- **Professional Profiles:** Full profile support (Name, Profession, Skills, Image, Rating).
- **Donation System:** Integrated support for Bank transfers and MetaMask/Crypto donations.
- **Offline-First:** Tasks are broadcasted when peers are discovered; no central server required.

---

## 📂 Folder Structure

```text
SkillMesh/
├── frontend/             # Browser UI (HTML, CSS, JS)
├── professional-node/    # Node.js P2P Service
│   ├── node.js           # Main Express server & P2P logic
│   ├── libp2p-network.js # libp2p configuration
│   ├── profile.json      # Professional's profile data
│   ├── tasks.json        # Persisted task data
│   └── package.json      # Dependencies
├── images/               # Profile and task-related images
└── README.md             # This guide
```

---

## 🛠️ Installation Guide

### Desktop (Windows / macOS / Linux)

1. **Install Node.js:** Download from [nodejs.org](https://nodejs.org/). (Version 18+ recommended).
2. **Clone the Project:**
   ```bash
   git clone <your-repo-url>
   cd SkillMesh/professional-node
   ```
3. **Install Dependencies:**
   ```bash
   npm install
   ```

### Android (Termux)

1. **Update Packages:**
   ```bash
   pkg update && pkg upgrade
   ```
2. **Install Node.js and Git:**
   ```bash
   pkg install nodejs git
   ```
3. **Setup Repository:**
   ```bash
   git clone <your-repo-url>
   cd SkillMesh/professional-node
   npm install
   ```

---

## 🚀 Setup Guide

1. **Configure Your Profile:**
   Open `professional-node/profile.json` and update your professional details:
   ```json
   {
     "id": "unique-node-id",
     "name": "Your Name",
     "profession": "Electrician",
     "skills": ["Inverter Repair", "Wiring"],
     "country": "Your Country",
     "city": "Your City",
     "location": "Your Area",
     "profileImage": "your-image.jpg",
     "rating": 5.0,
     "completedTasks": 0
   }
   ```
2. **Start the Node:**
   ```bash
   node node.js
   ```
3. **Access the Dashboard:**
   Open your browser and navigate to:
   `http://localhost:3000`

---

## ⚙️ Settings & Configuration Guide

### Customizing Task Types
To add or modify task types, update the `<select>` options in `frontend/index.html`:
```html
<select id="type">
    <option value="Electrician">Electrician</option>
    <option value="Developer">Developer</option> <!-- Add new types here -->
</select>
```

### Filtering Tasks
The **Task Board** includes filtering controls for Country, City, Location, and Type. These filters work locally on the current node's task list.
- **Country/City/Location:** Type partial names to find relevant tasks.
- **Type:** Select a specific profession from the dropdown.
- **Apply Filters:** Click the button to refresh the view.

### Donations
- **Bank Transfer:** Update the bank details in `frontend/index.html` under the `bank-info` div.
- **Crypto (MetaMask):** Update your wallet address in `frontend/app.js` within the `donateCrypto` function:
  ```javascript
  to: "YOUR_CRYPTO_WALLET_ADDRESS"
  ```

---

## 🔗 P2P Networking Details

- **Protocol:** SkillMesh uses `libp2p` with TCP transport and Noise encryption.
- **Discovery:** `mDNS` is used for automatic discovery of other nodes on the local network.
- **Broadcasting:** Tasks are published on the `skillmesh-tasks` GossipSub topic.
- **Conflict Resolution:** The system operates on a "first-claim-wins" basis. Once a claim is broadcasted and received, other nodes update the task status to "assigned" and prevent further claims.

---

## 📝 License
Apache-2.0 OR MIT
