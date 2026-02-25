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
            alert('Task posted successfully!');
            taskForm.reset();
            loadTasks();
        }
    });
});
async function loadProfile() {
    try {
        const response = await fetch('/api/profile');
        const profile = await response.json();
        document.getElementById('node-name').textContent = profile.name;
        document.getElementById('node-profession').textContent = ' | ' + profile.profession;
        document.getElementById('node-rating').textContent = ' | Rating: ' + profile.rating;

        if (profile.profileImage) {
            const img = document.getElementById('profile-img');
            img.src = '/images/' + profile.profileImage;
            img.style.display = 'inline-block';
            img.style.width = '50px';
            img.style.height = '50px';
            img.style.borderRadius = '50%';
            img.style.verticalAlign = 'middle';
            img.style.marginRight = '10px';
        }

        if (profile.skills && profile.skills.length > 0) {
            const skillsDiv = document.getElementById('node-skills');
            skillsDiv.innerHTML = 'Skills: ' + profile.skills.map(s => `<span>${escapeHTML(s)}</span>`).join('');
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

        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';

            const safeTitle = escapeHTML(task.title);
            const safeDesc = escapeHTML(task.description);
            const safeType = escapeHTML(task.type);
            const safeLoc = escapeHTML(task.location);
            const safeStatus = escapeHTML(task.status);

            taskCard.innerHTML = `<h3>${safeTitle}</h3><p>${safeDesc}</p>` +
                `<p>Type: ${safeType} | Location: ${safeLoc}</p>` +
                `<p class="task-status">Status: ${safeStatus}</p>` +
                (task.status === 'open' ? `<button class="claim-btn" onclick="claimTask('${task.id}')">Claim Task</button>` : '') +
                (task.status === 'assigned' ? `<button class="complete-btn" onclick="completeTask('${task.id}')">Mark Completed</button>` : '');
            taskList.appendChild(taskCard);
        });
    } catch (e) {
        console.error('Error loading tasks:', e);
    }
}
window.claimTask = async function(taskId) {
    await fetch('/api/tasks/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId }) });
    loadTasks();
}
window.completeTask = async function(taskId) {
    await fetch('/api/tasks/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId }) });
    loadTasks();
    loadProfile();
}
window.donateCrypto = async function(amountEth) {
    if (typeof window.ethereum !== "undefined") {
        try {
            const [account] = await ethereum.request({ method: "eth_requestAccounts" });
            await ethereum.request({
                method: "eth_sendTransaction",
                params: [{
                    from: account,
                    to: "YOUR_CRYPTO_WALLET_ADDRESS", // Replace with actual address
                    value: "0x" + (amountEth * 1e18).toString(16)
                }],
            });
            alert("Thank you for donating in crypto!");
        } catch (error) {
            console.error(error);
            alert("Donation failed or was cancelled.");
        }
    } else {
        alert("MetaMask not detected!");
    }
}
window.donateBank = function() { document.getElementById('bank-info').style.display = 'block'; }
