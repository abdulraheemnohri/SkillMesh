let nodeUrl = localStorage.getItem('skillmesh_node_url') || 'http://localhost:3000';
let userId = localStorage.getItem('skillmesh_user_id') || 'user-' + Math.floor(Math.random() * 1000);

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
            statusDiv.innerHTML = `<span class=\"dot\" style=\"background-color: var(--success);\"></span> Online (${stats.peerCount} Peers)`;

            // Render Online Professionals
            if (stats.activeProfessionals && stats.activeProfessionals.length > 0) {
                peerList.innerHTML = stats.activeProfessionals.map(p => `
                    <div class=\"peer-item\">
                        <img src=\"https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=94a3b8&color=fff\" class=\"peer-avatar\">
                        <div class=\"peer-info\">
                            <strong>${escapeHTML(p.name)}</strong>
                            <span>${escapeHTML(p.profession)} • ★ ${p.rating} (${p.completedTasks || 0} done)</span>
                        </div>
                    </div>
                `).join('');
            } else {
                peerList.innerHTML = '<p class=\"text-xs text-muted\">No professionals found on mesh.</p>';
            }
        } else {
            throw new Error();
        }
    } catch (err) {
        statusDiv.innerHTML = `<span class=\"dot\" style=\"background-color: var(--danger);\"></span> Offline`;
        peerList.innerHTML = '<p class=\"text-xs text-muted\">Node offline.</p>';
    }
}

async function loadMyTasks() {
    const taskList = document.getElementById('task-list');
    const myTaskIds = JSON.parse(localStorage.getItem('skillmesh_my_tasks') || '[]');

    if (myTaskIds.length === 0) {
        taskList.innerHTML = '<p class=\"text-muted\" style=\"text-align:center; padding: 2rem;\">You haven\'t posted any tasks yet.</p>';
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
            taskList.innerHTML = '<p class=\"text-muted\" style=\"text-align:center; padding: 2rem;\">No active tasks found on the mesh.</p>';
            return;
        }

        myTasks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        taskList.innerHTML = '';

        myTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            const statusClass = `status-${task.status}`;
            const assignedText = task.assignedToName ? `<br><small>Assigned to: <strong>${escapeHTML(task.assignedToName)}</strong></small>` : '';

            card.innerHTML = `
                <div style=\"display:flex; justify-content:space-between; align-items:flex-start;\">
                    <h3>${escapeHTML(task.title)}</h3>
                    <span class=\"task-status-badge ${statusClass}\">${task.status.toUpperCase()}</span>
                </div>
                <p>${escapeHTML(task.description)}</p>
                <div class=\"task-meta\">
                    <span>📁 ${escapeHTML(task.type)}</span>
                    <span>📍 ${escapeHTML(task.location)}</span>
                    <span>🕒 ${new Date(task.timestamp).toLocaleDateString()}</span>
                </div>
                ${assignedText}
            `;
            taskList.appendChild(card);
        });
    } catch (err) {
        taskList.innerHTML = '<p class=\"text-danger\" style=\"text-align:center; padding: 2rem;\">Error connecting to mesh node.</p>';
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