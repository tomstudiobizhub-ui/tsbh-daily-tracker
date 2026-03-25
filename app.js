// Global Variables
let currentStaffId = null;
let clients = [];
let jobs = [];
let staffActivities = [];
let inventory = [];
let isAdminAuthenticated = false;
const ADMIN_PASSWORD = "@admin123#";

// Initialize App
window.onload = function() {
    updateDate();
    checkLoginStatus();
    loadAllData();
};

// Update Date
function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
}

// Check Login Status
function checkLoginStatus() {
    const savedId = localStorage.getItem('currentStaffId');
    if (savedId) {
        currentStaffId = savedId;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('staffDisplay').textContent = `ID: ${savedId}`;
        loadAllData();
        showToast(`Welcome back, ${savedId}!`);
    }
}

// Show Toast
function showToast(msg, dur = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), dur);
}

// Login
function login() {
    const id = document.getElementById('staffId').value.trim();
    if (!id) {
        showToast('Please enter Staff ID');
        return;
    }
    currentStaffId = id;
    localStorage.setItem('currentStaffId', id);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('staffDisplay').textContent = `ID: ${id}`;
    loadAllData();
    showToast(`Welcome, ${id}!`);
}

// Logout
function logout() {
    if (confirm('Log out?')) {
        currentStaffId = null;
        localStorage.removeItem('currentStaffId');
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        showToast('Logged out');
    }
}

// Record Sign-In
function recordSignIn() {
    const now = new Date();
    const signInData = {
        time: now.toLocaleTimeString(),
        date: now.toLocaleDateString(),
        timestamp: now.toISOString()
    };
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            signInData.location = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };
            document.getElementById('locationInfo').innerHTML = 
                `📍 Lat: ${pos.coords.latitude.toFixed(4)}, Long: ${pos.coords.longitude.toFixed(4)}`;
            saveSignInData(signInData);
            showToast('GPS location recorded!');
        }, () => {
            saveSignInData(signInData);
            showToast('Location unavailable');
        });
    } else {
        saveSignInData(signInData);
    }
    
    document.getElementById('signInTime').textContent = `Signed in at ${signInData.time}`;
}

function saveSignInData(data) {
    if (!currentStaffId) return;
    localStorage.setItem(`signin_${currentStaffId}`, JSON.stringify(data));
}

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const tabId = this.getAttribute('data-tab');
        
        if (tabId === 'admin' && !isAdminAuthenticated) {
            openAdminModal();
            return;
        }
        
        document.querySelectorAll('.tab-content, .nav-link').forEach(el => {
            el.classList.remove('active');
        });
        
        document.getElementById(tabId).classList.add('active');
        this.classList.add('active');
        
        // Load data for tab
        if (tabId === 'clients') renderClients();
        else if (tabId === 'jobs') renderJobs();
        else if (tabId === 'staff') renderStaff();
        else if (tabId === 'inventory') renderInventory();
        else if (tabId === 'reports') updateReportStats();
        else if (tabId === 'admin') showAdminDashboard();
    });
});

// ==================== CLIENTS ====================

function addClient() {
    const name = document.getElementById('clientName').value.trim();
    if (!name) {
        showToast('Name required');
        return;
    }
    
    const now = new Date();
    clients.push({
        id: Date.now(),
        name,
        phone: document.getElementById('clientPhone').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        comment: document.getElementById('clientComment').value.trim(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        staffId: currentStaffId
    });
    
    saveData('clients', clients);
    renderClients();
    clearForm(['clientName', 'clientPhone', 'clientEmail', 'clientComment']);
    showToast('Client added!');
}

function renderClients() {
    const list = document.getElementById('clientList');
    const todayClients = clients.filter(c => c.date === new Date().toLocaleDateString());
    
    if (todayClients.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No clients today</p>';
        return;
    }
    
    list.innerHTML = todayClients.map(c => `
        <div class="data-item">
            <div class="data-item-info">
                <h4>${c.name}</h4>
                <p>📞 ${c.phone || 'N/A'}</p>
                <p>✉️ ${c.email || 'N/A'}</p>
                <p>${c.comment || 'No comment'}</p>
                <p style="font-size: 0.75rem; color: #999;">${c.time}</p>
            </div>
        </div>
    `).join('');
}

function clearClients() {
    if (confirm('Clear all clients?')) {
        clients = [];
        saveData('clients', clients);
        renderClients();
        showToast('Cleared!');
    }
}

// ==================== JOBS ====================

function addJob() {
    const client = document.getElementById('jobClient').value.trim();
    if (!client) {
        showToast('Client name required');
        return;
    }
    
    const now = new Date();
    const amount = parseFloat(document.getElementById('jobAmount').value) || 0;
    const paid = parseFloat(document.getElementById('jobPaid').value) || 0;
    
    jobs.push({
        id: Date.now(),
        trackingId: 'TBOS-' + Date.now().toString().slice(-6),
        client,
        phone: document.getElementById('jobPhone').value.trim(),
        hub: document.getElementById('jobHub').value,
        description: document.getElementById('jobDescription').value.trim(),
        amount,
        paid,
        balance: amount - paid,
        status: paid >= amount ? 'Completed' : 'Pending',
        stage: 'Client/staff',
        delivery: document.getElementById('jobDelivery').value,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        staffId: currentStaffId
    });
    
    saveData('jobs', jobs);
    renderJobs();
    clearForm(['jobClient', 'jobPhone', 'jobHub', 'jobDescription', 'jobAmount', 'jobPaid', 'jobDelivery']);
    showToast('Job created! ID: ' + jobs[jobs.length - 1].trackingId);
}

function renderJobs() {
    const list = document.getElementById('jobList');
    const hubFilter = document.getElementById('filterHub').value;
    const statusFilter = document.getElementById('filterStatus').value;
    
    let filteredJobs = jobs;
    if (hubFilter) filteredJobs = filteredJobs.filter(j => j.hub === hubFilter);
    if (statusFilter) filteredJobs = filteredJobs.filter(j => j.status === statusFilter);
    
    if (filteredJobs.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No jobs found</p>';
        return;
    }
    
    list.innerHTML = filteredJobs.map(j => `
        <div class="data-item">
            <div class="data-item-info">
                <h4>${j.trackingId} - ${j.client}</h4>
                <p>🏢 ${j.hub || 'N/A'}</p>
                <p>📝 ${j.description || 'No description'}</p>
                <p>💰 ₦${j.amount.toLocaleString()} | Paid: ₦${j.paid.toLocaleString()}</p>
                <p>📊 Status: ${j.status} | Stage: ${j.stage}</p>
                <p style="font-size: 0.75rem; color: #999;">${j.date} ${j.time}</p>
            </div>
            <div class="data-item-actions">
                <button class="btn-success" onclick="updateJobStatus(${j.id})">✓</button>
            </div>
        </div>
    `).join('');
}

function updateJobStatus(id) {
    const job = jobs.find(j => j.id === id);
    if (job) {
        const stages = ['Client/staff', 'Graphics', 'Printing', 'Photography', 'Secretary Review', 'Delivery', 'Completed'];
        const currentIndex = stages.indexOf(job.stage);
        if (currentIndex < stages.length - 1) {
            job.stage = stages[currentIndex + 1];
            job.status = job.stage === 'Completed' ? 'Completed' : 'In Progress';
            saveData('jobs', jobs);
            renderJobs();
            showToast('Job routed to: ' + job.stage);
        } else {
            showToast('Job already completed!');
        }
    }
}

function clearJobs() {
    clearForm(['jobClient', 'jobPhone', 'jobHub', 'jobDescription', 'jobAmount', 'jobPaid', 'jobDelivery']);
}

// ==================== STAFF ====================

function addStaffActivity() {
    const name = document.getElementById('staffName').value.trim();
    const role = document.getElementById('staffRole').value;
    const activity = document.getElementById('staffActivity').value.trim();
    
    if (!name || !activity) {
        showToast('Fill all fields');
        return;
    }
    
    const now = new Date();
    staffActivities.push({
        id: Date.now(),
        name,
        role,
        activity,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        staffId: currentStaffId
    });
    
    saveData('staff', staffActivities);
    renderStaff();
    clearForm(['staffName', 'staffRole', 'staffActivity', 'staffPhotos']);
    document.getElementById('staffPhotoPreview').innerHTML = '';
    showToast('Activity recorded!');
}

function renderStaff() {
    const list = document.getElementById('staffList');
    const todayActivities = staffActivities.filter(a => a.date === new Date().toLocaleDateString());
    
    if (todayActivities.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No activities today</p>';
        return;
    }
    
    list.innerHTML = todayActivities.map(a => `
        <div class="data-item">
            <div class="data-item-info">
                <h4>${a.name} - ${a.role}</h4>
                <p>${a.activity}</p>
                <p style="font-size: 0.75rem; color: #999;">${a.time}</p>
            </div>
        </div>
    `).join('');
}

function clearStaff() {
    if (confirm('Clear all activities?')) {
        staffActivities = [];
        saveData('staff', staffActivities);
        renderStaff();
        showToast('Cleared!');
    }
}

// ==================== INVENTORY ====================

function addInventory() {
    const name = document.getElementById('itemName').value.trim();
    if (!name) {
        showToast('Item name required');
        return;
    }
    
    inventory.push({
        id: Date.now(),
        name,
        category: document.getElementById('itemCategory').value,
        stock: parseInt(document.getElementById('itemStock').value) || 0,
        alert: parseInt(document.getElementById('itemAlert').value) || 5,
        status: 'OK'
    });
    
    updateInventoryStatus();
    saveData('inventory', inventory);
    renderInventory();
    clearForm(['itemName', 'itemCategory', 'itemStock', 'itemAlert']);
    showToast('Item added!');
}

function updateInventoryStatus() {
    inventory.forEach(item => {
        if (item.stock === 0) item.status = 'OUT';
        else if (item.stock <= item.alert) item.status = 'LOW';
        else item.status = 'OK';
    });
}

function renderInventory() {
    const list = document.getElementById('inventoryList');
    updateInventoryStatus();
    
    const total = inventory.length;
    const low = inventory.filter(i => i.status === 'LOW').length;
    const out = inventory.filter(i => i.status === 'OUT').length;
    
    document.getElementById('totalItems').textContent = total;
    document.getElementById('lowStock').textContent = low;
    document.getElementById('outStock').textContent = out;
    
    if (inventory.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No inventory items</p>';
        return;
    }
    
    list.innerHTML = inventory.map(i => `
        <div class="data-item">
            <div class="data-item-info">
                <h4>${i.name}</h4>
                <p>📦 ${i.category}</p>
                <p>Stock: ${i.stock} | Alert: ${i.alert}</p>
                <p>Status: <span style="color: ${i.status === 'OK' ? 'green' : i.status === 'LOW' ? 'orange' : 'red'}">${i.status}</span></p>
            </div>
        </div>
    `).join('');
}

// ==================== REPORTS ====================

function updateReportStats() {
    const today = new Date().toLocaleDateString();
    const todayClients = clients.filter(c => c.date === today).length;
    const todayJobs = jobs.filter(j => j.date === today).length;
    const todaySales = jobs.filter(j => j.date === today).reduce((sum, j) => sum + (j.paid || 0), 0);
    const todayStaff = [...new Set(staffActivities.filter(a => a.date === today).map(a => a.name))].length;
    
    document.getElementById('reportClients').textContent = todayClients;
    document.getElementById('reportJobs').textContent = todayJobs;
    document.getElementById('reportSales').textContent = '₦' + todaySales.toLocaleString();
    document.getElementById('reportStaff').textContent = todayStaff;
}

function generatePDF() {
    showToast('PDF generation requires jsPDF library. Use CSV export instead.');
}

function exportCSV() {
    const today = new Date().toLocaleDateString();
    let csv = 'Type,Name,Phone,Amount,Date,Time,Staff\n';
    
    clients.filter(c => c.date === today).forEach(c => {
        csv += `Client,${c.name},${c.phone},0,${c.date},${c.time},${c.staffId}\n`;
    });
    
    jobs.filter(j => j.date === today).forEach(j => {
        csv += `Job,${j.client},${j.phone},${j.amount},${j.date},${j.time},${j.staffId}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TBOS_Report_${today.replace(/\//g, '-')}.csv`;
    a.click();
    showToast('CSV exported!');
}

function backupData() {
    const backup = {
        clients,
        jobs,
        staffActivities,
        inventory,
        date: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TBOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Backup downloaded!');
}

// ==================== ADMIN ====================

function openAdminModal() {
    document.getElementById('adminModal').style.display = 'flex';
}

function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
}

function checkAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        isAdminAuthenticated = true;
        closeAdminModal();
        document.querySelectorAll('.tab-content, .nav-link').forEach(el => el.classList.remove('active'));
        document.getElementById('admin').classList.add('active');
        document.querySelector('[data-tab="admin"]').classList.add('active');
        showAdminDashboard();
        showToast('Admin access granted!');
    } else {
        showToast('Wrong password!');
    }
}

function showAdminDashboard() {
    const staffIds = getAllStaffIds();
    const list = document.getElementById('staffListElement');
    
    if (staffIds.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No staff data</p>';
        document.getElementById('staffDataContainer').innerHTML = '<p>No staff data available</p>';
        return;
    }
    
    list.innerHTML = staffIds.map(id => {
        const count = getDataCount(id);
        return `
            <div class="staff-item" onclick="loadStaffData('${id}')">
                <span>${id}</span>
                <span class="badge">${count}</span>
            </div>
        `;
    }).join('');
    
    loadStaffData(staffIds[0]);
}

function getAllStaffIds() {
    const staffIds = new Set();
    const prefixes = ['clients', 'jobs', 'staff', 'signin'];
    
    Object.keys(localStorage).forEach(key => {
        prefixes.forEach(prefix => {
            if (key.startsWith(prefix + '_')) {
                const parts = key.split('_');
                if (parts.length >= 2) {
                    staffIds.add(parts[1]);
                }
            }
        });
    });
    
    return Array.from(staffIds);
}

function getDataCount(staffId) {
    let count = 0;
    ['clients', 'jobs', 'staff'].forEach(p => {
        try {
            const data = JSON.parse(localStorage.getItem(`${p}`) || '[]');
            count += data.filter(d => d.staffId === staffId).length;
        } catch (e) {}
    });
    return count;
}

function loadStaffData(staffId) {
    document.querySelectorAll('.staff-item').forEach(i => i.classList.remove('active'));
    event.target.closest('.staff-item').classList.add('active');
    
    const allClients = clients.filter(c => c.staffId === staffId);
    const allJobs = jobs.filter(j => j.staffId === staffId);
    const allStaff = staffActivities.filter(a => a.staffId === staffId);
    const signIn = JSON.parse(localStorage.getItem(`signin_${staffId}`) || '{}');
    
    const totalSales = allJobs.reduce((sum, j) => sum + (j.paid || 0), 0);
    
    document.getElementById('staffDataContainer').innerHTML = `
        <h3>📋 ${staffId}</h3>
        ${signIn.time ? `<p>🕐 Signed in: ${signIn.time}</p>` : ''}
        ${signIn.location ? `<p>📍 Location: ${signIn.location.lat.toFixed(4)}, ${signIn.location.lng.toFixed(4)}</p>` : ''}
        <p>👥 Clients: ${allClients.length}</p>
        <p>💼 Jobs: ${allJobs.length}</p>
        <p>💰 Total Sales: ₦${totalSales.toLocaleString()}</p>
        <p>👷 Activities: ${allStaff.length}</p>
        <div style="margin: 20px 0;">
            <button class="btn-primary" onclick="approveStaff('${staffId}')">
                <i class="fas fa-check"></i> Approve & Clear
            </button>
        </div>
    `;
}

function approveStaff(staffId) {
    if (confirm(`Approve and clear ${staffId}'s data?`)) {
        clients = clients.filter(c => c.staffId !== staffId);
        jobs = jobs.filter(j => j.staffId !== staffId);
        staffActivities = staffActivities.filter(a => a.staffId !== staffId);
        localStorage.removeItem(`signin_${staffId}`);
        
        saveData('clients', clients);
        saveData('jobs', jobs);
        saveData('staff', staffActivities);
        
        showAdminDashboard();
        showToast(`${staffId} approved and cleared!`);
    }
}

function generateAdminPDF() {
    showToast('Admin PDF requires jsPDF library. Use CSV export instead.');
}

function clearAllData() {
    if (confirm('⚠️ WARNING: This will delete ALL data! Continue?')) {
        localStorage.clear();
        clients = [];
        jobs = [];
        staffActivities = [];
        inventory = [];
        location.reload();
    }
}

// ==================== UTILITIES ====================

function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        showToast('Storage error!');
    }
}

function loadAllData() {
    try {
        clients = JSON.parse(localStorage.getItem('clients') || '[]');
        jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
        staffActivities = JSON.parse(localStorage.getItem('staff') || '[]');
        inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    } catch (e) {
        console.error('Load error:', e);
    }
}

function clearForm(ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === 'file') el.value = '';
            else el.value = '';
        }
    });
}

function previewImages(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    preview.innerHTML = '';
    
    if (input.files) {
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = e => {
                const item = document.createElement('div');
                item.className = 'image-item';
                item.innerHTML = `<img src="${e.target.result}"><button class="delete-img" onclick="this.parentElement.remove()">×</button>`;
                preview.appendChild(item);
            };
            reader.readAsDataURL(file);
        });
    }
}

function openClientPortal() {
    window.location.href = 'clients.html';
}

function openAdminGate() {
    openAdminModal();
}