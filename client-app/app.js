let nodeUrl = localStorage.getItem('skillmesh_node_url') || 'http://localhost:3000';
let userId = localStorage.getItem('skillmesh_user_id') || 'user-' + Math.floor(Math.random() * 1000);
let discoveredPros = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('node-url').value = nodeUrl;
    document.getElementById('user-id').value = userId;

    checkConnection();
    loadMyTasks();

    const taskForm = document.getElementById('task-form');
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            type: document.getElementById('type').value,
            country: document.getElementById('country').value,
            city: document.getElementById('city').value,
            location: document.getElementById('location').value,
            deadline: document.getElementById('deadline').value,
            timestamp: new Date().toISOString(),
            id: 'task-' + Date.now(),
            ownerId: userId,
            status: 'open'
        };

        try {
            const response = await fetch(`${nodeUrl}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                showToast('Task posted to SkillMesh!');
                taskForm.reset();
                saveLocalTask(taskData.id);
                loadMyTasks();
            } else {
                showToast('Failed to post task. Check node connection.', 'danger');
            }
        } catch (err) {
            showToast('Connection error. Is the node running?', 'danger');
        }
    });

    const settingsForm = document.getElementById('settings-form');
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        nodeUrl = document.getElementById('node-url').value.replace(/\/$/, '');
        userId = document.getElementById('user-id').value;
        localStorage.setItem('skillmesh_node_url', nodeUrl);
        localStorage.setItem('skillmesh_user_id', userId);
        showToast('Settings saved!');
        closeSettings();
        checkConnection();
        loadMyTasks();
    });
});

async function checkConnection() {
    const statusDiv = document.getElementById('node-status');
    const peerList = document.getElementById('online-peers');
    try {
        const response = await fetch(`${nodeUrl}/api/mesh/stats`);
        if (response.ok) {
            const stats = await response.json();
            statusDiv.innerHTML = `<span class="dot" style="background-color: var(--success);"></span> Online (${stats.peerCount} Peers)`;
            discoveredPros = stats.activeProfessionals || [];

            // Render Online Professionals
            if (discoveredPros.length > 0) {
                peerList.innerHTML = discoveredPros.map(p => `
                    <div class="peer-item" onclick="viewProProfile('${p.id}')">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=94a3b8&color=fff" class="peer-avatar">
                        <div class="peer-info">
                            <strong>${escapeHTML(p.name)}</strong>
                            <span><span class="availability-dot ${p.isAvailable ? 'dot-online' : 'dot-offline'}"></span>${escapeHTML(p.profession)} • ★ ${p.rating}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                peerList.innerHTML = '<p class="text-xs text-muted">No professionals found on mesh.</p>';
            }
        } else {
            throw new Error();
        }
    } catch (err) {
        statusDiv.innerHTML = `<span class="dot" style="background-color: var(--danger);"></span> Offline`;
        peerList.innerHTML = '<p class="text-xs text-muted">Node offline.</p>';
    }
}

async function loadMyTasks() {
    const taskList = document.getElementById('task-list');
    const myTaskIds = JSON.parse(localStorage.getItem('skillmesh_my_tasks') || '[]');

    if (myTaskIds.length === 0) {
        taskList.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem;">You haven\'t posted any tasks yet.</p>';
        return;
    }

    try {
        const response = await fetch(`${nodeUrl}/api/tasks`);
        const allTasks = await response.json();
        let myTasks = allTasks.filter(t => myTaskIds.includes(t.id));

        const filterStatus = document.getElementById('filter-status').value;
        if (filterStatus !== 'all') {
            myTasks = myTasks.filter(t => t.status === filterStatus);
        }

        if (myTasks.length === 0) {
            taskList.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem;">No active tasks found on the mesh.</p>';
            return;
        }

        myTasks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        taskList.innerHTML = '';

        myTasks.forEach(task => {
            const card = document.createElement('div');

            // Expiration Logic
            const isExpired = task.deadline && new Date(task.deadline) < new Date() && task.status === 'open';
            card.className = `task-card ${isExpired ? 'task-expired' : ''}`;

            const statusClass = `status-${task.status}`;
            const assignedText = task.assignedToName ? `<br><small>Assigned to: <strong>${escapeHTML(task.assignedToName)}</strong></small>` : '';
            const expiredNotice = isExpired ? `<div class="expiration-notice">⚠️ TASK EXPIRED</div>` : '';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h3>${escapeHTML(task.title)}</h3>
                    <span class="task-status-badge ${statusClass}">${task.status.toUpperCase()}</span>
                </div>
                <p>${escapeHTML(task.description)}</p>
                <div class="task-meta">
                    <span>📁 ${escapeHTML(task.type)}</span>
                    <span>📍 ${escapeHTML(task.location)}</span>
                    <span>🕒 ${new Date(task.timestamp).toLocaleDateString()}</span>
                    ${task.deadline ? `<span style="color:${isExpired ? 'var(--danger)' : 'var(--secondary)'}">📅 ${escapeHTML(task.deadline)}</span>` : ''}
                </div>
                ${assignedText}
                ${expiredNotice}
            `;
            taskList.appendChild(card);
        });
    } catch (err) {
        taskList.innerHTML = '<p class="text-danger" style="text-align:center; padding: 2rem;">Error connecting to mesh node.</p>';
    }
}

function saveLocalTask(id) {
    const tasks = JSON.parse(localStorage.getItem('skillmesh_my_tasks') || '[]');
    tasks.push(id);
    localStorage.setItem('skillmesh_my_tasks', JSON.stringify(tasks));
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.openSettings = () => document.getElementById('settings-modal').style.display = 'block';
window.closeSettings = () => document.getElementById('settings-modal').style.display = 'none';

window.viewProProfile = (proId) => {
    const pro = discoveredPros.find(p => p.id === proId);
    if (!pro) return;

    const modal = document.getElementById('pro-modal');
    const body = document.getElementById('pro-details-body');

    body.innerHTML = `
        <div class="pro-header">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(pro.name)}&background=4f46e5&color=fff" alt="${escapeHTML(pro.name)}">
            <div>
                <h3>${escapeHTML(pro.name)}</h3>
                <p class="text-muted">${escapeHTML(pro.profession)}</p>
                <p class="text-xs ${pro.isAvailable ? 'text-success' : 'text-muted'}">
                    <span class="availability-dot ${pro.isAvailable ? 'dot-online' : 'dot-offline'}"></span>
                    ${pro.isAvailable ? 'Available Now' : 'Currently Offline'}
                </p>
            </div>
        </div>
        <div class="pro-stats">
            <div class="pro-stat-item">
                <label>Rating</label>
                <span>★ ${pro.rating}</span>
            </div>
            <div class="pro-stat-item">
                <label>Completed</label>
                <span>${pro.completedTasks || 0}</span>
            </div>
        </div>
        <div>
            <label class="text-xs text-muted" style="display:block; margin-bottom:0.5rem;">LOCATION</label>
            <p style="font-size:0.875rem;">📍 ${escapeHTML(pro.location)}</p>
        </div>
        <div class="btn-group" style="margin-top:1rem;">
            <button class="btn btn-primary" style="width:100%" onclick="showToast('Contacting ${escapeHTML(pro.name)} via Mesh...')">Contact Professional</button>
        </div>
    `;

    modal.style.display = 'block';
};

window.closeProModal = () => {
    document.getElementById('pro-modal').style.display = 'none';
};

function showToast(message, type = 'success') {
    const toast = document.getElementById('notification-toast');
    toast.textContent = message;
    toast.className = 'toast show';
    toast.style.background = type === 'danger' ? '#ef4444' : '#1e293b';
    setTimeout(() => toast.className = 'toast', 3000);
}

window.donateCrypto = async (amount) => {
    if (typeof window.ethereum !== "undefined") {
        try {
            const [account] = await ethereum.request({ method: "eth_requestAccounts" });
            await ethereum.request({
                method: "eth_sendTransaction",
                params: [{
                    from: account,
                    to: "YOUR_CRYPTO_WALLET_ADDRESS",
                    value: "0x" + (amount * 1e18).toString(16)
                }],
            });
            showToast("Thank you for your donation!");
        } catch (e) { showToast("Donation cancelled.", "danger"); }
    } else { showToast("MetaMask not found.", "danger"); }
};

// Poll for updates
setInterval(loadMyTasks, 15000);
setInterval(checkConnection, 10000);
