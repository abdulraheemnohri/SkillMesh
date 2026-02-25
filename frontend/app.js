document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadTasks();
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
            taskForm.reset();
            loadTasks();
        } else {
            showToast('Failed to broadcast task.', 'danger');
        }
    });
});

async function loadProfile() {
    try {
        const response = await fetch('/api/profile');
        const profile = await response.json();
        document.getElementById('node-name').textContent = profile.name;
        document.getElementById('node-profession').textContent = profile.profession;
        document.getElementById('node-rating').textContent = `★ ${profile.rating}`;

        if (profile.profileImage) {
            const img = document.getElementById('profile-img');
            img.src = '/images/' + profile.profileImage;
            img.style.display = 'block';
        }

        if (profile.skills && profile.skills.length > 0) {
            const skillsDiv = document.getElementById('node-skills');
            skillsDiv.innerHTML = profile.skills.map(s => `<span>${escapeHTML(s)}</span>`).join('');
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

        tasks = tasks.filter(t => {
            return (!filterCountry || (t.country && t.country.toLowerCase().includes(filterCountry))) &&
                   (!filterCity || (t.city && t.city.toLowerCase().includes(filterCity))) &&
                   (!filterLoc || (t.location && t.location.toLowerCase().includes(filterLoc))) &&
                   (!filterType || t.type === filterType);
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

            const safeTitle = escapeHTML(task.title);
            const safeDesc = escapeHTML(task.description);
            const safeType = escapeHTML(task.type);
            const safeLoc = escapeHTML(task.location);
            const safeStatus = escapeHTML(task.status);

            const statusClass = `status-${task.status}`;

            taskCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h3>${safeTitle}</h3>
                    <span class="task-status-badge ${statusClass}">${safeStatus.toUpperCase()}</span>
                </div>
                <p>${safeDesc}</p>
                <div class="task-meta">
                    <span class="meta-item">📁 ${safeType}</span>
                    <span class="meta-item">📍 ${safeLoc}</span>
                    <span class="meta-item">🕒 ${new Date(task.timestamp).toLocaleDateString()}</span>
                </div>
                <div class="task-actions">
                    ${task.status === 'open' ? `<button class="btn btn-primary btn-sm" onclick="claimTask('${task.id}')">Claim Task</button>` : ''}
                    ${task.status === 'assigned' ? `<button class="btn btn-secondary btn-sm" onclick="completeTask('${task.id}')">Mark Completed</button>` : ''}
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
