// Placeholder configuration - User needs to fill these in
const CONFIG = {
    CLIENT_ID: '235655418368-kqfijrs3pkiugp1ji5brr727jkfqqh77.apps.googleusercontent.com', // e.g., '123456789-abc.apps.googleusercontent.com'
    DRIVE_FILE_ID: '10T_qKiCLiS8EAUW4zYDOidJV45K6BtQM',
    SCOPES: 'https://www.googleapis.com/auth/drive.file'
};

let tokenClient;
let accessToken = null;
let syncData = {
    sessionActive: false,
    sessionStartTime: null,
    metrics: {
        totalSessions: 0,
        lastSessionDate: "Never"
    }
};

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const userNameEl = document.getElementById('user-name');
const userAvatarEl = document.getElementById('user-avatar');
const syncStatusEl = document.getElementById('sync-status');
const btnStartSession = document.getElementById('btn-start-session');
const btnEndSession = document.getElementById('btn-end-session');
const metricsContent = document.getElementById('metrics-content');

// Initialize Google Identity Services
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                accessToken = tokenResponse.access_token;
                showDashboard();
                fetchDriveData();
            }
        },
    });
}

function handleAuthClick() {
    if (CONFIG.CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
        alert("Please set your Google Client ID in app.js first!");
        return;
    }
    tokenClient.requestAccessToken();
}

function handleSignoutClick() {
    const token = accessToken;
    if (token) {
        google.accounts.oauth2.revoke(token, () => {
            accessToken = null;
            showLogin();
        });
    }
}

// UI State Management
function showLogin() {
    loginSection.classList.add('active');
    dashboardSection.classList.remove('active');
}

function showDashboard() {
    loginSection.classList.remove('active');
    dashboardSection.classList.add('active');
    // We can fetch user profile via another API if needed, but for now we'll just set a generic welcome
    userNameEl.textContent = "Welcome, Shooter";
    userAvatarEl.src = "https://ui-avatars.com/api/?name=Shooter&background=3b82f6&color=fff";
}

function updateUI() {
    // Update Buttons
    if (syncData.sessionActive) {
        btnStartSession.disabled = true;
        btnEndSession.disabled = false;
        btnStartSession.textContent = "Session Active...";
    } else {
        btnStartSession.disabled = false;
        btnEndSession.disabled = true;
        btnStartSession.textContent = "Start Session";
    }

    // Update Metrics
    metricsContent.innerHTML = `
        <div class="metrics-item">
            Status: <strong>${syncData.sessionActive ? "In Progress" : "Idle"}</strong>
        </div>
        <div class="metrics-item">
            Total Sessions: <strong>${syncData.metrics.totalSessions || 0}</strong>
        </div>
        <div class="metrics-item">
            Last Session: <strong>${syncData.metrics.lastSessionDate || "N/A"}</strong>
        </div>
    `;
}

// Google Drive API Interactions
async function fetchDriveData() {
    if (!CONFIG.DRIVE_FILE_ID || CONFIG.DRIVE_FILE_ID === 'YOUR_DRIVE_JSON_FILE_ID_HERE') {
        syncStatusEl.textContent = "Error: File ID not configured.";
        updateUI(); // Show default
        return;
    }

    syncStatusEl.textContent = "Status: Fetching latest data...";
    
    try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${CONFIG.DRIVE_FILE_ID}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            syncData = await response.json();
            syncStatusEl.textContent = "Status: Up to date";
        } else {
            // File might be empty or error
            syncStatusEl.textContent = "Status: Using default state (Error fetching file)";
        }
    } catch (error) {
        console.error("Error fetching file:", error);
        syncStatusEl.textContent = "Status: Failed to sync";
    }

    updateUI();
}

async function saveDriveData() {
    if (!CONFIG.DRIVE_FILE_ID || CONFIG.DRIVE_FILE_ID === 'YOUR_DRIVE_JSON_FILE_ID_HERE') return;

    syncStatusEl.textContent = "Status: Saving changes...";

    try {
        // To update a file content via Drive API, use PATCH to /upload/drive/v3/files/{fileId}
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${CONFIG.DRIVE_FILE_ID}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(syncData, null, 2)
        });

        if (response.ok) {
            syncStatusEl.textContent = "Status: Saved and Up to date";
        } else {
            syncStatusEl.textContent = "Status: Error saving changes";
        }
    } catch (error) {
        console.error("Error saving file:", error);
        syncStatusEl.textContent = "Status: Failed to save";
    }
}

// Event Listeners
btnStartSession.addEventListener('click', () => {
    syncData.sessionActive = true;
    syncData.sessionStartTime = new Date().toISOString();
    updateUI();
    saveDriveData();
});

btnEndSession.addEventListener('click', () => {
    syncData.sessionActive = false;
    syncData.metrics.totalSessions = (syncData.metrics.totalSessions || 0) + 1;
    syncData.metrics.lastSessionDate = new Date().toLocaleDateString();
    syncData.sessionStartTime = null;
    updateUI();
    saveDriveData();
});

// Initialization wrapper for Google API script
function gapiLoaded() {
    // Left empty intentionally. Real logic is in gisLoaded.
}
