let currentProfile = null;
let currentChatTaskId = null;
let chatInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadTasks();
    startMeshStatsPolling();
    startTaskPolling();
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            type: document.getElementById('type').value,
            country: document.getElementById('country').value,
            city: document.getElementById('city').value,
            location: document.getElementById('location').value,
            mobileNumber: document.getElementById('mobile').value,
            deadline: document.getElementById('deadline').value,
            timestamp: new Date().toISOString(),
            id: 'task-' + Date.now(),
            status: 'open'
        };
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        if (response.ok) {
            showToast('Task broadcasted to mesh!');
            addActivity('You broadcasted a new task');
            taskForm.reset();
            loadTasks();
        } else {
            showToast('Failed to broadcast task.', 'danger');
        }
    });
    }

    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedProfile = {
                name: document.getElementById('set-name').value,
                profession: document.getElementById('set-profession').value,
                profileImage: document.getElementById('set-image').value,
                skills: document.getElementById('set-skills').value.split(',').map(s => s.trim()).filter(s => s !== ''),
                country: document.getElementById('set-country').value,
                city: document.getElementById('set-city').value,
                location: document.getElementById('set-location').value
            };
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProfile)
            });
            if (response.ok) {
                showToast('Profile updated successfully!');
                closeSettings();
                loadProfile();
            } else {
                showToast('Failed to update profile.', 'danger');
            }
        });
    }
});

async function loadProfile() {
    try {
        const response = await fetch('/api/profile');
        const profile = await response.json();
        currentProfile = profile;

        // Update header UI
        if (document.getElementById('node-name')) document.getElementById('node-name').textContent = profile.name;
        document.getElementById('node-profession').textContent = profile.profession;
        document.getElementById('node-rating').textContent = `★ ${profile.rating}`;

        // Reputation Logic
        const points = profile.completedTasks * 10;
        document.getElementById('stat-points').textContent = points;
        document.getElementById('stat-completed').textContent = profile.completedTasks;

        let level = "Beginner";
        if (points >= 100) level = "Expert";
        else if (points >= 50) level = "Pro";
        else if (points >= 20) level = "Intermediate";
        document.getElementById('stat-level').textContent = level;

        const img = document.getElementById('profile-img');
        if (profile.profileImage) {
            img.src = '/images/' + profile.profileImage;
        } else {
            img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=6366f1&color=fff`;
        }
        img.style.display = 'block';

        if (profile.skills && profile.skills.length > 0) {
            const skillsDiv = document.getElementById('node-skills');
            if (skillsDiv) skillsDiv.innerHTML = profile.skills.map(s => `<span>${escapeHTML(s)}</span>`).join('');
        }

        // Update availability UI
        const availCheckbox = document.getElementById('availability-checkbox');
        const availLabel = document.getElementById('availability-label');
        if (availCheckbox) {
            availCheckbox.checked = profile.isAvailable;
            availLabel.textContent = profile.isAvailable ? 'Online' : 'Offline';
            availLabel.className = profile.isAvailable ? 'text-xs text-success' : 'text-xs text-muted';
        }

        // Pre-fill settings form
        if (document.getElementById('set-name')) {
            document.getElementById('set-name').value = profile.name || '';
            document.getElementById('set-profession').value = profile.profession || '';
            document.getElementById('set-image').value = profile.profileImage || '';
            document.getElementById('set-skills').value = (profile.skills || []).join(', ');
            document.getElementById('set-country').value = profile.country || '';
            document.getElementById('set-city').value = profile.city || '';
            document.getElementById('set-location').value = profile.location || '';
        }
    } catch (e) {
        console.error('Error loading profile:', e);
    }
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        let tasks = await response.json();

        const filterCountry = document.getElementById('filter-country').value.toLowerCase();
        const filterCity = document.getElementById('filter-city').value.toLowerCase();
        const filterLoc = document.getElementById('filter-location').value.toLowerCase();
        const filterType = document.getElementById('filter-type').value;
        const filterScope = document.getElementById('filter-scope').value;

        tasks = tasks.filter(t => {
            const matchesLoc = (!filterCountry || (t.country && t.country.toLowerCase().includes(filterCountry))) &&
                   (!filterCity || (t.city && t.city.toLowerCase().includes(filterCity))) &&
                   (!filterLoc || (t.location && t.location.toLowerCase().includes(filterLoc))) &&
                   (!filterType || t.type === filterType);

            const matchesScope = filterScope === 'all' || (currentProfile && t.assignedTo === currentProfile.id);

            return matchesLoc && matchesScope;
        });

        // Sort by timestamp descending
        tasks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';

        if (tasks.length === 0) {
            taskList.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem;">No tasks found on the mesh matching your criteria.</p>';
            return;
        }

        tasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';

            const isAssignedToMe = currentProfile && task.assignedTo === currentProfile.id;
            const safeTitle = escapeHTML(task.title);
            const safeDesc = escapeHTML(task.description);
            const safeType = escapeHTML(task.type);
            const safeLoc = escapeHTML(task.location);
            const safeStatus = escapeHTML(task.status);
            const safeDeadline = task.deadline ? escapeHTML(task.deadline) : null;

            const statusClass = `status-${task.status}`;
            const assignedText = task.assignedToName ? ` (to ${escapeHTML(task.assignedToName)})` : '';

            taskCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h3>${safeTitle}</h3>
                    <span class="task-status-badge ${statusClass}">${safeStatus.toUpperCase()}${task.status === 'assigned' ? assignedText : ''}</span>
                </div>
                <p>${safeDesc}</p>
                <div class="task-meta">
                    <span class="meta-item">📁 ${safeType}</span>
                    <span class="meta-item">📍 ${safeLoc}</span>
                    <span class="meta-item">🕒 ${new Date(task.timestamp).toLocaleDateString()}</span>
                    ${safeDeadline ? `<span class="meta-item" style="color: var(--danger);">📅 Due: ${safeDeadline}</span>` : ''}
                </div>
                <div class="task-actions">
                    ${task.status === 'open' ? `<button class="btn btn-primary btn-sm" onclick="claimTask('${task.id}')">Claim Task</button>` : ''}
                    ${isAssignedToMe ? `
                        <button class="btn btn-secondary btn-sm" onclick="completeTask('${task.id}')">Mark Completed</button>
                        <button class="btn btn-primary btn-sm" onclick="getContact('${task.id}')">Show Contact</button>
                        <button class="btn btn-primary btn-sm" onclick="openChat('${task.id}', '${safeTitle}')">Chat</button>
                    ` : ''}
                </div>
                <div id="contact-${task.id}" style="margin-top:0.5rem; font-weight:600; display:${task.mobileNumber ? 'block' : 'none'}">
                    📱 Contact: ${task.mobileNumber || ''}
                </div>
            `;
            taskList.appendChild(taskCard);
        });
    } catch (e) {
        console.error('Error loading tasks:', e);
    }
}

window.claimTask = async function(taskId) {
    const response = await fetch('/api/tasks/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
    });
    if (response.ok) {
        showToast('Task claimed successfully!');
        addActivity('You claimed a task');
        loadTasks();
    } else {
        showToast('Task already claimed or not found.', 'danger');
    }
}

window.completeTask = async function(taskId) {
    const response = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
    });
    if (response.ok) {
        showToast('Task marked as completed!');
        addActivity('You completed a task');
        loadTasks();
        loadProfile();
    } else {
        showToast('Failed to complete task.', 'danger');
    }
}

window.donateCrypto = async function(amountEth) {
    if (typeof window.ethereum !== "undefined") {
        try {
            const [account] = await ethereum.request({ method: "eth_requestAccounts" });
            await ethereum.request({
                method: "eth_sendTransaction",
                params: [{
                    from: account,
                    to: "YOUR_CRYPTO_WALLET_ADDRESS",
                    value: "0x" + (amountEth * 1e18).toString(16)
                }],
            });
            showToast("Thank you for your crypto donation!");
        } catch (error) {
            showToast("Donation cancelled.", "warning");
        }
    } else {
        showToast("MetaMask not detected!", "danger");
    }
}

window.donateBank = function() {
    document.getElementById('bank-info').style.display = 'block';
    showToast('Bank details displayed.');
}

let lastTaskCount = 0;
function startTaskPolling() {
    setInterval(async () => {
        try {
            const response = await fetch('/api/tasks');
            const tasks = await response.json();
            if (tasks.length > lastTaskCount) {
                if (lastTaskCount > 0) addActivity('New task broadcasted on mesh');
                lastTaskCount = tasks.length;
                loadTasks();
            }
        } catch (e) {}
    }, 10000);
}

function addActivity(text) {
    const feed = document.getElementById('activity-feed');
    if (feed.querySelector('p.text-muted')) feed.innerHTML = '';

    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `<strong>${new Date().toLocaleTimeString()}</strong>: ${escapeHTML(text)}`;
    feed.prepend(item);

    if (feed.children.length > 5) feed.removeChild(feed.lastChild);
}

function startMeshStatsPolling() {
    setInterval(async () => {
        try {
            const response = await fetch('/api/mesh/stats');
            const stats = await response.json();

            // Update Mesh Status
            const indicator = document.getElementById('sync-status');
            indicator.innerHTML = `<span class="dot ${stats.peerCount > 0 ? 'pulse' : ''}"></span> ${stats.peerCount > 0 ? 'Mesh Active' : 'Searching Mesh'} (${stats.peerCount} Peers)`;

            // Update Online Professionals
            const peerList = document.getElementById('online-peers');
            if (stats.activeProfessionals && stats.activeProfessionals.length > 0) {
                peerList.innerHTML = stats.activeProfessionals.map(p => `
                    <div class="peer-item">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=94a3b8&color=fff" class="peer-avatar">
                        <div class="peer-info">
                            <strong>${escapeHTML(p.name)}</strong>
                            <span>${escapeHTML(p.profession)} • ★ ${p.rating} (${p.completedTasks || 0} done)</span>
                        </div>
                    </div>
                `).join('');
            } else {
                peerList.innerHTML = '<p class="text-xs text-muted">No other professionals online.</p>';
            }
        } catch (e) {
            const indicator = document.getElementById('sync-status');
            indicator.innerHTML = `<span class="dot" style="background-color: var(--danger);"></span> Disconnected from Node`;
            console.error('Mesh stats error:', e);
        }
    }, 5000);
}

window.openSettings = function() {
    document.getElementById('settings-modal').style.display = 'block';
}

window.closeSettings = function() {
    document.getElementById('settings-modal').style.display = 'none';
}

window.toggleAvailability = async function() {
    const availCheckbox = document.getElementById('availability-checkbox');
    const availLabel = document.getElementById('availability-label');
    const isAvailable = availCheckbox.checked;

    availLabel.textContent = isAvailable ? 'Online' : 'Offline';
    availLabel.className = isAvailable ? 'text-xs text-success' : 'text-xs text-muted';

    const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable })
    });

    if (response.ok) {
        showToast(`You are now ${isAvailable ? 'Online' : 'Offline'}`);
        currentProfile.isAvailable = isAvailable;
    } else {
        showToast('Failed to update availability.', 'danger');
    }
}

window.switchTab = function(tabName) {
    // Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(tabName)) btn.classList.add('active');
    });

    // Content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    if (tabName === 'history') {
        loadHistory();
    }
}

async function loadHistory() {
    try {
        const response = await fetch('/api/tasks/history');
        const history = await response.json();
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';

        if (history.length === 0) {
            historyList.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem;">No completed tasks in your history.</p>';
            return;
        }

        history.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card status-completed';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h3>${escapeHTML(task.title)}</h3>
                    <span class="task-status-badge status-completed">COMPLETED</span>
                </div>
                <p>${escapeHTML(task.description)}</p>
                <div class="task-meta">
                    <span class="meta-item">📁 ${escapeHTML(task.type)}</span>
                    <span class="meta-item">📍 ${escapeHTML(task.location)}</span>
                    <span class="meta-item">📅 Done: ${new Date(task.timestamp).toLocaleDateString()}</span>
                </div>
                <div class="reputation-gain" style="margin-top: 1rem; font-size: 0.75rem; color: var(--success); font-weight: 600;">
                    +10 Rep Points Earned
                </div>
            `;
            historyList.appendChild(card);
        });
    } catch (e) {
        console.error('Error loading history:', e);
    }
}

window.getContact = async function(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/contact`);
        const data = await response.json();
        if (data.mobileNumber) {
            const div = document.getElementById(`contact-${taskId}`);
            div.textContent = `📱 Contact: ${data.mobileNumber}`;
            div.style.display = 'block';
            showToast('Contact information retrieved!');
        } else if (data.status === 'requested') {
            showToast('Contact requested from poster. Wait a moment...');
            // Poll for update
            setTimeout(() => getContact(taskId), 5000);
        }
    } catch (e) {
        showToast('Failed to retrieve contact.', 'danger');
    }
}

window.openChat = (taskId, taskTitle) => {
    currentChatTaskId = taskId;
    document.getElementById('chat-title').textContent = `Chat: ${taskTitle}`;
    document.getElementById('chat-modal').style.display = 'block';
    loadChatMessages();
    if (chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(loadChatMessages, 3000);
};

window.closeChat = () => {
    document.getElementById('chat-modal').style.display = 'none';
    if (chatInterval) clearInterval(chatInterval);
};

async function loadChatMessages() {
    if (!currentChatTaskId) return;
    try {
        const response = await fetch(`/api/chat/${currentChatTaskId}`);
        const messages = await response.json();
        const chatBox = document.getElementById('chat-messages');
        chatBox.innerHTML = messages.map(m => `
            <div class="chat-msg ${m.senderId === currentProfile.id ? 'mine' : 'theirs'}">
                <span class="chat-sender">${escapeHTML(m.senderName)}</span>
                ${escapeHTML(m.text)}
                <span class="chat-time">${new Date(m.timestamp).toLocaleTimeString()}</span>
            </div>
        `).join('');
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) {}
}

window.sendChatMessage = async () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !currentChatTaskId) return;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                taskId: currentChatTaskId,
                text,
                senderId: currentProfile.id,
                senderName: currentProfile.name
            })
        });
        if (response.ok) {
            input.value = '';
            loadChatMessages();
        }
    } catch (err) {
        showToast('Failed to send message.', 'danger');
    }
};

function showToast(message, type = 'success') {
    const toast = document.getElementById('notification-toast');
    toast.textContent = message;
    toast.className = 'toast show';
    if (type === 'danger') toast.style.background = '#ef4444';
    else if (type === 'warning') toast.style.background = '#f59e0b';
    else toast.style.background = '#1e293b';

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}
