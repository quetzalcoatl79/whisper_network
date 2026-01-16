// popup-file.js - File upload and anonymization for Whisper Network Extension

console.log('[Whisper] popup-file.js loaded');

// Default settings
const DEFAULT_API_URL = 'http://localhost:8001';
const DEFAULT_API_KEY = 'dev_test_key_12345';

let selectedFile = null;

// DOM Elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileType = document.getElementById('fileType');
const useFast = document.getElementById('useFast');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const statusMessage = document.getElementById('statusMessage');
const anonymizeFileBtn = document.getElementById('anonymizeFileBtn');
const clearFileBtn = document.getElementById('clearFileBtn');
const openAdvanced = document.getElementById('openAdvanced');
const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const saveSettings = document.getElementById('saveSettings');

// Load settings
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
        apiUrlInput.value = result.apiUrl || DEFAULT_API_URL;
        apiKeyInput.value = result.apiKey || DEFAULT_API_KEY;
    } catch (error) {
        console.error('[Whisper] Error loading settings:', error);
        apiUrlInput.value = DEFAULT_API_URL;
        apiKeyInput.value = DEFAULT_API_KEY;
    }
}

// Save settings
saveSettings.addEventListener('click', async () => {
    try {
        await chrome.storage.sync.set({
            apiUrl: apiUrlInput.value,
            apiKey: apiKeyInput.value
        });
        showStatus('✅ Paramètres sauvegardés', 'success');
    } catch (error) {
        console.error('[Whisper] Error saving settings:', error);
        showStatus('❌ Erreur lors de la sauvegarde', 'error');
    }
});

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update tab states
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update content states
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// Open advanced interface
openAdvanced.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup-advanced.html') });
});

// Upload zone click
uploadZone.addEventListener('click', () => {
    fileInput.click();
});

// Drag and drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// File input change
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Handle file selection
function handleFile(file) {
    selectedFile = file;
    
    // Update UI
    uploadZone.classList.add('has-file');
    uploadZone.querySelector('.upload-text').innerHTML = `
        <strong>✅ Fichier sélectionné</strong><br>
        ${file.name}
    `;
    
    // Show file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileType.textContent = getFileExtension(file.name);
    fileInfo.classList.add('show');
    
    // Enable anonymize button
    anonymizeFileBtn.disabled = false;
    
    console.log('[Whisper] File selected:', file.name, file.size);
}

// Clear file
clearFileBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    
    // Reset UI
    uploadZone.classList.remove('has-file');
    uploadZone.querySelector('.upload-text').innerHTML = `
        <strong>Cliquez pour sélectionner un fichier</strong><br>
        ou glissez-déposez ici
    `;
    fileInfo.classList.remove('show');
    anonymizeFileBtn.disabled = true;
    hideStatus();
    hideProgress();
});

// Anonymize file
anonymizeFileBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    
    try {
        // Get settings
        const result = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
        const apiUrl = result.apiUrl || DEFAULT_API_URL;
        const apiKey = result.apiKey || DEFAULT_API_KEY;
        
        // Show progress
        showProgress(0);
        showStatus('📤 Upload en cours...', 'info');
        anonymizeFileBtn.disabled = true;
        
        // Prepare form data
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Build URL with query params
        const url = new URL(`${apiUrl}/anonymize-file`);
        url.searchParams.append('use_fast', useFast.checked);
        
        console.log('[Whisper] Uploading file to:', url.toString());
        
        // Update progress
        showProgress(30);
        showStatus('🔒 Anonymisation en cours...', 'info');
        
        // Send request
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey
            },
            body: formData
        });
        
        showProgress(70);
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error: ${response.status} - ${error}`);
        }
        
        // Get metadata from headers
        const anonCount = response.headers.get('X-Anonymizations-Count') || '0';
        const procTime = response.headers.get('X-Processing-Time-Ms') || '0';
        const fileTypeHeader = response.headers.get('X-File-Type') || 'unknown';
        
        // Download anonymized file
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
            ? contentDisposition.split('filename="')[1].split('"')[0]
            : `${selectedFile.name}.anonymized`;
        
        showProgress(90);
        
        // Trigger download
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        
        showProgress(100);
        
        // Show success
        showStatus(
            `✅ Fichier anonymisé avec succès !<br>
            📊 ${anonCount} anonymisations • ⚡ ${parseFloat(procTime).toFixed(1)}ms`,
            'success'
        );
        
        console.log('[Whisper] File anonymized:', filename, anonCount, 'replacements');
        
        // Auto-clear after 3 seconds
        setTimeout(() => {
            clearFileBtn.click();
        }, 3000);
        
    } catch (error) {
        console.error('[Whisper] Anonymization error:', error);
        showStatus(`❌ Erreur: ${error.message}`, 'error');
        anonymizeFileBtn.disabled = false;
        hideProgress();
    }
});

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return `.${ext}`;
}

function showProgress(percent) {
    progressBar.classList.add('show');
    progressFill.style.width = `${percent}%`;
}

function hideProgress() {
    progressBar.classList.remove('show');
    progressFill.style.width = '0%';
}

function showStatus(message, type = 'info') {
    statusMessage.innerHTML = message;
    statusMessage.className = `status-message show ${type}`;
}

function hideStatus() {
    statusMessage.classList.remove('show');
}

// Initialize
loadSettings();
