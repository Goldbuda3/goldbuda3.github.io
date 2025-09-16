// Global variables
let currentFile = null;
let headers = [];
let delimiter = ',';
let fileData = [];
let presets = [];
let editingPresetIndex = null;
let debugMode = false; // Enable by typing "debug" in console

// Enable debug mode from console
window.enableDebug = function() {
    debugMode = true;
    console.log('Debug mode enabled. Extra logging will be shown during file processing.');
};

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

// Detect delimiter (comma or tab) with validation
function detectDelimiter(text) {
    // Get first few lines for analysis
    const sampleLines = text.split(/\r?\n/).slice(0, 10).filter(line => line.trim());
    
    if (sampleLines.length === 0) return ',';
    
    // Count delimiters outside of quotes
    const delimiterCounts = {
        ',': [],
        '\t': [],
        '|': [],
        ';': []
    };
    
    sampleLines.forEach(line => {
        let inQuotes = false;
        const counts = {',': 0, '\t': 0, '|': 0, ';': 0};
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    i++; // Skip escaped quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (!inQuotes && counts.hasOwnProperty(char)) {
                counts[char]++;
            }
        }
        
        // Store counts for consistency check
        Object.keys(counts).forEach(delim => {
            delimiterCounts[delim].push(counts[delim]);
        });
    });
    
    // Find delimiter with most consistent count across lines
    let bestDelimiter = ',';
    let bestScore = -1;
    
    Object.keys(delimiterCounts).forEach(delim => {
        const counts = delimiterCounts[delim];
        if (counts.length === 0 || counts[0] === 0) return;
        
        // Calculate consistency score (prefer consistent counts)
        const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
        const variance = counts.reduce((sum, count) => sum + Math.pow(count - avgCount, 2), 0) / counts.length;
        const consistency = avgCount > 0 ? (1 / (1 + variance)) * avgCount : 0;
        
        if (consistency > bestScore) {
            bestScore = consistency;
            bestDelimiter = delim;
        }
    });
    
    if (debugMode) {
        console.log('Delimiter detection:', delimiterCounts);
        console.log('Selected delimiter:', bestDelimiter, 'with score:', bestScore);
    }
    
    return bestDelimiter;
}

// Remove BOM (Byte Order Mark) if present
function removeBOM(text) {
    if (text.charCodeAt(0) === 0xFEFF) {
        return text.slice(1);
    }
    return text;
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
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    // Add the last field
    result.push(current.trim());
    
    return result;
}

// More robust CSV/TSV parsing that handles different formats
function parseCSVData(text, delimiter) {
    const lines = [];
    let currentLine = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    const MAX_FIELD_SIZE = 1000000; // 1MB max per field for safety
    
    // TSV files typically don't use quotes the same way as CSV
    const isTSV = delimiter === '\t';
    
    while (i < text.length) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        // Handle quotes differently for TSV vs CSV
        if (!isTSV && char === '"') {
            // CSV quote handling
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i += 2;
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
                i++;
            }
        } else if (isTSV && char === '"') {
            // For TSV, quotes are usually literal characters, not field delimiters
            // Only treat as quote delimiter if it's at field start/end
            if (currentField === '' && nextChar !== delimiter && nextChar !== '\n' && nextChar !== '\r') {
                // Starting quote
                inQuotes = true;
                i++;
            } else if (inQuotes && (nextChar === delimiter || nextChar === '\n' || nextChar === '\r' || nextChar === undefined)) {
                // Ending quote
                inQuotes = false;
                i++;
            } else if (inQuotes && nextChar === '"') {
                // Escaped quote in TSV
                currentField += '"';
                i += 2;
            } else {
                // Regular quote character in TSV
                currentField += char;
                i++;
            }
        } else if (char === delimiter && !inQuotes) {
            // End of field
            currentLine.push(currentField);
            currentField = '';
            i++;
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            // End of line (outside quotes)
            if (char === '\r' && nextChar === '\n') {
                i++; // Skip the \n in \r\n
            }
            currentLine.push(currentField);
            
            // Only add non-empty lines
            if (currentLine.length > 0 && (currentLine.length > 1 || currentLine[0] !== '')) {
                lines.push(currentLine);
            }
            currentLine = [];
            currentField = '';
            i++;
        } else {
            // Regular character
            if (currentField.length < MAX_FIELD_SIZE) {
                currentField += char;
            }
            i++;
        }
    }
    
    // Don't forget the last field and line
    if (currentField !== '' || currentLine.length > 0) {
        currentLine.push(currentField);
    }
    if (currentLine.length > 0 && (currentLine.length > 1 || currentLine[0] !== '')) {
        lines.push(currentLine);
    }
    
    return lines;
}

// Simpler TSV-specific parser for more reliable results
function parseTSVData(text) {
    const lines = [];
    const rawLines = text.split(/\r?\n/);
    let maxFields = 0;
    
    // First pass: determine the maximum number of fields
    for (const line of rawLines) {
        if (line === '') continue;
        const fieldCount = line.split('\t').length;
        maxFields = Math.max(maxFields, fieldCount);
    }
    
    // Second pass: parse with consistent field count
    for (const line of rawLines) {
        // Skip completely empty lines
        if (line === '') continue;
        
        // Split by tab
        const fields = line.split('\t');
        
        // Process each field
        const processedFields = fields.map(field => {
            // Only remove quotes if they're actually used as delimiters
            if (field && field.length >= 2 && field.startsWith('"') && field.endsWith('"')) {
                // Remove quotes and unescape internal quotes
                return field.slice(1, -1).replace(/""/g, '"');
            }
            // Return field as-is
            return field || '';
        });
        
        // Pad to consistent length if needed
        while (processedFields.length < maxFields) {
            processedFields.push('');
        }
        
        lines.push(processedFields);
    }
    
    return lines;
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
    const fileType = file.name.endsWith('.tsv') ? 'TSV' : 
                    file.name.endsWith('.tab') ? 'TAB' : 
                    file.name.endsWith('.txt') ? 'TXT' : 'CSV';
    document.getElementById('fileType').textContent = fileType;
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
        let text = await chunk.text();
        
        // Remove BOM if present
        text = removeBOM(text);
        
        // Detect delimiter
        delimiter = detectDelimiter(text);
        const delimiterDisplay = delimiter === '\t' ? 'Tab' : 
                               delimiter === ',' ? 'Comma' :
                               delimiter === '|' ? 'Pipe' :
                               delimiter === ';' ? 'Semicolon' : 'Other';
        document.getElementById('delimiter').textContent = delimiterDisplay;
        
        // Update file type display and add conversion notice
        const fileType = file.name.endsWith('.tsv') ? 'TSV' : 
                        file.name.endsWith('.tab') ? 'TAB' : 
                        file.name.endsWith('.txt') ? 'TXT' : 'CSV';
        
        // Show conversion info in file type field
        if (delimiter !== ',') {
            document.getElementById('fileType').textContent = fileType + ' → CSV (will convert)';
            
            // Add conversion notice
            const existingNotice = document.querySelector('.conversion-notice');
            if (existingNotice) existingNotice.remove();
            
            const notice = document.createElement('div');
            notice.className = 'conversion-notice';
            notice.innerHTML = `
                <span>🔄</span>
                <span><strong>Format Conversion:</strong> This ${delimiterDisplay}-delimited file will be automatically converted to standard CSV format (comma-delimited) when you export it, exactly like Excel does!</span>
            `;
            document.getElementById('fileInfo').appendChild(notice);
        }
        
        // Parse preview data using the appropriate parser
        let parsedLines;
        if (delimiter === '\t') {
            // Use TSV-specific parser for tab-delimited files
            parsedLines = parseTSVData(text);
        } else {
            // Use general CSV parser for other delimiters
            parsedLines = parseCSVData(text, delimiter);
        }
        
        if (parsedLines.length === 0) {
            showError('No data found in file');
            return;
        }
        
        // First line is headers
        headers = parsedLines[0];
        
        // Ensure all rows have the same number of columns as headers
        const numColumns = headers.length;
        
        // Check for parsing issues and show diagnostic info
        let hasInconsistentColumns = false;
        let maxColumns = numColumns;
        let rowsWithIssues = [];
        
        for (let i = 1; i < Math.min(20, parsedLines.length); i++) {
            if (parsedLines[i].length !== numColumns) {
                hasInconsistentColumns = true;
                rowsWithIssues.push(`Row ${i + 1}: ${parsedLines[i].length} columns (expected ${numColumns})`);
                maxColumns = Math.max(maxColumns, parsedLines[i].length);
            }
        }
        
        if (hasInconsistentColumns) {
            console.warn('Column alignment issues detected:', rowsWithIssues);
            showStatus(`⚠️ Warning: Column count mismatch detected. Some rows have ${maxColumns} columns instead of ${numColumns}. This often happens when data contains tab characters. Check the console for details.`);
            setTimeout(hideStatus, 7000);
        }
        
        // If we have more columns in data than headers, add placeholder headers
        if (maxColumns > numColumns && delimiter === '\t') {
            console.warn(`⚠️ TSV File Issue: Found ${maxColumns - numColumns} extra columns in some rows.`);
            console.warn('This usually means your data contains tab characters that should be escaped or quoted.');
            console.warn('The extra columns will be shown but may contain split data.');
            
            for (let i = numColumns; i < maxColumns; i++) {
                headers.push(`⚠️ Extra_${i + 1}`);
            }
        } else if (maxColumns > numColumns) {
            // For CSV files, just add generic headers
            for (let i = numColumns; i < maxColumns; i++) {
                headers.push(`Column_${i + 1}`);
            }
        }
        
        // Show preview table
        const previewTable = document.getElementById('previewTable');
        previewTable.innerHTML = '';
        
        // Update headers to use maxColumns if needed
        const displayHeaders = headers;
        
        // Add headers
        const headerRow = document.createElement('tr');
        displayHeaders.forEach((header, idx) => {
            const th = document.createElement('th');
            th.textContent = header || `(Column ${idx + 1})`;
            headerRow.appendChild(th);
        });
        previewTable.appendChild(headerRow);
        
        // Add data rows (max 5)
        for (let i = 1; i < Math.min(6, parsedLines.length); i++) {
            const row = document.createElement('tr');
            const values = parsedLines[i];
            
            // Ensure we display all columns
            for (let j = 0; j < displayHeaders.length; j++) {
                const td = document.createElement('td');
                const value = values[j] || '';
                td.textContent = value.length > 50 ? value.substring(0, 50) + '...' : value;
                // Highlight cells that are beyond expected columns
                if (j >= numColumns) {
                    td.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                    td.title = 'Extra column detected';
                }
                row.appendChild(td);
            }
            previewTable.appendChild(row);
        }
        
        // Log diagnostic info for debugging
        console.log('📊 File Parsing Diagnostics:');
        console.log('----------------------------');
        console.log('Delimiter:', delimiter === '\t' ? 'TAB' : delimiter === ',' ? 'COMMA' : delimiter);
        console.log('Parser used:', delimiter === '\t' ? 'TSV Parser' : 'CSV Parser');
        console.log('Total rows found:', parsedLines.length);
        console.log('Number of headers:', headers.length);
        console.log('Headers:', headers);
        console.log('First 5 rows column counts:', parsedLines.slice(0, 5).map((row, i) => `Row ${i + 1}: ${row.length} columns`));
        
        if (hasInconsistentColumns) {
            console.warn('⚠️ COLUMN MISMATCH DETECTED');
            console.log('Expected columns:', numColumns);
            console.log('Issues found:', rowsWithIssues);
        }
        
        // Show sample data for debugging
        if (parsedLines.length > 1) {
            console.log('\nSample data (first row):');
            console.table(parsedLines[1].slice(0, 10).map((val, i) => ({
                'Column Index': i,
                'Header': headers[i] || '(no header)',
                'Value': val ? (val.length > 50 ? val.substring(0, 50) + '...' : val) : '(empty)'
            })));
        }
        
        console.log('\n💡 Troubleshooting tips:');
        console.log('- If columns are misaligned, check for tabs or delimiters within data fields');
        console.log('- If extra rows appear, check for newlines within data fields');
        console.log('- For TSV files: Ensure fields with tabs are properly quoted');
        console.log('- Run window.enableDebug() for more detailed logging during export');
        console.log('- Check the preview table above - cells with red background indicate extra columns');
        
        document.getElementById('previewSection').style.display = 'block';
        
        // Create column selector
        const columnsGrid = document.getElementById('columnsGrid');
        columnsGrid.innerHTML = '';
        
        headers.forEach((header, index) => {
            const columnItem = document.createElement('div');
            columnItem.className = 'column-item';
            
            // Mark extra columns that were added
            const isExtraColumn = index >= numColumns;
            const displayName = header || `(Column ${index + 1})`;
            
            columnItem.innerHTML = `
                <input type="checkbox" id="col_${index}" ${isExtraColumn ? '' : 'checked'}>
                <label for="col_${index}">${displayName}${isExtraColumn ? ' ⚠️' : ''}</label>
            `;
            
            if (isExtraColumn) {
                columnItem.style.backgroundColor = 'rgba(255, 165, 0, 0.1)';
                columnItem.title = 'Extra column detected - may indicate parsing issue';
            }
            
            columnsGrid.appendChild(columnItem);
        });
        
        document.getElementById('columnSelector').style.display = 'block';
        document.getElementById('actionButtons').style.display = 'flex';
        
        // Update export button text based on file type
        const exportBtn = document.getElementById('exportBtn');
        if (delimiter === '\t' || delimiter === '|' || delimiter === ';') {
            exportBtn.textContent = 'Convert & Export as CSV';
        } else {
            exportBtn.textContent = 'Export as CSV';
        }
        
        // Display presets
        displayPresets();
        
        hideStatus();
        hideError();
        
    } catch (error) {
        console.error('Error details:', error);
        showError('Error reading file: ' + error.message + '. Please check if the file is a valid CSV/TSV format.');
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
    
    if (debugMode) {
        console.log('🚀 Starting export process');
        console.log('Selected columns:', selectedColumns);
        console.log('File size:', currentFile.size, 'bytes');
        console.log('Delimiter:', delimiter);
    }
    
    try {
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for safer processing
        let offset = 0;
        let outputParts = [];
        let remainder = '';
        let isFirstChunk = true;
        let totalProcessed = 0;
        
        // Add selected headers
        const selectedHeaders = selectedColumns.map(i => headers[i]);
        outputParts.push(formatCSVLine(selectedHeaders) + '\n');
        
        // For TSV files, use simpler line-based processing
        if (delimiter === '\t') {
            if (debugMode) console.log('Using TSV-specific processing');
            
            let lineCount = 0;
            let skippedLines = 0;
            
            // Process TSV files line by line for better accuracy
            while (offset < currentFile.size) {
                const chunk = currentFile.slice(offset, Math.min(offset + CHUNK_SIZE, currentFile.size));
                let text = await chunk.text();
                
                // Remove BOM from first chunk
                if (offset === 0) {
                    text = removeBOM(text);
                }
                
                // Combine with remainder
                const fullText = remainder + text;
                
                // Find last complete line (look for last newline)
                let lastNewline = -1;
                if (offset + CHUNK_SIZE >= currentFile.size) {
                    // This is the last chunk, process everything
                    lastNewline = fullText.length;
                } else {
                    // Find the last newline to ensure complete lines
                    lastNewline = fullText.lastIndexOf('\n');
                    if (lastNewline === -1) {
                        // No newline found, might be a very long line
                        console.warn('Warning: Very long line detected, might cause issues');
                        lastNewline = fullText.length;
                    }
                }
                
                // Process complete lines only
                const toProcess = fullText.substring(0, lastNewline);
                remainder = lastNewline < fullText.length ? fullText.substring(lastNewline + 1) : '';
                
                // Split into lines
                const lines = toProcess.split(/\r?\n/);
                
                if (debugMode && isFirstChunk) {
                    console.log(`Processing ${lines.length} lines in first chunk`);
                }
                
                for (let i = (isFirstChunk ? 1 : 0); i < lines.length; i++) {
                    const line = lines[i];
                    lineCount++;
                    
                    // Skip empty lines
                    if (line === '') {
                        skippedLines++;
                        continue;
                    }
                    
                    // Split by tab - preserve all fields including empty ones
                    const values = line.split('\t');
                    
                    // Validate field count
                    if (debugMode && values.length !== headers.length && totalProcessed < 10) {
                        console.warn(`Row ${lineCount} has ${values.length} fields, expected ${headers.length}`);
                        console.log('Row data:', values.slice(0, 5).map(v => v.substring(0, 20)));
                    }
                    
                    // Handle quoted fields if present
                    const processedValues = values.map(field => {
                        if (field && field.length >= 2 && field.startsWith('"') && field.endsWith('"')) {
                            return field.slice(1, -1).replace(/""/g, '"');
                        }
                        return field || '';
                    });
                    
                    // Ensure we have the right number of values (don't add extra columns)
                    const paddedValues = [];
                    const maxFields = Math.min(processedValues.length, headers.length);
                    for (let j = 0; j < headers.length; j++) {
                        if (j < maxFields) {
                            paddedValues[j] = processedValues[j];
                        } else {
                            paddedValues[j] = '';
                        }
                    }
                    
                    // Get selected values
                    const selectedValues = selectedColumns.map(idx => paddedValues[idx] || '');
                    
                    // Add the row (including rows with empty values to maintain structure)
                    outputParts.push(formatCSVLine(selectedValues) + '\n');
                    totalProcessed++;
                    
                    if (debugMode && totalProcessed % 1000 === 0) {
                        console.log(`Processed ${totalProcessed} rows...`);
                    }
                }
                
                isFirstChunk = false;
                offset += CHUNK_SIZE;
                
                // Update progress
                const progress = Math.min(100, Math.round((offset / currentFile.size) * 100));
                showProgress(progress);
            }
            
            // Process remainder if any
            if (remainder && remainder.trim()) {
                if (debugMode) console.log('Processing remainder:', remainder.length, 'chars');
                
                const values = remainder.split('\t');
                const processedValues = values.map(field => {
                    if (field && field.length >= 2 && field.startsWith('"') && field.endsWith('"')) {
                        return field.slice(1, -1).replace(/""/g, '"');
                    }
                    return field || '';
                });
                
                const paddedValues = [];
                for (let j = 0; j < headers.length; j++) {
                    paddedValues[j] = j < processedValues.length ? processedValues[j] : '';
                }
                
                const selectedValues = selectedColumns.map(idx => paddedValues[idx] || '');
                outputParts.push(formatCSVLine(selectedValues) + '\n');
                totalProcessed++;
            }
            
            if (debugMode) {
                console.log('TSV Export Summary:');
                console.log('- Total lines seen:', lineCount);
                console.log('- Empty lines skipped:', skippedLines);
                console.log('- Rows exported:', totalProcessed);
            }
        } else {
            // Original CSV processing for non-TSV files
            while (offset < currentFile.size) {
                const chunk = currentFile.slice(offset, Math.min(offset + CHUNK_SIZE, currentFile.size));
                let text = await chunk.text();
                
                // Remove BOM from first chunk
                if (offset === 0) {
                    text = removeBOM(text);
                }
                
                // Combine with remainder from previous chunk
                const fullText = remainder + text;
                
                // Find the last complete line in this chunk
                let lastCompleteLineEnd = fullText.length;
                let inQuotes = false;
                
                // If this isn't the last chunk, find a safe breaking point
                if (offset + CHUNK_SIZE < currentFile.size) {
                    // Scan backwards to find a line break that's not inside quotes
                    for (let i = fullText.length - 1; i >= fullText.length - 1000 && i >= 0; i--) {
                        if (fullText[i] === '"') {
                            // Count quotes before this position
                            let quoteCount = 0;
                            for (let j = 0; j < i; j++) {
                                if (fullText[j] === '"') {
                                    if (j + 1 < fullText.length && fullText[j + 1] === '"') {
                                        j++; // Skip escaped quote
                                    } else {
                                        quoteCount++;
                                    }
                                }
                            }
                            inQuotes = (quoteCount % 2) === 1;
                        }
                        
                        if ((fullText[i] === '\n' || fullText[i] === '\r') && !inQuotes) {
                            lastCompleteLineEnd = i + 1;
                            if (fullText[i] === '\r' && i + 1 < fullText.length && fullText[i + 1] === '\n') {
                                lastCompleteLineEnd = i + 2;
                            }
                            break;
                        }
                    }
                }
                
                // Process the complete portion
                const toProcess = fullText.substring(0, lastCompleteLineEnd);
                remainder = fullText.substring(lastCompleteLineEnd);
                
                // Parse the chunk
                const parsedLines = parseCSVData(toProcess, delimiter);
                
                // Process each line
                for (let i = (isFirstChunk ? 1 : 0); i < parsedLines.length; i++) {
                    const values = parsedLines[i];
                    if (values && values.length > 0) {
                        const paddedValues = [];
                        for (let j = 0; j < headers.length; j++) {
                            paddedValues[j] = values[j] || '';
                        }
                        
                        const selectedValues = selectedColumns.map(idx => paddedValues[idx] || '');
                        
                        if (selectedValues.some(v => v !== '')) {
                            outputParts.push(formatCSVLine(selectedValues) + '\n');
                            totalProcessed++;
                        }
                    }
                }
                
                isFirstChunk = false;
                offset += CHUNK_SIZE;
                
                // Update progress
                const progress = Math.min(100, Math.round((offset / currentFile.size) * 100));
                showProgress(progress);
            }
            
            // Process any remaining text
            if (remainder.trim()) {
                const parsedLines = parseCSVData(remainder, delimiter);
                for (let i = 0; i < parsedLines.length; i++) {
                    const values = parsedLines[i];
                    if (values && values.length > 0) {
                        const paddedValues = [];
                        for (let j = 0; j < headers.length; j++) {
                            paddedValues[j] = values[j] || '';
                        }
                        
                        const selectedValues = selectedColumns.map(idx => paddedValues[idx] || '');
                        
                        if (selectedValues.some(v => v !== '')) {
                            outputParts.push(formatCSVLine(selectedValues) + '\n');
                            totalProcessed++;
                        }
                    }
                }
            }
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
        
        // Show appropriate success message
        const conversionNote = (delimiter !== ',') ? ' File converted from TSV to CSV format.' : '';
        const originalLineEstimate = Math.round(currentFile.size / 100); // Rough estimate
        
        showStatus(`✅ Export completed! Processed ${totalProcessed} data rows.${conversionNote}`);
        
        if (debugMode) {
            console.log('Export complete. Total rows exported:', totalProcessed);
        }
        
        setTimeout(hideStatus, 4000);
        
    } catch (error) {
        console.error('Export error details:', error);
        showError('Error exporting file: ' + error.message + '. The file may be too complex or corrupted.');
    } finally {
        document.getElementById('exportBtn').disabled = false;
        hideProgress();
    }
}

// Format CSV line for export
function formatCSVLine(values) {
    return values.map(value => {
        if (value == null || value === undefined) return '';
        
        // Convert to string
        value = String(value);
        
        // Check if the value needs to be quoted
        const needsQuotes = value.includes(',') || 
                          value.includes('"') || 
                          value.includes('\n') || 
                          value.includes('\r') ||
                          value.startsWith(' ') ||
                          value.endsWith(' ');
        
        if (needsQuotes) {
            // Escape quotes by doubling them
            const escaped = value.replace(/"/g, '""');
            return `"${escaped}"`;
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
    
    // Remove any conversion notices
    const notice = document.querySelector('.conversion-notice');
    if (notice) notice.remove();
    
    // Reset file type display
    document.getElementById('fileType').textContent = '';
    
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('exportNameSection').style.display = 'none';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('columnSelector').style.display = 'none';
    document.getElementById('actionButtons').style.display = 'none';
    
    // Reset export button text
    document.getElementById('exportBtn').textContent = 'Export as CSV';
    
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