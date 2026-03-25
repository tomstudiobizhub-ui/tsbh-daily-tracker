// ==================== GLOBAL VARIABLES ====================
let currentStaffId = null;
let clients = [];
let jobs = [];
let staffActivities = [];
let inventory = [];
let isAdminAuthenticated = false;
const ADMIN_PASSWORD = "@admin123#";
const WHATSAPP_NUMBER = "2348185504382";

// Job Routing Stages
const JOB_STAGES = [
    'Client/staff',
    'Graphics',
    'Printing',
    'Photography',
    'Secretary Review',
    'Admin Approval',
    'Delivery',
    'Completed'
];

// ==================== INITIALIZATION ====================
window.onload = function() {
    updateDate();
    checkLoginStatus();
    loadAllData();
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(e => console.log('SW failed:', e));
    }
    
    // Online/Offline Events
    window.addEventListener('online', () => showToast("Back online!"));
    window.addEventListener('offline', () => showToast("You are offline."));
};

// ==================== UTILITY FUNCTIONS ====================
function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

function checkLoginStatus() {
    const savedId = localStorage.getItem('currentStaffId');
    if (savedId) {
        currentStaffId = savedId;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('staffDisplay').textContent = savedId;
        loadAllData();
        showToast(`Welcome back, ${savedId}!`);
    }
}

function showToast(msg, dur = 3000) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), dur);
    }
}

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
        staffActivities = JSON.parse(localStorage.getItem('staffActivities') || '[]');
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

function generateId() {
    return 'TBOS-' + Date.now().toString().slice(-6);
}

// ==================== LOGIN/LOGOUT ====================
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
    document.getElementById('staffDisplay').textContent = id;
    loadAllData();
    showToast(`Welcome, ${id}!`);
}

function logout() {
    if (confirm('Log out?')) {
        currentStaffId = null;
        localStorage.removeItem('currentStaffId');
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
        showToast('Logged out');
    }
}

// ==================== SIGN-IN WITH GPS ====================
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

// ==================== NAVIGATION ====================
document.querySelectorAll('.tab-link').forEach(link => {
    link.addEventListener('click', function(e) {
        if (this.getAttribute('href') === '#') return;
        
        e.preventDefault();
        const tabId = this.getAttribute('data-tab');
        
        if (tabId === 'admin' && !isAdminAuthenticated) {
            openAdminModal();
            return;
        }
        
        document.querySelectorAll('.tab-content, .tab-link').forEach(el => {
            el.classList.remove('active');
        });
        
        document.getElementById(tabId).classList.add('active');
        this.classList.add('active');
        
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
            <div class="data-item-actions">
                <button class="btn-success" onclick="sendWhatsApp('${c.name}', '${c.phone}')">
                    <i class="fab fa-whatsapp"></i>
                </button>
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

// ==================== JOBS WITH ROUTING ====================
function addJob() {
    const client = document.getElementById('jobClient').value.trim();
    if (!client) {
        showToast('Client name required');
        return;
    }
    
    const now = new Date();
    const amount = parseFloat(document.getElementById('jobAmount').value) || 0;
    const paid = parseFloat(document.getElementById('jobPaid').value) || 0;
    const trackingId = generateId();
    
    jobs.push({
        id: Date.now(),
        trackingId,
        client,
        phone: document.getElementById('jobPhone').value.trim(),
        hub: document.getElementById('jobHub').value,
        description: document.getElementById('jobDescription').value.trim(),
        amount,
        paid,
        balance: amount - paid,
        paymentStatus: paid >= amount ? 'PAID' : (paid > 0 ? 'PARTIALLY PAID' : 'UNPAID'),
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
    showToast(`Job created! ID: ${trackingId}`);
    sendJobWhatsApp(trackingId, document.getElementById('jobPhone').value.trim(), 'created');
}

function renderJobs() {
    const list = document.getElementById('jobList');
    const hubFilter = document.getElementById('filterHub')?.value;
    const statusFilter = document.getElementById('filterStatus')?.value;
    
    let filteredJobs = jobs;
    if (hubFilter) filteredJobs = filteredJobs.filter(j => j.hub === hubFilter);
    if (statusFilter) filteredJobs = filteredJobs.filter(j => j.status === statusFilter);
    
    if (filteredJobs.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No jobs found</p>';
        return;
    }
    
    list.innerHTML = filteredJobs.map(j => {
        const statusClass = j.paymentStatus === 'PAID' ? 'status-paid' : 
                           j.paymentStatus === 'PARTIALLY PAID' ? 'status-partial' : 'status-unpaid';
        
        return `
        <div class="data-item">
            <div class="data-item-info">
                <h4>${j.trackingId} - ${j.client}</h4>
                <p>🏢 ${j.hub || 'N/A'}</p>
                <p>📝 ${j.description || 'No description'}</p>
                <p>💰 ₦${j.amount.toLocaleString()} | Paid: ₦${j.paid.toLocaleString()}</p>
                <p>📊 Status: <span class="status-badge ${statusClass}">${j.paymentStatus}</span> | Stage: ${j.stage}</p>
                <p style="font-size: 0.75rem; color: #999;">${j.date} ${j.time}</p>
            </div>
            <div class="data-item-actions">
                <button class="btn-info" onclick="viewJobDetail(${j.id})" title="View & Route">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-success" onclick="sendJobWhatsApp('${j.trackingId}', '${j.phone}', 'update')" title="WhatsApp">
                    <i class="fab fa-whatsapp"></i>
                </button>
            </div>
        </div>
    `}).join('');
}

function viewJobDetail(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    const currentIndex = JOB_STAGES.indexOf(job.stage);
    const nextStage = currentIndex < JOB_STAGES.length - 1 ? JOB_STAGES[currentIndex + 1] : null;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3>📋 Job Details & Routing</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div><strong>Tracking ID:</strong> ${job.trackingId}</div>
                    <div><strong>Client:</strong> ${job.client}</div>
                    <div><strong>Phone:</strong> ${job.phone}</div>
                    <div><strong>Hub:</strong> ${job.hub}</div>
                    <div><strong>Stage:</strong> ${job.stage}</div>
                    <div><strong>Status:</strong> <span class="status-badge ${job.paymentStatus === 'PAID' ? 'status-paid' : job.paymentStatus === 'PARTIALLY PAID' ? 'status-partial' : 'status-unpaid'}">${job.paymentStatus}</span></div>
                    <div><strong>Amount:</strong> ₦${job.amount.toLocaleString()}</div>
                    <div><strong>Paid:</strong> ₦${job.paid.toLocaleString()}</div>
                    <div><strong>Balance:</strong> ₦${job.balance.toLocaleString()}</div>
                    <div><strong>Delivery:</strong> ${job.delivery}</div>
                </div>
                
                <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                    <h4 style="margin-bottom: 15px;"><i class="fas fa-route"></i> Job Routing</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${JOB_STAGES.map((stage, index) => {
                            let className = 'stage-item';
                            if (index === currentIndex) className += ' active';
                            if (index < currentIndex) className += ' completed';
                            return `<div class="${className}" style="flex: 1; min-width: 80px; text-align: center; padding: 10px; background: white; border-radius: 8px; border: 2px solid ${index === currentIndex ? '#6c5ce7' : index < currentIndex ? '#00b894' : '#ddd'};">
                                <div style="font-size: 1.2rem; margin-bottom: 5px;">${index < currentIndex ? '✅' : index === currentIndex ? '📍' : '⭕'}</div>
                                <div style="font-size: 0.7rem;">${stage}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                    ${nextStage ? `
                    <button class="btn-primary" onclick="routeJob(${job.id}, '${nextStage}')" style="flex: 1; background: #6c5ce7; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-arrow-right"></i> Route to ${nextStage}
                    </button>
                    ` : '<button class="btn-success" disabled style="flex: 1; background: #00b894; color: white; border: none; padding: 12px; border-radius: 8px;"><i class="fas fa-check"></i> Job Completed</button>'}
                    <button class="btn-success" onclick="sendJobWhatsApp('${job.trackingId}', '${job.phone}', 'update')" style="background: #25D366; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function routeJob(jobId, nextStage) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    if (!confirm(`Route this job from ${job.stage} to ${nextStage}?`)) return;
    
    job.stage = nextStage;
    job.status = nextStage === 'Completed' ? 'Completed' : 'In Progress';
    
    saveData('jobs', jobs);
    renderJobs();
    document.querySelector('.modal.active')?.remove();
    showToast(`Job routed to: ${nextStage}`);
    sendJobWhatsApp(job.trackingId, job.phone, `routed to ${nextStage}`);
}

// ==================== WHATSAPP INTEGRATION ====================
function sendWhatsApp(name, phone) {
    if (!phone) {
        showToast('No phone number');
        return;
    }
    const message = `Hello ${name},\n\nThank you for choosing Tomstudio BizHub!\n\nContact: +234 818 550 4382`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function sendJobWhatsApp(trackingId, phone, action) {
    if (!phone) {
        showToast('No phone number');
        return;
    }
    const message = `Hello,\n\nYour job status update - ${trackingId}\nAction: ${action}\n\nThank you for choosing Tomstudio BizHub!\nContact: +234 818 550 4382`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
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
    
    saveData('staffActivities', staffActivities);
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
        saveData('staffActivities', staffActivities);
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
        document.querySelectorAll('.tab-content, .tab-link').forEach(el => el.classList.remove('active'));
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
    ['clients', 'jobs', 'staffActivities'].forEach(p => {
        try {
            const data = JSON.parse(localStorage.getItem(p) || '[]');
            data.forEach(d => {
                if (d.staffId) staffIds.add(d.staffId);
            });
        } catch (e) {}
    });
    return Array.from(staffIds);
}

function getDataCount(staffId) {
    let count = 0;
    ['clients', 'jobs', 'staffActivities'].forEach(p => {
        try {
            const data = JSON.parse(localStorage.getItem(p) || '[]');
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
            <button class="btn-primary" onclick="approveStaff('${staffId}')" style="width: 100%; background: #6c5ce7; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer;">
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
        saveData('staffActivities', staffActivities);
        
        showAdminDashboard();
        showToast(`${staffId} approved and cleared!`);
    }
}

function generateAdminPDF() {
    showToast('Admin PDF - Feature coming soon!');
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

function filterStaffList() {
    const search = document.getElementById('adminSearch').value.toLowerCase();
    const items = document.querySelectorAll('.staff-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(search) ? 'flex' : 'none';
    });
}

// ==================== IMAGE PREVIEW ====================
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

// ==================== CLIENT PORTAL ====================
function openClientPortal() {
    window.location.href = 'clients.html';
}