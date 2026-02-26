# SkillMesh User App

This is the standalone client application for **SkillMesh**, a decentralized P2P task network.

## Hosting on GitHub Pages

1.  Create a new repository on GitHub (e.g., `skillmesh-client`).
2.  Upload the files in this folder (`index.html`, `style.css`, `app.js`) to the repository.
3.  Go to **Settings** -> **Pages**.
4.  Under **Build and deployment**, set the source to **Deploy from a branch** and select the `main` branch.
5.  Click **Save**. Your app will be live at `https://your-username.github.io/skillmesh-client/`.

## How it works

- **Decentralized Connection**: This app connects to a **SkillMesh Professional Node** (Gateway).
- **Settings**: Click the ⚙️ icon to configure the `Mesh Node URL`. By default, it looks for a node on `http://localhost:3000`.
- **Privacy**: Your mobile number is encrypted/hidden during mesh broadcast and is only shared with the professional who successfully claims your task.

## Features

- **Post Tasks**: Country, City, Location, Category, Mobile, and Deadline.
- **Real-time Mesh**: See professionals online across the mesh network.
- **P2P Chat**: Coordinate directly with professionals through the built-in chat system.
- **Secure**: No central server; tasks sync directly between nodes.
