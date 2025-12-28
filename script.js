// Global variables to store period data
let dataFilterCRMHitachi;
let hyosungPeriods = [];
let currentHyosungPeriod = null;
let ncrPeriods = [];
let currentNcrPeriod = null;
let wincorPeriods = [];
let currentWincorPeriod = null;
let jalinPeriods = [];
let currentJalinPeriod = null;

// --- LOGIN GATE SYSTEM ---
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const passwordInput = document.getElementById('passwordInput');
    const loginGate = document.getElementById('login-gate');
    const loginMsg = document.getElementById('loginMsg');
    
    function checkLogin() {
        if (passwordInput.value === '9910') {
            // Success
            document.body.classList.remove('login-gate-active');
            loginGate.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            loginGate.style.opacity = '0';
            loginGate.style.transform = 'scale(1.1)';
            setTimeout(() => {
                loginGate.remove();
            }, 500);
        } else {
            // Fail
            loginMsg.style.opacity = '1';
            passwordInput.classList.add('border-danger', 'text-danger');
            passwordInput.value = '';
            setTimeout(() => {
                passwordInput.classList.remove('border-danger', 'text-danger');
            }, 1000);
        }
    }

    loginBtn.addEventListener('click', checkLogin);
    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') checkLogin();
    });

    // --- Inisialisasi Modul CRM Hitachi & Lainnya ---
    dataFilterCRMHitachi = new DataFilterCRMHitachi(); 
    
    // Setup untuk semua mesin
    ['crm', 'wincor', 'hyosung', 'ncr', 'jalin'].forEach(machine => {
        setupDragAndDrop(`dropzone-${machine}`, `file-${machine}`, `${machine}LogInput`);
        
        // Setup input file click via dropzone
        const dropzone = document.getElementById(`dropzone-${machine}`);
        const fileInput = document.getElementById(`file-${machine}`);
        
        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => {
                fileInput.click();
            });
        }
    });

    // Event Listeners Filter
    const wincorBtn = document.getElementById('wincorFilterButton');
    if(wincorBtn) wincorBtn.addEventListener('click', filterWincor);

    const hyosungBtn = document.getElementById('hyosungFilterButton');
    if(hyosungBtn) hyosungBtn.addEventListener('click', filterHyosung);

    const ncrBtn = document.getElementById('ncrFilterButton');
    if(ncrBtn) ncrBtn.addEventListener('click', filterNcr);

    const jalinBtn = document.getElementById('jalinFilterButton');
    if(jalinBtn) jalinBtn.addEventListener('click', filterJalin);
});

// --- UTILITY FUNCTIONS ---
function cleanAnsiCodes(str) {
    const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\u0000/g;
    return str.replace(ansiRegex, '');
}

// --- RESET FUNCTIONALITY ---
function resetForm(type) {
    // Reset input log
    const logInput = document.getElementById(`${type}LogInput`);
    if (logInput) logInput.value = '';

    // Reset input fisik
    if (type === 'crm') {
        document.getElementById('crmPhys100').value = '';
        document.getElementById('crmPhys50').value = '';
    } else if (type === 'jalin') {
        document.getElementById('jalinPhysInput').value = '';
    } else {
        const physInput = document.getElementById(`${type}PhysInput`);
        if (physInput) physInput.value = '';
    }

    // Reset input add cash manual
    const addCashManual = document.getElementById(`${type}AddCashManual`);
    if (addCashManual) addCashManual.value = '';

    // Untuk CRM, reset machine display
    if (type === 'crm') {
        document.getElementById('machineDisplay').innerHTML = `<span class="w-2 h-2 bg-slate-600 rounded-full"></span> MACHINE: <span class="text-white">WAITING LOG...</span>`;
    }

    // Reset hasil rekonsiliasi
    const reconBox = document.getElementById(`${type}ReconBox`);
    if (reconBox) {
        reconBox.className = "p-8 rounded-2xl bg-slate-800/60 border border-slate-600 flex flex-col justify-center items-center transition-all duration-500";
        const reconResult = document.getElementById(`${type}ReconResult`);
        if (reconResult) {
            reconResult.textContent = "MENUNGGU";
            reconResult.className = "text-5xl font-mono font-black text-slate-500 tracking-tight";
        }
        const expression = document.getElementById(`${type}Expression`);
        if (expression) expression.textContent = '';
    }

    // Reset stats khusus untuk Jalin
    if (type === 'jalin') {
        document.getElementById('jalinTid').textContent = '-';
        document.getElementById('jalinTotalAddCash').textContent = '0';
        document.getElementById('jalinTotalAmount').textContent = '0';
        document.getElementById('jalinTotalRemaining').textContent = '0';
        document.getElementById('jalinDisplayPhys').textContent = '0';

        // Reset cassette lists
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`jalinCash${i}`).innerHTML = '';
        }
    }

    // Reset periode display untuk semua mesin
    const periodDisplay = document.getElementById(`${type}PeriodDisplay`);
    if (periodDisplay) {
        periodDisplay.innerHTML = '';
        periodDisplay.classList.add('hidden');
    }
    
    // Reset selected period untuk semua mesin
    const periodSelected = document.getElementById(`${type}PeriodSelected`);
    if (periodSelected) periodSelected.classList.add('hidden');

    // Reset variabel periode global
    if (type === 'hyosung') {
        hyosungPeriods = [];
        currentHyosungPeriod = null;
    } else if (type === 'ncr') {
        ncrPeriods = [];
        currentNcrPeriod = null;
    } else if (type === 'wincor') {
        wincorPeriods = [];
        currentWincorPeriod = null;
    } else if (type === 'jalin') {
        jalinPeriods = [];
        currentJalinPeriod = null;
    }

    alert('Form has been reset!');
}

// --- UPGRADED COPY FUNCTIONALITY ---
function copyListToClipboard(listId, btnElement) {
    const list = document.getElementById(listId);
    if (!list) return;
    
    let items = '';
    
    // Filter khusus untuk CRM (Cash Presented & Stored Count)
    if (listId === 'cashPresentedList' || listId === 'storedCountList') {
        const listItems = Array.from(list.querySelectorAll('li'));
        items = listItems.map(li => {
            // Ambil teks dan hapus pemisah ribuan untuk Excel
            let text = li.textContent.trim();
            // Hapus titik pemisah ribuan agar terbaca benar di Excel
            text = text.replace(/\./g, '');
            // Hapus koma jika ada (untuk angka desimal, meski tidak ada di kasus ini)
            text = text.replace(/,/g, '');
            return text;
        }).filter(text => text !== '').join('\n');
    }
    // Filter untuk cassette ATM (Hyosung, Wincor, NCR, Jalin)
    else if (listId.includes('Cash') || listId.includes('cassette')) {
        const listItems = Array.from(list.querySelectorAll('li'));
        items = listItems
            .filter(li => {
                // Hapus baris yang mengandung "Total:" atau "Total :"
                const text = li.textContent.trim();
                return !text.includes('Total:') && !text.includes('Total :');
            })
            .map(li => {
                let text = li.textContent.trim();
                // Hapus nilai 0 atau negatif
                if (text === '0' || text === '-0' || text.startsWith('-')) {
                    return '';
                }
                // Hapus pemisah ribuan untuk konsistensi
                text = text.replace(/\./g, '');
                return text;
            })
            .filter(text => text !== '' && text !== '0' && !text.startsWith('-'))
            .join('\n');
    }
    // Default untuk list lainnya
    else {
        items = Array.from(list.querySelectorAll('li'))
            .map(li => li.textContent.trim())
            .filter(text => text !== '')
            .join('\n');
    }
    
    if (!items) {
        const originalText = btnElement.textContent;
        btnElement.textContent = "EMPTY!";
        btnElement.style.backgroundColor = "#ef4444";
        btnElement.style.color = "#fff";
        setTimeout(() => {
            btnElement.textContent = originalText;
            btnElement.style.backgroundColor = "";
            btnElement.style.color = "";
        }, 1500);
        return;
    }

    navigator.clipboard.writeText(items).then(() => {
        const originalText = btnElement.textContent;
        btnElement.textContent = "COPIED!";
        btnElement.style.backgroundColor = "#10b981";
        btnElement.style.borderColor = "#10b981";
        btnElement.style.color = "#fff";
        
        setTimeout(() => {
            btnElement.textContent = originalText;
            btnElement.style.backgroundColor = "";
            btnElement.style.borderColor = "";
            btnElement.style.color = "";
        }, 2000);
    }).catch(err => {
        console.error('Gagal menyalin:', err);
        alert('Gagal menyalin ke clipboard');
    });
}

// --- UI & NAVIGATION ---
function navigateTo(targetId) {
    const pages = document.querySelectorAll('.page-section');
    pages.forEach(page => {
        page.classList.add('hidden');
        page.classList.remove('fade-enter-active');
    });

    const target = document.getElementById(targetId);
    if (target) {
        target.classList.remove('hidden');
        setTimeout(() => {
            target.classList.add('fade-enter-active');
        }, 10);
        window.scrollTo(0, 0);
    }
}

// --- DRAG & DROP LOGIC ---
function setupDragAndDrop(dropzoneId, inputId, textareaId) {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(inputId);
    const textarea = document.getElementById(textareaId);

    if(!dropzone) return;

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files, textarea);
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            handleFiles(files, textarea);
        }
    }, false);
}

// === UPGRADED: Fungsi untuk membaca file ZIP TANPA BATASAN ===
async function extractZipContents(file) {
    try {
        const zip = await JSZip.loadAsync(file);
        let extractedText = "";
        let logCount = 0;
        let fileList = [];
        
        // Prioritaskan file .txt, .log, .csv
        const textFiles = [];
        const otherFiles = [];
        
        for (const [filename, fileEntry] of Object.entries(zip.files)) {
            if (!fileEntry.dir) {
                if (filename.toLowerCase().endsWith('.txt') || 
                    filename.toLowerCase().endsWith('.log') ||
                    filename.toLowerCase().endsWith('.csv')) {
                    textFiles.push({filename, fileEntry});
                } else {
                    otherFiles.push({filename, fileEntry});
                }
            }
        }
        
        // Gabungkan dengan prioritas file teks
        const allFiles = [...textFiles, ...otherFiles];
        
        for (const {filename, fileEntry} of allFiles) {
            try {
                // Coba baca sebagai teks
                const content = await fileEntry.async('text');
                extractedText += `=== File: ${filename} ===\n${content}\n\n`;
                fileList.push(filename);
                logCount++;
                
                // Batasi hanya jika ukuran text terlalu besar (10MB)
                if (extractedText.length > 10000000) { // ~10MB
                    extractedText += `\n[NOTE: Ukuran konten ZIP terlalu besar, hanya menampilkan sebagian]\n`;
                    break;
                }
            } catch (error) {
                console.warn(`Gagal membaca file ${filename}:`, error);
                extractedText += `=== File: ${filename} ===\n[TIPE FILE NON-TEKS, DILEWATI]\n\n`;
            }
        }
        
        if (logCount > 0) {
            return {
                success: true,
                text: `[${logCount} file ditemukan dalam ZIP: ${fileList.length} file total]\n\n${extractedText}`,
                count: logCount
            };
        } else {
            return {
                success: false,
                text: "[ZIP tidak mengandung file teks yang bisa dibaca]",
                count: 0
            };
        }
    } catch (error) {
        console.error('Error reading ZIP:', error);
        return {
            success: false,
            text: `[ERROR: Gagal membaca file ZIP. Detail: ${error.message}]`,
            count: 0
        };
    }
}

// Fungsi untuk membaca semua jenis file
async function handleFiles(files, textarea) {
    if (!files || files.length === 0) return;
    
    textarea.value = "Membaca file...";
    const readers = [];
    let combinedText = "";
    let totalFiles = 0;
    
    for (const file of files) {
        const promise = new Promise(async (resolve) => {
            try {
                if (file.name.toLowerCase().endsWith('.zip')) {
                    const result = await extractZipContents(file);
                    totalFiles += result.count;
                    resolve(result.text);
                } else if (file.type === 'text/plain' || 
                         file.name.toLowerCase().endsWith('.txt') || 
                         file.name.toLowerCase().endsWith('.log') ||
                         file.name.toLowerCase().endsWith('.csv')) {
                    // Baca file teks biasa
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        totalFiles++;
                        resolve(e.target.result);
                    };
                    reader.onerror = () => resolve(`Error membaca file ${file.name}`);
                    reader.readAsText(file, 'UTF-8');
                } else {
                    // Coba baca sebagai teks meskipun bukan .txt/.log
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        totalFiles++;
                        resolve(`[File: ${file.name}]\n${e.target.result}\n`);
                    };
                    reader.onerror = () => {
                        resolve(`[File: ${file.name} - Bukan file teks, dilewati]`);
                    };
                    reader.readAsText(file);
                }
            } catch (error) {
                resolve(`Error membaca file ${file.name}: ${error.message}`);
            }
        });
        readers.push(promise);
    }

    Promise.all(readers).then(contents => {
        if (files.length > 1) {
            combinedText = `[${files.length} FILE]\n\n` + contents.join("\n\n---\n\n");
        } else {
            combinedText = contents[0];
        }
        
        textarea.value = combinedText;
    });
}

// --- LOGIKA REKONSILIASI ---
function updateReconciliationUI(physVal, sysVal, boxId, textId, expressionId) {
    const box = document.getElementById(boxId);
    const text = document.getElementById(textId);
    const exp = document.getElementById(expressionId);
    if(!box || !text) return;

    const diff = physVal - sysVal;
    
    box.className = "p-8 rounded-2xl border flex flex-col justify-center items-center transition-all duration-500 w-full min-h-[180px]";
    
    if (diff === 0) {
        box.classList.add("bg-slate-600", "border-slate-500", "shadow-[0_0_30px_rgba(71,85,105,0.4)]");
        text.textContent = "COCOK";
        text.className = "text-5xl lg:text-6xl font-mono font-black text-white tracking-tight";
        if(exp) {
            exp.textContent = "Mantap... 😎";
            exp.className = "text-center mt-4 text-success font-bold font-mono animate-bounce-slow text-2xl lg:text-3xl drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]";
        }
    } else if (diff < 0) {
        box.classList.add("bg-red-900/90", "border-red-500", "shadow-[0_0_30px_rgba(239,68,68,0.4)]");
        text.textContent = `SHORTAGE ${Math.abs(diff).toLocaleString('id-ID')}`;
        text.className = "text-4xl lg:text-5xl font-mono font-black text-white tracking-tight";
        if(exp) {
            exp.textContent = "Hmmm... gini aja terus 😡";
            exp.className = "text-center mt-4 text-danger font-bold font-mono animate-pulse-fast text-2xl lg:text-3xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]";
        }
    } else {
        box.classList.add("bg-green-900/90", "border-green-500", "shadow-[0_0_30px_rgba(16,185,129,0.4)]");
        text.textContent = `SURPLUS ${diff.toLocaleString('id-ID')}`;
        text.className = "text-4xl lg:text-5xl font-mono font-black text-white tracking-tight";
         if(exp) {
            exp.textContent = "Waduh... coba cek di kaset apa reject 🤨";
            exp.className = "text-center mt-4 text-warning font-bold font-mono animate-pulse-fast text-2xl lg:text-3xl drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]";
        }
    }
}

function updateReconciliationTable(physVal, sysVal, cellId, badgeId) {
    const cell = document.getElementById(cellId);
    if(!cell) return;
    cell.textContent = physVal.toLocaleString('id-ID');
}

// CRM CLASS - DENGAN FILTER PERIODE BERDASARKAN DISPENSE
class DataFilterCRMHitachi {
    constructor() {
        this.logInput = document.getElementById('crmLogInput');
        this.filterButton = document.getElementById('crmFilterButton');
        this.machineDisplay = document.getElementById('machineDisplay');
        this.crmPhys100 = document.getElementById('crmPhys100');
        this.crmPhys50 = document.getElementById('crmPhys50');
        
        this.init100 = document.getElementById('init100');
        this.init50 = document.getElementById('init50');
        this.disp100 = document.getElementById('disp100');
        this.disp50 = document.getElementById('disp50');
        this.dep100 = document.getElementById('dep100');
        this.dep50 = document.getElementById('dep50');
        this.rem100 = document.getElementById('rem100');
        this.rem50 = document.getElementById('rem50');
        this.initAmount = document.getElementById('initAmount');
        this.dispAmount = document.getElementById('dispAmount');
        this.depAmount = document.getElementById('depAmount');
        this.remAmount = document.getElementById('remAmount');
        this.crmTotalPhysAmount = document.getElementById('crmTotalPhysAmount'); 
        this.cashPresentedCount = document.getElementById('cashPresentedCount');
        this.cashPresentedTotal = document.getElementById('cashPresentedTotal');
        this.cashPresentedList = document.getElementById('cashPresentedList');
        this.storedCountCount = document.getElementById('storedCountCount');
        this.storedCountTotal = document.getElementById('storedCountTotal');
        this.storedCountList = document.getElementById('storedCountList');

        // Periode
        this.periods = [];
        this.currentPeriod = null;

        if (this.filterButton) {
            this.filterButton.addEventListener('click', () => this.filterData());
        }
    }

    // Fungsi untuk mencari periode replenish dalam log CRM dengan FILTER DISPENSE
    findReplenishmentPeriods(lines) {
        const periods = [];
        const replenishmentIndices = [];
        
        // Cari semua baris REPLENISHMENT
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().includes('REPLENISHMENT')) {
                // Ambil tanggal dari format: 28/08/2025 20:11:46 REPLENISHMENT
                const dateMatch = lines[i].match(/(\d{2}\/\d{2}\/\d{4})/);
                if (dateMatch) {
                    // Konversi ke format dd/mm/yy
                    const [day, month, year] = dateMatch[1].split('/');
                    const formattedDate = `${day}/${month}/${year.slice(-2)}`;
                    replenishmentIndices.push({
                        index: i,
                        date: formattedDate // Format: dd/mm/yy
                    });
                }
            }
        }
        
        // Buat periode dari setiap dua REPLENISHMENT berurutan
        for (let i = 0; i < replenishmentIndices.length - 1; i++) {
            const startIdx = replenishmentIndices[i].index;
            const endIdx = replenishmentIndices[i + 1].index;
            
            // === TAMBAHAN: FILTER BERDASARKAN DISPENSE ===
            // Cek apakah ada transaksi dispense ("Request Count") dalam periode ini
            let hasDispense = false;
            for (let j = startIdx + 1; j < endIdx; j++) {
                if (lines[j].indexOf('Request Count') === 0) {
                    hasDispense = true;
                    break;
                }
            }
            
            // Hanya tambahkan periode jika ADA transaksi dispense
            if (hasDispense) {
                periods.push({
                    startIndex: startIdx,
                    endIndex: endIdx,
                    startDate: replenishmentIndices[i].date,
                    endDate: replenishmentIndices[i + 1].date,
                    displayText: `${replenishmentIndices[i].date} - ${replenishmentIndices[i + 1].date}`
                });
            }
        }
        
        return periods;
    }

    // Fungsi untuk menampilkan periode di UI
    displayPeriods() {
        const periodDisplay = document.getElementById('crmPeriodDisplay');
        if (!periodDisplay) return;
        
        periodDisplay.innerHTML = '';
        periodDisplay.classList.remove('hidden');
        
        if (this.periods.length === 0) {
            periodDisplay.innerHTML = '<span class="period-label"><span class="badge">PERIODE</span> Tidak ditemukan periode dengan transaksi dispense</span>';
            return;
        }
        
        // Tentukan periode default
        let defaultPeriodIndex = this.periods.length - 1;
        if (this.periods.length > 1) {
            const lastPeriod = this.periods[this.periods.length - 1];
            // Jika periode terakhir adalah "sekarang" (tidak dibatasi oleh add cash)
            if (lastPeriod.displayText.includes('Sekarang') || !lastPeriod.endDate) {
                // Pilih periode kedua dari terakhir
                defaultPeriodIndex = this.periods.length - 2;
            } else {
                defaultPeriodIndex = this.periods.length - 1;
            }
        }
        
        // Buat tombol untuk setiap periode
        this.periods.forEach((period, index) => {
            const button = document.createElement('button');
            button.textContent = period.displayText;
            button.className = 'period-btn crm';
            
            // Jika ini periode default, set sebagai active
            if (index === defaultPeriodIndex) {
                button.classList.add('active');
                this.currentPeriod = period;
                this.updateSelectedPeriodUI(period);
            } else if (this.currentPeriod && this.currentPeriod.displayText === period.displayText) {
                button.classList.add('active');
            }
            
            button.addEventListener('click', () => {
                // Update current period
                this.currentPeriod = period;
                
                // Update UI tombol
                document.querySelectorAll('#crmPeriodDisplay .period-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');
                
                // Update selected period UI
                this.updateSelectedPeriodUI(period);
                
                // Analisis untuk periode ini
                this.analyzePeriod(period);
            });
            
            periodDisplay.appendChild(button);
        });
        
        // Analisis untuk periode default
        if (this.currentPeriod) {
            this.analyzePeriod(this.currentPeriod);
        }
    }
    
    updateSelectedPeriodUI(period) {
        const selectedDiv = document.getElementById('crmPeriodSelected');
        const selectedText = document.getElementById('crmSelectedPeriodText');
        
        if (selectedDiv && selectedText) {
            selectedDiv.classList.remove('hidden');
            selectedText.textContent = period.displayText;
        }
    }

    findReplenishmentPeriod(lines, period = null) {
        if (period) {
            // Gunakan periode yang ditentukan
            return { 
                start: period.startIndex + 1,
                end: period.endIndex - 1,
                initIndex: period.startIndex
            };
        }
        
        // Default: cari periode terakhir yang diapit 2 add cash
        const replenishmentIndices = [];
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().endsWith('REPLENISHMENT')) {
                replenishmentIndices.push(i);
                if (replenishmentIndices.length === 3) break; // Ambil 3 terakhir
            }
        }
        
        // Jika ada minimal 2 periode, ambil periode kedua dari terakhir
        if (replenishmentIndices.length >= 2) {
            return { 
                start: replenishmentIndices[1] + 1,
                end: replenishmentIndices[0] - 1,
                initIndex: replenishmentIndices[1]
            };
        }
        if (replenishmentIndices.length === 1) {
            return { 
                start: replenishmentIndices[0] + 1, 
                end: lines.length - 1, 
                initIndex: replenishmentIndices[0] 
            };
        }
        // Fallback Full Log
        return { start: 0, end: lines.length - 1, initIndex: -1 };
    }

    calculateDISP(lines, period = null) {
        const { start, end } = this.findReplenishmentPeriod(lines, period);
        const totals = { disp1: 0, disp2: 0, disp3: 0, disp4: 0 };
        for (let i = start; i <= end; i++) {
            const line = lines[i];
            if (line.indexOf('Request Count') === 0) {
                for (let j = 0; j < 4; j++) {
                    let value = parseInt(line.substring(21 + j * 3, 23 + j * 3));
                    if (!isNaN(value)) {
                        totals['disp' + (j + 1)] += value;
                    }
                }
            }
        }
        return Object.values(totals);
    }

    totalDisp100(totals) { return totals.disp1 + totals.disp2; }
    totalDisp50(totals) { return totals.disp3 + totals.disp4; }

    calculateDEP(lines, period = null) {
        const { start, end } = this.findReplenishmentPeriod(lines, period);
        let totalDep1 = 0, totalDep2 = 0;
        for (let i = start; i <= end; i++) {
            if (lines[i].includes('Stored Count')) {
                for (let j = i + 1; j <= end; j++) {
                    const nextLine = lines[j];
                    if (nextLine.includes('[100000')) {
                        const match100000 = nextLine.match(/\[100000, (\d+)\]/);
                        if (match100000) totalDep1 += parseInt(match100000[1]);
                    } else if (nextLine.includes('[50000')) {
                        const match50000 = nextLine.match(/\[50000, (\d+)\]/);
                        if (match50000) totalDep2 += parseInt(match50000[1]);
                    } else if (nextLine.includes('Stored Count') || nextLine.includes('REPLENISHMENT') || nextLine.includes('Request Count')) {
                        break; 
                    }
                }
            }
        }
        return [totalDep1, totalDep2];
    }

    calculateINIT(lines, period = null) {
        const { initIndex } = this.findReplenishmentPeriod(lines, period);
        if (initIndex === -1) return [0, 0]; 
        let init100 = 0, init50 = 0;
        for (let j = initIndex + 3; j < initIndex + 7 && j < lines.length; j++) { 
            const values = lines[j].trim().split(/\s+/);
            if (values.length >= 3) { 
                if (values[1] === '100000') init100 += parseInt(values[2]) || 0;
                else if (values[1] === '50000') init50 += parseInt(values[2]) || 0;
            }
        }
        return [init100, init50];
    }

    calculateREM(lines, period = null) {
        const [totalDisp1, totalDisp2, totalDisp3, totalDisp4] = this.calculateDISP(lines, period);
        const [totalDep1, totalDep2] = this.calculateDEP(lines, period);
        const [init100, init50] = this.calculateINIT(lines, period);
        const rem100 = init100 - this.totalDisp100({ disp1: totalDisp1, disp2: totalDisp2 }) + totalDep1;
        const rem50 = init50 - this.totalDisp50({ disp3: totalDisp3, disp4: totalDisp4 }) + totalDep2;
        return [rem100, rem50];
    }

    findMachineID(lines) {
        for (const line of lines) {
            const match = line.match(/Terminal ID\s*\[\s*(\d+)\s*\]/);
            if (match) return match[1];
        }
        return "Not Found";
    }

    extractCashPresented(lines, period = null) {
        const { start, end } = this.findReplenishmentPeriod(lines, period);
        const cashPresentedTransactions = [];
        let totalAmountCalculated = 0;

        for (let i = start; i <= end; i++) {
            const line = lines[i].trim();
            if (line.indexOf('Request Count') === 0) {
                const amounts = [];
                for (let k = 0; k < 4; k++) {
                    let value = parseInt(line.substring(21 + k * 3, 23 + k * 3));
                    if (!isNaN(value)) {
                        if (k < 2) amounts.push(value * 100000);
                        else amounts.push(value * 50000);
                    }
                }
                const transactionAmount = amounts.reduce((sum, val) => sum + val, 0);
                if (transactionAmount > 0) {
                    cashPresentedTransactions.push(transactionAmount);
                    totalAmountCalculated += transactionAmount;
                }
            }
        }
        return { count: cashPresentedTransactions.length, total: totalAmountCalculated, list: cashPresentedTransactions };
    }

    extractStoredCount(lines, period = null) {
        const { start, end } = this.findReplenishmentPeriod(lines, period);
        const [totalDep1, totalDep2] = this.calculateDEP(lines, period);
        const totalAmount = (totalDep1 * 100000) + (totalDep2 * 50000);
        const storedTransactions = [];
        
        for (let i = start; i <= end; i++) {
            if (lines[i].includes('Stored Count')) {
                for (let j = i + 1; j <= end; j++) {
                    const nextLine = lines[j];
                    if (nextLine.includes('[100000')) {
                        const match100000 = nextLine.match(/\[100000, (\d+)\]/);
                        if (match100000) storedTransactions.push(parseInt(match100000[1]) * 100000);
                    } else if (nextLine.includes('[50000')) {
                        const match50000 = nextLine.match(/\[50000, (\d+)\]/);
                        if (match50000) storedTransactions.push(parseInt(match50000[1]) * 50000);
                    } else if (nextLine.includes('Stored Count') || nextLine.includes('REPLENISHMENT') || nextLine.includes('Request Count')) {
                        break; 
                    }
                }
            }
        }
        return { count: storedTransactions.length, total: totalAmount, list: storedTransactions };
    }

    filterData() {
        if (!this.logInput) return;
        const logInput = cleanAnsiCodes(this.logInput.value);
        const lines = logInput.split('\n');
        const machineID = this.findMachineID(lines);
        this.machineDisplay.innerHTML = `<span class="w-2 h-2 bg-accent rounded-full animate-pulse"></span> MACHINE: ${machineID}`;
        
        // Cari semua periode DENGAN FILTER DISPENSE
        this.periods = this.findReplenishmentPeriods(lines);
        
        // Tampilkan periode di UI (akan otomatis menganalisis periode default)
        this.displayPeriods();
    }
    
    analyzePeriod(period) {
        const logInput = cleanAnsiCodes(this.logInput.value);
        const lines = logInput.split('\n');
        
        const [totalDisp1, totalDisp2, totalDisp3, totalDisp4] = this.calculateDISP(lines, period);
        const [totalDep1, totalDep2] = this.calculateDEP(lines, period);
        const [init100, init50] = this.calculateINIT(lines, period);
        const [rem100, rem50] = this.calculateREM(lines, period);
        
        this.init100.textContent = init100;
        this.init50.textContent = init50;
        this.disp100.textContent = this.totalDisp100({ disp1: totalDisp1, disp2: totalDisp2 });
        this.disp50.textContent = this.totalDisp50({ disp3: totalDisp3, disp4: totalDisp4 });
        this.dep100.textContent = totalDep1;
        this.dep50.textContent = totalDep2;
        this.rem100.textContent = rem100;
        this.rem50.textContent = rem50;
        
        const initAmount = (init100 * 100000) + (init50 * 50000);
        const dispAmount = (this.totalDisp100({ disp1: totalDisp1, disp2: totalDisp2 }) * 100000) + (this.totalDisp50({ disp3: totalDisp3, disp4: totalDisp4 }) * 50000);
        const depAmount = (totalDep1 * 100000) + (totalDep2 * 50000);
        const remAmount = (rem100 * 100000) + (rem50 * 50000);
        
        this.initAmount.textContent = initAmount.toLocaleString('id-ID');
        this.dispAmount.textContent = dispAmount.toLocaleString('id-ID');
        this.depAmount.textContent = depAmount.toLocaleString('id-ID');
        this.remAmount.textContent = remAmount.toLocaleString('id-ID');
        
        const cashPresented = this.extractCashPresented(lines, period);
        this.cashPresentedCount.textContent = cashPresented.count;
        this.cashPresentedTotal.textContent = cashPresented.total.toLocaleString('id-ID');
        this.cashPresentedList.innerHTML = '';
        cashPresented.list.forEach(amount => {
            const li = document.createElement('li');
            li.textContent = amount.toLocaleString('id-ID');
            li.classList.add('py-1', 'border-b', 'border-slate-800/50');
            this.cashPresentedList.appendChild(li);
        });

        const storedCountData = this.extractStoredCount(lines, period);
        this.storedCountCount.textContent = storedCountData.count;
        this.storedCountTotal.textContent = storedCountData.total.toLocaleString('id-ID');
        this.storedCountList.innerHTML = '';
        storedCountData.list.forEach(amount => {
            const li = document.createElement('li');
            li.textContent = amount.toLocaleString('id-ID');
            li.classList.add('py-1', 'border-b', 'border-slate-800/50');
            this.storedCountList.appendChild(li);
        });

        const phys100 = parseInt(this.crmPhys100.value) || 0;
        const phys50 = parseInt(this.crmPhys50.value) || 0;
        const totalPhys = (phys100 * 100000) + (phys50 * 50000);
        
        if(this.crmPhys100.value === "" && this.crmPhys50.value === "") {
             this.crmTotalPhysAmount.textContent = "MENUNGGU INPUT";
             this.crmTotalPhysAmount.classList.add("text-sm");
        } else {
             this.crmTotalPhysAmount.textContent = totalPhys.toLocaleString('id-ID');
             this.crmTotalPhysAmount.classList.remove("text-sm");
        }

        if (this.crmPhys100.value !== "" || this.crmPhys50.value !== "") {
            updateReconciliationTable(phys100, rem100, "crmResPhys100");
            updateReconciliationTable(phys50, rem50, "crmResPhys50");
            updateReconciliationUI(totalPhys, remAmount, "crmTotalReconBox", "crmTotalReconResult", "crmExpression");
        }
    }
}

// --- FUNGSI PERIODE UNTUK HYOSUNG DENGAN FILTER DISPENSE ---
function findHyosungPeriods(logLines) {
    const periods = [];
    const addCashIndices = [];

    // Cari semua baris "ADD CASH:"
    for (let i = 0; i < logLines.length; i++) {
        if (logLines[i].includes('ADD CASH:')) {
            // Ambil tanggal dari baris sebelumnya (i-1)
            if (i > 0) {
                const dateMatch = logLines[i-1].match(/(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})/);
                if (dateMatch) {
                    const dateStr = dateMatch[1];
                    const datePart = dateStr.split(' ')[0]; // Format: dd/mm/yyyy
                    // Konversi ke dd/mm/yy
                    const [day, month, year] = datePart.split('/');
                    const formattedDate = `${day}/${month}/${year.slice(-2)}`;
                    addCashIndices.push({ index: i, date: formattedDate });
                }
            }
        }
    }

    // Buat periode dari setiap dua "ADD CASH:" berurutan
    for (let i = 0; i < addCashIndices.length; i++) {
        const startIdx = addCashIndices[i].index;
        const startDate = addCashIndices[i].date;
        let endDate = null;
        let endIdx = logLines.length;

        if (i < addCashIndices.length - 1) {
            endIdx = addCashIndices[i+1].index;
            endDate = addCashIndices[i+1].date;
        }

        // === TAMBAHAN: FILTER BERDASARKAN DISPENSE ===
        // Cek apakah ada transaksi dispense ("Request Count") dalam periode ini
        let hasDispense = false;
        for (let j = startIdx + 1; j < endIdx; j++) {
            if (logLines[j].includes('Request Count')) {
                hasDispense = true;
                break;
            }
        }
        
        // Hanya tambahkan periode jika ADA transaksi dispense
        if (hasDispense) {
            periods.push({
                startIndex: startIdx,
                endIndex: endIdx,
                startDate: startDate,
                endDate: endDate,
                displayText: endDate ? `${startDate} - ${endDate}` : `${startDate} - Sekarang`
            });
        }
    }

    return periods;
}

function displayHyosungPeriods() {
    const periodDisplay = document.getElementById('hyosungPeriodDisplay');
    if (!periodDisplay) return;
    
    periodDisplay.innerHTML = '';
    periodDisplay.classList.remove('hidden');
    
    if (hyosungPeriods.length === 0) {
        periodDisplay.innerHTML = '<span class="period-label"><span class="badge">PERIODE</span> Tidak ditemukan periode dengan transaksi dispense</span>';
        return;
    }
    
    // Tentukan periode default
    let defaultPeriodIndex = hyosungPeriods.length - 1;
    if (hyosungPeriods.length > 1) {
        const lastPeriod = hyosungPeriods[hyosungPeriods.length - 1];
        // Jika periode terakhir adalah "sekarang" (tidak dibatasi oleh add cash)
        if (lastPeriod.displayText.includes('Sekarang') || !lastPeriod.endDate) {
            // Cari periode terakhir yang memiliki endDate (periode yang sudah selesai)
            for (let i = hyosungPeriods.length - 2; i >= 0; i--) {
                if (hyosungPeriods[i].endDate) {
                    defaultPeriodIndex = i;
                    break;
                }
            }
        } else {
            defaultPeriodIndex = hyosungPeriods.length - 1;
        }
    }
    
    // Buat tombol untuk setiap periode
    hyosungPeriods.forEach((period, index) => {
        const button = document.createElement('button');
        button.textContent = period.displayText;
        button.className = 'period-btn hyosung';
        
        // Jika ini periode default, set sebagai active
        if (index === defaultPeriodIndex) {
            button.classList.add('active');
            currentHyosungPeriod = period;
            updateHyosungSelectedPeriodUI(period);
        } else if (currentHyosungPeriod && currentHyosungPeriod.displayText === period.displayText) {
            button.classList.add('active');
        }
        
        button.addEventListener('click', () => {
            // Update current period
            currentHyosungPeriod = period;
            
            // Update UI tombol
            document.querySelectorAll('#hyosungPeriodDisplay .period-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            // Update selected period UI
            updateHyosungSelectedPeriodUI(period);
            
            // Analisis untuk periode ini
            analyzeHyosungPeriod(period);
        });
        
        periodDisplay.appendChild(button);
    });
    
    // Analisis untuk periode default
    if (currentHyosungPeriod) {
        analyzeHyosungPeriod(currentHyosungPeriod);
    }
}

function updateHyosungSelectedPeriodUI(period) {
    const selectedDiv = document.getElementById('hyosungPeriodSelected');
    const selectedText = document.getElementById('hyosungSelectedPeriodText');
    
    if (selectedDiv && selectedText) {
        selectedDiv.classList.remove('hidden');
        selectedText.textContent = period.displayText;
    }
}

function analyzeHyosungPeriod(period) {
    const logTextRaw = document.getElementById('hyosungLogInput').value;
    const logText = cleanAnsiCodes(logTextRaw);
    const logLines = logText.split('\n');

    const atmID = findHyosungATM_ID(logText);
    displayHyosungATM_ID(atmID);

    // Parse add cash dari periode yang dipilih
    let totalAddCashAwal = 0;
    if (period) {
        totalAddCashAwal = parseHyosungAddCashNew(logLines, period.startIndex);
    }

    // CEK INPUT MANUAL ADD CASH
    const manualAddCash = parseInt(document.getElementById('hyosungAddCashManual').value);
    if (!isNaN(manualAddCash) && manualAddCash > 0) {
        totalAddCashAwal = manualAddCash;
    }

    displayHyosungTotalAddCash(totalAddCashAwal.toLocaleString('id-ID'));

    // Tentukan rentang baris untuk analisis dispense berdasarkan periode
    let startLineDispense = period ? period.startIndex + 1 : 0;
    let endLineDispense = period ? period.endIndex - 1 : logLines.length - 1;

    const cashLists = { 'hyosungCash1': [], 'hyosungCash2': [], 'hyosungCash3': [], 'hyosungCash4': [] };

    for (let i = startLineDispense; i <= endLineDispense; i++) {
        const match = logLines[i].match(/Request Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
        if (match) {
            const [, disp1, disp2, disp3, disp4] = match;
            // Filter: hanya tambahkan jika nilainya > 0
            if (parseInt(disp1) > 0) cashLists['hyosungCash1'].push(parseInt(disp1));
            if (parseInt(disp2) > 0) cashLists['hyosungCash2'].push(parseInt(disp2));
            if (parseInt(disp3) > 0) cashLists['hyosungCash3'].push(parseInt(disp3));
            if (parseInt(disp4) > 0) cashLists['hyosungCash4'].push(parseInt(disp4));
        }
    }

    // Tampilkan hasil dispense (dengan filter untuk nilai 0)
    for (const [cashType, list] of Object.entries(cashLists)) {
        displayHyosungResult(list, cashType);
    }

    const totalAmount = Object.values(cashLists).flat().reduce((acc, val) => acc + val, 0);
    document.getElementById('hyosungTotalAmount').textContent = `${totalAmount.toLocaleString('id-ID')}`;

    const totalRemaining = calculateTotalRemaining(totalAddCashAwal, totalAmount);
    displayHyosungTotalRemaining(totalRemaining.toLocaleString('id-ID'));

    const physInput = document.getElementById('hyosungPhysInput');
    if (physInput.value !== "") {
        const physVal = parseInt(physInput.value) || 0;
        document.getElementById('hyosungDisplayPhys').textContent = physVal.toLocaleString('id-ID');
        updateReconciliationUI(physVal, totalRemaining, "hyosungReconBox", "hyosungReconResult", "hyosungExpression");
    }
}

function filterHyosung() {
    const logTextRaw = document.getElementById('hyosungLogInput').value;
    const logText = cleanAnsiCodes(logTextRaw);
    const logLines = logText.split('\n');

    // Cari periode DENGAN FILTER DISPENSE
    hyosungPeriods = findHyosungPeriods(logLines);

    // Tampilkan periode di UI (akan otomatis menganalisis periode default)
    displayHyosungPeriods();
}

// --- FUNGSI PERIODE UNTUK NCR DENGAN FILTER DISPENSE ---
function findNcrPeriods(logLines) {
    const periods = [];
    const cashAddedIndices = [];

    // Cari semua baris "CASH ADDED"
    for (let i = 0; i < logLines.length; i++) {
        if (logLines[i].includes('CASH ADDED')) {
            let dateStr = null;
            
            // Cari pattern *mm/dd/yyyy* di baris yang sama
            let match = logLines[i].match(/\*(\d{2}\/\d{2}\/\d{4})\*/);
            if (match) {
                dateStr = match[1]; // format: mm/dd/yyyy
                // Ubah menjadi dd/mm/yy
                const [month, day, year] = dateStr.split('/');
                dateStr = `${day}/${month}/${year.slice(-2)}`;
            } else if (i > 0) {
                // Cari di baris sebelumnya
                match = logLines[i-1].match(/\*(\d{2}\/\d{2}\/\d{4})\*/);
                if (match) {
                    dateStr = match[1]; // format: mm/dd/yyyy
                    // Ubah menjadi dd/mm/yy
                    const [month, day, year] = dateStr.split('/');
                    dateStr = `${day}/${month}/${year.slice(-2)}`;
                }
            }

            if (dateStr) {
                cashAddedIndices.push({ index: i, date: dateStr });
            }
        }
    }

    // Buat periode dari setiap dua "CASH ADDED" berurutan
    for (let i = 0; i < cashAddedIndices.length; i++) {
        const startIdx = cashAddedIndices[i].index;
        const startDate = cashAddedIndices[i].date;
        let endDate = null;
        let endIdx = logLines.length;

        if (i < cashAddedIndices.length - 1) {
            endIdx = cashAddedIndices[i+1].index;
            endDate = cashAddedIndices[i+1].date;
        }

        // === TAMBAHAN: FILTER BERDASARKAN DISPENSE ===
        // Cek apakah ada transaksi dispense ("NOTES PRESENTED") dalam periode ini
        let hasDispense = false;
        for (let j = startIdx + 1; j < endIdx; j++) {
            if (logLines[j].includes('NOTES PRESENTED')) {
                hasDispense = true;
                break;
            }
        }
        
        // Hanya tambahkan periode jika ADA transaksi dispense
        if (hasDispense) {
            periods.push({
                startIndex: startIdx,
                endIndex: endIdx,
                startDate: startDate,
                endDate: endDate,
                displayText: endDate ? `${startDate} - ${endDate}` : `${startDate} - Sekarang`
            });
        }
    }

    return periods;
}

function displayNcrPeriods() {
    const periodDisplay = document.getElementById('ncrPeriodDisplay');
    if (!periodDisplay) return;
    
    periodDisplay.innerHTML = '';
    periodDisplay.classList.remove('hidden');
    
    if (ncrPeriods.length === 0) {
        periodDisplay.innerHTML = '<span class="period-label"><span class="badge">PERIODE</span> Tidak ditemukan periode dengan transaksi dispense</span>';
        return;
    }
    
    // Tentukan periode default
    let defaultPeriodIndex = ncrPeriods.length - 1;
    if (ncrPeriods.length > 1) {
        const lastPeriod = ncrPeriods[ncrPeriods.length - 1];
        // Jika periode terakhir adalah "sekarang" (tidak dibatasi oleh add cash)
        if (lastPeriod.displayText.includes('Sekarang') || !lastPeriod.endDate) {
            // Cari periode terakhir yang memiliki endDate (periode yang sudah selesai)
            for (let i = ncrPeriods.length - 2; i >= 0; i--) {
                if (ncrPeriods[i].endDate) {
                    defaultPeriodIndex = i;
                    break;
                }
            }
        } else {
            defaultPeriodIndex = ncrPeriods.length - 1;
        }
    }
    
    // Buat tombol untuk setiap periode
    ncrPeriods.forEach((period, index) => {
        const button = document.createElement('button');
        button.textContent = period.displayText;
        button.className = 'period-btn ncr';
        
        // Jika ini periode default, set sebagai active
        if (index === defaultPeriodIndex) {
            button.classList.add('active');
            currentNcrPeriod = period;
            updateNcrSelectedPeriodUI(period);
        } else if (currentNcrPeriod && currentNcrPeriod.displayText === period.displayText) {
            button.classList.add('active');
        }
        
        button.addEventListener('click', () => {
            // Update current period
            currentNcrPeriod = period;
            
            // Update UI tombol
            document.querySelectorAll('#ncrPeriodDisplay .period-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            // Update selected period UI
            updateNcrSelectedPeriodUI(period);
            
            // Analisis untuk periode ini
            analyzeNcrPeriod(period);
        });
        
        periodDisplay.appendChild(button);
    });
    
    // Analisis untuk periode default
    if (currentNcrPeriod) {
        analyzeNcrPeriod(currentNcrPeriod);
    }
}

function updateNcrSelectedPeriodUI(period) {
    const selectedDiv = document.getElementById('ncrPeriodSelected');
    const selectedText = document.getElementById('ncrSelectedPeriodText');
    
    if (selectedDiv && selectedText) {
        selectedDiv.classList.remove('hidden');
        selectedText.textContent = period.displayText;
    }
}

function analyzeNcrPeriod(period) {
    const logTextRaw = document.getElementById('ncrLogInput').value;
    const logText = cleanAnsiCodes(logTextRaw);
    const logLines = logText.split('\n');

    const atmID = findNcrATM_ID(logText);
    displayNcrATM_ID(atmID);

    // Parse add cash dari periode yang dipilih
    let totalAddCashAwal = 0;
    if (period) {
        totalAddCashAwal = parseNcrCashAddedNew(logLines, period.startIndex);
    }

    // CEK INPUT MANUAL ADD CASH
    const manualAddCash = parseInt(document.getElementById('ncrAddCashManual').value);
    if (!isNaN(manualAddCash) && manualAddCash > 0) {
        totalAddCashAwal = manualAddCash;
    }

    displayNcrTotalAddCash(totalAddCashAwal.toLocaleString('id-ID'));

    // Tentukan rentang baris untuk analisis dispense berdasarkan periode
    let startLineDispense = period ? period.startIndex + 1 : 0;
    let endLineDispense = period ? period.endIndex - 1 : logLines.length - 1;

    const cashLists = { 'ncrCash1': [], 'ncrCash2': [], 'ncrCash3': [], 'ncrCash4': [] };

    for (let i = startLineDispense; i <= endLineDispense; i++) {
        const match = logLines[i].match(/NOTES PRESENTED\s+(\d+),(\d+),(\d+),(\d+)/);
        if (match) {
            const [, disp1, disp2, disp3, disp4] = match;
            // Filter: hanya tambahkan jika nilainya > 0
            if (parseInt(disp1) > 0) cashLists['ncrCash1'].push(parseInt(disp1));
            if (parseInt(disp2) > 0) cashLists['ncrCash2'].push(parseInt(disp2));
            if (parseInt(disp3) > 0) cashLists['ncrCash3'].push(parseInt(disp3));
            if (parseInt(disp4) > 0) cashLists['ncrCash4'].push(parseInt(disp4));
        }
    }

    // Tampilkan hasil dispense (dengan filter untuk nilai 0)
    for (const [cashType, list] of Object.entries(cashLists)) {
        displayNcrResult(list, cashType);
    }

    const totalAmount = Object.values(cashLists).flat().reduce((acc, val) => acc + val, 0);
    document.getElementById('ncrTotalAmount').textContent = `${totalAmount.toLocaleString('id-ID')}`;

    const totalRemaining = calculateTotalRemaining(totalAddCashAwal, totalAmount);
    displayNcrTotalRemaining(totalRemaining.toLocaleString('id-ID'));

    const physInput = document.getElementById('ncrPhysInput');
    if (physInput.value !== "") {
        const physVal = parseInt(physInput.value) || 0;
        document.getElementById('ncrDisplayPhys').textContent = physVal.toLocaleString('id-ID');
        updateReconciliationUI(physVal, totalRemaining, "ncrReconBox", "ncrReconResult", "ncrExpression");
    }
}

function filterNcr() {
    const logTextRaw = document.getElementById('ncrLogInput').value;
    const logText = cleanAnsiCodes(logTextRaw);
    const logLines = logText.split('\n');

    // Cari periode DENGAN FILTER DISPENSE
    ncrPeriods = findNcrPeriods(logLines);

    // Tampilkan periode di UI (akan otomatis menganalisis periode default)
    displayNcrPeriods();
}

// --- FUNGSI PERIODE UNTUK WINCOR DENGAN FILTER DISPENSE ---
function findWincorPeriods(logLines) {
    const validPeriods = [];
    const validCashCounterIndices = [];

    // 1. Cari SEMUA baris "CASH COUNTERS AFTER SOP"
    for (let i = 0; i < logLines.length; i++) {
        if (logLines[i].includes('CASH COUNTERS AFTER SOP')) {
            // 2. VALIDASI: Periksa apakah add cash-nya valid
            const totalAddCash = parseWincorAddCashNewValidated(logLines, i);
            
            // 3. HANYA tambahkan jika VALID (2000, 4000, 6000, atau 8000)
            if (totalAddCash > 0) {
                validCashCounterIndices.push({ 
                    index: i, 
                    addCashValue: totalAddCash 
                });
            }
        }
    }

    // 4. Buat periode dari indeks VALID yang berurutan
    if (validCashCounterIndices.length >= 2) {
        for (let i = 0; i < validCashCounterIndices.length - 1; i++) {
            const startIdx = validCashCounterIndices[i].index;
            const endIdx = validCashCounterIndices[i + 1].index;
            
            // === TAMBAHAN: FILTER BERDASARKAN DISPENSE ===
            // Cek apakah ada transaksi dispense ("CASH\s+(\d+):") dalam periode ini
            let hasDispense = false;
            for (let j = startIdx + 1; j < endIdx; j++) {
                if (logLines[j].match(/CASH\s+(\d+):(\d+),(\d+);/)) {
                    hasDispense = true;
                    break;
                }
            }
            
            // Hanya tambahkan periode jika ADA transaksi dispense
            if (hasDispense) {
                // Cari tanggal dalam rentang ini
                const dates = findWincorDatesInRange(logLines, startIdx, endIdx);
                
                if (dates.length > 0) {
                    // Konversi format tanggal ke dd/mm/yy
                    const formattedDates = dates.map(date => {
                        const [day, month, year] = date.split('/');
                        return `${day}/${month}/${year.slice(-2)}`;
                    });
                    
                    validPeriods.push({
                        startIndex: startIdx,
                        endIndex: endIdx,
                        startDate: formattedDates[0],
                        endDate: formattedDates[formattedDates.length - 1],
                        displayText: `${formattedDates[0]} - ${formattedDates[formattedDates.length - 1]}`,
                        addCashValue: validCashCounterIndices[i].addCashValue
                    });
                }
            }
        }
        
        // Tambahkan periode terakhir (dari CASH COUNTERS terakhir sampai akhir log)
        if (validCashCounterIndices.length > 0) {
            const lastIdx = validCashCounterIndices[validCashCounterIndices.length - 1].index;
            
            // === TAMBAHAN: FILTER BERDASARKAN DISPENSE ===
            let hasDispense = false;
            for (let j = lastIdx + 1; j < logLines.length; j++) {
                if (logLines[j].match(/CASH\s+(\d+):(\d+),(\d+);/)) {
                    hasDispense = true;
                    break;
                }
            }
            
            // Hanya tambahkan periode jika ADA transaksi dispense
            if (hasDispense) {
                const dates = findWincorDatesInRange(logLines, lastIdx, logLines.length - 1);
                if (dates.length > 0) {
                    // Konversi format tanggal ke dd/mm/yy
                    const formattedDates = dates.map(date => {
                        const [day, month, year] = date.split('/');
                        return `${day}/${month}/${year.slice(-2)}`;
                    });
                    
                    validPeriods.push({
                        startIndex: lastIdx,
                        endIndex: logLines.length,
                        startDate: formattedDates[0],
                        endDate: formattedDates[formattedDates.length - 1],
                        displayText: `${formattedDates[0]} - ${formattedDates[formattedDates.length - 1]}`,
                        addCashValue: validCashCounterIndices[validCashCounterIndices.length - 1].addCashValue
                    });
                }
            }
        }
    } else if (validCashCounterIndices.length === 1) {
        // Hanya ada 1 periode valid
        const startIdx = validCashCounterIndices[0].index;
        
        // === TAMBAHAN: FILTER BERDASARKAN DISPENSE ===
        let hasDispense = false;
        for (let j = startIdx + 1; j < logLines.length; j++) {
            if (logLines[j].match(/CASH\s+(\d+):(\d+),(\d+);/)) {
                hasDispense = true;
                break;
            }
        }
        
        // Hanya tambahkan periode jika ADA transaksi dispense
        if (hasDispense) {
            const dates = findWincorDatesInRange(logLines, startIdx, logLines.length - 1);
            if (dates.length > 0) {
                // Konversi format tanggal ke dd/mm/yy
                const formattedDates = dates.map(date => {
                    const [day, month, year] = date.split('/');
                    return `${day}/${month}/${year.slice(-2)}`;
                });
                
                validPeriods.push({
                    startIndex: startIdx,
                    endIndex: logLines.length,
                    startDate: formattedDates[0],
                    endDate: formattedDates[formattedDates.length - 1],
                    displayText: `${formattedDates[0]} - ${formattedDates[formattedDates.length - 1]}`,
                    addCashValue: validCashCounterIndices[0].addCashValue
                });
            }
        }
    }

    return validPeriods;
}

// Fungsi untuk normalisasi tanggal Wincor (2-digit year → 4-digit)
function normalizeWincorDate(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) {
            year = '20' + year;
        }
        return `${parts[0]}/${parts[1]}/${year}`;
    }
    return dateStr;
}

// Fungsi untuk mencari tanggal setelah "CASH PRESENTED"
function findDateAfterCashPresented(lines, startIndex) {
    for (let i = startIndex + 1; i <= startIndex + 5 && i < lines.length; i++) {
        const match = lines[i].match(/TANGGAL:\s*(\d{2}\/\d{2}\/\d{2})/);
        if (match) {
            const normalizedDate = normalizeWincorDate(match[1]);
            // Konversi ke dd/mm/yy
            const [day, month, year] = normalizedDate.split('/');
            return `${day}/${month}/${year.slice(-2)}`;
        }
    }
    return null;
}

// Fungsi untuk mencari tanggal dalam rentang tertentu
function findWincorDatesInRange(lines, startIdx, endIdx) {
    const dates = [];
    for (let i = startIdx; i <= endIdx && i < lines.length; i++) {
        if (lines[i].includes('CASH PRESENTED')) {
            const date = findDateAfterCashPresented(lines, i);
            if (date) {
                dates.push(date);
            }
        }
    }
    return dates;
}

// Fungsi untuk menampilkan periode Wincor di UI
function displayWincorPeriods() {
    const periodDisplay = document.getElementById('wincorPeriodDisplay');
    if (!periodDisplay) return;
    
    periodDisplay.innerHTML = '';
    periodDisplay.classList.remove('hidden');
    
    if (wincorPeriods.length === 0) {
        periodDisplay.innerHTML = '<span class="period-label"><span class="badge">PERIODE</span> Tidak ditemukan periode VALID dengan transaksi dispense</span>';
        return;
    }
    
    // Tentukan periode default
    let defaultPeriodIndex = wincorPeriods.length - 1;
    if (wincorPeriods.length > 1) {
        const lastPeriod = wincorPeriods[wincorPeriods.length - 1];
        // Jika periode terakhir adalah "sekarang" (tidak dibatasi oleh add cash)
        if (lastPeriod.displayText.includes('Sekarang') || !lastPeriod.endDate) {
            // Cari periode terakhir yang memiliki endDate (periode yang sudah selesai)
            for (let i = wincorPeriods.length - 2; i >= 0; i--) {
                if (wincorPeriods[i].endDate) {
                    defaultPeriodIndex = i;
                    break;
                }
            }
        } else {
            defaultPeriodIndex = wincorPeriods.length - 1;
        }
    }
    
    // Buat tombol untuk setiap periode VALID
    wincorPeriods.forEach((period, index) => {
        const button = document.createElement('button');
        button.textContent = period.displayText;
        button.className = 'period-btn wincor';
        
        // Jika ini periode default, set sebagai active
        if (index === defaultPeriodIndex) {
            button.classList.add('active');
            currentWincorPeriod = period;
            updateWincorSelectedPeriodUI(period);
        } else if (currentWincorPeriod && currentWincorPeriod.displayText === period.displayText) {
            button.classList.add('active');
        }
        
        button.addEventListener('click', () => {
            // Update current period
            currentWincorPeriod = period;
            
            // Update UI tombol
            document.querySelectorAll('#wincorPeriodDisplay .period-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            // Update selected period UI
            updateWincorSelectedPeriodUI(period);
            
            // Analisis untuk periode ini
            analyzeWincorPeriod(period);
        });
        
        periodDisplay.appendChild(button);
    });
    
    // Analisis untuk periode default
    if (currentWincorPeriod) {
        analyzeWincorPeriod(currentWincorPeriod);
    }
}

// Fungsi untuk update UI periode terpilih
function updateWincorSelectedPeriodUI(period) {
    const selectedDiv = document.getElementById('wincorPeriodSelected');
    const selectedText = document.getElementById('wincorSelectedPeriodText');
    
    if (selectedDiv && selectedText) {
        selectedDiv.classList.remove('hidden');
        selectedText.textContent = period.displayText;
    }
}

// Fungsi untuk menganalisis periode Wincor tertentu
function analyzeWincorPeriod(period) {
    const logTextRaw = document.getElementById('wincorLogInput').value;
    const logText = cleanAnsiCodes(logTextRaw);
    const logLines = logText.split('\n');

    const atmID = findATM_ID(logText);
    displayWincorATM_ID(atmID);

    // Gunakan nilai add cash dari periode yang VALID
    let totalAddCashAwal = 0;
    if (period && period.addCashValue) {
        totalAddCashAwal = period.addCashValue;
    }

    // CEK INPUT MANUAL ADD CASH
    const manualAddCash = parseInt(document.getElementById('wincorAddCashManual').value);
    if (!isNaN(manualAddCash) && manualAddCash > 0) {
        totalAddCashAwal = manualAddCash;
    }

    displayWincorTotalAddCash(totalAddCashAwal.toLocaleString('id-ID'));

    // Tentukan rentang baris untuk analisis dispense berdasarkan periode
    let startLineDispense = period ? period.startIndex + 1 : 0;
    let endLineDispense = period ? period.endIndex - 1 : logLines.length - 1;

    const cashLists = { 'wincorCash1': [], 'wincorCash2': [], 'wincorCash3': [], 'wincorCash4': [] };

    for (let i = startLineDispense; i <= endLineDispense; i++) {
        const match = logLines[i].match(/CASH\s+(\d+):(\d+),(\d+);/);
        if (match) {
            const [, cassetteNum, code, amount] = match;
            const cassNum = parseInt(cassetteNum);
            const dispAmount = parseInt(amount);
            // Filter: hanya tambahkan jika nilainya > 0
            if (!isNaN(cassNum) && !isNaN(dispAmount) && cassNum >= 1 && cassNum <= 4 && dispAmount > 0) {
                cashLists[`wincorCash${cassNum}`].push(dispAmount);
            }
        }
    }

    // Tampilkan hasil dispense (dengan filter untuk nilai 0)
    for (const [cashType, list] of Object.entries(cashLists)) {
        displayWincorResult(list, cashType);
    }

    const totalAmount = Object.values(cashLists).flat().reduce((acc, val) => acc + val, 0);
    document.getElementById('wincorTotalAmount').textContent = `${totalAmount.toLocaleString('id-ID')}`;

    const totalRemaining = calculateTotalRemaining(totalAddCashAwal, totalAmount);
    displayWincorTotalRemaining(totalRemaining.toLocaleString('id-ID'));

    const physInput = document.getElementById('wincorPhysInput');
    if (physInput.value !== "") {
        const physVal = parseInt(physInput.value) || 0;
        document.getElementById('wincorDisplayPhys').textContent = physVal.toLocaleString('id-ID');
        updateReconciliationUI(physVal, totalRemaining, "wincorReconBox", "wincorReconResult", "wincorExpression");
    }
}

// Fungsi utama untuk filter Wincor
function filterWincor() {
    const logTextRaw = document.getElementById('wincorLogInput').value;
    const logText = cleanAnsiCodes(logTextRaw);
    const logLines = logText.split('\n');

    // Cari periode VALID (dengan validasi add cash) DENGAN FILTER DISPENSE
    wincorPeriods = findWincorPeriods(logLines);

    // Tampilkan periode VALID di UI (akan otomatis menganalisis periode default)
    displayWincorPeriods();
}

// --- FUNGSI EXISTING UNTUK WINCOR ---
function parseWincorAddCashNewValidated(logLines, startIndex) {
    let totalAddCash = 0;
    if (startIndex >= logLines.length) return 0;
    if (!logLines[startIndex].includes('CASH COUNTERS AFTER SOP')) return 0;
    for (let i = startIndex + 1; i < logLines.length; i++) {
        const line = logLines[i].trim();
        if (line === '' || /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}/.test(line)) break;
        const matchIDR = line.match(/IDR\s+\d+\s+(\d+)/);
        const matchRetracts = line.match(/RETRACTS:\s+(\d+)/);
        const matchRejects = line.match(/REJECTS:\s+(\d+)/);
        if (matchIDR) totalAddCash += parseInt(matchIDR[1]);
        if (matchRetracts) totalAddCash += parseInt(matchRetracts[1]);
        if (matchRejects) totalAddCash += parseInt(matchRejects[1]);
    }
    if (totalAddCash === 2000 || totalAddCash === 4000 || totalAddCash === 6000 || totalAddCash === 8000) return totalAddCash;
    else return 0;
}

function displayWincorATM_ID(atmID) { document.getElementById('wincorAtmId').textContent = `${atmID}`; }
function displayWincorTotalAddCash(totalAddCash) { document.getElementById('wincorTotalAddCash').textContent = `${totalAddCash}`; }
function displayWincorTotalRemaining(totalRemaining) { document.getElementById('wincorTotalRemaining').textContent = `${totalRemaining}`; }

// UPGRADED: Fungsi display dengan filter untuk nilai 0
function displayWincorResult(list, id) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    
    // Filter: hanya tampilkan nilai > 0
    const filteredList = list.filter(item => item > 0);
    
    let totalAmount = 0;
    filteredList.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.toLocaleString('id-ID');
        li.classList.add('py-1', 'border-b', 'border-slate-700/50');
        ul.appendChild(li);
        totalAmount += item;
    });
    
    // Hanya tampilkan total jika ada data
    if (filteredList.length > 0) {
        const totalLi = document.createElement('li');
        totalLi.textContent = `Total: ${totalAmount.toLocaleString('id-ID')}`;
        totalLi.style.fontWeight = 'bold';
        totalLi.classList.add('text-accent', 'border-b', 'border-slate-700', 'pb-2', 'mb-2', 'pt-2');
        ul.insertBefore(totalLi, ul.firstChild);
    }
}

function calculateTotalRemaining(totalAddCash, totalAmount) { return totalAddCash - totalAmount; }
function findATM_ID(logText) {
    const match = logText.match(/ATM ID\s*:\s*(\d+)/);
    return match ? match[1] : "Not Found";
}

// --- FUNGSI EXISTING UNTUK HYOSUNG ---
function parseHyosungAddCashNew(logLines, startIndex) {
    let totalAddCash = 0;
    if (startIndex >= logLines.length) return 0;
    if (!logLines[startIndex].includes('ADD CASH:')) return 0;
    let cstValues = [0, 0, 0, 0]; 
    for (let i = 1; i <= 4; i++) {
        const lineIndex = startIndex + i; 
        if (lineIndex >= logLines.length) break;
        const line = logLines[lineIndex].trim(); 
        const match = line.match(/^(\d+)CST:\s*(\d+)$/); 
        if (!match) break;
        const [, cassetteNumStr, amountStr] = match;
        const cassetteNum = parseInt(cassetteNumStr);
        const amount = parseInt(amountStr);
        if (cassetteNum < 1 || cassetteNum > 4) return 0;
        if (amount !== 2000 && amount !== 0) return 0;
        cstValues[cassetteNum - 1] = amount; 
    }
    totalAddCash = cstValues.reduce((sum, val) => sum + val, 0);
    return totalAddCash;
}

// UPGRADED: Fungsi display dengan filter untuk nilai 0
function displayHyosungResult(list, id) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    
    // Filter: hanya tampilkan nilai > 0
    const filteredList = list.filter(item => item > 0);
    
    let totalAmount = 0;
    filteredList.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.toLocaleString('id-ID');
        li.classList.add('py-1', 'border-b', 'border-slate-700/50');
        ul.appendChild(li);
        totalAmount += item;
    });
    
    // Hanya tampilkan total jika ada data
    if (filteredList.length > 0) {
        const totalLi = document.createElement('li');
        totalLi.textContent = `Total: ${totalAmount.toLocaleString('id-ID')}`;
        totalLi.style.fontWeight = 'bold';
        totalLi.classList.add('text-accent', 'border-b', 'border-slate-700', 'pb-2', 'mb-2', 'pt-2');
        ul.insertBefore(totalLi, ul.firstChild);
    }
}

function findHyosungATM_ID(logText) {
    const match = logText.match(/Terminal Id\s*:\s*(\d+)/);
    return match ? match[1] : "Not Found";
}

function displayHyosungATM_ID(atmID) { document.getElementById('hyosungAtmId').textContent = `${atmID}`; }
function displayHyosungTotalAddCash(totalAddCash) { document.getElementById('hyosungTotalAddCash').textContent = `${totalAddCash}`; }
function displayHyosungTotalRemaining(totalRemaining) { document.getElementById('hyosungTotalRemaining').textContent = `${totalRemaining}`; }

// --- FUNGSI EXISTING UNTUK NCR ---
function parseNcrCashAddedNew(logLines, startIndex) {
    let totalAddCash = 0;
    if (startIndex >= logLines.length) return 0;
    if (!logLines[startIndex].includes('CASH ADDED')) return 0;
    let typeValues = [0, 0, 0, 0]; 
    for (let i = 1; i <= 3; i++) { 
        const lineIndex = startIndex + i; 
        if (lineIndex >= logLines.length) break;
        let line = logLines[lineIndex].trim(); 
        line = cleanAnsiCodes(line);
        const matches = [...line.matchAll(/TYPE\s+(\d+)\s*=\s*(\d+)/g)];
        if (matches.length === 0) break;
        for (const match of matches) {
            const [, typeNumStr, amountStr] = match;
            const typeNum = parseInt(typeNumStr);
            const amount = parseInt(amountStr);
            if (typeNum < 1 || typeNum > 4) return 0;
            typeValues[typeNum - 1] = amount; 
        }
    }
    totalAddCash = typeValues.reduce((sum, val) => sum + val, 0);
    
    if (totalAddCash === 2000 || totalAddCash === 4000 || totalAddCash === 6000 || totalAddCash === 8000) {
        return totalAddCash;
    } else {
        return 0;
    }
}

// UPGRADED: Fungsi display dengan filter untuk nilai 0
function displayNcrResult(list, id) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    
    // Filter: hanya tampilkan nilai > 0
    const filteredList = list.filter(item => item > 0);
    
    let totalAmount = 0;
    filteredList.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.toLocaleString('id-ID');
        li.classList.add('py-1', 'border-b', 'border-slate-700/50');
        ul.appendChild(li);
        totalAmount += item;
    });
    
    // Hanya tampilkan total jika ada data
    if (filteredList.length > 0) {
        const totalLi = document.createElement('li');
        totalLi.textContent = `Total: ${totalAmount.toLocaleString('id-ID')}`;
        totalLi.style.fontWeight = 'bold';
        totalLi.classList.add('text-accent', 'border-b', 'border-slate-700', 'pb-2', 'mb-2', 'pt-2');
        ul.insertBefore(totalLi, ul.firstChild);
    }
}

function findNcrATM_ID(logText) {
    const match = logText.match(/MACHINE NO:\s*(\d+)/);
    return match ? match[1] : "Not Found";
}

function displayNcrATM_ID(atmID) { document.getElementById('ncrAtmId').textContent = `${atmID}`; }
function displayNcrTotalAddCash(totalAddCash) { document.getElementById('ncrTotalAddCash').textContent = `${totalAddCash}`; }
function displayNcrTotalRemaining(totalRemaining) { document.getElementById('ncrTotalRemaining').textContent = `${totalRemaining}`; }

// --- JALIN SPECIFIC LOGIC DENGAN FILTER DISPENSE ---

// Fungsi untuk mencari TID (Terminal ID)
function findJalinTID(logText) {
    const match = logText.match(/TID=(\w+)/);
    return match ? match[1] : "Not Found";
}

// Fungsi untuk mencari periode analisis Jalin DENGAN FILTER DISPENSE
function findJalinAddCashPeriods(logLines) {
    const periods = [];
    const printLines = [];
    
    // Cari semua baris yang mengandung "Printing 'PRT_SHOW_CASSETTES.xml'"
    for (let i = 0; i < logLines.length; i++) {
        if (logLines[i].includes("Printing 'PRT_SHOW_CASSETTES.xml'")) {
            // Ambil tanggal dari kolom ke-5 (indeks 4) setelah split dengan '|'
            const parts = logLines[i].split('|');
            if (parts.length >= 5) {
                const dateTime = parts[4].trim();
                // dateTime format: "2025-08-22 13:13:38"
                const datePart = dateTime.split(' ')[0];
                // Ubah format dari "2025-08-22" menjadi "22/08/25" (dd/mm/yy)
                const [year, month, day] = datePart.split('-');
                const formattedDate = `${day}/${month}/${year.slice(-2)}`;
                printLines.push({ index: i, date: formattedDate });
            }
        }
    }
    
    // Buat periode dari setiap dua baris berurutan
    for (let i = 0; i < printLines.length - 1; i++) {
        const startIdx = printLines[i].index;
        const endIdx = printLines[i + 1].index;
        
        // === TAMBAHAN: FILTER BERDASARKAN DISPENSE ===
        // Cek apakah ada transaksi dispense ("DISPENSED:") dalam periode ini
        let hasDispense = false;
        for (let j = startIdx + 1; j < endIdx; j++) {
            if (logLines[j].includes('DISPENSED:')) {
                hasDispense = true;
                break;
            }
        }
        
        // Hanya tambahkan periode jika ADA transaksi dispense
        if (hasDispense) {
            periods.push({
                startIndex: printLines[i].index,
                endIndex: printLines[i + 1].index,
                startDate: printLines[i].date,
                endDate: printLines[i + 1].date,
                displayText: `${printLines[i].date} - ${printLines[i + 1].date}`
            });
        }
    }
    
    return periods;
}

// Fungsi untuk menampilkan periode Jalin di UI
function displayJalinPeriods() {
    const periodDisplay = document.getElementById('jalinPeriodDisplay');
    if (!periodDisplay) return;
    
    periodDisplay.innerHTML = '';
    periodDisplay.classList.remove('hidden');
    
    if (jalinPeriods.length === 0) {
        periodDisplay.innerHTML = '<span class="period-label"><span class="badge">PERIODE</span> Tidak ditemukan periode dengan transaksi dispense</span>';
        return;
    }
    
    // Tentukan periode default
    let defaultPeriodIndex = jalinPeriods.length - 1;
    if (jalinPeriods.length > 1) {
        const lastPeriod = jalinPeriods[jalinPeriods.length - 1];
        // Jika periode terakhir adalah "sekarang" (tidak dibatasi oleh add cash)
        if (lastPeriod.displayText.includes('Sekarang') || !lastPeriod.endDate) {
            // Cari periode terakhir yang memiliki endDate (periode yang sudah selesai)
            for (let i = jalinPeriods.length - 2; i >= 0; i--) {
                if (jalinPeriods[i].endDate) {
                    defaultPeriodIndex = i;
                    break;
                }
            }
        } else {
            defaultPeriodIndex = jalinPeriods.length - 1;
        }
    }
    
    // Buat tombol untuk setiap periode
    jalinPeriods.forEach((period, index) => {
        const button = document.createElement('button');
        button.textContent = period.displayText;
        button.className = 'period-btn jalin';
        
        // Jika ini periode default, set sebagai active
        if (index === defaultPeriodIndex) {
            button.classList.add('active');
            currentJalinPeriod = period;
            updateJalinSelectedPeriodUI(period);
        } else if (currentJalinPeriod && currentJalinPeriod.displayText === period.displayText) {
            button.classList.add('active');
        }
        
        button.addEventListener('click', () => {
            // Update current period
            currentJalinPeriod = period;
            
            // Update UI tombol
            document.querySelectorAll('#jalinPeriodDisplay .period-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            // Update selected period UI
            updateJalinSelectedPeriodUI(period);
            
            // Analisis untuk periode ini
            analyzeJalinPeriod(period);
        });
        
        periodDisplay.appendChild(button);
    });
    
    // Analisis untuk periode default
    if (currentJalinPeriod) {
        analyzeJalinPeriod(currentJalinPeriod);
    }
}

function updateJalinSelectedPeriodUI(period) {
    const selectedDiv = document.getElementById('jalinPeriodSelected');
    const selectedText = document.getElementById('jalinSelectedPeriodText');
    
    if (selectedDiv && selectedText) {
        selectedDiv.classList.remove('hidden');
        selectedText.textContent = period.displayText;
    }
}

// Fungsi untuk parsing nilai add cash dari periode yang ditemukan
function parseJalinAddCash(logLines, periodIndex) {
    let totalAddCash = 0;
    let foundValid = false;
    
    // Cari baris CU2_TOTAL, CU3_TOTAL, CU4_TOTAL, CU5_TOTAL dalam 52 baris ke bawah
    for (let i = periodIndex + 1; i < logLines.length && i <= periodIndex + 52; i++) {
        const line = logLines[i].trim();
        
        // Cari CU2_TOTAL
        const cu2Match = line.match(/CU2_TOTAL=(\d+)/);
        if (cu2Match) {
            const value = parseInt(cu2Match[1]);
            if (value > 0) totalAddCash += value;
        }
        
        // Cari CU3_TOTAL
        const cu3Match = line.match(/CU3_TOTAL=(\d+)/);
        if (cu3Match) {
            const value = parseInt(cu3Match[1]);
            if (value > 0) totalAddCash += value;
        }
        
        // Cari CU4_TOTAL
        const cu4Match = line.match(/CU4_TOTAL=(\d+)/);
        if (cu4Match) {
            const value = parseInt(cu4Match[1]);
            if (value > 0) totalAddCash += value;
        }
        
        // Cari CU5_TOTAL
        const cu5Match = line.match(/CU5_TOTAL=(\d+)/);
        if (cu5Match) {
            const value = parseInt(cu5Match[1]);
            if (value > 0) totalAddCash += value;
        }
    }
    
    // Validasi: total harus 2000, 4000, 6000, atau 8000
    if ([2000, 4000, 6000, 8000].includes(totalAddCash)) {
        foundValid = true;
    } else {
        totalAddCash = 0; // Reset jika tidak valid
    }
    
    return { totalAddCash, foundValid };
}

// Fungsi untuk mencari dan memproses data dispense Jalin
function findJalinDispenseData(logLines, startIndex, endIndex) {
    const cashLists = { 
        'jalinCash1': [], 
        'jalinCash2': [], 
        'jalinCash3': [], 
        'jalinCash4': [] 
    };
    
    for (let i = startIndex; i <= endIndex; i++) {
        const line = logLines[i];
        
        // Cari baris "DISPENSED:"
        if (line.includes('DISPENSED:')) {
            const dispensePattern = /DISPENSED:\s*\d+\s*x\s*[\d.,]+\s*,?\s*(\d+)\s*x\s*[\d.,]+\s*IDR,?\s*(\d+)\s*x\s*[\d.,]+\s*IDR,?\s*(\d+)\s*x\s*[\d.,]+\s*IDR,?\s*(\d+)\s*x\s*[\d.,]+\s*IDR/;
            const match = line.match(dispensePattern);
            
            if (match) {
                const disp1 = parseInt(match[1]);
                const disp2 = parseInt(match[2]);
                const disp3 = parseInt(match[3]);
                const disp4 = parseInt(match[4]);
                
                // Filter: hanya tambahkan jika nilainya > 0
                if (disp1 > 0) cashLists['jalinCash1'].push(disp1);
                if (disp2 > 0) cashLists['jalinCash2'].push(disp2);
                if (disp3 > 0) cashLists['jalinCash3'].push(disp3);
                if (disp4 > 0) cashLists['jalinCash4'].push(disp4);
            } else {
                // Alternatif parsing
                const parts = line.split('DISPENSED:')[1].split(',');
                if (parts.length >= 5) {
                    for (let j = 1; j <= 4; j++) {
                        const part = parts[j].trim();
                        const amountMatch = part.match(/(\d+)\s*x\s*[\d.,]+\s*IDR/);
                        if (amountMatch) {
                            const amount = parseInt(amountMatch[1]);
                            // Filter: hanya tambahkan jika nilainya > 0
                            if (amount > 0) {
                                cashLists[`jalinCash${j}`].push(amount);
                            }
                        }
                    }
                }
            }
        }
    }
    
    return cashLists;
}

// UPGRADED: Fungsi untuk menampilkan hasil dispense Jalin ke UI (dengan filter nilai 0)
function displayJalinResult(list, id) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    
    // Filter: hanya tampilkan nilai > 0
    const filteredList = list.filter(item => item > 0);
    
    let totalAmount = 0;
    filteredList.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.toLocaleString('id-ID');
        li.classList.add('py-1', 'border-b', 'border-slate-700/50');
        ul.appendChild(li);
        totalAmount += item;
    });
    
    // Hanya tampilkan total jika ada data
    if (filteredList.length > 0) {
        const totalLi = document.createElement('li');
        totalLi.textContent = `Total: ${totalAmount.toLocaleString('id-ID')}`;
        totalLi.style.fontWeight = 'bold';
        totalLi.classList.add('text-jalinAccent', 'border-b', 'border-slate-700', 'pb-2', 'mb-2', 'pt-2');
        ul.insertBefore(totalLi, ul.firstChild);
    }
}

// Fungsi untuk menganalisis periode Jalin tertentu
function analyzeJalinPeriod(period) {
    const logTextRaw = document.getElementById('jalinLogInput').value;
    const logText = cleanAnsiCodes(logTextRaw);
    const logLines = logText.split('\n');
    
    if (!logText || logText.length < 50) {
        alert('Log kosong atau terlalu pendek. Harap upload log terlebih dahulu.');
        return;
    }
    
    // Cari TID
    const tid = findJalinTID(logText);
    document.getElementById('jalinTid').textContent = tid;
    
    // Tentukan indeks periode
    let startLineDispense = period ? period.startIndex + 1 : 0;
    let endLineDispense = period ? period.endIndex - 1 : logLines.length - 1;
    
    // Cari nilai add cash untuk periode ini
    let totalAddCashAwal = 0;
    if (period) {
        const addCashResult = parseJalinAddCash(logLines, period.startIndex);
        if (addCashResult.foundValid) {
            totalAddCashAwal = addCashResult.totalAddCash;
        }
    }
    
    // CEK INPUT MANUAL ADD CASH
    const manualAddCash = parseInt(document.getElementById('jalinAddCashManual').value);
    if (!isNaN(manualAddCash) && manualAddCash > 0) {
        totalAddCashAwal = manualAddCash;
    }
    
    document.getElementById('jalinTotalAddCash').textContent = totalAddCashAwal.toLocaleString('id-ID');
    
    // Ekstrak data dispense untuk periode ini
    const cashLists = findJalinDispenseData(logLines, startLineDispense, endLineDispense);
    
    // Tampilkan hasil dispense (dengan filter untuk nilai 0)
    for (const [cashType, list] of Object.entries(cashLists)) {
        displayJalinResult(list, cashType);
    }
    
    // Hitung total dispense
    const totalAmount = Object.values(cashLists).flat().reduce((acc, val) => acc + val, 0);
    document.getElementById('jalinTotalAmount').textContent = totalAmount.toLocaleString('id-ID');
    
    // Hitung total remaining
    const totalRemaining = totalAddCashAwal - totalAmount;
    document.getElementById('jalinTotalRemaining').textContent = totalRemaining.toLocaleString('id-ID');
    
    // Tampilkan hasil rekonsiliasi
    const physInput = document.getElementById('jalinPhysInput');
    if (physInput.value !== "") {
        const physVal = parseInt(physInput.value) || 0;
        document.getElementById('jalinDisplayPhys').textContent = physVal.toLocaleString('id-ID');
        updateReconciliationUI(physVal, totalRemaining, "jalinReconBox", "jalinReconResult", "jalinExpression");
    }
}

// Fungsi utama untuk memfilter data Jalin
function filterJalin() {
    const logTextRaw = document.getElementById('jalinLogInput').value;
    const logText = cleanAnsiCodes(logTextRaw);
    const logLines = logText.split('\n');
    
    if (!logText || logText.length < 50) {
        alert('Log kosong atau terlalu pendek. Harap upload log terlebih dahulu.');
        return;
    }
    
    // Cari TID
    const tid = findJalinTID(logText);
    document.getElementById('jalinTid').textContent = tid;
    
    // Cari periode analisis DENGAN FILTER DISPENSE
    jalinPeriods = findJalinAddCashPeriods(logLines);
    
    // Tampilkan periode di UI (akan otomatis menganalisis periode default)
    displayJalinPeriods();
}