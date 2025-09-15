// Global variables
let currentFile = null;
let headers = [];
let delimiter = ',';
let fileData = [];
let presets = [];
let editingPresetIndex = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load presets from localStorage
    loadPresets();
    
    // Set up drag and drop
    setupDragAndDrop();
});

// Set up drag and drop functionality
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    if (uploadArea) {
        uploadArea.ondragover = function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.add('dragover');
            return false;
        };
        
        uploadArea.ondragleave = function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('dragover');
            return false;
        };
        
        uploadArea.ondrop = function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                handleFile(files[0]);
            }
            return false;
        };
    }
    
    // Prevent default drag behavior on the entire document
    document.ondragover = function(e) {
        e.preventDefault();
        return false;
    };
    
    document.ondrop = function(e) {
        e.preventDefault();
        return false;
    };
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Detect delimiter (comma or tab)
function detectDelimiter(text) {
    const firstLine = text.split('\n')[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    return tabCount > commaCount ? '\t' : ',';
}

// Parse CSV line with proper quote handling
function parseCSVLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    
    return result;
}

// Handle file upload
async function handleFile(file) {
    currentFile = file;
    
    // Check file size (700 MB limit)
    if (file.size > 700 * 1024 * 1024) {
        showError('File size exceeds 700 MB limit');
        return;
    }
    
    // Show file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileType').textContent = file.name.endsWith('.tsv') ? 'TSV' : 'CSV';
    document.getElementById('fileInfo').style.display = 'block';
    
    // Set default export name
    const defaultName = file.name.replace(/\.(csv|tsv)$/i, '') + '_converted';
    document.getElementById('exportNameInput').value = defaultName;
    document.getElementById('exportNameSection').style.display = 'block';
    
    showStatus('Reading file...');
    
    try {
        // Read first chunk for preview
        const chunkSize = 1024 * 1024; // 1MB chunk for preview
        const chunk = file.slice(0, Math.min(chunkSize, file.size));
        const text = await chunk.text();
        
        // Detect delimiter
        delimiter = detectDelimiter(text);
        document.getElementById('delimiter').textContent = delimiter === '\t' ? 'Tab' : 'Comma';
        
        // Parse preview data
        const lines = text.split('\n').filter(line => line.trim());
        headers = parseCSVLine(lines[0], delimiter);
        
        // Show preview table
        const previewTable = document.getElementById('previewTable');
        previewTable.innerHTML = '';
        
        // Add headers
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        previewTable.appendChild(headerRow);
        
        // Add data rows (max 5)
        for (let i = 1; i < Math.min(6, lines.length); i++) {
            const row = document.createElement('tr');
            const values = parseCSVLine(lines[i], delimiter);
            values.forEach(value => {
                const td = document.createElement('td');
                td.textContent = value.length > 50 ? value.substring(0, 50) + '...' : value;
                row.appendChild(td);
            });
            previewTable.appendChild(row);
        }
        
        document.getElementById('previewSection').style.display = 'block';
        
        // Create column selector
        const columnsGrid = document.getElementById('columnsGrid');
        columnsGrid.innerHTML = '';
        
        headers.forEach((header, index) => {
            const columnItem = document.createElement('div');
            columnItem.className = 'column-item';
            columnItem.innerHTML = `
                <input type="checkbox" id="col_${index}" checked>
                <label for="col_${index}">${header}</label>
            `;
            columnsGrid.appendChild(columnItem);
        });
        
        document.getElementById('columnSelector').style.display = 'block';
        document.getElementById('actionButtons').style.display = 'flex';
        
        // Display presets
        displayPresets();
        
        hideStatus();
        hideError();
        
    } catch (error) {
        showError('Error reading file: ' + error.message);
    }
}

// Select all columns
function selectAll() {
    document.querySelectorAll('#columnsGrid input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
}

// Deselect all columns
function deselectAll() {
    document.querySelectorAll('#columnsGrid input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}

// Load presets from localStorage
function loadPresets() {
    const saved = localStorage.getItem('csvConverterPresets');
    if (saved) {
        try {
            presets = JSON.parse(saved);
        } catch (e) {
            presets = [];
        }
    }
}

// Save presets to localStorage
function savePresetsToStorage() {
    localStorage.setItem('csvConverterPresets', JSON.stringify(presets));
}

// Display presets in the UI
function displayPresets() {
    const presetList = document.getElementById('presetList');
    
    if (presets.length === 0) {
        presetList.innerHTML = '<div class="no-presets">No saved presets yet</div>';
        return;
    }
    
    presetList.innerHTML = '';
    
    presets.forEach((preset, index) => {
        const presetItem = document.createElement('div');
        presetItem.className = 'preset-item';
        presetItem.innerHTML = `
            <span class="preset-name" title="${preset.headers.join(', ')}">${preset.name}</span>
            <div class="preset-actions">
                <button class="preset-btn preset-apply" onclick="applyPreset(${index})">Apply</button>
                <button class="preset-btn preset-edit" onclick="editPreset(${index})">Edit</button>
                <button class="preset-btn preset-delete" onclick="deletePreset(${index})">Delete</button>
            </div>
        `;
        presetList.appendChild(presetItem);
    });
}

// Open save preset modal
function openSavePresetModal() {
    const selectedHeaders = [];
    document.querySelectorAll('#columnsGrid input[type="checkbox"]').forEach((cb, index) => {
        if (cb.checked) {
            selectedHeaders.push(headers[index]);
        }
    });
    
    if (selectedHeaders.length === 0) {
        showError('Please select at least one column to save as preset');
        return;
    }
    
    document.getElementById('modalHeader').textContent = 'Save Preset';
    document.getElementById('presetNameInput').value = '';
    editingPresetIndex = null;
    document.getElementById('presetModal').style.display = 'block';
}

// Edit existing preset
function editPreset(index) {
    const preset = presets[index];
    document.getElementById('modalHeader').textContent = 'Edit Preset';
    document.getElementById('presetNameInput').value = preset.name;
    editingPresetIndex = index;
    
    // Apply the preset selection first
    applyPreset(index);
    
    document.getElementById('presetModal').style.display = 'block';
}

// Close preset modal
function closePresetModal() {
    document.getElementById('presetModal').style.display = 'none';
    editingPresetIndex = null;
}

// Save preset
function savePreset() {
    const name = document.getElementById('presetNameInput').value.trim();
    
    if (!name) {
        alert('Please enter a preset name');
        return;
    }
    
    const selectedHeaders = [];
    document.querySelectorAll('#columnsGrid input[type="checkbox"]').forEach((cb, index) => {
        if (cb.checked) {
            selectedHeaders.push(headers[index]);
        }
    });
    
    if (editingPresetIndex !== null) {
        // Edit existing preset
        presets[editingPresetIndex] = { name, headers: selectedHeaders };
    } else {
        // Add new preset
        presets.push({ name, headers: selectedHeaders });
    }
    
    savePresetsToStorage();
    displayPresets();
    closePresetModal();
    showStatus('Preset saved successfully!');
    setTimeout(hideStatus, 2000);
}

// Apply preset
function applyPreset(index) {
    const preset = presets[index];
    
    // First, deselect all
    document.querySelectorAll('#columnsGrid input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Then select matching headers
    preset.headers.forEach(presetHeader => {
        headers.forEach((header, headerIndex) => {
            if (header === presetHeader) {
                const checkbox = document.getElementById(`col_${headerIndex}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            }
        });
    });
    
    showStatus(`Applied preset: ${preset.name}`);
    setTimeout(hideStatus, 2000);
}

// Delete preset
function deletePreset(index) {
    if (confirm(`Are you sure you want to delete the preset "${presets[index].name}"?`)) {
        presets.splice(index, 1);
        savePresetsToStorage();
        displayPresets();
        showStatus('Preset deleted');
        setTimeout(hideStatus, 2000);
    }
}

// Export file
async function exportFile() {
    const selectedColumns = [];
    document.querySelectorAll('#columnsGrid input[type="checkbox"]').forEach((cb, index) => {
        if (cb.checked) {
            selectedColumns.push(index);
        }
    });
    
    if (selectedColumns.length === 0) {
        showError('Please select at least one column');
        return;
    }
    
    // Get custom filename
    let exportFileName = document.getElementById('exportNameInput').value.trim();
    if (!exportFileName) {
        exportFileName = currentFile.name.replace(/\.(csv|tsv)$/i, '') + '_converted';
    }
    // Ensure .csv extension
    if (!exportFileName.endsWith('.csv')) {
        exportFileName += '.csv';
    }
    
    showProgress(0);
    showStatus('Processing file...');
    document.getElementById('exportBtn').disabled = true;
    
    try {
        const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
        let offset = 0;
        let outputParts = [];
        let partialLine = '';
        let isFirstChunk = true;
        
        // Add selected headers
        const selectedHeaders = selectedColumns.map(i => headers[i]);
        outputParts.push(formatCSVLine(selectedHeaders) + '\n');
        
        while (offset < currentFile.size) {
            const chunk = currentFile.slice(offset, offset + CHUNK_SIZE);
            const text = await chunk.text();
            
            // Combine with partial line from previous chunk
            const fullText = partialLine + text;
            const lines = fullText.split('\n');
            
            // Save last partial line for next chunk
            partialLine = lines[lines.length - 1];
            
            // Process complete lines
            const completeLines = lines.slice(0, -1);
            
            for (let i = (isFirstChunk ? 1 : 0); i < completeLines.length; i++) {
                const line = completeLines[i].trim();
                if (line) {
                    const values = parseCSVLine(line, delimiter);
                    const selectedValues = selectedColumns.map(idx => values[idx] || '');
                    outputParts.push(formatCSVLine(selectedValues) + '\n');
                }
            }
            
            isFirstChunk = false;
            offset += CHUNK_SIZE;
            
            // Update progress
            const progress = Math.min(100, Math.round((offset / currentFile.size) * 100));
            showProgress(progress);
        }
        
        // Process last partial line if exists
        if (partialLine.trim()) {
            const values = parseCSVLine(partialLine, delimiter);
            const selectedValues = selectedColumns.map(idx => values[idx] || '');
            outputParts.push(formatCSVLine(selectedValues) + '\n');
        }
        
        // Create and download file
        const blob = new Blob(outputParts, { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus('Export completed successfully!');
        setTimeout(hideStatus, 3000);
        
    } catch (error) {
        showError('Error exporting file: ' + error.message);
    } finally {
        document.getElementById('exportBtn').disabled = false;
        hideProgress();
    }
}

// Format CSV line for export
function formatCSVLine(values) {
    return values.map(value => {
        if (value == null) return '';
        value = String(value);
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
    }).join(',');
}

// Reset file and UI
function resetFile() {
    currentFile = null;
    headers = [];
    delimiter = ',';
    fileData = [];
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
    
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('exportNameSection').style.display = 'none';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('columnSelector').style.display = 'none';
    document.getElementById('actionButtons').style.display = 'none';
    
    hideStatus();
    hideError();
    hideProgress();
}

// UI Helper Functions
function showProgress(percent) {
    document.getElementById('progressBar').style.display = 'block';
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressFill').textContent = percent + '%';
}

function hideProgress() {
    document.getElementById('progressBar').style.display = 'none';
}

function showStatus(message) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.style.display = 'block';
}

function hideStatus() {
    document.getElementById('statusMessage').style.display = 'none';
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('presetModal');
    if (event.target == modal) {
        closePresetModal();
    }
}