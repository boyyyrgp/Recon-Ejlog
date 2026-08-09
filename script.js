// Global variables to store period data
// FIX (redesign visual - Tactical Alert HUD): default Chart.js app-wide supaya SEMUA
// chart otomatis pakai font monospace (bukan Orbitron) utk label sumbu/angka sesuai
// §4.1 spesifikasi desain - murni visual, tidak menyentuh kalkulasi/data chart apapun.
if (typeof Chart !== 'undefined' && Chart.defaults) {
    if (Chart.defaults.font) Chart.defaults.font.family = "'Share Tech Mono', monospace";
    Chart.defaults.color = '#8B92A0';
    Chart.defaults.borderColor = 'rgba(38, 43, 51, 0.6)';
}
let dataFilterCRMHitachi;
let dataFilterCRMDinabold;
let dataFilterCRMOky;
let dataFilterCRMHyosung;
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
    dataFilterCRMDinabold = new DataFilterCRMDinabold();
    dataFilterCRMOky = new DataFilterCRMOky();
    dataFilterCRMHyosung = new DataFilterCRMHyosung();

    // POIN 2: tambahkan tombol SUMMARY ke 8 halaman (murni DOM injection, additive)
    injectSummaryButtons();
    
    // Setup untuk semua mesin
    ['crm', 'wincor', 'hyosung', 'ncr', 'jalin', 'dn', 'oky', 'crmHyosung'].forEach(machine => {
        setupDragAndDrop(`dropzone-${machine}`, `file-${machine}`, `${machine}LogInput`, machine);
        
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
    if (typeof str !== 'string') return '';
    const cleaned = str
        .replace(/\uFEFF/g, '')
        .replace(/\u0000/g, '')
        .replace(/\r\n?/g, '\n')
        .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
        .replace(/\u009B[0-?]*[ -/]*[@-~]/g, '')
        .replace(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g, '')
        .replace(/\u001B[PX^_][\s\S]*?\u001B\\/g, '')
        .replace(/\u001B[()#][0-2AB1I]/g, '')
        // Fallback untuk log yang kehilangan byte ESC, menyisakan token seperti [05p, [020t, [1q, [31m
        .replace(/\[\??\d{1,4}(?:;\d{1,4})*[ -/]*[@-~]/g, '')
        .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
        .replace(/\u00A0/g, ' ');
    return cleaned;
}

function normalizeLogLine(line) {
    return cleanAnsiCodes(line || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatNcrDate(dateStr, shouldSwapMonthDay = false, preferSwapWhenAmbiguous = false) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const [part1, part2, year] = parts;
    const n1 = parseInt(part1, 10);
    const n2 = parseInt(part2, 10);
    const inferredSwap = Number.isFinite(n1) && Number.isFinite(n2)
        ? (n1 > 12 ? false : (n2 > 12 ? true : (shouldSwapMonthDay || preferSwapWhenAmbiguous)))
        : (shouldSwapMonthDay || preferSwapWhenAmbiguous);

    if (year.length === 2) {
        if (inferredSwap) return `${part2}/${part1}/${year}`;
        return `${part1}/${part2}/${year}`;
    }

    if (inferredSwap) {
        return `${part2}/${part1}/${year.slice(-2)}`;
    }

    return `${part1}/${part2}/${year.slice(-2)}`;
}

function extractNcrDateAround(logLines, pivotIndex) {
    const candidateOffsets = [0, -1, 1, 2, 3, 4, 5, 6, -2, -3];

    for (const offset of candidateOffsets) {
        const index = pivotIndex + offset;
        if (index < 0 || index >= logLines.length) continue;

        const rawLine = cleanAnsiCodes(logLines[index] || '');
        const line = normalizeLogLine(rawLine);
        if (!line) continue;

        let match = rawLine.match(/\*(\d{2}\/\d{2}\/\d{4})\*/);
        if (match) {
            return formatNcrDate(match[1], true);
        }

        match = line.match(/\b(?:LOCAL\s+TOTAL|LAST\s+CLEARED)\s+(\d{2}\/\d{2}\/\d{2,4})\b/i);
        if (match) {
            return formatNcrDate(match[1], false, true);
        }

        match = line.match(/\b(\d{2}\/\d{2}\/\d{2,4})\b/);
        if (match) {
            return formatNcrDate(match[1], false, true);
        }
    }

    return null;
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

// --- RESET FUNCTIONALITY (CRM DINABOLD - TERPISAH DARI resetForm() AGAR TIDAK MENYENTUH MESIN LAIN) ---
function resetFormDinabold() {
    const logInput = document.getElementById('dnLogInput');
    if (logInput) logInput.value = '';

    const p100 = document.getElementById('dnPhys100');
    const p50 = document.getElementById('dnPhys50');
    if (p100) p100.value = '';
    if (p50) p50.value = '';

    const machineDisplay = document.getElementById('dnMachineDisplay');
    if (machineDisplay) {
        machineDisplay.innerHTML = `<span class="w-2 h-2 bg-slate-600 rounded-full"></span> MACHINE: <span class="text-white">WAITING LOG...</span>`;
    }

    const reconBox = document.getElementById('dnTotalReconBox');
    if (reconBox) {
        reconBox.className = "glass-panel p-8 rounded-2xl border flex flex-col justify-center items-center transition-all duration-500 w-full min-h-[180px]";
        const reconResult = document.getElementById('dnTotalReconResult');
        if (reconResult) {
            reconResult.textContent = "MENUNGGU INPUT";
            reconResult.className = "text-5xl lg:text-6xl font-mono font-black text-slate-600 tracking-tight whitespace-nowrap py-2";
        }
        const expression = document.getElementById('dnExpression');
        if (expression) expression.textContent = '';
    }

    ['dnInit100', 'dnInit50', 'dnDisp100', 'dnDisp50', 'dnDep100', 'dnDep50', 'dnRem100', 'dnRem50', 'dnResPhys100', 'dnResPhys50', 'dnRetrackLembar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });
    ['dnInitAmount', 'dnDispAmount', 'dnDepAmount', 'dnRemAmount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });

    const totalPhys = document.getElementById('dnTotalPhysAmount');
    if (totalPhys) {
        totalPhys.textContent = '0';
        totalPhys.classList.remove('text-sm');
    }

    const cashList = document.getElementById('dnCashPresentedList');
    if (cashList) cashList.innerHTML = '';
    const cashCount = document.getElementById('dnCashPresentedCount');
    if (cashCount) cashCount.textContent = '0';
    const cashTotal = document.getElementById('dnCashPresentedTotal');
    if (cashTotal) cashTotal.textContent = '0';

    const storedList = document.getElementById('dnStoredCountList');
    if (storedList) storedList.innerHTML = '';
    const storedCount = document.getElementById('dnStoredCountCount');
    if (storedCount) storedCount.textContent = '0';
    const storedTotal = document.getElementById('dnStoredCountTotal');
    if (storedTotal) storedTotal.textContent = '0';

    const validationInfo = document.getElementById('dnValidationInfo');
    if (validationInfo) validationInfo.textContent = '';

    const periodDisplay = document.getElementById('dnPeriodDisplay');
    if (periodDisplay) {
        periodDisplay.innerHTML = '';
        periodDisplay.classList.add('hidden');
    }
    const periodSelected = document.getElementById('dnPeriodSelected');
    if (periodSelected) periodSelected.classList.add('hidden');

    if (typeof dataFilterCRMDinabold !== 'undefined' && dataFilterCRMDinabold) {
        dataFilterCRMDinabold.periods = [];
        dataFilterCRMDinabold.currentPeriod = null;
        dataFilterCRMDinabold.anomalies = [];
    }

    alert('Form has been reset!');
}

// --- RESET FUNCTIONALITY (CRM OKI - TERPISAH DARI resetForm() AGAR TIDAK MENYENTUH MESIN LAIN) ---
function resetFormOky() {
    const logInput = document.getElementById('okyLogInput');
    if (logInput) logInput.value = '';

    const p100 = document.getElementById('okyPhys100');
    const p50 = document.getElementById('okyPhys50');
    if (p100) p100.value = '';
    if (p50) p50.value = '';

    const machineDisplay = document.getElementById('okyMachineDisplay');
    if (machineDisplay) {
        machineDisplay.innerHTML = `<span class="w-2 h-2 bg-slate-600 rounded-full"></span> MACHINE: <span class="text-white">WAITING LOG...</span>`;
    }

    const reconBox = document.getElementById('okyTotalReconBox');
    if (reconBox) {
        reconBox.className = "glass-panel p-8 rounded-2xl border flex flex-col justify-center items-center transition-all duration-500 w-full min-h-[180px]";
        const reconResult = document.getElementById('okyTotalReconResult');
        if (reconResult) {
            reconResult.textContent = "MENUNGGU INPUT";
            reconResult.className = "text-5xl lg:text-6xl font-mono font-black text-slate-600 tracking-tight whitespace-nowrap py-2";
        }
        const expression = document.getElementById('okyExpression');
        if (expression) expression.textContent = '';
    }

    ['okyInit100', 'okyInit50', 'okyDisp100', 'okyDisp50', 'okyDep100', 'okyDep50', 'okyRem100', 'okyRem50', 'okyResPhys100', 'okyResPhys50'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });
    ['okyInitAmount', 'okyDispAmount', 'okyDepAmount', 'okyRemAmount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });

    const totalPhys = document.getElementById('okyTotalPhysAmount');
    if (totalPhys) {
        totalPhys.textContent = '0';
        totalPhys.classList.remove('text-sm');
    }

    const cashList = document.getElementById('okyCashPresentedList');
    if (cashList) cashList.innerHTML = '';
    const cashCount = document.getElementById('okyCashPresentedCount');
    if (cashCount) cashCount.textContent = '0';
    const cashTotal = document.getElementById('okyCashPresentedTotal');
    if (cashTotal) cashTotal.textContent = '0';

    const storedList = document.getElementById('okyStoredCountList');
    if (storedList) storedList.innerHTML = '';
    const storedCount = document.getElementById('okyStoredCountCount');
    if (storedCount) storedCount.textContent = '0';
    const storedTotal = document.getElementById('okyStoredCountTotal');
    if (storedTotal) storedTotal.textContent = '0';

    const periodDisplay = document.getElementById('okyPeriodDisplay');
    if (periodDisplay) {
        periodDisplay.innerHTML = '';
        periodDisplay.classList.add('hidden');
    }
    const periodSelected = document.getElementById('okyPeriodSelected');
    if (periodSelected) periodSelected.classList.add('hidden');

    if (typeof dataFilterCRMOky !== 'undefined' && dataFilterCRMOky) {
        dataFilterCRMOky.periods = [];
        dataFilterCRMOky.currentPeriod = null;
    }

    alert('Form has been reset!');
}

// --- CRM HYOSUNG (MODUL BARU) - resetForm mengikuti pola resetFormOky persis ---
function resetFormCrmHyosung() {
    const logInput = document.getElementById('crmHyosungLogInput');
    if (logInput) logInput.value = '';

    const p100 = document.getElementById('crmHyosungPhys100');
    const p50 = document.getElementById('crmHyosungPhys50');
    if (p100) p100.value = '';
    if (p50) p50.value = '';

    const machineDisplay = document.getElementById('crmHyosungMachineDisplay');
    if (machineDisplay) {
        machineDisplay.innerHTML = `<span class="w-2 h-2 bg-slate-600 rounded-full"></span> MACHINE: <span class="text-white">WAITING LOG...</span>`;
    }

    const reconBox = document.getElementById('crmHyosungTotalReconBox');
    if (reconBox) {
        reconBox.className = "glass-panel p-8 rounded-2xl border flex flex-col justify-center items-center transition-all duration-500 w-full min-h-[180px]";
        const reconResult = document.getElementById('crmHyosungTotalReconResult');
        if (reconResult) {
            reconResult.textContent = "MENUNGGU INPUT";
            reconResult.className = "text-5xl lg:text-6xl font-mono font-black text-slate-600 tracking-tight whitespace-nowrap py-2";
        }
        const expression = document.getElementById('crmHyosungExpression');
        if (expression) expression.textContent = '';
    }

    ['crmHyosungInit100', 'crmHyosungInit50', 'crmHyosungDisp100', 'crmHyosungDisp50', 'crmHyosungDep100', 'crmHyosungDep50', 'crmHyosungRem100', 'crmHyosungRem50', 'crmHyosungResPhys100', 'crmHyosungResPhys50'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });
    ['crmHyosungInitAmount', 'crmHyosungDispAmount', 'crmHyosungDepAmount', 'crmHyosungRemAmount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });

    const totalPhys = document.getElementById('crmHyosungTotalPhysAmount');
    if (totalPhys) {
        totalPhys.textContent = '0';
        totalPhys.classList.remove('text-sm');
    }

    const cashList = document.getElementById('crmHyosungCashPresentedList');
    if (cashList) cashList.innerHTML = '';
    const cashCount = document.getElementById('crmHyosungCashPresentedCount');
    if (cashCount) cashCount.textContent = '0';
    const cashTotal = document.getElementById('crmHyosungCashPresentedTotal');
    if (cashTotal) cashTotal.textContent = '0';

    const storedList = document.getElementById('crmHyosungStoredCountList');
    if (storedList) storedList.innerHTML = '';
    const storedCount = document.getElementById('crmHyosungStoredCountCount');
    if (storedCount) storedCount.textContent = '0';
    const storedTotal = document.getElementById('crmHyosungStoredCountTotal');
    if (storedTotal) storedTotal.textContent = '0';

    const periodDisplay = document.getElementById('crmHyosungPeriodDisplay');
    if (periodDisplay) {
        periodDisplay.innerHTML = '';
        periodDisplay.classList.add('hidden');
    }
    const periodSelected = document.getElementById('crmHyosungPeriodSelected');
    if (periodSelected) periodSelected.classList.add('hidden');

    if (typeof dataFilterCRMHyosung !== 'undefined' && dataFilterCRMHyosung) {
        dataFilterCRMHyosung.periods = [];
        dataFilterCRMHyosung.currentPeriod = null;
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
        btnElement.style.backgroundColor = "#FF2A3D";
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
        btnElement.style.backgroundColor = "#39FF6A";
        btnElement.style.borderColor = "#39FF6A";
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
function setupDragAndDrop(dropzoneId, inputId, textareaId, machine) {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(inputId);
    const textarea = document.getElementById(textareaId);

    if(!dropzone) return;

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files, textarea, machine, dropzoneId);
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
            handleFiles(files, textarea, machine, dropzoneId);
        }
    }, false);
}

// === FIX BUG UTAMA: extractZipContents SEBELUMNYA menggabungkan SEMUA sub-file dalam
// ZIP jadi 1 blob teks besar (urutan sesuai penyimpanan arsip, BUKAN kronologis), lalu
// diperlakukan sbg "1 file" oleh handleFiles - akibatnya proses auto-sort/dedup TIDAK
// PERNAH jalan utk isi ZIP (beda dgn drop multi-file .txt langsung yg sudah benar).
// FIX: sekarang tiap sub-file dalam ZIP dikembalikan sbg ENTRI TERPISAH, supaya nanti
// diperlakukan PERSIS SAMA seperti file individual yg di-drop langsung - ikut disortir
// kronologis & dedup oleh mergeSortDedupLogs. Berlaku otomatis utk ke-7 mesin krn fungsi
// ini generik (tidak spesifik per-mesin).
async function extractZipContents(file) {
    try {
        const zip = await JSZip.loadAsync(file);
        const entries = []; // { filename, content } - SATU per sub-file, TIDAK digabung
        let skippedCount = 0;
        let totalChars = 0;

        // Prioritaskan file .txt, .log, .csv, .jrn
        const textFiles = [];
        const otherFiles = [];
        for (const [filename, fileEntry] of Object.entries(zip.files)) {
            if (fileEntry.dir) continue;
            const lower = filename.toLowerCase();
            if (lower.endsWith('.txt') || lower.endsWith('.log') || lower.endsWith('.csv') || lower.endsWith('.jrn')) {
                textFiles.push({ filename, fileEntry });
            } else {
                otherFiles.push({ filename, fileEntry });
            }
        }
        const allFiles = [...textFiles, ...otherFiles];

        for (const { filename, fileEntry } of allFiles) {
            if (totalChars > 10000000) break; // batas ~10MB total, sama seperti sebelumnya
            try {
                const content = await fileEntry.async('text');
                // Lewati file biner/non-teks yg gagal terbaca bermakna (mis. hasil decode kosong
                // atau penuh karakter kontrol) - JANGAN dimasukkan ke entries supaya tidak
                // mengotori deteksi tanggal & proses sort/dedup di mergeSortDedupLogs.
                if (!content || !content.trim()) { skippedCount++; continue; }
                entries.push({ filename, content });
                totalChars += content.length;
            } catch (error) {
                console.warn(`Gagal membaca file ${filename}:`, error);
                skippedCount++;
            }
        }

        if (entries.length > 0) {
            return { success: true, entries, count: entries.length, skippedCount };
        }
        return { success: false, entries: [], count: 0, skippedCount, error: "ZIP tidak mengandung file teks yang bisa dibaca" };
    } catch (error) {
        console.error('Error reading ZIP:', error);
        return { success: false, entries: [], count: 0, skippedCount: 0, error: `Gagal membaca file ZIP. Detail: ${error.message}` };
    }
}

// ============================================================
// POIN 3 — AUTO-SORT MULTI-FILE & DEDUPLIKASI (per mesin, adapter pattern)
// Prinsip arsitektur (hasil validasi): kunci dedup di-resolve SAAT MASIH DI FILE
// ASLINYA (sebelum digabung/disortir), baru dipakai saat proses gabung.
// Referensi lengkap: dokumen "Upgrade_Standarisasi_Summary_Autosort.md"
// ============================================================

function standardFileDateFinder(text) {
    // FIX: sebelumnya cuma ambil TANGGAL (tanpa jam) - dua file yang overlap tapi
    // kebetulan sama-sama "mulai" di tanggal kalender yang sama (lazim terjadi kalau
    // ada buffer overlap beberapa jam di tiap file) jadi SERI saat diurutkan, dan
    // pemenangnya jadi tergantung urutan upload yang acak, bukan kronologi aslinya.
    // Sekarang ikut ambil jam:menit:detik kalau ada persis setelah tanggalnya, supaya
    // urutan file lebih presisi & tidak gampang seri.
    const m = text.match(/(\d{2})\/(\d{2})\/(\d{2,4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
    if (!m) return null;
    let [, d, mo, y, h, mi, s] = m;
    if (y.length === 2) y = '20' + y;
    const dt = new Date(+y, +mo - 1, +d, +(h || 0), +(mi || 0), +(s || 0));
    return isNaN(dt.getTime()) ? null : dt;
}

function jalinFileDateFinder(text) {
    const m = text.match(/\|(\d{4})-(\d{2})-(\d{2}) \d{2}:\d{2}:\d{2}\|/);
    if (!m) return null;
    const dt = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(dt.getTime()) ? null : dt;
}

// Kunci dedup TRANSAKSI standar (dipakai CRM Hitachi, Dinabold, Oki, Hyosung, NCR, Wincor —
// keenamnya sudah tervalidasi punya blok TANGGAL:/WAKTU:/ATM ID/NO.REF:/AMOUNT yang sama pola)
// FIX (penting): sebelumnya regex ini HANYA mencakup bagian struk (TANGGAL..AMOUNT), sementara
// baris "indikator" tiap mesin (Request Count/Stored Count/CASH REQUEST/Cash-In OK/NOTES
// PRESENTED/dst - letaknya SEBELUM struk, bagian dump protokol mentah) TIDAK ikut match.
// Akibatnya kalau 1 transaksi yang sama muncul di 2 file yang overlap, struknya berhasil
// dibuang duplikatnya saat dedup, TAPI baris indikatornya jadi "yatim" (kehilangan struk
// pasangannya) dan tetap kehitung dobel di kalkulasi DISP/DEP - inilah akar masalah REMAINING
// bisa minus meski sudah difilter per-periode dgn benar. Sekarang indikator ikut jadi bagian
// SATU match yang sama, jadi ikut terbuang bersamaan saat strukanya dianggap duplikat.
const STANDARD_TRX_DEDUP_REGEX = /(?:Request Count|Stored Count|CASH REQUEST|Cash-In OK|NOTES\s+PRESENTED|CASH\s+\d+:\d+,\d+;)\b[\s\S]{0,2000}?TANGGAL:\s*(\d{2}\/\d{2}\/\d{2})\s+WAKTU\s*:\s*(\d{2}:\d{2}:\d{2})[\s\S]{0,60}?ATM ID\s*:\s*(\S+)\s+NO\.REF:\s*(\S+)[\s\S]{0,400}?AMOUNT\s*:\s*RP\s*([\d.,]+)/;

// Resolver kunci ADMIN/RPL marker per mesin — dipanggil dgn (line, semuaBarisFileASLI, indexBaris)
function ncrAdminKeyResolver(line, lines, idx) {
    for (let j = idx; j < Math.min(lines.length, idx + 8); j++) {
        const m = lines[j].match(/LOCAL TOTAL\s+(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}:\d{2})/);
        if (m) {
            const [, mo, d, y] = m; // format Amerika mm/dd/yy -> normalisasi dd/mm/yyyy
            return `ADM|CASHADDED|${d}/${mo}/20${y} ${m[4]}`;
        }
    }
    return `ADM|CASHADDED|UNKNOWN|${idx}`;
}

function wincorAdminKeyResolver(line, lines, idx) {
    for (let back = 0; back < 500; back++) {
        const j = idx - back;
        if (j < 0) break;
        const m = lines[j].match(/TANGGAL:\s*(\d{2}\/\d{2}\/\d{2})\s+WAKTU\s*:\s*(\d{2}:\d{2}:\d{2})/);
        if (m) return `ADM|SOP|${m[1]} ${m[2]}`;
    }
    for (let fwd = 0; fwd < 500; fwd++) {
        const j = idx + fwd;
        if (j >= lines.length) break;
        const m = lines[j].match(/TANGGAL:\s*(\d{2}\/\d{2}\/\d{2})\s+WAKTU\s*:\s*(\d{2}:\d{2}:\d{2})/);
        if (m) return `ADM|SOP|${m[1]} ${m[2]}`;
    }
    return `ADM|SOP|UNKNOWN|${idx}`;
}

function selfTimestampAdminKeyResolver(line) {
    return `ADM|${line.trim()}`;
}

// FIX (khusus Oki): blok "Replenishment" (marker RPL Oki) kadang ke-print/ke-extract dua kali
// PERSIS (Serial No. & Date sama persis) di 1 file EJ log yang sama - beda dari duplikat
// transaksi nasabah biasa karena baris-baris blok ini (Replenishment/Serial No/Cas A B C D E/
// IDR.../Typ.../Cnt...) TIDAK diawali timestamp per-baris, jadi tidak ketangkep adminMarkerTest
// generik (berbasis prefix "DD/MM/YYYY HH:MM:SS"). Kalau blok kembar ini dibiarkan,
// findValidMarkers Oki mengira ada 2 titik RPL terpisah padahal cuma 1 kejadian nyata - salah
// satu "periode" di antaranya jadi berdurasi nol (tsStart===tsEnd, sama-sama Serial/Date kembar
// itu) & menelan ratusan transaksi asli tanpa pernah terhitung. Fungsi ini membuang salinan
// ke-2/dst dari blok yang Serial No.+Date-nya identik dengan yang sudah pernah dilihat.
function dedupOkyReplenishmentBlocks(text) {
    const lines = text.split('\n');
    const seenSerials = new Set();
    const seenSettlements = new Set();
    const genericTsPrefix = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/;
    const out = [];
    let removed = 0;
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        // Blok "Replenishment" (marker RPL) - struktur tetap 6 baris (Replenishment/Serial
        // No/Cas A B C D E/IDR.../Typ.../Cnt...), kunci dedup = Serial No + Date.
        if (trimmed === 'Replenishment') {
            const serialLine = lines[i + 1] || '';
            const m = serialLine.match(/Serial No\.(\d+)\s+Date:(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/);
            if (m) {
                const key = m[1] + '|' + m[2];
                if (seenSerials.has(key)) {
                    let j = i + 1;
                    while (j < lines.length && j < i + 8 && lines[j].trim().indexOf('Cnt') !== 0) j++;
                    removed++;
                    i = j;
                    continue;
                }
                seenSerials.add(key);
            }
        }

        // Blok laporan "---Settlement DD/MM/YYYY HH:MM:SS----" - panjangnya variabel (isi
        // tabel CUR DENO/NO DENOM/INIT-DISP-DEP-REM AMOUNT dst), jadi batasnya dicari dgn
        // scan maju sampai ketemu baris "---Settlement" lain, "Replenishment", atau baris
        // event biasa berawalan timestamp (tanda sudah keluar dari blok laporan). Kunci
        // dedup = timestamp persis di judul laporannya sendiri (unik per laporan asli).
        if (trimmed.indexOf('---Settlement ') === 0) {
            const tsMatch = trimmed.match(/---Settlement\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/);
            const key = tsMatch ? tsMatch[1] : trimmed;
            if (seenSettlements.has(key)) {
                let j = i + 1;
                while (j < lines.length) {
                    const t2 = lines[j].trim();
                    if (t2.indexOf('---Settlement ') === 0 || t2 === 'Replenishment' || genericTsPrefix.test(t2)) break;
                    j++;
                }
                removed++;
                i = j - 1; // for-loop akan i++ lagi -> lanjut persis di baris pemicu stop (tidak ikut dibuang)
                continue;
            }
            seenSettlements.add(key);
        }

        out.push(lines[i]);
    }
    return { text: out.join('\n'), removed };
}

function jalinAdminKeyResolver(line, lines, idx) {
    // FIX: baris Jalin format "TID|x|y|TS_KARTU|TS_ASLI|PESAN" - field TS_KARTU (timestamp
    // pertama) SELALU "0000-00-00 00:00:00" (placeholder) utk baris laporan/servis seperti
    // "Printing 'PRT_SHOW_CASSETTES.xml'", BUKAN field ke-2 (TS_ASLI) yg jadi waktu kejadian
    // sesungguhnya. Regex lama ambil timestamp PERTAMA yg ketemu (selalu placeholder sama),
    // membuat SEMUA kejadian marker asli (walau di tanggal berbeda) dianggap 1 kunci yg sama
    // -> kejadian ke-2/dst salah dianggap duplikat & terhapus. Sekarang ambil timestamp
    // TERAKHIR sebelum field pesan (paling dekat ke akhir baris); fallback pakai index baris
    // (bukan cuma teks) supaya tidak pernah collide keliru kalau formatnya di luar dugaan.
    const m = line.match(/\|(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\|[^|]*$/);
    return m ? `ADM|RPL|${m[1]}` : `ADM|RPL|UNKNOWN|${idx}`;
}

function jalinTrxKeyPerLine(line) {
    const m = line.match(/^(\S+)\|(\d+)\|(\d+)\|(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\|(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\|DISPENSED/);
    return m ? 'TRX|' + m.slice(1).join('|') : null;
}

const LOG_MERGE_ADAPTERS = {
    crm: {
        fileDateFinder: standardFileDateFinder,
        trxDedupRegex: STANDARD_TRX_DEDUP_REGEX,
        adminMarkerTest: (line) => /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/.test(line),
        resolveAdminKey: (line) => selfTimestampAdminKeyResolver(line),
    },
    dn: {
        fileDateFinder: standardFileDateFinder,
        trxDedupRegex: STANDARD_TRX_DEDUP_REGEX,
        adminMarkerTest: (line) => /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/.test(line),
        resolveAdminKey: (line) => selfTimestampAdminKeyResolver(line),
    },
    hyosung: {
        fileDateFinder: standardFileDateFinder,
        trxDedupRegex: STANDARD_TRX_DEDUP_REGEX,
        adminMarkerTest: (line) => /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/.test(line),
        resolveAdminKey: (line) => selfTimestampAdminKeyResolver(line),
    },
    ncr: {
        fileDateFinder: standardFileDateFinder,
        trxDedupRegex: STANDARD_TRX_DEDUP_REGEX,
        adminMarkerTest: (line) => /CASH ADDED/.test(line),
        resolveAdminKey: ncrAdminKeyResolver,
    },
    wincor: {
        fileDateFinder: standardFileDateFinder,
        trxDedupRegex: STANDARD_TRX_DEDUP_REGEX,
        adminMarkerTest: (line) => /CASH COUNTERS AFTER SOP/.test(line),
        resolveAdminKey: wincorAdminKeyResolver,
    },
    jalin: {
        fileDateFinder: jalinFileDateFinder,
        trxDedupRegex: null,
        trxKeyPerLine: jalinTrxKeyPerLine,
        adminMarkerTest: (line) => /PRT_SHOW_CASSETTES/.test(line),
        resolveAdminKey: (line, lines, idx) => jalinAdminKeyResolver(line, lines, idx),
    },
    oky: {
        fileDateFinder: standardFileDateFinder,
        trxDedupRegex: STANDARD_TRX_DEDUP_REGEX,
        adminMarkerTest: (line) => /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/.test(line),
        resolveAdminKey: (line) => selfTimestampAdminKeyResolver(line),
        blockDedup: dedupOkyReplenishmentBlocks, // FIX: blok marker RPL Oki bisa duplikat persis, tidak kena dedup baris generik
    },
    // CRM HYOSUNG (MODUL BARU): struktur EJ log mirip ATM Hyosung (jam mentah "DD/MM/YYYY
    // HH:MM:SS" di tiap baris admin) & strukTANGGAL/WAKTU/ATM ID/NO.REF/AMOUNT sama seperti
    // Hitachi/Oky/Dinabold - adapter identik dgn hyosung/oky, tidak perlu blockDedup khusus
    // (belum ditemukan indikasi blok ADD CASH terduplikasi persis seperti kasus RPL Oki).
    crmHyosung: {
        fileDateFinder: standardFileDateFinder,
        trxDedupRegex: STANDARD_TRX_DEDUP_REGEX,
        adminMarkerTest: (line) => /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/.test(line),
        resolveAdminKey: (line) => selfTimestampAdminKeyResolver(line),
    },
};

/**
 * Gabung banyak file log jadi 1, terurut kronologis & bebas duplikat.
 * @param {string[]} fileContentsArray - isi teks tiap file (urutan sesuai user upload, boleh acak)
 * @param {string} machineKey - salah satu dari 'crm','dn','hyosung','ncr','wincor','jalin'
 * @returns {{mergedText: string, info: object|null}}
 */
function mergeSortDedupLogs(fileContentsArray, machineKey) {
    const adapter = LOG_MERGE_ADAPTERS[machineKey];
    if (!adapter || fileContentsArray.length < 1) {
        return { mergedText: fileContentsArray.join('\n'), info: null };
    }
    // FIX (dedup file tunggal): sebelumnya fungsi ini di-skip total kalau cuma 1 file
    // diupload (fileContentsArray.length <= 1), dengan asumsi "1 file pasti bersih dari
    // duplikat". Ternyata TIDAK - satu file EJ log tunggal bisa saja sudah berisi 1 hari
    // penuh yang ke-print/ke-extract dua kali dari sumbernya (mis. proses pengambilan log
    // di sisi mesin/vendor), sehingga baris admin marker & transaksi terduplikasi PERSIS
    // walau usernya cuma upload 1 file. Sekarang jalur single-file & multi-file SAMA-SAMA
    // lewat pipeline sort+dedup di bawah; untuk 1 file, langkah "urutkan antar file" jadi
    // no-op (cuma ada 1 elemen), tapi langkah dedup admin-marker & transaksi TETAP jalan
    // dan efektif menangkap duplikasi INTERNAL di dalam file itu sendiri.

    // LANGKAH 1: baca tiap file APA ADANYA, resolve tanggal file & kunci admin marker
    // SELAGI MASIH DI KONTEKS FILE ASLINYA (prinsip arsitektur hasil validasi).
    const fileInfos = fileContentsArray.map((text, originalIndex) => {
        const cleanText = text.replace(/\r\n/g, '\n');
        const lines = cleanText.split('\n');
        const adminKeysByLineIndex = new Map();
        lines.forEach((line, i) => {
            if (adapter.adminMarkerTest(line)) {
                adminKeysByLineIndex.set(i, adapter.resolveAdminKey(line, lines, i));
            }
        });
        const fileDate = adapter.fileDateFinder(cleanText) || new Date(8640000000000000); // file tanpa tanggal -> taruh paling akhir
        return { originalIndex, lines, fileDate, adminKeysByLineIndex };
    });

    // LANGKAH 2: urutkan file berdasarkan tanggal representatifnya
    fileInfos.sort((a, b) => a.fileDate - b.fileDate);
    const wasReordered = fileInfos.some((f, i) => f.originalIndex !== i);

    // LANGKAH 3: gabung SAMBIL buang baris admin marker yg kuncinya sudah pernah muncul
    const seenAdminGlobal = new Set();
    let adminDuplicatesRemoved = 0;
    const mergedParts = [];
    for (const f of fileInfos) {
        const keptLines = [];
        f.lines.forEach((line, i) => {
            if (f.adminKeysByLineIndex.has(i)) {
                const key = f.adminKeysByLineIndex.get(i);
                if (seenAdminGlobal.has(key)) { adminDuplicatesRemoved++; return; }
                seenAdminGlobal.add(key);
            }
            keptLines.push(line);
        });
        mergedParts.push(keptLines.join('\n'));
    }
    let mergedText = mergedParts.join('\n');

    // LANGKAH 3b: dedup blok marker khusus (mesin yg markernya bukan baris berawalan
    // timestamp, jadi tidak ketangkep LANGKAH 3 di atas - lihat dedupOkyReplenishmentBlocks)
    let blockDuplicatesRemoved = 0;
    if (adapter.blockDedup) {
        const res = adapter.blockDedup(mergedText);
        mergedText = res.text;
        blockDuplicatesRemoved = res.removed;
    }

    // LANGKAH 4: dedup transaksi nasabah (aman dikerjakan di teks gabungan karena
    // kuncinya sudah unik berdasar isi transaksi sendiri: NO.REF+TANGGAL+WAKTU+AMOUNT)
    let trxDuplicatesRemoved = 0;
    if (adapter.trxDedupRegex) {
        const seenTrx = new Set();
        const re = new RegExp(adapter.trxDedupRegex.source, 'g');
        mergedText = mergedText.replace(re, (match, ...groups) => {
            const key = 'TRX|' + groups.slice(0, 4).join('|');
            if (seenTrx.has(key)) { trxDuplicatesRemoved++; return ''; }
            seenTrx.add(key);
            return match;
        });
    } else if (adapter.trxKeyPerLine) {
        const seenTrx = new Set();
        const outLines = [];
        for (const line of mergedText.split('\n')) {
            const key = adapter.trxKeyPerLine(line);
            if (key) {
                if (seenTrx.has(key)) { trxDuplicatesRemoved++; continue; }
                seenTrx.add(key);
            }
            outLines.push(line);
        }
        mergedText = outLines.join('\n');
    }

    // LANGKAH 5: deteksi gap waktu signifikan (>6 jam) sbg info non-blocking
    let gapWarning = null;
    try {
        const allDates = fileInfos.map(f => f.fileDate.getTime()).filter(t => t < 8640000000000000);
        allDates.sort((a, b) => a - b);
        for (let i = 1; i < allDates.length; i++) {
            const gapHours = (allDates[i] - allDates[i - 1]) / 3600000;
            if (gapHours > 30) { // antar TANGGAL AWAL file (kasar), ambang longgar krn ini per-file bukan per-transaksi
                gapWarning = `Kemungkinan ada rentang tanggal yang terlewat di antara file-file yang diupload.`;
                break;
            }
        }
    } catch (e) { /* abaikan, ini cuma info tambahan */ }

    const info = {
        totalFiles: fileContentsArray.length,
        wasReordered,
        trxDuplicatesRemoved,
        adminDuplicatesRemoved,
        blockDuplicatesRemoved,
        totalDuplicatesRemoved: trxDuplicatesRemoved + adminDuplicatesRemoved + blockDuplicatesRemoved,
        dateRangeStart: fileInfos[0].fileDate,
        dateRangeEnd: fileInfos[fileInfos.length - 1].fileDate,
        gapWarning,
    };
    return { mergedText, info };
}

function formatMergeInfoText(info) {
    if (!info) return null;
    const fmtDate = (d) => {
        if (!d || d.getTime() >= 8640000000000000) return '?';
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    };
    let msg = `${info.totalFiles} file digabung`;
    if (info.wasReordered) msg += ` (urutan otomatis diperbaiki)`;
    msg += ` -> rentang ${fmtDate(info.dateRangeStart)} - ${fmtDate(info.dateRangeEnd)}`;
    if (info.totalDuplicatesRemoved > 0) {
        msg += ` -> ${info.totalDuplicatesRemoved} baris duplikat dibuang`;
    }
    if (info.gapWarning) {
        msg += ` | ⚠ ${info.gapWarning}`;
    }
    return msg;
}

function showMergeInfoBanner(dropzoneId, message) {
    if (!message) return;
    const dropzone = document.getElementById(dropzoneId);
    if (!dropzone) return;
    let banner = document.getElementById(dropzoneId + '-mergeinfo');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = dropzoneId + '-mergeinfo';
        banner.className = 'text-[10px] font-mono text-slate-400 mt-2 px-1 leading-relaxed';
        dropzone.insertAdjacentElement('afterend', banner);
    }
    banner.textContent = message;
}

// Fungsi untuk membaca semua jenis file
// FIX BUG UTAMA (laporan: ZIP tidak beraturan tanggalnya gagal diproses mesin rekonsiliasi):
// Setiap "reader" sekarang resolve ke ARRAY berisi 1 atau lebih string (1 file biasa -> 1
// elemen; 1 file ZIP -> N elemen sesuai jumlah sub-file di dalamnya). Setelah itu SEMUA
// hasil di-flatten jadi satu daftar "file efektif" sebelum diputuskan apakah perlu lewat
// mergeSortDedupLogs - supaya isi ZIP ikut disortir kronologis & dedup PERSIS SAMA seperti
// kalau sub-file itu di-drop langsung satu-satu di luar ZIP. Berlaku utk ke-7 mesin sekaligus
// karena handleFiles dipakai bersama (generik, tidak spesifik per-mesin).
async function handleFiles(files, textarea, machine, dropzoneId) {
    if (!files || files.length === 0) return;
    
    textarea.value = "Membaca file...";
    const readers = [];
    const zipNotes = [];
    
    for (const file of files) {
        const promise = new Promise(async (resolve) => {
            try {
                if (file.name.toLowerCase().endsWith('.zip')) {
                    const result = await extractZipContents(file);
                    if (!result.success) {
                        zipNotes.push(`${file.name}: ${result.error || 'gagal dibaca'}`);
                        resolve([]);
                        return;
                    }
                    if (result.skippedCount > 0) {
                        zipNotes.push(`${file.name}: ${result.skippedCount} isi file dilewati (bukan teks)`);
                    }
                    // FIX: setiap sub-file dalam ZIP jadi elemen TERPISAH (bukan 1 blob gabungan)
                    resolve(result.entries.map(e => e.content));
                } else if (file.type === 'text/plain' || 
                         file.name.toLowerCase().endsWith('.txt') || 
                         file.name.toLowerCase().endsWith('.log') ||
                         file.name.toLowerCase().endsWith('.csv') ||
                         file.name.toLowerCase().endsWith('.jrn')) {
                    // Baca file teks biasa
                    const reader = new FileReader();
                    reader.onload = (e) => resolve([e.target.result]);
                    reader.onerror = () => resolve([`Error membaca file ${file.name}`]);
                    reader.readAsText(file, 'UTF-8');
                } else {
                    // Coba baca sebagai teks meskipun bukan .txt/.log
                    const reader = new FileReader();
                    reader.onload = (e) => resolve([`[File: ${file.name}]\n${e.target.result}\n`]);
                    reader.onerror = () => resolve([]);
                    reader.readAsText(file);
                }
            } catch (error) {
                resolve([`Error membaca file ${file.name}: ${error.message}`]);
            }
        });
        readers.push(promise);
    }

    Promise.all(readers).then(resultsPerFile => {
        // FIX INTI: satukan semua "file efektif" jadi 1 daftar datar - termasuk yg berasal
        // dari DALAM ZIP. Sebelumnya ZIP (walau isinya banyak sub-file) selalu dihitung sbg
        // "1 file" oleh files.length, sehingga proses auto-sort/dedup (yg butuh > 1 file)
        // tidak pernah terpicu utk isi ZIP - inilah akar bug "gagal mengekstrak" saat isi ZIP
        // tidak berurutan tanggalnya.
        const contents = resultsPerFile.flat().filter(c => c !== undefined && c !== null);

        if (contents.length === 0) {
            textarea.value = zipNotes.length ? '[' + zipNotes.join(' | ') + ']' : '[Tidak ada konten yang berhasil dibaca]';
            return;
        }

        if (contents.length >= 1 && machine) {
            // POIN 3 + FIX dedup file tunggal: dulu jalur ini cuma nyala kalau contents.length > 1.
            // Sekarang SELALU lewat mergeSortDedupLogs walau cuma 1 file - fungsi itu sendiri yang
            // no-op kalau memang tidak ada apa-apa untuk dibuang, jadi aman utk semua kasus.
            const { mergedText, info } = mergeSortDedupLogs(contents, machine);
            textarea.value = mergedText;
            if (dropzoneId) {
                let msg = formatMergeInfoText(info);
                if (zipNotes.length) msg = (msg ? msg + ' | ' : '') + zipNotes.join(' | ');
                showMergeInfoBanner(dropzoneId, msg);
            }
        } else if (contents.length > 1) {
            // Fallback lama (mesin tanpa adapter dikenal / dipanggil tanpa machine key)
            textarea.value = `[${contents.length} FILE]\n\n` + contents.join("\n\n---\n\n");
        } else {
            textarea.value = contents[0];
            if (dropzoneId) showMergeInfoBanner(dropzoneId, zipNotes.length ? zipNotes.join(' | ') : null);
        }
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
            exp.textContent = "Hmmm... Hitung Ulang 😡";
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

// ============================================================================
// FIX: Validasi silang waktu ASLI transaksi vs batas periode REPLENISH.
// ----------------------------------------------------------------------------
// Latar belakang: calculateDISP/calculateDEP tiap mesin CRM memotong data
// berdasarkan INDEX baris (baris antara marker REPLENISH start & end), dengan
// asumsi urutan fisik baris di `lines` sudah 100% kronologis. Asumsi ini valid
// untuk 1 file tunggal, TAPI proses gabung banyak file (mergeSortDedupLogs)
// mengurutkan per-FILE (pakai tanggal representatif tiap file), bukan per-baris
// transaksi. Kalau file-file yang digabung saling overlap (lazim terjadi kalau
// user upload banyak export harian yang rentangnya tumpang tindih), baris
// transaksi BISA berakhir di posisi index yang secara kronologis sedikit
// meleset dari urutan aslinya walau tanggal di tiap barisnya sendiri tetap
// benar - akibatnya transaksi dari SEBELUM (atau SESUDAH) jam REPLENISH bisa
// "nyasar" masuk hitungan periode yang salah.
//
// Fix ini TIDAK mengubah proses gabung/sort file (berisiko merusak struktur
// blok multi-baris log lain seperti [Transaction record]/CASSETTE). Sebagai
// gantinya, calculateDISP/calculateDEP memvalidasi ULANG waktu ASLI tiap
// transaksi (field "TANGGAL: dd/mm/yy WAKTU: hh:mm:ss" di struk yang selalu
// menyertai tiap transaksi - sumber yang sama persis dipakai fitur SUMMARY)
// terhadap jam REPLENISH pembuka & penutup periode tsb. Kalau waktu aslinya
// ternyata di luar rentang periode, transaksi itu DIABAIKAN dari perhitungan
// periode ini - berlaku utk batas AWAL maupun AKHIR periode secara simetris.
//
// Fail-open by design: kalau field TANGGAL/WAKTU tidak ketemu di sekitar baris
// tsb (jarang, tapi bisa terjadi di ujung file/format tidak standar), transaksi
// TETAP dihitung seperti perilaku lama (index-based) - supaya fix ini tidak
// menghilangkan data yang sebenarnya valid hanya karena tidak bisa divalidasi.
// ============================================================================
const RECON_TANGGAL_WAKTU_REGEX = /TANGGAL:\s*(\d{2})\/(\d{2})\/(\d{2})\s+WAKTU\s*:\s*(\d{2}):(\d{2}):(\d{2})/;

function reconParseMarkerTimestamp(line) {
    if (!line) return null;
    const m = line.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
}

// Cari timestamp asli transaksi (field TANGGAL/WAKTU) di sekitar baris idx.
// windowSize default 30 baris (cukup lega utk berbagai format struk CRM).
function reconFindTransactionTimestamp(lines, idx, windowSize = 30) {
    const m = extractDateTimeNearLine(lines, idx, [], RECON_TANGGAL_WAKTU_REGEX, windowSize);
    if (!m) return null;
    return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
}

// true = transaksi ini SAH masuk periode [tsStart, tsEnd). Fail-open kalau
// tsStart/timestamp transaksi tidak bisa ditentukan. finderFn dibuat pluggable
// karena format timestamp per-transaksi beda antar mesin (lihat varian generik
// di bawah, dipakai Dinabold yang formatnya bukan gaya struk TANGGAL/WAKTU).
function reconIsWithinPeriod(lines, idx, tsStart, tsEnd, finderFn = reconFindTransactionTimestamp) {
    if (!tsStart) return true;
    const ts = finderFn(lines, idx);
    if (!ts) return true;
    if (ts < tsStart) return false;
    if (tsEnd && ts >= tsEnd) return false;
    return true;
}

// Varian generik "dd/mm/yyyy hh:mm:ss" (dipakai Dinabold - format log-nya beda
// total dari gaya struk TANGGAL/WAKTU Hitachi/Oki, lihat summaryExtractDinabold
// yang sudah lebih dulu memakai pola pencarian identik untuk fitur SUMMARY).
const RECON_GENERIC_DATETIME_REGEX = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/;

// FIX (khusus Oki): validasi periode tsStart/tsEnd Oki (findMarkerTimestamp) dibangun dari
// jam PERANGKAT KERAS mesin sendiri (baris "Date:DD/MM/YYYY HH:MM:SS" tepat setelah marker
// "Replenishment", konsisten dgn baris² berwaktu mentah di sekitarnya). Tapi timestamp
// transaksi yg dipakai reconIsWithinPeriod (via reconFindTransactionTimestamp) diambil dari
// struk TANGGAL:/WAKTU: (field switching/host bank) - dan terbukti dari data asli field ini
// KONSISTEN tertinggal 2 jam (120 menit, 2232 dari 2269 sampel persis 120, sisanya 121)
// dibanding jam mentah mesin. Akibatnya reconIsWithinPeriod salah menyisihkan transaksi yg
// sebenarnya valid (terutama 2 jam pertama tiap periode) - REM Oki bisa meleset ratusan
// lembar per periode. Bukan soal duplikat file (itu bug terpisah, sudah diperbaiki lewat
// dedup), ini soal SUMBER timestamp yg dipakai utk validasi periode. Fix: utk Oki, pakai jam
// mentah (baris berawalan "DD/MM/YYYY HH:MM:SS" terdekat SEBELUM baris transaksi), bukan
// struk TANGGAL/WAKTU - konsisten dgn basis jam yg dipakai tsStart/tsEnd itu sendiri.
function reconFindOkyTransactionTimestamp(lines, idx, windowSize = 20) {
    for (let k = idx; k >= Math.max(0, idx - windowSize); k--) {
        const m = lines[k].match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (m) return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
    }
    return null;
}
function reconFindTransactionTimestampGeneric(lines, idx, windowSize = 20, preferredOffsets = [0, -1, -2, 1, 2]) {
    const m = extractDateTimeNearLine(lines, idx, preferredOffsets, RECON_GENERIC_DATETIME_REGEX, windowSize);
    if (!m) return null;
    return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
}

// --- CRM HYOSUNG (MODUL BARU): marker "ADD CASH:" (bare label, sama persis gaya ATM
// Hyosung), jam mentah ada di baris SEBELUMNYA (offset -1, kadang -2/-3 kalau ada baris
// kosong sisipan). Dipakai juga untuk validasi timestamp transaksi (reconIsWithinPeriod)
// supaya basis jam tsStart/tsEnd & basis jam transaksi KONSISTEN satu sama lain (pelajaran
// dari fix Oki di atas - reconFindOkyTransactionTimestamp) - bukan struk TANGGAL/WAKTU.
function reconCrmHyosungMarkerTimestamp(lines, addCashIdx) {
    for (let k = addCashIdx - 1; k >= Math.max(0, addCashIdx - 3); k--) {
        const m = lines[k].match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (m) return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
    }
    return null;
}
function reconFindCrmHyosungTransactionTimestamp(lines, idx, windowSize = 25) {
    for (let k = idx; k >= Math.max(0, idx - windowSize); k--) {
        const m = lines[k].match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (m) return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
    }
    return null;
}
// ============================================================================

// ============================================================================
// FIX #2 (lanjutan Bug #2 di atas, sekarang utk mesin ATM): Hyosung/Wincor/NCR/
// Jalin memotong data dispense pakai pola index yang SAMA PERSIS dengan CRM
// sebelum diperbaiki (analyze*Period: `period.startIndex+1` s/d `period.endIndex-1`,
// TANPA validasi waktu sama sekali) - sama-sama rawan kontaminasi index akibat
// proses gabung banyak file yang overlap. Helper di bawah reuse persis pola
// ekstraksi timestamp yang sudah dipakai & tervalidasi di masing-masing
// summaryExtract*() (Hyosung/Wincor/NCR/Jalin) - supaya konsisten & tidak
// menciptakan asumsi format baru yang belum teruji.
// ============================================================================

// --- HYOSUNG: marker "ADD CASH:", tanggal di baris SEBELUMNYA (offset -1) ---
function reconHyosungMarkerTimestamp(lines, idx) {
    const m = extractDateTimeNearLine(lines, idx, [-1], RECON_GENERIC_DATETIME_REGEX, 10);
    if (!m) return null;
    return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
}
function reconHyosungTrxTimestamp(lines, idx) {
    const m = extractDateTimeNearLine(lines, idx, [-7], RECON_GENERIC_DATETIME_REGEX, 20);
    if (!m) return null;
    return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
}

// --- WINCOR: marker "CASH COUNTERS AFTER SOP" (reuse wincorAdminKeyResolver
// yang sudah ada), transaksi "CASH REQUEST:" pakai TANGGAL/WAKTU offset [1..5] ---
function reconWincorMarkerTimestamp(lines, idx) {
    const key = wincorAdminKeyResolver('', lines, idx);
    const m = key.match(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
}
function reconWincorTrxTimestamp(lines, idx) {
    const m = extractDateTimeNearLine(lines, idx, [1, 2, 3, 4, 5], RECON_TANGGAL_WAKTU_REGEX, 20);
    if (!m) return null;
    return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
}

// --- NCR: marker "CASH ADDED" (reuse ncrAdminKeyResolver yang sudah ada),
// transaksi "NOTES PRESENTED" pakai TANGGAL/WAKTU offset [-9] ---
function reconNcrMarkerTimestamp(lines, idx) {
    const key = ncrAdminKeyResolver('', lines, idx);
    const m = key.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (!m) return null;
    return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], '0');
}
function reconNcrTrxTimestamp(lines, idx) {
    const m = extractDateTimeNearLine(lines, idx, [-9], RECON_TANGGAL_WAKTU_REGEX, 20);
    if (!m) return null;
    return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
}

// --- JALIN: marker & transaksi sama-sama bawa timestamp ISO (yyyy-mm-dd) pipe-
// delimited di baris ITU SENDIRI (bukan cari di sekitar) ---
function reconJalinMarkerTimestamp(lines, idx) {
    const parts = (lines[idx] || '').split('|');
    if (parts.length < 5) return null;
    const m = parts[4].trim().match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    return buildDateFromParts(m[3], m[2], m[1], m[4], m[5], m[6]);
}
function reconJalinTrxTimestamp(lines, idx) {
    const m = (lines[idx] || '').match(/\|(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\|(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\|DISPENSED:/);
    if (!m) return null;
    return buildDateFromParts(m[3], m[2], m[1], m[4], m[5], m[6]);
}
// ============================================================================

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

        // FIX Poin 1: sebelumnya CRM Hitachi WAJIB 2 marker REPLENISHMENT berurutan
        // (marker terakhir tanpa penutup selalu diabaikan). Sekarang marker terakhir
        // tetap dibentuk jadi periode, label akhir = tanggal transaksi terakhir.
        if (replenishmentIndices.length > 0) {
            const lastMarker = replenishmentIndices[replenishmentIndices.length - 1];
            const startIdx = lastMarker.index;
            const endIdx = lines.length;

            let hasDispense = false;
            for (let j = startIdx + 1; j < endIdx; j++) {
                if (lines[j].indexOf('Request Count') === 0) {
                    hasDispense = true;
                    break;
                }
            }

            if (hasDispense) {
                const finalEndDate = crmHitachiLastTrxDate(lines, startIdx, endIdx) || lastMarker.date;
                periods.push({
                    startIndex: startIdx,
                    endIndex: endIdx,
                    startDate: lastMarker.date,
                    endDate: null,
                    displayText: `${lastMarker.date} - ${finalEndDate}`
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
                initIndex: period.startIndex,
                // Batas waktu ASLI periode ini (dari marker RPL-nya sendiri) - dipakai
                // calculateDISP/calculateDEP utk validasi silang, lihat blok fix di atas.
                tsStart: reconParseMarkerTimestamp(lines[period.startIndex]),
                tsEnd: (period.endIndex < lines.length) ? reconParseMarkerTimestamp(lines[period.endIndex]) : null
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
                initIndex: replenishmentIndices[1],
                tsStart: reconParseMarkerTimestamp(lines[replenishmentIndices[1]]),
                tsEnd: reconParseMarkerTimestamp(lines[replenishmentIndices[0]])
            };
        }
        if (replenishmentIndices.length === 1) {
            return { 
                start: replenishmentIndices[0] + 1, 
                end: lines.length - 1, 
                initIndex: replenishmentIndices[0],
                tsStart: reconParseMarkerTimestamp(lines[replenishmentIndices[0]]),
                tsEnd: null
            };
        }
        // Fallback Full Log
        return { start: 0, end: lines.length - 1, initIndex: -1, tsStart: null, tsEnd: null };
    }

    calculateDISP(lines, period = null) {
        const { start, end, tsStart, tsEnd } = this.findReplenishmentPeriod(lines, period);
        const totals = { disp1: 0, disp2: 0, disp3: 0, disp4: 0 };
        for (let i = start; i <= end; i++) {
            const line = lines[i];
            if (line.indexOf('Request Count') === 0) {
                if (!reconIsWithinPeriod(lines, i, tsStart, tsEnd)) continue;
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
        const { start, end, tsStart, tsEnd } = this.findReplenishmentPeriod(lines, period);
        let totalDep1 = 0, totalDep2 = 0;
        for (let i = start; i <= end; i++) {
            if (lines[i].includes('Stored Count')) {
                if (!reconIsWithinPeriod(lines, i, tsStart, tsEnd)) continue;
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

// ============================================================
// CRM DINABOLD (DN) CLASS - MODUL BARU, TERISOLASI PENUH
// Tidak mewarisi/mengubah DataFilterCRMHitachi maupun class lain.
// Referensi lengkap keyword & regex: lihat "Upgrade DN.md"
// ============================================================
class DataFilterCRMDinabold {
    constructor() {
        this.logInput = document.getElementById('dnLogInput');
        this.filterButton = document.getElementById('dnFilterButton');
        this.machineDisplay = document.getElementById('dnMachineDisplay');
        this.dnPhys100 = document.getElementById('dnPhys100');
        this.dnPhys50 = document.getElementById('dnPhys50');

        this.dnInit100 = document.getElementById('dnInit100');
        this.dnInit50 = document.getElementById('dnInit50');
        this.dnDisp100 = document.getElementById('dnDisp100');
        this.dnDisp50 = document.getElementById('dnDisp50');
        this.dnDep100 = document.getElementById('dnDep100');
        this.dnDep50 = document.getElementById('dnDep50');
        this.dnRem100 = document.getElementById('dnRem100');
        this.dnRem50 = document.getElementById('dnRem50');
        this.dnRetrackLembar = document.getElementById('dnRetrackLembar'); // FIX poin 6: sekarang fungsional

        this.dnInitAmount = document.getElementById('dnInitAmount');
        this.dnDispAmount = document.getElementById('dnDispAmount');
        this.dnDepAmount = document.getElementById('dnDepAmount');
        this.dnRemAmount = document.getElementById('dnRemAmount');
        this.dnTotalPhysAmount = document.getElementById('dnTotalPhysAmount');

        this.dnCashPresentedCount = document.getElementById('dnCashPresentedCount');
        this.dnCashPresentedTotal = document.getElementById('dnCashPresentedTotal');
        this.dnCashPresentedList = document.getElementById('dnCashPresentedList');
        this.dnStoredCountCount = document.getElementById('dnStoredCountCount');
        this.dnStoredCountTotal = document.getElementById('dnStoredCountTotal');
        this.dnStoredCountList = document.getElementById('dnStoredCountList');
        this.dnValidationInfo = document.getElementById('dnValidationInfo');

        // Periode
        this.periods = [];
        this.currentPeriod = null;
        // Anomali validasi AMOUNT (direset tiap analyzePeriod)
        this.anomalies = [];

        if (this.filterButton) {
            this.filterButton.addEventListener('click', () => this.filterData());
        }
    }

    // --- Validasi blok "CLEAR CASH" harus benar-benar all-zero ---
    isValidClearCashZeroBlock(lines, idx) {
        const found = { '1': null, '2': null, '3': null, '4': null, REJECTED: null, RETRACTED: null };
        for (let k = 1; k <= 10 && idx + k < lines.length; k++) {
            const t = lines[idx + k].trim();
            let m;
            if ((m = t.match(/^([1-4])\s+(\d+)$/))) {
                if (found[m[1]] === null) found[m[1]] = parseInt(m[2], 10);
            } else if ((m = t.match(/^REJECTED\s+(\d+)$/i))) {
                found.REJECTED = parseInt(m[1], 10);
            } else if ((m = t.match(/^RETRACTED\s+(\d+)$/i))) {
                found.RETRACTED = parseInt(m[1], 10);
            }
            const allFound = found['1'] !== null && found['2'] !== null && found['3'] !== null &&
                              found['4'] !== null && found.REJECTED !== null && found.RETRACTED !== null;
            if (allFound) break;
        }
        const allFound = found['1'] !== null && found['2'] !== null && found['3'] !== null &&
                          found['4'] !== null && found.REJECTED !== null && found.RETRACTED !== null;
        if (!allFound) return false;
        return found['1'] === 0 && found['2'] === 0 && found['3'] === 0 && found['4'] === 0 &&
               found.REJECTED === 0 && found.RETRACTED === 0;
    }

    // --- Ambil 4 nilai kaset dari blok "CASH COUNTERS AFTER SOP" ---
    parseAfterSopValues(lines, headerIdx) {
        const values = [];
        for (let k = headerIdx + 1; k <= headerIdx + 8 && k < lines.length; k++) {
            const m = lines[k].match(/IDR\s+\d+\s+(\d+)\*?/);
            if (m) values.push(parseInt(m[1], 10));
            if (values.length === 4) break;
        }
        return values.length === 4 ? values : null;
    }

    // FIX (poin 1 & 2 dari user): ambil RETRACTS & REJECTS dari blok "CASH COUNTERS AFTER
    // SOP" - dipakai utk validasi kelipatan-50 (bukan cuma 4 nilai kaset sendiri-sendiri).
    // Teknisi kadang melakukan test-dispense saat SOP utk pastikan mesin berfungsi; lembar
    // itu masuk REJECTS (uangnya tetap di dalam mesin, tidak keluar), jadi harus ikut
    // dihitung supaya total tetap dianggap kelipatan 50 & marker dikenali sbg batas periode.
    parseAfterSopRejectRetract(lines, headerIdx) {
        let rejects = 0, retracts = 0;
        for (let k = headerIdx + 1; k <= headerIdx + 10 && k < lines.length; k++) {
            const t = lines[k].trim();
            let m;
            if ((m = t.match(/^RETRACTS:\s*(\d+)/i))) retracts = parseInt(m[1], 10);
            else if ((m = t.match(/^REJECTS:\s*(\d+)/i))) rejects = parseInt(m[1], 10);
        }
        return { rejects, retracts };
    }

    // FIX (poin 6 dari user): ambil RETRACTS dari blok "CASH COUNTERS BEFORE SOP" milik
    // marker ini - itu adalah tally retrack yg terkumpul SEPANJANG periode yg BARU SAJA
    // BERAKHIR (periode sebelum marker ini), krn "BEFORE SOP" = kondisi kaset SEBELUM
    // dihitung ulang tapi SESUDAH "CLEAR CASH" (baris ini tercatat setelah CLEAR CASH,
    // sebelum "AFTER SOP"). Denom retrack tidak diketahui, jadi cuma jumlah lembar total.
    parseBeforeSopRetracts(lines, clearCashIdx, sopHeaderIdx) {
        for (let k = clearCashIdx + 1; k < sopHeaderIdx && k < lines.length; k++) {
            if (lines[k].includes('CASH COUNTERS BEFORE SOP')) {
                for (let j = k + 1; j <= k + 10 && j < sopHeaderIdx && j < lines.length; j++) {
                    const m = lines[j].trim().match(/^RETRACTS:\s*(\d+)/i);
                    if (m) return parseInt(m[1], 10);
                }
                return null;
            }
        }
        return null;
    }

    // --- Cari semua marker batas periode yang VALID (CLEAR CASH zero + AFTER SOP bulat kelipatan 50) ---
    findValidMarkers(lines) {
        const markers = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() !== 'CLEAR CASH') continue;
            if (!this.isValidClearCashZeroBlock(lines, i)) continue;

            let sopHeaderIdx = -1;
            for (let k = i + 1; k < lines.length && k < i + 300; k++) {
                if (lines[k].includes('CASH COUNTERS AFTER SOP')) {
                    sopHeaderIdx = k;
                    break;
                }
            }
            if (sopHeaderIdx === -1) continue; // tidak ada AFTER SOP terkait, lewati

            const values = this.parseAfterSopValues(lines, sopHeaderIdx);
            if (!values) continue;

            // FIX: validasi "BULAT" sekarang menjumlahkan REJECTS+RETRACTS dari blok yang
            // SAMA sebelum dicek kelipatan 50 (pola yg sudah benar di Wincor/ATM) - bukan
            // lagi mengecek tiap kaset satu-satu. Uang yg "hilang" dari kaset krn reject/
            // retrack test-dispense teknisi masih di dalam mesin, jadi tetap dihitung disini
            // supaya marker ini tetap dikenali sbg batas periode yg sah.
            const { rejects, retracts } = this.parseAfterSopRejectRetract(lines, sopHeaderIdx);
            const grandTotal = values[0] + values[1] + values[2] + values[3] + rejects + retracts;
            if (grandTotal % 50 !== 0) continue; // dianggap koreksi tengah periode RPL, bukan batas periode

            // FIX (konfirmasi user): saldo REPLENISH jangan ikut berkurang gara2 reject/
            // retrack test-dispense - uangnya masih di dalam mesin. Denom reject/retrack
            // tidak tercatat di log, tapi bisa disimpulkan: kaset yg BELUM kelipatan 50
            // pasti itu yg "kehilangan" reject/retrack-nya (kaset yg sudah bulat, termasuk
            // kaset nonaktif "0*", tidak disentuh). Pool reject+retrack dipakai secukupnya
            // per kaset (urut kaset 1-4) sampai bulat, sisa pool (kalau ada) tidak dipaksakan
            // ke kaset yg sudah bulat supaya tidak mengarang uang yg tidak semestinya ada.
            const adjustedValues = values.slice();
            let pool = rejects + retracts;
            for (let vi = 0; vi < 4 && pool > 0; vi++) {
                const shortfall = (50 - (adjustedValues[vi] % 50)) % 50;
                if (shortfall === 0) continue;
                const apply = Math.min(shortfall, pool);
                adjustedValues[vi] += apply;
                pool -= apply;
            }

            const dateMatch = lines[sopHeaderIdx].match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})/);
            let formattedDate = '-';
            if (dateMatch) {
                const [day, month, year] = dateMatch[1].split('/');
                formattedDate = `${day}/${month}/${year.slice(-2)}`;
            }

            markers.push({
                clearCashIndex: i,
                sopIndex: sopHeaderIdx,
                date: formattedDate,
                init100: adjustedValues[0] + adjustedValues[1],
                init50: adjustedValues[2] + adjustedValues[3],
                beforeSopRetracts: this.parseBeforeSopRetracts(lines, i, sopHeaderIdx),
            });
        }
        return markers;
    }

    // --- Bentuk periode dari pasangan marker valid yang berurutan, filter hanya yang ada transaksi dispense ---
    findReplenishmentPeriods(lines) {
        const markers = this.findValidMarkers(lines);
        const periods = [];

        for (let i = 0; i < markers.length - 1; i++) {
            const startIdx = markers[i].sopIndex;
            const endIdx = markers[i + 1].clearCashIndex;

            let hasDispense = false;
            for (let j = startIdx + 1; j < endIdx; j++) {
                if (lines[j].includes('CASH REQUEST:')) {
                    hasDispense = true;
                    break;
                }
            }
            if (!hasDispense) continue;

            periods.push({
                startIndex: startIdx,
                endIndex: endIdx,
                startDate: markers[i].date,
                endDate: markers[i + 1].date,
                init100: markers[i].init100,
                init50: markers[i].init50,
                displayText: `${markers[i].date} - ${markers[i + 1].date}`,
                retrackLembar: markers[i + 1].beforeSopRetracts,
            });
        }

        // FIX Poin 1: sebelumnya Dinabold WAJIB 2 marker valid berurutan (marker
        // terakhir tanpa penutup selalu diabaikan). Sekarang marker terakhir tetap
        // dibentuk jadi periode, label akhir = tanggal transaksi terakhir (dispense/setor).
        if (markers.length > 0) {
            const lastMarker = markers[markers.length - 1];
            const startIdx = lastMarker.sopIndex;
            const endIdx = lines.length;

            let hasDispense = false;
            for (let j = startIdx + 1; j < endIdx; j++) {
                if (lines[j].includes('CASH REQUEST:')) {
                    hasDispense = true;
                    break;
                }
            }

            if (hasDispense) {
                const finalEndDate = dinaboldLastTrxDate(lines, startIdx, endIdx) || lastMarker.date;
                periods.push({
                    startIndex: startIdx,
                    endIndex: endIdx,
                    startDate: lastMarker.date,
                    endDate: null,
                    init100: lastMarker.init100,
                    init50: lastMarker.init50,
                    displayText: `${lastMarker.date} - ${finalEndDate}`,
                    retrackLembar: null, // periode masih terbuka, belum ada marker penutup
                });
            }
        }
        return periods;
    }

    // --- Resolusi batas baris [start,end] untuk 1 periode (atau fallback bila period=null) ---
    // FIX: tsStart/tsEnd = batas waktu ASLI periode (dari marker SOP/CLEAR CASH-nya
    // sendiri), dipakai calculateDISP/calculateDEP utk validasi silang - lihat blok
    // fix "RECON_*" di atas file ini. Melindungi dari transaksi yg secara INDEX
    // masuk rentang periode ini tapi waktu aslinya di luar (akibat urutan fisik
    // baris kurang presisi setelah gabung banyak file yg saling overlap).
    resolvePeriodBounds(lines, period = null) {
        if (period) {
            return { 
                start: period.startIndex + 1, 
                end: period.endIndex - 1,
                tsStart: reconParseMarkerTimestamp(lines[period.startIndex]),
                tsEnd: (period.endIndex < lines.length)
                    ? reconFindTransactionTimestampGeneric(lines, period.endIndex, 20, [0, 1, 2, -1, -2])
                    : null
            };
        }
        const markers = this.findValidMarkers(lines);
        if (markers.length >= 2) {
            const last = markers[markers.length - 1];
            const prev = markers[markers.length - 2];
            return {
                start: prev.sopIndex + 1, end: last.clearCashIndex - 1,
                tsStart: reconParseMarkerTimestamp(lines[prev.sopIndex]),
                tsEnd: reconFindTransactionTimestampGeneric(lines, last.clearCashIndex, 20, [0, 1, 2, -1, -2])
            };
        }
        if (markers.length === 1) {
            return {
                start: markers[0].sopIndex + 1, end: lines.length - 1,
                tsStart: reconParseMarkerTimestamp(lines[markers[0].sopIndex]), tsEnd: null
            };
        }
        return { start: 0, end: lines.length - 1, tsStart: null, tsEnd: null };
    }

    calculateDISP(lines, period = null) {
        const { start, end, tsStart, tsEnd } = this.resolvePeriodBounds(lines, period);
        let c1 = 0, c2 = 0, c3 = 0, c4 = 0;
        for (let i = start; i <= end; i++) {
            const m = lines[i].match(/CASH REQUEST:\s*(\d{2})(\d{2})(\d{2})(\d{2})/);
            if (m) {
                if (!reconIsWithinPeriod(lines, i, tsStart, tsEnd, reconFindTransactionTimestampGeneric)) continue;
                c1 += parseInt(m[1], 10);
                c2 += parseInt(m[2], 10);
                c3 += parseInt(m[3], 10);
                c4 += parseInt(m[4], 10);
            }
        }
        return [c1, c2, c3, c4];
    }

    totalDisp100(totals) { return totals[0] + totals[1]; }
    totalDisp50(totals) { return totals[2] + totals[3]; }

    // --- Deposit: anchor "Cash-In OK", scan MUNDUR ke baris IDR ... S/N: (bukan forward, untuk hindari salah tangkap baris dispense) ---
    calculateDEP(lines, period = null) {
        const { start, end, tsStart, tsEnd } = this.resolvePeriodBounds(lines, period);
        let totalDep100 = 0, totalDep50 = 0;
        for (let i = start; i <= end; i++) {
            if (!lines[i].includes('Cash-In OK')) continue;
            // Baris "Cash-In OK" sendiri sudah membawa timestamp dd/mm/yyyy hh:mm:ss -
            // validasi langsung dari baris ini sendiri, tidak perlu cari di sekitar.
            if (tsStart) {
                const ownTs = reconParseMarkerTimestamp(lines[i]);
                if (ownTs && (ownTs < tsStart || (tsEnd && ownTs >= tsEnd))) continue;
            }
            for (let j = i - 1; j >= start; j--) {
                const l = lines[j];
                if (l.includes('Cash-In OK') || l.includes('CASH REQUEST:')) break; // batas transaksi lain
                let m;
                if ((m = l.match(/IDR\s+100000\s+S\/N:\s*(.+)/))) {
                    totalDep100 += m[1].split(',').map(s => s.trim()).filter(s => s !== '').length;
                } else if ((m = l.match(/IDR\s+50000\s+S\/N:\s*(.+)/))) {
                    totalDep50 += m[1].split(',').map(s => s.trim()).filter(s => s !== '').length;
                }
                if (l.includes('SERIAL NUMBERS SUCCESSFULLY STORED FOR')) break; // awal blok deposit ini
            }
        }
        return [totalDep100, totalDep50];
    }

    calculateINIT(lines, period = null) {
        if (period) return [period.init100 || 0, period.init50 || 0];
        const markers = this.findValidMarkers(lines);
        if (markers.length === 0) return [0, 0];
        const last = markers[markers.length - 1];
        return [last.init100, last.init50];
    }

    calculateREM(lines, period = null) {
        const [d1, d2, d3, d4] = this.calculateDISP(lines, period);
        const [dep100, dep50] = this.calculateDEP(lines, period);
        const [init100, init50] = this.calculateINIT(lines, period);
        const rem100 = init100 - (d1 + d2) + dep100;
        const rem50 = init50 - (d3 + d4) + dep50;
        return [rem100, rem50];
    }

    findMachineID(lines) {
        for (const line of lines) {
            const m = line.match(/ATM ID\s*:\s*(\d+)/);
            if (m) return m[1];
        }
        return "Not Found";
    }

    // --- Validasi silang ke field AMOUNT transaksi (dicari beberapa baris setelah anchor) ---
    checkAmountValidation(lines, anchorIndex, end, computedAmount, type) {
        const limit = Math.min(end, anchorIndex + 15);
        for (let k = anchorIndex + 1; k <= limit; k++) {
            const m = lines[k].match(/AMOUNT\s*:\s*RP\s*([\d.,]+)/);
            if (m) {
                const declared = parseInt(m[1].replace(/[.,]/g, ''), 10);
                if (!isNaN(declared) && declared !== computedAmount) {
                    this.anomalies.push({ type, lineNumber: anchorIndex + 1, computed: computedAmount, declared });
                }
                return;
            }
        }
    }

    extractCashPresented(lines, period = null) {
        const { start, end } = this.resolvePeriodBounds(lines, period);
        const list = [];
        let total = 0;
        for (let i = start; i <= end; i++) {
            const m = lines[i].match(/CASH REQUEST:\s*(\d{2})(\d{2})(\d{2})(\d{2})/);
            if (m) {
                const c1 = parseInt(m[1], 10), c2 = parseInt(m[2], 10), c3 = parseInt(m[3], 10), c4 = parseInt(m[4], 10);
                const amount = (c1 + c2) * 100000 + (c3 + c4) * 50000;
                if (amount > 0) {
                    list.push(amount);
                    total += amount;
                    this.checkAmountValidation(lines, i, end, amount, 'DISPENSE');
                }
            }
        }
        return { count: list.length, total, list };
    }

    extractStoredCount(lines, period = null) {
        const { start, end } = this.resolvePeriodBounds(lines, period);
        const list = [];
        let total = 0;
        for (let i = start; i <= end; i++) {
            if (!lines[i].includes('Cash-In OK')) continue;
            let dep100count = 0, dep50count = 0;
            for (let j = i - 1; j >= start; j--) {
                const l = lines[j];
                if (l.includes('Cash-In OK') || l.includes('CASH REQUEST:')) break;
                let m;
                if ((m = l.match(/IDR\s+100000\s+S\/N:\s*(.+)/))) {
                    dep100count += m[1].split(',').map(s => s.trim()).filter(s => s !== '').length;
                } else if ((m = l.match(/IDR\s+50000\s+S\/N:\s*(.+)/))) {
                    dep50count += m[1].split(',').map(s => s.trim()).filter(s => s !== '').length;
                }
                if (l.includes('SERIAL NUMBERS SUCCESSFULLY STORED FOR')) break;
            }
            const amount = dep100count * 100000 + dep50count * 50000;
            if (amount > 0) {
                list.push(amount);
                total += amount;
                this.checkAmountValidation(lines, i, end, amount, 'DEPOSIT');
            }
        }
        return { count: list.length, total, list };
    }

    displayPeriods() {
        const periodDisplay = document.getElementById('dnPeriodDisplay');
        if (!periodDisplay) return;

        periodDisplay.innerHTML = '';
        periodDisplay.classList.remove('hidden');

        if (this.periods.length === 0) {
            periodDisplay.innerHTML = '<span class="period-label"><span class="badge">PERIODE</span> Tidak ditemukan periode dengan transaksi dispense</span>';
            return;
        }

        let defaultPeriodIndex = this.periods.length - 1;
        if (this.periods.length > 1) {
            const lastPeriod = this.periods[this.periods.length - 1];
            if (!lastPeriod.endDate) {
                // Periode terakhir adalah dangling (tanpa penutup RPL) -> default ke periode closed terakhir
                for (let k = this.periods.length - 2; k >= 0; k--) {
                    if (this.periods[k].endDate) { defaultPeriodIndex = k; break; }
                }
            }
        }

        this.periods.forEach((period, index) => {
            const button = document.createElement('button');
            button.textContent = period.displayText;
            button.className = 'period-btn dn';

            if (index === defaultPeriodIndex) {
                button.classList.add('active');
                this.currentPeriod = period;
                this.updateSelectedPeriodUI(period);
            } else if (this.currentPeriod && this.currentPeriod.displayText === period.displayText) {
                button.classList.add('active');
            }

            button.addEventListener('click', () => {
                this.currentPeriod = period;
                document.querySelectorAll('#dnPeriodDisplay .period-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.updateSelectedPeriodUI(period);
                this.analyzePeriod(period);
            });

            periodDisplay.appendChild(button);
        });

        if (this.currentPeriod) {
            this.analyzePeriod(this.currentPeriod);
        }
    }

    updateSelectedPeriodUI(period) {
        const selectedDiv = document.getElementById('dnPeriodSelected');
        const selectedText = document.getElementById('dnSelectedPeriodText');
        if (selectedDiv && selectedText) {
            selectedDiv.classList.remove('hidden');
            selectedText.textContent = period.displayText;
        }
    }

    filterData() {
        if (!this.logInput) return;
        const logInput = cleanAnsiCodes(this.logInput.value);
        const lines = logInput.split('\n');
        const machineID = this.findMachineID(lines);
        this.machineDisplay.innerHTML = `<span class="w-2 h-2 bg-accent rounded-full animate-pulse"></span> MACHINE: ${machineID}`;

        this.periods = this.findReplenishmentPeriods(lines);
        this.displayPeriods();
    }

    analyzePeriod(period) {
        const logInput = cleanAnsiCodes(this.logInput.value);
        const lines = logInput.split('\n');
        this.anomalies = [];

        const [d1, d2, d3, d4] = this.calculateDISP(lines, period);
        const [dep100, dep50] = this.calculateDEP(lines, period);
        const [init100, init50] = this.calculateINIT(lines, period);
        const [rem100, rem50] = this.calculateREM(lines, period);

        this.dnInit100.textContent = init100;
        this.dnInit50.textContent = init50;
        this.dnDisp100.textContent = this.totalDisp100([d1, d2, d3, d4]);
        this.dnDisp50.textContent = this.totalDisp50([d1, d2, d3, d4]);
        this.dnDep100.textContent = dep100;
        this.dnDep50.textContent = dep50;
        this.dnRem100.textContent = rem100;
        this.dnRem50.textContent = rem50;

        // FIX poin 6: RETRACK sekarang fungsional - jumlah lembar (bukan per-denom, krn
        // denomnya tidak diketahui dari log), diambil dari kolom RETRACTS pada blok
        // "CASH COUNTERS BEFORE SOP" milik marker penutup periode ini. Periode yg masih
        // terbuka (belum ada marker penutup) tampilkan "-" krn datanya belum tersedia.
        if (this.dnRetrackLembar) {
            this.dnRetrackLembar.textContent = (period.retrackLembar === null || period.retrackLembar === undefined)
                ? '-' : period.retrackLembar;
        }

        const initAmount = (init100 * 100000) + (init50 * 50000);
        const dispAmount = (this.totalDisp100([d1, d2, d3, d4]) * 100000) + (this.totalDisp50([d1, d2, d3, d4]) * 50000);
        const depAmount = (dep100 * 100000) + (dep50 * 50000);
        const remAmount = (rem100 * 100000) + (rem50 * 50000);

        this.dnInitAmount.textContent = initAmount.toLocaleString('id-ID');
        this.dnDispAmount.textContent = dispAmount.toLocaleString('id-ID');
        this.dnDepAmount.textContent = depAmount.toLocaleString('id-ID');
        this.dnRemAmount.textContent = remAmount.toLocaleString('id-ID');

        const cashPresented = this.extractCashPresented(lines, period);
        this.dnCashPresentedCount.textContent = cashPresented.count;
        this.dnCashPresentedTotal.textContent = cashPresented.total.toLocaleString('id-ID');
        this.dnCashPresentedList.innerHTML = '';
        cashPresented.list.forEach(amount => {
            const li = document.createElement('li');
            li.textContent = amount.toLocaleString('id-ID');
            li.classList.add('py-1', 'border-b', 'border-slate-800/50');
            this.dnCashPresentedList.appendChild(li);
        });

        const storedCountData = this.extractStoredCount(lines, period);
        this.dnStoredCountCount.textContent = storedCountData.count;
        this.dnStoredCountTotal.textContent = storedCountData.total.toLocaleString('id-ID');
        this.dnStoredCountList.innerHTML = '';
        storedCountData.list.forEach(amount => {
            const li = document.createElement('li');
            li.textContent = amount.toLocaleString('id-ID');
            li.classList.add('py-1', 'border-b', 'border-slate-800/50');
            this.dnStoredCountList.appendChild(li);
        });

        if (this.dnValidationInfo) {
            const totalTx = cashPresented.count + storedCountData.count;
            if (this.anomalies.length === 0) {
                this.dnValidationInfo.textContent = `✓ Validasi AMOUNT: seluruh ${totalTx} transaksi cocok.`;
                this.dnValidationInfo.classList.remove('text-danger');
                this.dnValidationInfo.classList.add('text-slate-500');
            } else {
                this.dnValidationInfo.textContent = `⚠ Validasi AMOUNT: ${this.anomalies.length} dari ${totalTx} transaksi tidak cocok (lihat console browser untuk detail baris).`;
                this.dnValidationInfo.classList.remove('text-slate-500');
                this.dnValidationInfo.classList.add('text-danger');
                console.warn('CRM DINABOLD - Anomali validasi AMOUNT:', this.anomalies);
            }
        }

        const phys100 = parseInt(this.dnPhys100.value) || 0;
        const phys50 = parseInt(this.dnPhys50.value) || 0;
        const totalPhys = (phys100 * 100000) + (phys50 * 50000);

        if (this.dnPhys100.value === "" && this.dnPhys50.value === "") {
            this.dnTotalPhysAmount.textContent = "MENUNGGU INPUT";
            this.dnTotalPhysAmount.classList.add("text-sm");
        } else {
            this.dnTotalPhysAmount.textContent = totalPhys.toLocaleString('id-ID');
            this.dnTotalPhysAmount.classList.remove("text-sm");
        }

        if (this.dnPhys100.value !== "" || this.dnPhys50.value !== "") {
            updateReconciliationTable(phys100, rem100, "dnResPhys100");
            updateReconciliationTable(phys50, rem50, "dnResPhys50");
            updateReconciliationUI(totalPhys, remAmount, "dnTotalReconBox", "dnTotalReconResult", "dnExpression");
        }
    }
}

// ============================================================
// CRM OKI (OKY) CLASS - MODUL BARU, TERISOLASI PENUH
// Struktur log MIRIP CRM HITACHI: dispense = "Request Count [c1,c2,c3,c4]",
// deposit = baris "Stored Count" (berdiri sendiri) diikuti "[100000, N]"/"[50000, N]".
// Konvensi kaset SAMA seperti Hitachi: slot 1&2 = IDR100.000, slot 3&4 = IDR50.000
// (divalidasi dari field "Denomination [A,A,B,B]" pada log Oki yang selalu
// memetakan 2 slot pertama ke kaset IDR100K dan 2 slot terakhir ke IDR50.000).
//
// Marker REPLENISH milik Oki SENDIRI (beda dari Hitachi/Dinabold): baris
// 'Replenishment' berdiri sendiri, diikuti baris 'Serial No.xxx  Date:dd/mm/yyyy hh:mm:ss',
// lalu header kaset "Cas A B C D E" / "IDR100K IDR100K IDR50000 IDR50000 ALL",
// dan baris 'Cnt v1 v2 v3 v4 v5' (v1,v2 = lembar 100rb ; v3,v4 = lembar 50rb ;
// v5 = kolom reject/ALL, diabaikan). Nilai Cnt inilah yang dipakai sbg INIT
// (saldo awal periode berikutnya) - sama persis konsepnya dgn "AFTER SOP" Dinabold.
// ============================================================
class DataFilterCRMOky {
    constructor() {
        this.logInput = document.getElementById('okyLogInput');
        this.filterButton = document.getElementById('okyFilterButton');
        this.machineDisplay = document.getElementById('okyMachineDisplay');
        this.okyPhys100 = document.getElementById('okyPhys100');
        this.okyPhys50 = document.getElementById('okyPhys50');

        this.okyInit100 = document.getElementById('okyInit100');
        this.okyInit50 = document.getElementById('okyInit50');
        this.okyDisp100 = document.getElementById('okyDisp100');
        this.okyDisp50 = document.getElementById('okyDisp50');
        this.okyDep100 = document.getElementById('okyDep100');
        this.okyDep50 = document.getElementById('okyDep50');
        this.okyRem100 = document.getElementById('okyRem100');
        this.okyRem50 = document.getElementById('okyRem50');

        this.okyInitAmount = document.getElementById('okyInitAmount');
        this.okyDispAmount = document.getElementById('okyDispAmount');
        this.okyDepAmount = document.getElementById('okyDepAmount');
        this.okyRemAmount = document.getElementById('okyRemAmount');
        this.okyTotalPhysAmount = document.getElementById('okyTotalPhysAmount');

        this.okyCashPresentedCount = document.getElementById('okyCashPresentedCount');
        this.okyCashPresentedTotal = document.getElementById('okyCashPresentedTotal');
        this.okyCashPresentedList = document.getElementById('okyCashPresentedList');
        this.okyStoredCountCount = document.getElementById('okyStoredCountCount');
        this.okyStoredCountTotal = document.getElementById('okyStoredCountTotal');
        this.okyStoredCountList = document.getElementById('okyStoredCountList');

        this.periods = [];
        this.currentPeriod = null;

        if (this.filterButton) {
            this.filterButton.addEventListener('click', () => this.filterData());
        }
    }

    // --- Ambil 4 nilai kaset (100K,100K,50K,50K) dari baris 'Cnt v1 v2 v3 v4 v5' setelah 'Replenishment' ---
    parseReplenishCnt(lines, replIdx) {
        for (let k = replIdx + 1; k <= replIdx + 12 && k < lines.length; k++) {
            const m = lines[k].match(/^\s*Cnt\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
            if (m) {
                return {
                    init100: parseInt(m[1], 10) + parseInt(m[2], 10),
                    init50: parseInt(m[3], 10) + parseInt(m[4], 10)
                };
            }
        }
        return null;
    }

    // --- Cari semua marker REPLENISH valid (baris 'Replenishment' + baris 'Cnt' ditemukan berdekatan) ---
    findValidMarkers(lines) {
        const markers = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() !== 'Replenishment') continue;

            let dm = null;
            for (let k = i + 1; k <= i + 5 && k < lines.length; k++) {
                const m = lines[k].match(/Date\s*:\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
                if (m) { dm = m; break; }
            }
            if (!dm) continue;

            const cnt = this.parseReplenishCnt(lines, i);
            if (!cnt) continue;

            const formattedDate = `${dm[1]}/${dm[2]}/${dm[3].slice(-2)}`;
            markers.push({
                replIndex: i,
                date: formattedDate,
                init100: cnt.init100,
                init50: cnt.init50
            });
        }
        return markers;
    }

    findReplenishmentPeriods(lines) {
        const markers = this.findValidMarkers(lines);
        const periods = [];

        for (let i = 0; i < markers.length - 1; i++) {
            const startIdx = markers[i].replIndex;
            const endIdx = markers[i + 1].replIndex;

            let hasDispense = false;
            for (let j = startIdx + 1; j < endIdx; j++) {
                if (lines[j].trim().indexOf('Request Count') === 0) { hasDispense = true; break; }
            }
            if (!hasDispense) continue;

            periods.push({
                startIndex: startIdx,
                endIndex: endIdx,
                startDate: markers[i].date,
                endDate: markers[i + 1].date,
                init100: markers[i].init100,
                init50: markers[i].init50,
                displayText: `${markers[i].date} - ${markers[i + 1].date}`
            });
        }

        // FIX Poin 1 (standarisasi label periode tanpa penutup): marker terakhir tetap
        // dibentuk jadi periode, label akhir = tanggal transaksi terakhir yang ditemukan.
        if (markers.length > 0) {
            const lastMarker = markers[markers.length - 1];
            const startIdx = lastMarker.replIndex;
            const endIdx = lines.length;

            let hasDispense = false;
            for (let j = startIdx + 1; j < endIdx; j++) {
                if (lines[j].trim().indexOf('Request Count') === 0) { hasDispense = true; break; }
            }

            if (hasDispense) {
                const finalEndDate = okyLastTrxDate(lines, startIdx, endIdx) || lastMarker.date;
                periods.push({
                    startIndex: startIdx,
                    endIndex: endIdx,
                    startDate: lastMarker.date,
                    endDate: null,
                    init100: lastMarker.init100,
                    init50: lastMarker.init50,
                    displayText: `${lastMarker.date} - ${finalEndDate}`
                });
            }
        }
        return periods;
    }

    // Marker "Replenishment" sendiri bare label (tanpa timestamp inline) - tanggal
    // & jam aslinya ada di baris "Date : dd/mm/yyyy hh:mm:ss" tak lama setelahnya
    // (lihat findValidMarkers/summaryExtractOky). Dipakai utk tsStart/tsEnd FIX
    // validasi silang waktu, sama prinsipnya dgn Hitachi/Dinabold.
    findMarkerTimestamp(lines, replIndex) {
        for (let k = replIndex + 1; k <= replIndex + 5 && k < lines.length; k++) {
            const m = lines[k].match(/Date\s*:\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
            if (m) return buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
        }
        return null;
    }

    resolvePeriodBounds(lines, period = null) {
        if (period) {
            return {
                start: period.startIndex + 1, end: period.endIndex - 1,
                tsStart: this.findMarkerTimestamp(lines, period.startIndex),
                tsEnd: (period.endIndex < lines.length) ? this.findMarkerTimestamp(lines, period.endIndex) : null
            };
        }
        const markers = this.findValidMarkers(lines);
        if (markers.length >= 2) {
            const last = markers[markers.length - 1];
            const prev = markers[markers.length - 2];
            return {
                start: prev.replIndex + 1, end: last.replIndex - 1,
                tsStart: this.findMarkerTimestamp(lines, prev.replIndex),
                tsEnd: this.findMarkerTimestamp(lines, last.replIndex)
            };
        }
        if (markers.length === 1) {
            return {
                start: markers[0].replIndex + 1, end: lines.length - 1,
                tsStart: this.findMarkerTimestamp(lines, markers[0].replIndex), tsEnd: null
            };
        }
        return { start: 0, end: lines.length - 1, tsStart: null, tsEnd: null };
    }

    calculateDISP(lines, period = null) {
        const { start, end, tsStart, tsEnd } = this.resolvePeriodBounds(lines, period);
        let c1 = 0, c2 = 0, c3 = 0, c4 = 0;
        for (let i = start; i <= end; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.indexOf('Request Count') !== 0) continue;
            // FIX: pakai reconFindOkyTransactionTimestamp (jam mentah), BUKAN default
            // (struk TANGGAL/WAKTU) - struk Oki terbukti tertinggal 2 jam dari jam mentah,
            // sedangkan tsStart/tsEnd sendiri berbasis jam mentah (lihat findMarkerTimestamp).
            if (!reconIsWithinPeriod(lines, i, tsStart, tsEnd, reconFindOkyTransactionTimestamp)) continue;
            // FIX (presisi lembar): "Request Count" = permintaan AWAL (bisa beda dari fisik
            // yg benar2 keluar kalau kaset kehabisan di tengah transaksi - terverifikasi dari
            // data asli: Request 15 lembar 50rb, tapi kaset C cuma sisa 6 -> Dispense Count
            // jadi [0,0,6,7]=13 lembar riil, sementara Amount tetap ikut Request(15) krn itu
            // yg disetujui host/dibebankan ke nasabah). Utk REM (sisa uang FISIK di kaset),
            // yg harus dipakai adalah "Dispense Count" (baris tepat setelah Request Count) -
            // itu representasi NYATA lembar yg pindah dari kaset, bukan jumlah yg diminta.
            const dispLine = lines[i + 1];
            const dm = dispLine && dispLine.trim().match(/^Dispense Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
            if (dm) {
                c1 += parseInt(dm[1], 10); c2 += parseInt(dm[2], 10);
                c3 += parseInt(dm[3], 10); c4 += parseInt(dm[4], 10);
            } else {
                // fallback kalau format baris Dispense Count tidak ketemu persis di posisi +1
                const m = trimmed.match(/Request Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
                if (m) {
                    c1 += parseInt(m[1], 10); c2 += parseInt(m[2], 10);
                    c3 += parseInt(m[3], 10); c4 += parseInt(m[4], 10);
                }
            }
        }
        return [c1, c2, c3, c4];
    }

    totalDisp100(totals) { return totals[0] + totals[1]; }
    totalDisp50(totals) { return totals[2] + totals[3]; }

    calculateDEP(lines, period = null) {
        const { start, end, tsStart, tsEnd } = this.resolvePeriodBounds(lines, period);
        let dep100 = 0, dep50 = 0;
        for (let i = start; i <= end; i++) {
            if (lines[i].trim() !== 'Stored Count') continue; // hindari salah tangkap baris inline 'Store Count [..]'
            // FIX: sama seperti calculateDISP - pakai jam mentah, bukan struk TANGGAL/WAKTU.
            if (!reconIsWithinPeriod(lines, i, tsStart, tsEnd, reconFindOkyTransactionTimestamp)) continue;
            for (let j = i + 1; j <= end; j++) {
                const nl = lines[j];
                if (nl.includes('[100000')) {
                    const mm = nl.match(/\[100000\s*,\s*(\d+)\s*\]/);
                    if (mm) dep100 += parseInt(mm[1], 10);
                } else if (nl.includes('[50000')) {
                    const mm = nl.match(/\[50000\s*,\s*(\d+)\s*\]/);
                    if (mm) dep50 += parseInt(mm[1], 10);
                } else if (nl.trim() === 'Stored Count' || nl.includes('Replenishment') || nl.trim().indexOf('Request Count') === 0) {
                    break;
                }
            }
        }
        return [dep100, dep50];
    }

    calculateINIT(lines, period = null) {
        if (period) return [period.init100 || 0, period.init50 || 0];
        const markers = this.findValidMarkers(lines);
        if (markers.length === 0) return [0, 0];
        const last = markers[markers.length - 1];
        return [last.init100, last.init50];
    }

    calculateREM(lines, period = null) {
        const [c1, c2, c3, c4] = this.calculateDISP(lines, period);
        const [dep100, dep50] = this.calculateDEP(lines, period);
        const [init100, init50] = this.calculateINIT(lines, period);
        const rem100 = init100 - (c1 + c2) + dep100;
        const rem50 = init50 - (c3 + c4) + dep50;
        return [rem100, rem50];
    }

    findMachineID(lines) {
        for (const line of lines) {
            const m = line.match(/ATM ID\s*:\s*(\d+)/);
            if (m) return m[1];
        }
        return "Not Found";
    }

    extractCashPresented(lines, period = null) {
        const { start, end } = this.resolvePeriodBounds(lines, period);
        const list = [];
        let total = 0;
        for (let i = start; i <= end; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.indexOf('Request Count') !== 0) continue;
            // FIX: samakan dgn calculateDISP - pakai Dispense Count (fisik riil), bukan
            // Request Count (permintaan awal, bisa lebih tinggi dari fisik kalau kaset
            // kehabisan di tengah transaksi).
            const dispLine = lines[i + 1];
            const dm = dispLine && dispLine.trim().match(/^Dispense Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
            let c1, c2, c3, c4;
            if (dm) {
                c1 = parseInt(dm[1], 10); c2 = parseInt(dm[2], 10); c3 = parseInt(dm[3], 10); c4 = parseInt(dm[4], 10);
            } else {
                const m = trimmed.match(/Request Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
                if (!m) continue;
                c1 = parseInt(m[1], 10); c2 = parseInt(m[2], 10); c3 = parseInt(m[3], 10); c4 = parseInt(m[4], 10);
            }
            const amount = (c1 + c2) * 100000 + (c3 + c4) * 50000;
            if (amount > 0) { list.push(amount); total += amount; }
        }
        return { count: list.length, total, list };
    }

    extractStoredCount(lines, period = null) {
        const { start, end } = this.resolvePeriodBounds(lines, period);
        const [dep100, dep50] = this.calculateDEP(lines, period);
        const totalAmount = dep100 * 100000 + dep50 * 50000;
        const list = [];
        for (let i = start; i <= end; i++) {
            if (lines[i].trim() !== 'Stored Count') continue;
            for (let j = i + 1; j <= end; j++) {
                const nl = lines[j];
                if (nl.includes('[100000')) {
                    const mm = nl.match(/\[100000\s*,\s*(\d+)\s*\]/);
                    if (mm) list.push(parseInt(mm[1], 10) * 100000);
                } else if (nl.includes('[50000')) {
                    const mm = nl.match(/\[50000\s*,\s*(\d+)\s*\]/);
                    if (mm) list.push(parseInt(mm[1], 10) * 50000);
                } else if (nl.trim() === 'Stored Count' || nl.includes('Replenishment') || nl.trim().indexOf('Request Count') === 0) {
                    break;
                }
            }
        }
        return { count: list.length, total: totalAmount, list };
    }

    displayPeriods() {
        const periodDisplay = document.getElementById('okyPeriodDisplay');
        if (!periodDisplay) return;

        periodDisplay.innerHTML = '';
        periodDisplay.classList.remove('hidden');

        if (this.periods.length === 0) {
            periodDisplay.innerHTML = '<span class="period-label"><span class="badge">PERIODE</span> Tidak ditemukan periode dengan transaksi dispense</span>';
            return;
        }

        let defaultPeriodIndex = this.periods.length - 1;
        if (this.periods.length > 1) {
            const lastPeriod = this.periods[this.periods.length - 1];
            if (!lastPeriod.endDate) {
                for (let k = this.periods.length - 2; k >= 0; k--) {
                    if (this.periods[k].endDate) { defaultPeriodIndex = k; break; }
                }
            }
        }

        this.periods.forEach((period, index) => {
            const button = document.createElement('button');
            button.textContent = period.displayText;
            button.className = 'period-btn oky';

            if (index === defaultPeriodIndex) {
                button.classList.add('active');
                this.currentPeriod = period;
                this.updateSelectedPeriodUI(period);
            } else if (this.currentPeriod && this.currentPeriod.displayText === period.displayText) {
                button.classList.add('active');
            }

            button.addEventListener('click', () => {
                this.currentPeriod = period;
                document.querySelectorAll('#okyPeriodDisplay .period-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.updateSelectedPeriodUI(period);
                this.analyzePeriod(period);
            });

            periodDisplay.appendChild(button);
        });

        if (this.currentPeriod) {
            this.analyzePeriod(this.currentPeriod);
        }
    }

    updateSelectedPeriodUI(period) {
        const selectedDiv = document.getElementById('okyPeriodSelected');
        const selectedText = document.getElementById('okySelectedPeriodText');
        if (selectedDiv && selectedText) {
            selectedDiv.classList.remove('hidden');
            selectedText.textContent = period.displayText;
        }
    }

    filterData() {
        if (!this.logInput) return;
        const logInput = cleanAnsiCodes(this.logInput.value);
        const lines = logInput.split('\n');
        const machineID = this.findMachineID(lines);
        this.machineDisplay.innerHTML = `<span class="w-2 h-2 bg-accent rounded-full animate-pulse"></span> MACHINE: ${machineID}`;

        this.periods = this.findReplenishmentPeriods(lines);
        this.displayPeriods();
    }

    analyzePeriod(period) {
        const logInput = cleanAnsiCodes(this.logInput.value);
        const lines = logInput.split('\n');

        const [c1, c2, c3, c4] = this.calculateDISP(lines, period);
        const [dep100, dep50] = this.calculateDEP(lines, period);
        const [init100, init50] = this.calculateINIT(lines, period);
        const [rem100, rem50] = this.calculateREM(lines, period);

        this.okyInit100.textContent = init100;
        this.okyInit50.textContent = init50;
        this.okyDisp100.textContent = this.totalDisp100([c1, c2, c3, c4]);
        this.okyDisp50.textContent = this.totalDisp50([c1, c2, c3, c4]);
        this.okyDep100.textContent = dep100;
        this.okyDep50.textContent = dep50;
        this.okyRem100.textContent = rem100;
        this.okyRem50.textContent = rem50;

        const initAmount = init100 * 100000 + init50 * 50000;
        const dispAmount = this.totalDisp100([c1, c2, c3, c4]) * 100000 + this.totalDisp50([c1, c2, c3, c4]) * 50000;
        const depAmount = dep100 * 100000 + dep50 * 50000;
        const remAmount = rem100 * 100000 + rem50 * 50000;

        this.okyInitAmount.textContent = initAmount.toLocaleString('id-ID');
        this.okyDispAmount.textContent = dispAmount.toLocaleString('id-ID');
        this.okyDepAmount.textContent = depAmount.toLocaleString('id-ID');
        this.okyRemAmount.textContent = remAmount.toLocaleString('id-ID');

        const cashPresented = this.extractCashPresented(lines, period);
        this.okyCashPresentedCount.textContent = cashPresented.count;
        this.okyCashPresentedTotal.textContent = cashPresented.total.toLocaleString('id-ID');
        this.okyCashPresentedList.innerHTML = '';
        cashPresented.list.forEach(amount => {
            const li = document.createElement('li');
            li.textContent = amount.toLocaleString('id-ID');
            li.classList.add('py-1', 'border-b', 'border-slate-800/50');
            this.okyCashPresentedList.appendChild(li);
        });

        const storedCountData = this.extractStoredCount(lines, period);
        this.okyStoredCountCount.textContent = storedCountData.count;
        this.okyStoredCountTotal.textContent = storedCountData.total.toLocaleString('id-ID');
        this.okyStoredCountList.innerHTML = '';
        storedCountData.list.forEach(amount => {
            const li = document.createElement('li');
            li.textContent = amount.toLocaleString('id-ID');
            li.classList.add('py-1', 'border-b', 'border-slate-800/50');
            this.okyStoredCountList.appendChild(li);
        });

        const phys100 = parseInt(this.okyPhys100.value) || 0;
        const phys50 = parseInt(this.okyPhys50.value) || 0;
        const totalPhys = phys100 * 100000 + phys50 * 50000;

        if (this.okyPhys100.value === "" && this.okyPhys50.value === "") {
            this.okyTotalPhysAmount.textContent = "MENUNGGU INPUT";
            this.okyTotalPhysAmount.classList.add("text-sm");
        } else {
            this.okyTotalPhysAmount.textContent = totalPhys.toLocaleString('id-ID');
            this.okyTotalPhysAmount.classList.remove("text-sm");
        }

        if (this.okyPhys100.value !== "" || this.okyPhys50.value !== "") {
            updateReconciliationTable(phys100, rem100, "okyResPhys100");
            updateReconciliationTable(phys50, rem50, "okyResPhys50");
            updateReconciliationUI(totalPhys, remAmount, "okyTotalReconBox", "okyTotalReconResult", "okyExpression");
        }
    }
}

// ============================================================
// CRM HYOSUNG (MODUL BARU) - MODUL TERISOLASI PENUH, tidak mewarisi/mengubah
// class CRM lain. Ditambahkan atas permintaan user, dianalisis langsung dari
// sample EJ log asli (EJ_CRM_Hyosung.jrn, 8 hari data, ~305rb baris).
//
// Struktur log MIRIP ATM Hyosung (marker "ADD CASH:" bare label, jam mentah
// di baris SEBELUMNYA, baris kaset "NCST:jumlah"), TAPI mesin ini recycler
// 2-arah (dispense+deposit) dgn 4 kaset didedikasikan ke 2 denominasi TETAP -
// ikut konvensi CRM yang sudah baku di aplikasi ini (SAMA seperti
// Hitachi/Dinabold/Oki, dikonfirmasi user & tervalidasi dari data asli lewat
// baris "RCY IDR 100K"/"RCY IDR 50K" pada blok "Print Cash" log):
//   kaset 1 & 2 = IDR 100.000, kaset 3 & 4 = IDR 50.000.
// TIDAK memakai deteksi 1-denominasi-per-mesin ala ATM Hyosung (detectHyosungDenom).
//
// Marker REPLENISH: baris "ADD CASH:" diikuti 4 baris "NCST:jumlah" (1CST/2CST/
// 3CST/4CST) - INIT per kaset diambil LANGSUNG dari nilai ini (beda dari ATM
// Hyosung yg mewajibkan tiap kaset persis 2000/0 - di CRM ini nilainya bervariasi
// sesuai denominasi, mis. 2000/2000/1000/1000).
//
// Dispense: "Request Count [c1,c2,c3,c4]" diikuti "Dispense Count [c1,c2,c3,c4]"
// tepat 1 baris berikutnya - pakai Dispense Count (fisik riil keluar dari kaset),
// sama seperti fix presisi lembar Oki (lihat komentar calculateDISP Oki).
//
// Deposit: "Store Count [c1,c2,c3,c4]" - beda format dari Hitachi/Oki ("Stored
// Count" baris tunggal + lookahead "[100000,N]"/"[50000,N]") - di sini SUDAH
// bracket 4-kolom langsung dalam 1 baris, tidak perlu lookahead multi-baris.
//
// Timestamp: tsStart/tsEnd (dari marker ADD CASH) & validasi tiap transaksi
// SAMA-SAMA pakai jam MENTAH (baris "DD/MM/YYYY HH:MM:SS" terdekat) - BUKAN
// struk TANGGAL/WAKTU - supaya basis jamnya konsisten satu sama lain (pelajaran
// dari fix Oki, lihat reconFindOkyTransactionTimestamp).
//
// CATATAN VALIDASI (penting): kolom DISPENSED tervalidasi 100% cocok persis dgn
// laporan "Print Cash" internal log pada 4 periode yang diuji. Kolom DEPOSITED
// dihitung LANGSUNG dari total tiap transaksi setor individual (metode paling
// akurat sesuai arahan user - "temukan & hitung satu-persatu tiap transaksi").
// Nilai ini bisa terpaut kecil (~0.05%-1.5%) dari angka "DEP AMOUNT" versi
// laporan Print Cash internal mesin - user sendiri mengonfirmasi laporan Print
// Cash TIDAK selalu akurat, kemungkinan krn sebagian uang setoran disortir mesin
// ke kaset "MIX" di luar kaset 1-4 sehingga tidak tercermin di kolom kaset
// laporan tsb, sementara transaksi individual (yang dipakai di sini) tetap
// mencatat nilai setor penuh yang disetujui/dibebankan ke rekening nasabah.
// ============================================================
class DataFilterCRMHyosung {
    constructor() {
        this.logInput = document.getElementById('crmHyosungLogInput');
        this.filterButton = document.getElementById('crmHyosungFilterButton');
        this.machineDisplay = document.getElementById('crmHyosungMachineDisplay');
        this.crmHyosungPhys100 = document.getElementById('crmHyosungPhys100');
        this.crmHyosungPhys50 = document.getElementById('crmHyosungPhys50');

        this.crmHyosungInit100 = document.getElementById('crmHyosungInit100');
        this.crmHyosungInit50 = document.getElementById('crmHyosungInit50');
        this.crmHyosungDisp100 = document.getElementById('crmHyosungDisp100');
        this.crmHyosungDisp50 = document.getElementById('crmHyosungDisp50');
        this.crmHyosungDep100 = document.getElementById('crmHyosungDep100');
        this.crmHyosungDep50 = document.getElementById('crmHyosungDep50');
        this.crmHyosungRem100 = document.getElementById('crmHyosungRem100');
        this.crmHyosungRem50 = document.getElementById('crmHyosungRem50');

        this.crmHyosungInitAmount = document.getElementById('crmHyosungInitAmount');
        this.crmHyosungDispAmount = document.getElementById('crmHyosungDispAmount');
        this.crmHyosungDepAmount = document.getElementById('crmHyosungDepAmount');
        this.crmHyosungRemAmount = document.getElementById('crmHyosungRemAmount');
        this.crmHyosungTotalPhysAmount = document.getElementById('crmHyosungTotalPhysAmount');

        this.crmHyosungCashPresentedCount = document.getElementById('crmHyosungCashPresentedCount');
        this.crmHyosungCashPresentedTotal = document.getElementById('crmHyosungCashPresentedTotal');
        this.crmHyosungCashPresentedList = document.getElementById('crmHyosungCashPresentedList');
        this.crmHyosungStoredCountCount = document.getElementById('crmHyosungStoredCountCount');
        this.crmHyosungStoredCountTotal = document.getElementById('crmHyosungStoredCountTotal');
        this.crmHyosungStoredCountList = document.getElementById('crmHyosungStoredCountList');

        this.periods = [];
        this.currentPeriod = null;

        if (this.filterButton) {
            this.filterButton.addEventListener('click', () => this.filterData());
        }
    }

    // --- Ambil 4 nilai kaset dari baris "NCST:jumlah" (1CST/2CST/3CST/4CST) setelah "ADD CASH:" ---
    parseAddCashCst(lines, addCashIdx) {
        const cst = [0, 0, 0, 0];
        let found = false;
        for (let k = addCashIdx + 1; k <= addCashIdx + 6 && k < lines.length; k++) {
            const m = lines[k].trim().match(/^(\d+)CST:(\d+)$/);
            if (m) {
                const slot = parseInt(m[1], 10);
                if (slot >= 1 && slot <= 4) { cst[slot - 1] = parseInt(m[2], 10); found = true; }
            } else if (found) {
                break; // sudah lewat blok NCST, berhenti
            }
        }
        return found ? cst : null;
    }

    // --- Cari semua marker REPLENISH valid ("ADD CASH:" + blok NCST ditemukan) ---
    findValidMarkers(lines) {
        const markers = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() !== 'ADD CASH:') continue;
            const cst = this.parseAddCashCst(lines, i);
            if (!cst) continue;

            let dateLabel = null;
            for (let k = i - 1; k >= Math.max(0, i - 3); k--) {
                const m = lines[k].match(/^(\d{2})\/(\d{2})\/(\d{4})/);
                if (m) { dateLabel = `${m[1]}/${m[2]}/${m[3].slice(-2)}`; break; }
            }

            markers.push({
                addCashIndex: i,
                date: dateLabel || '??/??/??',
                init100: cst[0] + cst[1],
                init50: cst[2] + cst[3]
            });
        }
        return markers;
    }

    findReplenishmentPeriods(lines) {
        const markers = this.findValidMarkers(lines);
        const periods = [];

        for (let i = 0; i < markers.length - 1; i++) {
            const startIdx = markers[i].addCashIndex;
            const endIdx = markers[i + 1].addCashIndex;

            let hasDispense = false;
            for (let j = startIdx + 1; j < endIdx; j++) {
                if (lines[j].trim().indexOf('Request Count') === 0) { hasDispense = true; break; }
            }
            if (!hasDispense) continue;

            periods.push({
                startIndex: startIdx,
                endIndex: endIdx,
                startDate: markers[i].date,
                endDate: markers[i + 1].date,
                init100: markers[i].init100,
                init50: markers[i].init50,
                displayText: `${markers[i].date} - ${markers[i + 1].date}`
            });
        }

        // Marker terakhir tetap dibentuk jadi periode walau tanpa penutup - label akhir
        // = tanggal transaksi terakhir yang ditemukan (standar 6+1 mesin lain di app ini).
        if (markers.length > 0) {
            const lastMarker = markers[markers.length - 1];
            const startIdx = lastMarker.addCashIndex;
            const endIdx = lines.length;

            let hasDispense = false;
            for (let j = startIdx + 1; j < endIdx; j++) {
                if (lines[j].trim().indexOf('Request Count') === 0) { hasDispense = true; break; }
            }

            if (hasDispense) {
                const finalEndDate = crmHyosungLastTrxDate(lines, startIdx, endIdx) || lastMarker.date;
                periods.push({
                    startIndex: startIdx,
                    endIndex: endIdx,
                    startDate: lastMarker.date,
                    endDate: null,
                    init100: lastMarker.init100,
                    init50: lastMarker.init50,
                    displayText: `${lastMarker.date} - ${finalEndDate}`
                });
            }
        }
        return periods;
    }

    resolvePeriodBounds(lines, period = null) {
        if (period) {
            return {
                start: period.startIndex + 1, end: period.endIndex - 1,
                tsStart: reconCrmHyosungMarkerTimestamp(lines, period.startIndex),
                tsEnd: (period.endIndex < lines.length) ? reconCrmHyosungMarkerTimestamp(lines, period.endIndex) : null
            };
        }
        const markers = this.findValidMarkers(lines);
        if (markers.length >= 2) {
            const last = markers[markers.length - 1];
            const prev = markers[markers.length - 2];
            return {
                start: prev.addCashIndex + 1, end: last.addCashIndex - 1,
                tsStart: reconCrmHyosungMarkerTimestamp(lines, prev.addCashIndex),
                tsEnd: reconCrmHyosungMarkerTimestamp(lines, last.addCashIndex)
            };
        }
        if (markers.length === 1) {
            return {
                start: markers[0].addCashIndex + 1, end: lines.length - 1,
                tsStart: reconCrmHyosungMarkerTimestamp(lines, markers[0].addCashIndex), tsEnd: null
            };
        }
        return { start: 0, end: lines.length - 1, tsStart: null, tsEnd: null };
    }

    calculateDISP(lines, period = null) {
        const { start, end, tsStart, tsEnd } = this.resolvePeriodBounds(lines, period);
        let c1 = 0, c2 = 0, c3 = 0, c4 = 0;
        for (let i = start; i <= end; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.indexOf('Request Count') !== 0) continue;
            if (!reconIsWithinPeriod(lines, i, tsStart, tsEnd, reconFindCrmHyosungTransactionTimestamp)) continue;

            // Pakai "Dispense Count" (fisik riil, baris tepat setelah Request Count) - bukan
            // Request Count (permintaan awal) - sama seperti fix presisi lembar Oki.
            const dispLine = lines[i + 1];
            const dm = dispLine && dispLine.trim().match(/^Dispense Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
            if (dm) {
                c1 += parseInt(dm[1], 10); c2 += parseInt(dm[2], 10);
                c3 += parseInt(dm[3], 10); c4 += parseInt(dm[4], 10);
            } else {
                // fallback kalau baris Dispense Count tidak ketemu persis di posisi +1
                const m = trimmed.match(/Request Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
                if (m) {
                    c1 += parseInt(m[1], 10); c2 += parseInt(m[2], 10);
                    c3 += parseInt(m[3], 10); c4 += parseInt(m[4], 10);
                }
            }
        }
        return [c1, c2, c3, c4];
    }

    totalDisp100(totals) { return totals[0] + totals[1]; }
    totalDisp50(totals) { return totals[2] + totals[3]; }

    // --- Deposit (REVISI, tervalidasi 100% presisi ke rupiah thd 4 periode lewat laporan
    // internal "Print Cash" milik log sendiri) ---
    // AWALNYA dihitung dari "Store Count [c1,c2,c3,c4]" (lookup langsung, bracket 4-kolom) -
    // TERNYATA UNDERCOUNT: field ini hanya mencatat lembar yang berhasil masuk ke kaset 1-4,
    // TIDAK termasuk lembar yang disortir mesin ke kaset "MIX" (kondisi lembar kurang sempurna,
    // tetap sah sbg setoran nasabah - dibuktikan lgs dari data: baris "Host Store: Stored" pada
    // satu transaksi nyata menunjukkan total SEBENARNYA Rp2.850.000 sementara "Store Count"-nya
    // cuma mencatat Rp200.000, selisihnya PERSIS sama dgn field "[MIX CASSETTE]" periode tsb).
    //
    // FIX: anchor ke baris "Host Store: Stored" (jam mentah ada langsung di baris yg sama) +
    // baris "IDR100000:N"/"IDR50000:N" setelahnya - breakdown denominasi LENGKAP termasuk yang
    // ke kaset MIX. Baris ini BISA muncul >1x per transaksi (by design - dikonfirmasi user:
    // nasabah bisa melakukan store berkali-kali dalam 1 sesi krn ada limit lembar per-batch, ini
    // normal dan SEMUA batch harus dihitung), TAPI kadang juga muncul sbg echo/duplikat identik
    // dari batch yg SAMA (co: sekali sblm [Transaction record], sekali sesudahnya). Pembeda yang
    // valid: daftar serial number di bawah "Stored Note" - kalau identik = batch yg sama (hitung
    // 1x), kalau beda = batch yg genuinely berbeda (hitung semua). Kalau TIDAK ada "Stored Note"
    // sama sekali = transaksi gagal/diretract (co: kasus nyata "Host Communication Down" ->
    // "Reset" -> "Notes retracted:" yang ditemukan di log) - uangnya TIDAK jadi masuk, jangan
    // dihitung sbg deposit.
    extractHostStoreBlocks(lines, start, end) {
        const blocks = [];
        for (let i = start; i <= end; i++) {
            const trimmed = lines[i].trim();
            if (!trimmed.endsWith('Host Store: Stored')) continue;

            let d100 = 0, d50 = 0, k = i + 1;
            while (k <= end) {
                const l = lines[k].trim();
                const m100 = l.match(/^IDR100000\s*:\s*(\d+)$/);
                const m50 = l.match(/^IDR50000\s*:\s*(\d+)$/);
                if (m100) { d100 += parseInt(m100[1], 10); k++; continue; }
                if (m50) { d50 += parseInt(m50[1], 10); k++; continue; }
                break;
            }
            if (d100 + d50 === 0) continue;

            // Cari "Stored Note" + kumpulkan serial multi-baris sampai ']' ditemukan. Window
            // digenerouskan (300 baris) supaya transaksi besar (ratusan lembar) tetap tertangkap
            // utuh - window kecil terbukti memotong daftar serial transaksi besar & merusak dedup.
            let serialStr = '', foundStoredNote = false;
            for (let j = k; j <= Math.min(end, k + 300); j++) {
                const l = lines[j].trim();
                if (l === 'Stored Note') { foundStoredNote = true; continue; }
                if (!foundStoredNote) continue;
                serialStr += l;
                if (l.includes(']')) break;
            }
            if (!foundStoredNote) continue; // tanpa "Stored Note" = transaksi gagal/retract

            const serialList = serialStr.replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
            if (serialList.length === 0) continue; // tanpa serial = gagal/retract juga, jangan dihitung

            const tm = lines[i].match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
            const ts = tm ? buildDateFromParts(tm[1], tm[2], tm[3], tm[4], tm[5], tm[6]) : null;

            blocks.push({
                line: i, d100, d50, amount: d100 * 100000 + d50 * 50000,
                serials: serialList.slice().sort().join(','), ts
            });
        }
        return blocks;
    }

    calculateDEP(lines, period = null) {
        const { start, end, tsStart, tsEnd } = this.resolvePeriodBounds(lines, period);
        const blocks = this.extractHostStoreBlocks(lines, start, end);
        const seen = new Set();
        let dep100 = 0, dep50 = 0;
        for (const b of blocks) {
            if (seen.has(b.serials)) continue; // duplikat/echo batch yg sama - hitung sekali saja
            if (tsStart && b.ts && (b.ts < tsStart || (tsEnd && b.ts >= tsEnd))) continue;
            seen.add(b.serials);
            dep100 += b.d100; dep50 += b.d50;
        }
        return [dep100, dep50];
    }

    calculateINIT(lines, period = null) {
        if (period) return [period.init100 || 0, period.init50 || 0];
        const markers = this.findValidMarkers(lines);
        if (markers.length === 0) return [0, 0];
        const last = markers[markers.length - 1];
        return [last.init100, last.init50];
    }

    calculateREM(lines, period = null) {
        const [c1, c2, c3, c4] = this.calculateDISP(lines, period);
        const [dep100, dep50] = this.calculateDEP(lines, period);
        const [init100, init50] = this.calculateINIT(lines, period);
        const rem100 = init100 - (c1 + c2) + dep100;
        const rem50 = init50 - (c3 + c4) + dep50;
        return [rem100, rem50];
    }

    findMachineID(lines) {
        for (const line of lines) {
            const m = line.match(/ATM ID\s*:\s*(\d+)/);
            if (m) return m[1];
        }
        return "Not Found";
    }

    extractCashPresented(lines, period = null) {
        const { start, end } = this.resolvePeriodBounds(lines, period);
        const list = [];
        let total = 0;
        for (let i = start; i <= end; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.indexOf('Request Count') !== 0) continue;
            const dispLine = lines[i + 1];
            const dm = dispLine && dispLine.trim().match(/^Dispense Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
            let c1, c2, c3, c4;
            if (dm) {
                c1 = parseInt(dm[1], 10); c2 = parseInt(dm[2], 10); c3 = parseInt(dm[3], 10); c4 = parseInt(dm[4], 10);
            } else {
                const m = trimmed.match(/Request Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
                if (!m) continue;
                c1 = parseInt(m[1], 10); c2 = parseInt(m[2], 10); c3 = parseInt(m[3], 10); c4 = parseInt(m[4], 10);
            }
            const amount = (c1 + c2) * 100000 + (c3 + c4) * 50000;
            if (amount > 0) { list.push(amount); total += amount; }
        }
        return { count: list.length, total, list };
    }

    // Konsisten dgn calculateDEP (lihat catatan lengkap di sana): pakai extractHostStoreBlocks +
    // dedup berdasar serial, BUKAN "Store Count [c1,c2,c3,c4]" lagi (undercount krn kaset MIX).
    extractStoredCount(lines, period = null) {
        const { start, end } = this.resolvePeriodBounds(lines, period);
        const blocks = this.extractHostStoreBlocks(lines, start, end);
        const seen = new Set();
        const list = [];
        let total = 0;
        for (const b of blocks) {
            if (seen.has(b.serials)) continue;
            seen.add(b.serials);
            list.push(b.amount);
            total += b.amount;
        }
        return { count: list.length, total, list };
    }

    displayPeriods() {
        const periodDisplay = document.getElementById('crmHyosungPeriodDisplay');
        if (!periodDisplay) return;

        periodDisplay.innerHTML = '';
        periodDisplay.classList.remove('hidden');

        if (this.periods.length === 0) {
            periodDisplay.innerHTML = '<span class="period-label"><span class="badge">PERIODE</span> Tidak ditemukan periode dengan transaksi dispense</span>';
            return;
        }

        let defaultPeriodIndex = this.periods.length - 1;
        if (this.periods.length > 1) {
            const lastPeriod = this.periods[this.periods.length - 1];
            if (!lastPeriod.endDate) {
                for (let k = this.periods.length - 2; k >= 0; k--) {
                    if (this.periods[k].endDate) { defaultPeriodIndex = k; break; }
                }
            }
        }

        this.periods.forEach((period, index) => {
            const button = document.createElement('button');
            button.textContent = period.displayText;
            button.className = 'period-btn crmHyosung';

            if (index === defaultPeriodIndex) {
                button.classList.add('active');
                this.currentPeriod = period;
                this.updateSelectedPeriodUI(period);
            } else if (this.currentPeriod && this.currentPeriod.displayText === period.displayText) {
                button.classList.add('active');
            }

            button.addEventListener('click', () => {
                this.currentPeriod = period;
                document.querySelectorAll('#crmHyosungPeriodDisplay .period-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.updateSelectedPeriodUI(period);
                this.analyzePeriod(period);
            });

            periodDisplay.appendChild(button);
        });

        if (this.currentPeriod) {
            this.analyzePeriod(this.currentPeriod);
        }
    }

    updateSelectedPeriodUI(period) {
        const selectedDiv = document.getElementById('crmHyosungPeriodSelected');
        const selectedText = document.getElementById('crmHyosungSelectedPeriodText');
        if (selectedDiv && selectedText) {
            selectedDiv.classList.remove('hidden');
            selectedText.textContent = period.displayText;
        }
    }

    filterData() {
        if (!this.logInput) return;
        const logInput = cleanAnsiCodes(this.logInput.value);
        const lines = logInput.split('\n');
        const machineID = this.findMachineID(lines);
        this.machineDisplay.innerHTML = `<span class="w-2 h-2 bg-accent rounded-full animate-pulse"></span> MACHINE: ${machineID}`;

        this.periods = this.findReplenishmentPeriods(lines);
        this.displayPeriods();
    }

    analyzePeriod(period) {
        const logInput = cleanAnsiCodes(this.logInput.value);
        const lines = logInput.split('\n');

        const [c1, c2, c3, c4] = this.calculateDISP(lines, period);
        const [dep100, dep50] = this.calculateDEP(lines, period);
        const [init100, init50] = this.calculateINIT(lines, period);
        const [rem100, rem50] = this.calculateREM(lines, period);

        this.crmHyosungInit100.textContent = init100;
        this.crmHyosungInit50.textContent = init50;
        this.crmHyosungDisp100.textContent = this.totalDisp100([c1, c2, c3, c4]);
        this.crmHyosungDisp50.textContent = this.totalDisp50([c1, c2, c3, c4]);
        this.crmHyosungDep100.textContent = dep100;
        this.crmHyosungDep50.textContent = dep50;
        this.crmHyosungRem100.textContent = rem100;
        this.crmHyosungRem50.textContent = rem50;

        const initAmount = init100 * 100000 + init50 * 50000;
        const dispAmount = this.totalDisp100([c1, c2, c3, c4]) * 100000 + this.totalDisp50([c1, c2, c3, c4]) * 50000;
        const depAmount = dep100 * 100000 + dep50 * 50000;
        const remAmount = rem100 * 100000 + rem50 * 50000;

        this.crmHyosungInitAmount.textContent = initAmount.toLocaleString('id-ID');
        this.crmHyosungDispAmount.textContent = dispAmount.toLocaleString('id-ID');
        this.crmHyosungDepAmount.textContent = depAmount.toLocaleString('id-ID');
        this.crmHyosungRemAmount.textContent = remAmount.toLocaleString('id-ID');

        const cashPresented = this.extractCashPresented(lines, period);
        this.crmHyosungCashPresentedCount.textContent = cashPresented.count;
        this.crmHyosungCashPresentedTotal.textContent = cashPresented.total.toLocaleString('id-ID');
        this.crmHyosungCashPresentedList.innerHTML = '';
        cashPresented.list.forEach(amount => {
            const li = document.createElement('li');
            li.textContent = amount.toLocaleString('id-ID');
            li.classList.add('py-1', 'border-b', 'border-slate-800/50');
            this.crmHyosungCashPresentedList.appendChild(li);
        });

        const storedCountData = this.extractStoredCount(lines, period);
        this.crmHyosungStoredCountCount.textContent = storedCountData.count;
        this.crmHyosungStoredCountTotal.textContent = storedCountData.total.toLocaleString('id-ID');
        this.crmHyosungStoredCountList.innerHTML = '';
        storedCountData.list.forEach(amount => {
            const li = document.createElement('li');
            li.textContent = amount.toLocaleString('id-ID');
            li.classList.add('py-1', 'border-b', 'border-slate-800/50');
            this.crmHyosungStoredCountList.appendChild(li);
        });

        const phys100 = parseInt(this.crmHyosungPhys100.value) || 0;
        const phys50 = parseInt(this.crmHyosungPhys50.value) || 0;
        const totalPhys = phys100 * 100000 + phys50 * 50000;

        if (this.crmHyosungPhys100.value === "" && this.crmHyosungPhys50.value === "") {
            this.crmHyosungTotalPhysAmount.textContent = "MENUNGGU INPUT";
            this.crmHyosungTotalPhysAmount.classList.add("text-sm");
        } else {
            this.crmHyosungTotalPhysAmount.textContent = totalPhys.toLocaleString('id-ID');
            this.crmHyosungTotalPhysAmount.classList.remove("text-sm");
        }

        if (this.crmHyosungPhys100.value !== "" || this.crmHyosungPhys50.value !== "") {
            updateReconciliationTable(phys100, rem100, "crmHyosungResPhys100");
            updateReconciliationTable(phys50, rem50, "crmHyosungResPhys50");
            updateReconciliationUI(totalPhys, remAmount, "crmHyosungTotalReconBox", "crmHyosungTotalReconResult", "crmHyosungExpression");
        }
    }
}

function crmHyosungLastTrxDate(logLines, startIdx, endIdx) {
    return findLastMarkerDate(logLines, startIdx, endIdx,
        (l) => l.trim().indexOf('Request Count') === 0 || l.trim().indexOf('Store Count') === 0,
        (lines, idx) => {
            const m = extractDateNearLine(lines, idx, [], /TANGGAL:\s*(\d{2}\/\d{2}\/\d{2})/, 25);
            return m ? m[1] : null;
        });
}

function okyLastTrxDate(logLines, startIdx, endIdx) {
    return findLastMarkerDate(logLines, startIdx, endIdx,
        (l) => l.trim().indexOf('Request Count') === 0 || l.trim() === 'Stored Count',
        (lines, idx) => {
            const m = extractDateNearLine(lines, idx, [], /TANGGAL:\s*(\d{2}\/\d{2}\/\d{2})/, 25);
            return m ? m[1] : null;
        });
}

function isValidAtmAddCashTotal(total) {
    return total === 2000 || total === 4000 || total === 6000 || total === 8000;
}

function findFirstDispenseLine(logLines, startIndex, matcher) {
    for (let i = startIndex + 1; i < logLines.length; i++) {
        const line = normalizeLogLine(logLines[i] || '');
        if (matcher(line)) {
            return i;
        }
    }
    return logLines.length;
}

// --- FUNGSI PERIODE UNTUK HYOSUNG DENGAN FILTER DISPENSE ---
// ============================================================
// POIN 1 — STANDARISASI FALLBACK PERIODE (6 mesin)
// Kalau periode terakhir/tunggal tidak punya penutup RPL kedua,
// label akhir = tanggal transaksi (dispense/setor) TERAKHIR yang ditemukan,
// BUKAN lagi "Sekarang" (Hyosung/NCR lama) ataupun silent-drop (Wincor lama).
// Referensi lengkap: dokumen "Upgrade_Standarisasi_Summary_Autosort.md"
// ============================================================

function extractDateNearLine(logLines, idx, preferredOffsets, dateRegex, windowSize) {
    for (const off of preferredOffsets) {
        const j = idx + off;
        if (j < 0 || j >= logLines.length) continue;
        const m = logLines[j].match(dateRegex);
        if (m) return m;
    }
    for (let off = 1; off <= windowSize; off++) {
        for (const dir of [1, -1]) {
            const j = idx + dir * off;
            if (j < 0 || j >= logLines.length) continue;
            const m = logLines[j].match(dateRegex);
            if (m) return m;
        }
    }
    return null;
}

function findLastMarkerDate(logLines, startIdx, endIdx, markerTest, dateFinderFn) {
    let lastIdx = -1;
    for (let j = startIdx; j < endIdx; j++) {
        if (markerTest(logLines[j])) lastIdx = j;
    }
    if (lastIdx === -1) return null;
    return dateFinderFn(logLines, lastIdx);
}

function ddmmyyyyToShort(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    const [d, mo, y] = parts;
    return `${d}/${mo}/${y.slice(-2)}`;
}

function hyosungLastTrxDate(logLines, startIdx, endIdx) {
    return findLastMarkerDate(logLines, startIdx, endIdx,
        (l) => l.includes('Request Count'),
        (lines, idx) => {
            const m = extractDateNearLine(lines, idx, [-7], /(\d{2}\/\d{2}\/\d{4}) \d{2}:\d{2}:\d{2}/, 20);
            return m ? ddmmyyyyToShort(m[1]) : null;
        });
}

function ncrLastTrxDate(logLines, startIdx, endIdx) {
    return findLastMarkerDate(logLines, startIdx, endIdx,
        (l) => l.includes('NOTES PRESENTED'),
        (lines, idx) => {
            const m = extractDateNearLine(lines, idx, [-9], /TANGGAL:\s*(\d{2}\/\d{2}\/\d{2})/, 20);
            return m ? m[1] : null;
        });
}

function wincorLastTrxDate(logLines, startIdx, endIdx) {
    return findLastMarkerDate(logLines, startIdx, endIdx,
        (l) => l.includes('CASH PRESENTED') || /CASH\s+\d+:\d+,\d+;/.test(l),
        (lines, idx) => {
            const m = extractDateNearLine(lines, idx, [1, 2, 3, 4, 5], /TANGGAL:\s*(\d{2}\/\d{2}\/\d{2})/, 20);
            return m ? m[1] : null;
        });
}

function jalinLastTrxDate(logLines, startIdx, endIdx) {
    let lastDate = null;
    for (let j = startIdx; j < endIdx; j++) {
        if (logLines[j].includes('DISPENSED:')) {
            const m = logLines[j].match(/\|(\d{4})-(\d{2})-(\d{2}) \d{2}:\d{2}:\d{2}\|/);
            if (m) lastDate = `${m[3]}/${m[2]}/${m[1].slice(-2)}`;
        }
    }
    return lastDate;
}

function crmHitachiLastTrxDate(logLines, startIdx, endIdx) {
    return findLastMarkerDate(logLines, startIdx, endIdx,
        (l) => l.includes('Request Count') || l.includes('Stored Count'),
        (lines, idx) => {
            const m = extractDateNearLine(lines, idx, [], /TANGGAL:\s*(\d{2}\/\d{2}\/\d{2})/, 25);
            return m ? m[1] : null;
        });
}

function dinaboldLastTrxDate(logLines, startIdx, endIdx) {
    return findLastMarkerDate(logLines, startIdx, endIdx,
        (l) => l.includes('CASH REQUEST:') || l.includes('Cash-In OK'),
        (lines, idx) => {
            const m = extractDateNearLine(lines, idx, [0, -1, -2, 1, 2], /(\d{2})\/(\d{2})\/(\d{4})/, 20);
            return m ? `${m[1]}/${m[2]}/${m[3].slice(-2)}` : null;
        });
}

// ============================================================
// POIN 2 — SUMMARY ENGINE (fitur TAMBAHAN, read-only)
// PRINSIP KETAT: fungsi-fungsi di bawah ini TIDAK PERNAH memanggil atau
// mengubah state class DataFilterCRMHitachi/DataFilterCRMDinabold ataupun
// fungsi filterHyosung/filterNcr/filterWincor/filterJalin. Semuanya READ-ONLY
// terhadap array `lines`, dan meniru PERSIS logic marker/parsing yang SUDAH
// tervalidasi di masing-masing calculateDISP/DEP/extractCashPresented/dst -
// hanya ditambah penangkapan timestamp per transaksi (yang sebelumnya tidak
// diperlukan untuk perhitungan per-periode, tapi diperlukan utk Summary).
// Referensi desain lengkap: "Upgrade_Standarisasi_Summary_Autosort.md"
// ============================================================

function extractDateTimeNearLine(logLines, idx, preferredOffsets, dtRegex, windowSize) {
    for (const off of preferredOffsets) {
        const j = idx + off;
        if (j < 0 || j >= logLines.length) continue;
        const m = logLines[j].match(dtRegex);
        if (m) return m;
    }
    for (let off = 1; off <= windowSize; off++) {
        for (const dir of [1, -1]) {
            const j = idx + dir * off;
            if (j < 0 || j >= logLines.length) continue;
            const m = logLines[j].match(dtRegex);
            if (m) return m;
        }
    }
    return null;
}

// dd/mm/yyyy hh:mm:ss ATAU dd/mm/yy + WAKTU terpisah -> selalu dikembalikan sbg objek Date
function buildDateFromParts(d, mo, y, h, mi, s) {
    let year = parseInt(y, 10);
    if (year < 100) year += 2000;
    const dt = new Date(year, parseInt(mo, 10) - 1, parseInt(d, 10), parseInt(h || 0, 10), parseInt(mi || 0, 10), parseInt(s || 0, 10));
    return isNaN(dt.getTime()) ? null : dt;
}

// ---------- HELPER: pembulatan nominal ke kelipatan denom (agar Daily Rate realistis) ----------
// Rata-rata/median dari beberapa hari bisa saja tidak habis dibagi 50rb/100rb walau tiap
// transaksi aslinya selalu kelipatan denom - dibulatkan supaya angka yg ditampilkan tetap
// merepresentasikan uang fisik sungguhan (lembar 50rb/100rb), bukan angka statistik mentah.
function roundToNearest(value, unit) {
    if (!unit || unit <= 0) return Math.round(value);
    return Math.round(value / unit) * unit;
}

// ---------- HELPER: deteksi denominasi mesin Hyosung dari field "Denomination [x,x,x,x]" ----------
// Field ini ADA di log Hyosung dan selalu seragam (ATM cuma 1 denom fisik) - ini kebenaran
// langsung dari mesin, jadi TIDAK PERLU diturunkan/ditebak seperti Wincor/NCR.
function detectHyosungDenom(lines) {
    for (const line of lines) {
        const m = line.match(/Denomination\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
        if (m) {
            const vals = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10)].filter(v => v > 0);
            if (vals.length > 0) return vals[0];
        }
    }
    return 50000; // fallback aman kalau field tidak pernah ditemukan di log
}

// ---------- CRM HITACHI ----------
// Meniru PERSIS marker & digit-parsing dari calculateDISP/calculateDEP (class DataFilterCRMHitachi)
function summaryExtractCrmHitachi(lines) {
    const transactions = [];
    const rplMarkers = [];
    const dtRegexTanggalWaktu = /TANGGAL:\s*(\d{2})\/(\d{2})\/(\d{2})\s+WAKTU\s*:\s*(\d{2}):(\d{2}):(\d{2})/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Marker RPL (sama seperti findReplenishmentPeriods)
        // FIX: tangkap juga nilai add-cash real (baris "CASSETTE<n>  <DENOM> <CNT>" persis
        // di bawah REPLENISHMENT) supaya grafik Saldo bisa direset ke nilai isi ulang yang
        // sesungguhnya, bukan ke 0.
        if (trimmed.startsWith('REPLENISHMENT') || / REPLENISHMENT/.test(line)) {
            const dm = line.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
            if (dm) {
                const ts = buildDateFromParts(dm[1], dm[2], dm[3], dm[4], dm[5], dm[6]);
                if (ts) {
                    let resetAmount = null;
                    for (let k = i + 1; k <= i + 12 && k < lines.length; k++) {
                        const cm = lines[k].match(/CASSETTE\d+\s+(\d+)\s+(\d+)/);
                        if (cm) {
                            resetAmount = (resetAmount || 0) + parseInt(cm[1], 10) * parseInt(cm[2], 10);
                        } else if (resetAmount !== null && lines[k].trim().startsWith('----')) {
                            break;
                        }
                    }
                    rplMarkers.push({ ts, label: 'REPLENISH', resetAmount });
                }
            }
        }

        // Dispense - FIX: pakai regex fleksibel (\s* menerima tab MAUPUN spasi apa saja jumlahnya)
        // bukan substring posisi tetap yang cuma benar kalau formatnya persis spasi tertentu.
        // EJ log kadang pakai tab kadang spasi, tidak bisa dipastikan sebelumnya.
        if (trimmed.indexOf('Request Count') === 0) {
            const dispMatch = trimmed.match(/Request Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
            if (dispMatch) {
                const c1 = parseInt(dispMatch[1], 10), c2 = parseInt(dispMatch[2], 10);
                const c3 = parseInt(dispMatch[3], 10), c4 = parseInt(dispMatch[4], 10);
                const amount = (c1 + c2) * 100000 + (c3 + c4) * 50000;
                if (amount > 0) {
                    const m = extractDateTimeNearLine(lines, i, [], dtRegexTanggalWaktu, 25);
                    if (m) {
                        const ts = buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
                        if (ts) transactions.push({ ts, type: 'dispense', amount, lembar100: c1 + c2, lembar50: c3 + c4, lembar: c1 + c2 + c3 + c4 });
                    }
                }
            }
        }

        // Deposit (persis calculateDEP: 'Stored Count' lalu cari [100000,N]/[50000,N] sampai marker berikut)
        // FIX: \s* di sekitar koma supaya toleran tab/spasi/tanpa-spasi sekalipun.
        if (line.includes('Stored Count')) {
            let dep100 = 0, dep50 = 0;
            for (let j = i + 1; j < lines.length; j++) {
                const nl = lines[j];
                if (nl.includes('[100000')) {
                    const mm = nl.match(/\[100000\s*,\s*(\d+)\s*\]/);
                    if (mm) dep100 += parseInt(mm[1]);
                } else if (nl.includes('[50000')) {
                    const mm = nl.match(/\[50000\s*,\s*(\d+)\s*\]/);
                    if (mm) dep50 += parseInt(mm[1]);
                } else if (nl.includes('Stored Count') || nl.includes('REPLENISHMENT') || nl.includes('Request Count')) {
                    break;
                }
            }
            const amount = dep100 * 100000 + dep50 * 50000;
            if (amount > 0) {
                const m = extractDateTimeNearLine(lines, i, [], dtRegexTanggalWaktu, 25);
                if (m) {
                    const ts = buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
                    if (ts) transactions.push({ ts, type: 'deposit', amount, lembar100: dep100, lembar50: dep50, lembar: dep100 + dep50 });
                }
            }
        }
    }
    return { transactions, rplMarkers };
}

// ---------- DINABOLD ----------
// Meniru PERSIS marker dari class DataFilterCRMDinabold (findValidMarkers, extractCashPresented, extractStoredCount)
function summaryExtractDinabold(lines) {
    const transactions = [];
    const rplMarkers = [];

    // Marker RPL: pakai instance sementara utk reuse LOGIC VALIDASI yang sudah ada
    // (isValidClearCashZeroBlock, parseAfterSopValues) TANPA mengubah/menyentuh
    // instance dataFilterCRMDinabold yang aktif dipakai UI.
    const tempDn = new DataFilterCRMDinabold();
    const markers = tempDn.findValidMarkers(lines);
    markers.forEach(mk => {
        const parts = mk.date.split('/'); // dd/mm/yy
        if (parts.length === 3) {
            const timeMatch = lines[mk.sopIndex].match(/(\d{2}):(\d{2}):(\d{2})/);
            const ts = buildDateFromParts(parts[0], parts[1], parts[2], timeMatch ? timeMatch[1] : '0', timeMatch ? timeMatch[2] : '0', timeMatch ? timeMatch[3] : '0');
            // FIX: resetAmount = nilai kaset SETELAH SOP (init100/init50, sudah tervalidasi
            // di findValidMarkers) - dipakai grafik Saldo utk direset ke nilai riil, bukan 0.
            if (ts) rplMarkers.push({ ts, label: 'REPLENISH', resetAmount: (mk.init100 * 100000) + (mk.init50 * 50000) });
        }
    });

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const m1 = line.match(/CASH REQUEST:\s*(\d{2})(\d{2})(\d{2})(\d{2})/);
        if (m1) {
            const c1 = parseInt(m1[1], 10), c2 = parseInt(m1[2], 10), c3 = parseInt(m1[3], 10), c4 = parseInt(m1[4], 10);
            const amount = (c1 + c2) * 100000 + (c3 + c4) * 50000;
            if (amount > 0) {
                const dm = extractDateTimeNearLine(lines, i, [0, -1, -2, 1, 2], /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/, 20);
                if (dm) {
                    const ts = buildDateFromParts(dm[1], dm[2], dm[3], dm[4], dm[5], dm[6]);
                    if (ts) transactions.push({ ts, type: 'dispense', amount, lembar100: c1 + c2, lembar50: c3 + c4, lembar: c1 + c2 + c3 + c4 });
                }
            }
        }
        if (line.includes('Cash-In OK')) {
            let dep100 = 0, dep50 = 0;
            for (let j = i - 1; j >= 0; j--) {
                const l = lines[j];
                if (l.includes('Cash-In OK') || l.includes('CASH REQUEST:')) break;
                let mm;
                if ((mm = l.match(/IDR\s+100000\s+S\/N:\s*(.+)/))) {
                    dep100 += mm[1].split(',').map(s => s.trim()).filter(s => s !== '').length;
                } else if ((mm = l.match(/IDR\s+50000\s+S\/N:\s*(.+)/))) {
                    dep50 += mm[1].split(',').map(s => s.trim()).filter(s => s !== '').length;
                }
                if (l.includes('SERIAL NUMBERS SUCCESSFULLY STORED FOR')) break;
            }
            const amount = dep100 * 100000 + dep50 * 50000;
            if (amount > 0) {
                const dm = line.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
                if (dm) {
                    const ts = buildDateFromParts(dm[1], dm[2], dm[3], dm[4], dm[5], dm[6]);
                    if (ts) transactions.push({ ts, type: 'deposit', amount, lembar100: dep100, lembar50: dep50, lembar: dep100 + dep50 });
                }
            }
        }
    }
    return { transactions, rplMarkers };
}

// ---------- CRM OKI ----------
// Struktur log mirip Hitachi (Request Count / Stored Count), marker RPL sendiri
// (baris 'Replenishment' + baris 'Cnt v1 v2 v3 v4 v5'). Reuse instance sementara
// DataFilterCRMOky utk marker detection, sama prinsipnya dgn pendekatan Dinabold.
function summaryExtractOky(lines) {
    const transactions = [];
    const rplMarkers = [];
    const dtRegexTanggalWaktu = /TANGGAL:\s*(\d{2})\/(\d{2})\/(\d{2})\s+WAKTU\s*:\s*(\d{2}):(\d{2}):(\d{2})/;

    const tempOky = new DataFilterCRMOky();
    const markers = tempOky.findValidMarkers(lines);
    markers.forEach(mk => {
        const dm = lines[mk.replIndex + 1] ? lines[mk.replIndex + 1].match(/Date\s*:\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/) : null;
        if (dm) {
            const ts = buildDateFromParts(dm[1], dm[2], dm[3], dm[4], dm[5], dm[6]);
            if (ts) rplMarkers.push({ ts, label: 'REPLENISH', resetAmount: (mk.init100 * 100000) + (mk.init50 * 50000) });
        }
    });

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.indexOf('Request Count') === 0) {
            const dispMatch = trimmed.match(/Request Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
            if (dispMatch) {
                const c1 = parseInt(dispMatch[1], 10), c2 = parseInt(dispMatch[2], 10);
                const c3 = parseInt(dispMatch[3], 10), c4 = parseInt(dispMatch[4], 10);
                const amount = (c1 + c2) * 100000 + (c3 + c4) * 50000;
                if (amount > 0) {
                    const m = extractDateTimeNearLine(lines, i, [], dtRegexTanggalWaktu, 25);
                    if (m) {
                        const ts = buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
                        if (ts) transactions.push({ ts, type: 'dispense', amount, lembar100: c1 + c2, lembar50: c3 + c4, lembar: c1 + c2 + c3 + c4 });
                    }
                }
            }
        }

        if (trimmed === 'Stored Count') {
            let dep100 = 0, dep50 = 0;
            for (let j = i + 1; j < lines.length; j++) {
                const nl = lines[j];
                if (nl.includes('[100000')) {
                    const mm = nl.match(/\[100000\s*,\s*(\d+)\s*\]/);
                    if (mm) dep100 += parseInt(mm[1]);
                } else if (nl.includes('[50000')) {
                    const mm = nl.match(/\[50000\s*,\s*(\d+)\s*\]/);
                    if (mm) dep50 += parseInt(mm[1]);
                } else if (nl.trim() === 'Stored Count' || nl.includes('Replenishment') || nl.trim().indexOf('Request Count') === 0) {
                    break;
                }
            }
            const amount = dep100 * 100000 + dep50 * 50000;
            if (amount > 0) {
                const m = extractDateTimeNearLine(lines, i, [], dtRegexTanggalWaktu, 25);
                if (m) {
                    const ts = buildDateFromParts(m[1], m[2], m[3], m[4], m[5], m[6]);
                    if (ts) transactions.push({ ts, type: 'deposit', amount, lembar100: dep100, lembar50: dep50, lembar: dep100 + dep50 });
                }
            }
        }
    }
    return { transactions, rplMarkers };
}

// ---------- CRM HYOSUNG (MODUL BARU) ----------
// Meniru PERSIS marker & parsing dari calculateDISP/calculateDEP/findValidMarkers
// (class DataFilterCRMHyosung) - marker "ADD CASH:" + baris "NCST:jumlah", dispense
// "Request Count"+"Dispense Count [c1,c2,c3,c4]", deposit "Store Count [c1,c2,c3,c4]"
// langsung 1 baris. Timestamp pakai jam MENTAH (konsisten dgn reconCrmHyosungMarkerTimestamp/
// reconFindCrmHyosungTransactionTimestamp yg dipakai kalkulasi per-periode) - BUKAN struk
// TANGGAL/WAKTU, supaya SUMMARY & hasil rekonsiliasi per-periode memakai basis jam yang sama.
function summaryExtractCrmHyosung(lines) {
    const transactions = [];
    const rplMarkers = [];
    const rawTsRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() !== 'ADD CASH:') continue;
        const cst = [0, 0, 0, 0];
        let found = false;
        for (let k = i + 1; k <= i + 6 && k < lines.length; k++) {
            const m = lines[k].trim().match(/^(\d+)CST:(\d+)$/);
            if (m) {
                const slot = parseInt(m[1], 10);
                if (slot >= 1 && slot <= 4) { cst[slot - 1] = parseInt(m[2], 10); found = true; }
            } else if (found) break;
        }
        if (!found) continue;
        const ts = reconCrmHyosungMarkerTimestamp(lines, i);
        if (ts) {
            const resetAmount = (cst[0] + cst[1]) * 100000 + (cst[2] + cst[3]) * 50000;
            rplMarkers.push({ ts, label: 'REPLENISH', resetAmount });
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        if (trimmed.indexOf('Request Count') === 0) {
            const dispLine = lines[i + 1];
            const dm = dispLine && dispLine.trim().match(/^Dispense Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
            const m = dm || trimmed.match(/Request Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
            if (m) {
                const c1 = parseInt(m[1], 10), c2 = parseInt(m[2], 10), c3 = parseInt(m[3], 10), c4 = parseInt(m[4], 10);
                const amount = (c1 + c2) * 100000 + (c3 + c4) * 50000;
                if (amount > 0) {
                    let ts = null;
                    for (let k = i; k >= Math.max(0, i - 25); k--) {
                        const tm = lines[k].match(rawTsRegex);
                        if (tm) { ts = buildDateFromParts(tm[1], tm[2], tm[3], tm[4], tm[5], tm[6]); break; }
                    }
                    if (ts) transactions.push({ ts, type: 'dispense', amount, lembar100: c1 + c2, lembar50: c3 + c4, lembar: c1 + c2 + c3 + c4 });
                }
            }
        }
    }

    // Deposit (REVISI - lihat catatan lengkap di calculateDEP class DataFilterCRMHyosung):
    // anchor "Host Store: Stored" + dedup berdasar serial "Stored Note", BUKAN "Store Count
    // [c1,c2,c3,c4]" lagi (undercount krn tidak menangkap lembar yg disortir ke kaset MIX).
    // Loop TERPISAH & SEQUENTIAL (bukan bersarang di loop dispense di atas) supaya tetap O(n).
    const seenSerials = new Set();
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed.endsWith('Host Store: Stored')) continue;

        let d100 = 0, d50 = 0, k = i + 1;
        while (k < lines.length) {
            const l = lines[k].trim();
            const m100 = l.match(/^IDR100000\s*:\s*(\d+)$/);
            const m50 = l.match(/^IDR50000\s*:\s*(\d+)$/);
            if (m100) { d100 += parseInt(m100[1], 10); k++; continue; }
            if (m50) { d50 += parseInt(m50[1], 10); k++; continue; }
            break;
        }
        if (d100 + d50 === 0) continue;

        let serialStr = '', foundStoredNote = false;
        for (let j = k; j <= Math.min(lines.length - 1, k + 300); j++) {
            const l = lines[j].trim();
            if (l === 'Stored Note') { foundStoredNote = true; continue; }
            if (!foundStoredNote) continue;
            serialStr += l;
            if (l.includes(']')) break;
        }
        if (!foundStoredNote) continue; // tanpa "Stored Note" = transaksi gagal/retract

        const serialList = serialStr.replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
        if (serialList.length === 0) continue;
        const serialKey = serialList.slice().sort().join(',');
        if (seenSerials.has(serialKey)) continue; // duplikat/echo batch yg sama
        seenSerials.add(serialKey);

        const amount = d100 * 100000 + d50 * 50000;
        const tm = lines[i].match(rawTsRegex);
        const ts = tm ? buildDateFromParts(tm[1], tm[2], tm[3], tm[4], tm[5], tm[6]) : null;
        if (ts) transactions.push({ ts, type: 'deposit', amount, lembar100: d100, lembar50: d50, lembar: d100 + d50 });
    }
    return { transactions, rplMarkers };
}

// ---------- HYOSUNG ----------
// Meniru marker 'Request Count' (dispense) & 'ADD CASH:' (RPL) yg sudah dipakai findHyosungPeriods
// FIX Poin 2 (ATM): Hyosung punya field "Denomination" eksplisit di log - itu kebenaran
// denominasi mesin. Nominal SEKARANG = total lembar x denom mesin (bukan lagi asumsi
// split gaya CRM (c1+c2)*100000+(c3+c4)*50000 yang keliru utk mesin dgn 1 denom fisik).
// ---------- HYOSUNG ----------
// FIX (poin krusial dari user): sebelumnya denominasi mesin diambil dari field
// "Denomination [d1,d2,d3,d4]" apa adanya (detectHyosungDenom) - riskan kalau field itu
// tidak representatif/konsisten. Disamakan sekarang dengan pola Wincor & NCR yang sudah
// benar: denominasi diturunkan dari transaksi dispense VALID PERTAMA (field "Amount [...]"
// asli di blok [Transaction record] yg sama dengan Request Count ÷ lembar keluar), lalu
// dipakai konsisten (lembar x denom) ke SEMUA transaksi - bukan lagi bergantung ke field
// Denomination yang bisa saja tidak akurat/tidak ditemukan.
function summaryExtractHyosung(lines) {
    const transactions = [];
    const rplMarkers = [];
    let machineDenom = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('ADD CASH:')) {
            const dm = extractDateTimeNearLine(lines, i, [-1], /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/, 10);
            if (dm) {
                const ts = buildDateFromParts(dm[1], dm[2], dm[3], dm[4], dm[5], dm[6]);
                if (ts) {
                    const addCashLembar = parseHyosungAddCashNew(lines, i);
                    rplMarkers.push({ ts, label: 'REPLENISH', _addCashLembar: addCashLembar });
                }
            }
        }
        if (line.includes('Request Count')) {
            // FIX: Hyosung pakai format bracket dgn TAB separator (kadang tab kadang spasi -
            // EJ log tidak konsisten), jadi position-based substring TIDAK BERLAKU di sini.
            // Pakai regex fleksibel (\s* menerima keduanya) yang SAMA PERSIS dgn logic
            // rekonsiliasi existing yang sudah tervalidasi (lihat filterHyosung).
            const m = line.match(/Request Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
            if (m) {
                const c1 = parseInt(m[1], 10), c2 = parseInt(m[2], 10), c3 = parseInt(m[3], 10), c4 = parseInt(m[4], 10);
                const lembar = c1 + c2 + c3 + c4;
                if (lembar > 0) {
                    const dm = extractDateTimeNearLine(lines, i, [-7], /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/, 20);
                    if (dm) {
                        const ts = buildDateFromParts(dm[1], dm[2], dm[3], dm[4], dm[5], dm[6]);
                        if (ts) {
                            if (machineDenom === null) {
                                // Field "Amount [xxxxxxxx]" ada di blok [Transaction record] yg
                                // sama, beberapa baris sebelum "Request Count" (persis sebelum
                                // "Denomination"). Nilainya Rupiah asli, bukan kode internal.
                                for (let k = i - 1; k >= Math.max(0, i - 6); k--) {
                                    const am = lines[k].match(/^Amount\s*\[(\d+)\]/);
                                    if (am) {
                                        const realAmount = parseInt(am[1], 10);
                                        if (realAmount > 0) machineDenom = (realAmount / lembar) >= 75000 ? 100000 : 50000;
                                        break;
                                    }
                                }
                            }
                            transactions.push({ ts, type: 'dispense', amount: 0, lembar, _pendingDenom: true });
                        }
                    }
                }
            }
        }
    }
    if (machineDenom === null) machineDenom = detectHyosungDenom(lines); // fallback lama, cuma kalau data amount asli tidak ketemu sama sekali
    transactions.forEach(t => {
        if (t._pendingDenom) { t.amount = t.lembar * machineDenom; delete t._pendingDenom; }
    });
    rplMarkers.forEach(mk => {
        mk.resetAmount = mk._addCashLembar > 0 ? mk._addCashLembar * machineDenom : null;
        delete mk._addCashLembar;
    });
    return { transactions, rplMarkers, machineDenom };
}

// ---------- NCR ----------
// Nominal per transaksi TETAP dari field "AMOUNT: RP..." asli di log (sudah akurat, tidak
// diubah). Denominasi mesin diturunkan dari transaksi VALID pertama (amount ÷ lembar) utk
// keperluan pembulatan Daily Rate - JANGAN pernah pakai field "DENOMINATION 5 10 20 50" di
// log NCR, itu cuma label tipe kaset internal, BUKAN nilai rupiah sebenarnya.
function summaryExtractNcr(lines) {
    const transactions = [];
    const rplMarkers = [];
    let machineDenom = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/CASH\s+ADDED/.test(line)) {
            const key = ncrAdminKeyResolver('', lines, i); // format: ADM|CASHADDED|dd/mm/yyyy hh:mm
            const mm = key.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
            if (mm) {
                const ts = buildDateFromParts(mm[1], mm[2], mm[3], mm[4], mm[5], '0');
                if (ts) {
                    // FIX (koreksi arahan): Saldo grafik DIRESET ke nilai add-cash sungguhan,
                    // dihitung final di bawah setelah machineDenom pasti diketahui.
                    const addCashLembar = parseNcrCashAddedNew(lines, i);
                    rplMarkers.push({ ts, label: 'REPLENISH', _addCashLembar: addCashLembar });
                }
            }
        }
        if (line.includes('NOTES PRESENTED')) {
            const dm = extractDateTimeNearLine(lines, i, [-9], /TANGGAL:\s*(\d{2})\/(\d{2})\/(\d{2})\s+WAKTU\s*:\s*(\d{2}):(\d{2}):(\d{2})/, 20);
            if (dm) {
                const ts = buildDateFromParts(dm[1], dm[2], dm[3], dm[4], dm[5], dm[6]);
                if (ts) {
                    // Ambil AMOUNT dari blok TANGGAL yg sama (dekat idx-9) - nominal TIDAK berubah,
                    // sumbernya tetap sama seperti sebelumnya (sudah tervalidasi).
                    const amtWindow = lines.slice(Math.max(0, i - 12), i + 3).join('\n');
                    const amtMatch = amtWindow.match(/AMOUNT\s*:\s*RP\s*([\d.,]+)/);
                    const amount = amtMatch ? parseInt(amtMatch[1].replace(/[.,]/g, ''), 10) : 0;

                    // FIX: lembar diambil LANGSUNG dari baris "NOTES PRESENTED d1,d2,d3,d4" -
                    // baris yang SAMA PERSIS dipakai logic rekonsiliasi utama NCR yang sudah
                    // tervalidasi (lihat analyzeNcrPeriod). Tidak perlu tahu pemetaan kaset ke
                    // denominasi - cukup jumlahkan ke-4 nilainya jadi total lembar.
                    const notesMatch = normalizeLogLine(line).match(/NOTES\s+PRESENTED\s+(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                    const lembar = notesMatch
                        ? (parseInt(notesMatch[1], 10) + parseInt(notesMatch[2], 10) + parseInt(notesMatch[3], 10) + parseInt(notesMatch[4], 10))
                        : 0;

                    if (amount > 0) {
                        transactions.push({ ts, type: 'dispense', amount, lembar });
                        if (machineDenom === null && lembar > 0) {
                            machineDenom = (amount / lembar) >= 75000 ? 100000 : 50000;
                        }
                    }
                }
            }
        }
    }
    if (machineDenom === null) machineDenom = 50000;
    rplMarkers.forEach(mk => {
        mk.resetAmount = mk._addCashLembar > 0 ? mk._addCashLembar * machineDenom : null;
        delete mk._addCashLembar;
    });
    return { transactions, rplMarkers, machineDenom };
}

// ---------- WINCOR ----------
// FIX Poin 2b: Wincor tidak punya field denominasi yg bisa dipercaya di log (label "IDR xxxxx"
// pada blok kaset statis/tidak merepresentasikan denom fisik sebenarnya). Denominasi mesin
// diturunkan dari transaksi dispense VALID pertama: AMOUNT asli di log ÷ lembar keluar
// (CASH REQUEST) - lalu dipakai konsisten ke SEMUA transaksi (lembar x denom), BUKAN lagi
// asumsi split gaya CRM (c1+c2)*100000+(c3+c4)*50000.
function summaryExtractWincor(lines) {
    const transactions = [];
    const rplMarkers = [];
    let machineDenom = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('CASH COUNTERS AFTER SOP')) {
            const key = wincorAdminKeyResolver('', lines, i); // ADM|SOP|dd/mm/yy hh:mm:ss
            const mm = key.match(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
            if (mm) {
                const ts = buildDateFromParts(mm[1], mm[2], mm[3], mm[4], mm[5], mm[6]);
                if (ts) {
                    const addCashLembar = parseWincorAddCashNewValidated(lines, i);
                    rplMarkers.push({ ts, label: 'REPLENISH', _addCashLembar: addCashLembar });
                }
            }
        }
        const reqMatch = line.match(/CASH REQUEST:\s*(\d{2})(\d{2})(\d{2})(\d{2})/);
        if (reqMatch) {
            const c1 = parseInt(reqMatch[1], 10), c2 = parseInt(reqMatch[2], 10), c3 = parseInt(reqMatch[3], 10), c4 = parseInt(reqMatch[4], 10);
            const lembar = c1 + c2 + c3 + c4;
            if (lembar > 0) {
                const dm = extractDateTimeNearLine(lines, i, [1, 2, 3, 4, 5], /TANGGAL:\s*(\d{2})\/(\d{2})\/(\d{2})\s+WAKTU\s*:\s*(\d{2}):(\d{2}):(\d{2})/, 20);
                if (dm) {
                    const ts = buildDateFromParts(dm[1], dm[2], dm[3], dm[4], dm[5], dm[6]);
                    if (ts) {
                        if (machineDenom === null) {
                            const amtWindow = lines.slice(Math.max(0, i - 2), i + 20).join('\n');
                            const amtMatch = amtWindow.match(/AMOUNT\s*:\s*RP\s*([\d.,]+)/);
                            if (amtMatch) {
                                const realAmount = parseInt(amtMatch[1].replace(/[.,]/g, ''), 10);
                                if (realAmount > 0) machineDenom = (realAmount / lembar) >= 75000 ? 100000 : 50000;
                            }
                        }
                        transactions.push({ ts, type: 'dispense', amount: 0, lembar, _pendingDenom: true });
                    }
                }
            }
        }
    }
    if (machineDenom === null) machineDenom = 50000;
    transactions.forEach(t => {
        if (t._pendingDenom) { t.amount = t.lembar * machineDenom; delete t._pendingDenom; }
    });
    rplMarkers.forEach(mk => {
        mk.resetAmount = mk._addCashLembar > 0 ? mk._addCashLembar * machineDenom : null;
        delete mk._addCashLembar;
    });
    return { transactions, rplMarkers, machineDenom };
}

// ---------- JALIN ----------
// Nominal per transaksi TETAP dari denom asli yg tertulis di baris DISPENSED (sudah akurat,
// tidak diubah). Denominasi mesin (utk pembulatan Daily Rate) diambil dari transaksi pertama.
function summaryExtractJalin(lines) {
    const transactions = [];
    const rplMarkers = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('PRT_SHOW_CASSETTES')) {
            // FIX: field pipe pertama (index 3) SELALU placeholder "0000-00-00 00:00:00" utk
            // event ini - tanggal ASLI ada di field ke-5 (index 4). Pakai cara yang SAMA PERSIS
            // dgn logic existing yang sudah tervalidasi (findJalinAddCashPeriods).
            const parts = line.split('|');
            if (parts.length >= 5) {
                const dateTime = parts[4].trim();
                const dm = dateTime.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
                if (dm) {
                    const ts = buildDateFromParts(dm[3], dm[2], dm[1], dm[4], dm[5], dm[6]);
                    if (ts) {
                        // FIX (koreksi arahan): Saldo grafik DIRESET ke nilai add-cash sungguhan,
                        // dihitung final di bawah setelah machineDenom pasti diketahui.
                        const addCashResult = parseJalinAddCash(lines, i);
                        rplMarkers.push({ ts, label: 'REPLENISH', _addCashLembar: addCashResult.foundValid ? addCashResult.totalAddCash : 0 });
                    }
                }
            }
        }
        if (line.includes('DISPENSED:')) {
            const m = line.match(/\|(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\|(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\|DISPENSED:\s*(.+)/);
            if (m) {
                const ts = buildDateFromParts(m[3], m[2], m[1], m[4], m[5], m[6]);
                // Format: "0 x 0,00 , 2 x 100.000,00 IDR, 0 x 50.000,00 IDR, ..." -> jumlah lembar x denom
                const detail = m[13];
                let amount = 0;
                let lembar = 0;
                const pieces = detail.split(',');
                for (let k = 0; k + 1 < pieces.length; k += 2) {
                    const countMatch = (pieces[k] || '').match(/(\d+)\s*x/);
                    const denomMatch = ((pieces[k] || '') + ',' + (pieces[k+1] || '')).match(/x\s*([\d.]+),\d+\s*IDR/);
                    if (countMatch && denomMatch) {
                        const count = parseInt(countMatch[1], 10);
                        const denom = parseInt(denomMatch[1].replace(/\./g, ''), 10);
                        if (!isNaN(count) && !isNaN(denom)) { amount += count * denom; lembar += count; }
                    }
                }
                if (ts && amount > 0) transactions.push({ ts, type: 'dispense', amount, lembar });
            }
        }
    }
    // Denom mesin: ambil dari transaksi PERTAMA (amount ÷ lembar), sudah akurat krn Jalin
    // mencatat denom asli per transaksi - dipakai murni utk pembulatan Daily Rate.
    let machineDenom = 50000;
    const firstValid = transactions.find(t => t.lembar > 0);
    if (firstValid) machineDenom = (firstValid.amount / firstValid.lembar) >= 75000 ? 100000 : 50000;

    rplMarkers.forEach(mk => {
        mk.resetAmount = mk._addCashLembar > 0 ? mk._addCashLembar * machineDenom : null;
        delete mk._addCashLembar;
    });
    return { transactions, rplMarkers, machineDenom };
}

const SUMMARY_EXTRACTORS = {
    crm: summaryExtractCrmHitachi,
    dn: summaryExtractDinabold,
    oky: summaryExtractOky,
    hyosung: summaryExtractHyosung,
    ncr: summaryExtractNcr,
    wincor: summaryExtractWincor,
    jalin: summaryExtractJalin,
    crmHyosung: summaryExtractCrmHyosung,
};

// FITUR BARU: 2 set label kuadran (4 = default, 8 = mode detail via toggle user) + helper
// pengelompokan dari data PER JAM (24 slot) ke salah satu dari keduanya. Label 4-kuadran
// TETAP format lama (mis. "00:00 - 06:00") - tidak diubah, sudah dikenal user. Label
// 8-kuadran pakai format inklusif per instruksi user (mis. "00:00 - 02:59").
const QUADRANT_LABELS_4 = ['00:00 - 06:00', '06:00 - 12:00', '12:00 - 18:00', '18:00 - 24:00'];
const QUADRANT_LABELS_8 = ['00:00 - 02:59', '03:00 - 05:59', '06:00 - 08:59', '09:00 - 11:59', '12:00 - 14:59', '15:00 - 17:59', '18:00 - 20:59', '21:00 - 23:59'];
function getQuadrantLabels(n) { return n === 8 ? QUADRANT_LABELS_8 : QUADRANT_LABELS_4; }
function groupHourlyToQuadrants(hourlyArr, n) {
    const groupSize = 24 / n;
    const out = new Array(n).fill(0);
    for (let h = 0; h < 24; h++) out[Math.floor(h / groupSize)] += hourlyArr[h];
    return out;
}

function dateKeyLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function statMean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function statMedian(arr) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatDateShort(d) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Agregasi utama Summary: dari daftar transaksi + marker RPL, hasilkan:
 * - dailyTable: rekap per tanggal (jumlah, nominal, per jenis)
 * - quadrant*: distribusi per kuadran jam, dipisah dispense/deposit
 * - dailyRateDisp/dailyRateDep: statistik mean & median transaksi harian (jumlah & nominal)
 * - conclusion: kesimpulan otomatis
 */
function aggregateSummaryData(transactions, rplMarkers, isTwoWay, roundUnit) {
    // roundUnit: kelipatan pembulatan nominal Daily Rate - 50000 utk CRM (2 denom, satuan
    // terkecil 50rb), atau denom asli mesin (50000/100000) utk ATM (1 denom fisik).
    if (!roundUnit) roundUnit = 50000;

    // PENTING: dispCount/depCount = JUMLAH TRANSAKSI (dipakai HANYA utk kartu "Total Transaksi").
    // dispLembar/depLembar = JUMLAH LEMBAR sesungguhnya (dipakai utk semua yang berlabel "Lembar").
    // Dua hal ini BEDA dan sengaja dipisah - inilah inti perbaikan bug "lembar = jumlah transaksi".
    const dailyMap = new Map();
    // FITUR BARU: basis data diubah dari 4 kuadran TETAP jadi 24 slot PER JAM - supaya di level
    // tampilan bisa dikelompokkan ulang jadi 4 (default) ATAU 8 kuadran sesuai toggle user, dari
    // satu sumber data yang sama (bukan hitung ulang) - lihat groupHourlyToQuadrants() di dekat
    // renderSummaryContent().
    const hourlyDispCount = new Array(24).fill(0), hourlyDispAmount = new Array(24).fill(0), hourlyDispLembar = new Array(24).fill(0);
    const hourlyDepCount = new Array(24).fill(0), hourlyDepAmount = new Array(24).fill(0), hourlyDepLembar = new Array(24).fill(0);
    const hourlyDispLembar100 = new Array(24).fill(0), hourlyDispLembar50 = new Array(24).fill(0);
    const hourlyDepLembar100 = new Array(24).fill(0), hourlyDepLembar50 = new Array(24).fill(0);

    const sorted = [...transactions].sort((a, b) => a.ts - b.ts);

    sorted.forEach(t => {
        const key = dateKeyLocal(t.ts);
        if (!dailyMap.has(key)) {
            dailyMap.set(key, {
                dateKey: key, date: new Date(t.ts.getFullYear(), t.ts.getMonth(), t.ts.getDate()),
                dispCount: 0, dispAmount: 0, dispLembar: 0, dispLembar100: 0, dispLembar50: 0,
                depCount: 0, depAmount: 0, depLembar: 0, depLembar100: 0, depLembar50: 0,
            });
        }
        const rec = dailyMap.get(key);
        const h = t.ts.getHours();
        const lembar = t.lembar || 0;
        const lembar100 = t.lembar100 || 0;
        const lembar50 = t.lembar50 || 0;
        if (t.type === 'dispense') {
            rec.dispCount++; rec.dispAmount += t.amount; rec.dispLembar += lembar;
            rec.dispLembar100 += lembar100; rec.dispLembar50 += lembar50;
            hourlyDispCount[h]++; hourlyDispAmount[h] += t.amount; hourlyDispLembar[h] += lembar;
            hourlyDispLembar100[h] += lembar100; hourlyDispLembar50[h] += lembar50;
        } else {
            rec.depCount++; rec.depAmount += t.amount; rec.depLembar += lembar;
            rec.depLembar100 += lembar100; rec.depLembar50 += lembar50;
            hourlyDepCount[h]++; hourlyDepAmount[h] += t.amount; hourlyDepLembar[h] += lembar;
            hourlyDepLembar100[h] += lembar100; hourlyDepLembar50[h] += lembar50;
        }
    });

    const dailyTable = [...dailyMap.values()].sort((a, b) => a.date - b.date);

    // Net per hari (khusus CRM): Net = Deposit - Dispense, konsisten di lembar & nominal
    if (isTwoWay) {
        dailyTable.forEach(d => {
            d.netLembar = d.depLembar - d.dispLembar;
            d.netAmount = d.depAmount - d.dispAmount;
            d.netLembar100 = d.depLembar100 - d.dispLembar100;
            d.netLembar50 = d.depLembar50 - d.dispLembar50;
        });
    }

    // Tandai hari yang punya event RPL (utk anotasi "REPLENISH" - murni penanda, tidak pengaruhi angka)
    const rplDateKeys = new Set(rplMarkers.map(m => dateKeyLocal(m.ts)));
    dailyTable.forEach(d => { d.hasReplenish = rplDateKeys.has(d.dateKey); });

    // ---- Grafik Nominal Harian: Saldo berjalan, DIRESET tepat pada JAM event REPLENISH ----
    // sungguhan terjadi (bukan cuma di awal hari kalendernya, dan bukan ke 0).
    // FIX (sebelumnya): kalau REPLENISH terjadi tengah hari (mis. jam 18:41), versi lama
    // mereset SELURUH hari itu ke nilai RPL lalu memotong SEMUA transaksi hari itu dari nilai
    // baru tsb - padahal transaksi SEBELUM jam RPL sebenarnya masih menguras saldo LAMA (siklus
    // sebelumnya), bukan saldo baru yang belum masuk. Ini bisa membuat Saldo Akhir terlihat
    // minus padahal fisiknya tidak mungkin minus (kas selalu diisi ulang SEBELUM benar2 habis).
    // FIX SEKARANG: satu timeline kronologis berisi transaksi + event RPL (diurutkan per detik,
    // RPL diproses lebih dulu kalau timestamp-nya sama persis dgn transaksi), saldo berjalan
    // di-update transaksi demi transaksi TEPAT di titik waktu aslinya, dan RPL me-reset saldo
    // TEPAT di detik itu juga - sehingga transaksi sebelum jam RPL tetap kena dari saldo lama,
    // dan baru transaksi setelah jam RPL yang kena dari saldo baru. Saldo Awal/Akhir per hari di
    // bawah ini HANYA dipakai utk grafik "perjalanan saldo" - kolom dispAmount/depAmount di
    // dailyTable (dipakai tabel rekap harian In/Out) SAMA SEKALI TIDAK diubah oleh blok ini.
    const timeline = [];
    transactions.forEach(t => timeline.push({ ts: t.ts, kind: 'trx', type: t.type, amount: t.amount, lembar: t.lembar }));
    rplMarkers.forEach(m => {
        if (m.resetAmount !== null && m.resetAmount !== undefined) {
            timeline.push({ ts: m.ts, kind: 'rpl', resetAmount: m.resetAmount });
        }
    });
    timeline.sort((a, b) => a.ts - b.ts || ((a.kind === 'rpl' ? -1 : 1) - (b.kind === 'rpl' ? -1 : 1)));

    const saldoAwalByDate = new Map(), saldoAkhirByDate = new Map();
    let runningSaldo = 0, lastDateKey = null;
    timeline.forEach(ev => {
        const dk = dateKeyLocal(ev.ts);
        if (dk !== lastDateKey) {
            if (!saldoAwalByDate.has(dk)) saldoAwalByDate.set(dk, runningSaldo);
            lastDateKey = dk;
        }
        if (ev.kind === 'rpl') {
            runningSaldo = ev.resetAmount;
        } else if (isTwoWay) {
            runningSaldo += (ev.type === 'deposit' ? ev.amount : -ev.amount);
        } else {
            runningSaldo -= ev.amount; // ATM: cuma dispense
        }
        saldoAkhirByDate.set(dk, runningSaldo);
    });
    dailyTable.forEach(d => {
        d.saldoAwal = saldoAwalByDate.has(d.dateKey) ? saldoAwalByDate.get(d.dateKey) : 0;
        d.saldoAkhir = saldoAkhirByDate.has(d.dateKey) ? saldoAkhirByDate.get(d.dateKey) : d.saldoAwal;
    });

    // ---- FITUR BARU: pecah data per SEGMEN (sebelum/sesudah RPL) khusus utk hari yang
    // ada event REPLENISH - dipakai HANYA utk grafik (bar dipecah 2 warna + pembatas visual
    // antara periode lama & baru). TABEL rekap harian & kolom dispAmount/depAmount di
    // dailyTable di atas TIDAK disentuh sama sekali oleh blok ini - tujuannya tabel itu
    // tetap "in/out per hari", sedangkan grafik menggambarkan "perjalanan saldo" termasuk
    // titik potong RPL-nya. Kalau 1 hari ada >1 event RPL, dipakai yang TERAKHIR sebagai
    // titik potong (kasus jarang, disederhanakan).
    const rplSplitByDate = new Map();
    {
        const lastRplPerDate = new Map();
        rplMarkers.forEach(m => {
            if (m.resetAmount === null || m.resetAmount === undefined) return;
            const dk = dateKeyLocal(m.ts);
            const existing = lastRplPerDate.get(dk);
            if (!existing || m.ts > existing.ts) lastRplPerDate.set(dk, m);
        });
        lastRplPerDate.forEach((m, dk) => {
            rplSplitByDate.set(dk, {
                rplTs: m.ts, saldoBeforeRpl: null, saldoAfterRplStart: m.resetAmount,
                dispBefore: 0, dispAfter: 0, depBefore: 0, depAfter: 0,
                dispBeforeLembar: 0, dispAfterLembar: 0, depBeforeLembar: 0, depAfterLembar: 0,
            });
        });
        let runningSaldo2 = 0;
        timeline.forEach(ev => {
            const dk = dateKeyLocal(ev.ts);
            const split = rplSplitByDate.get(dk);
            if (ev.kind === 'rpl') {
                if (split && ev.ts.getTime() === split.rplTs.getTime() && split.saldoBeforeRpl === null) {
                    split.saldoBeforeRpl = runningSaldo2; // saldo TEPAT sebelum reset ini terjadi
                }
                runningSaldo2 = ev.resetAmount;
            } else {
                if (split) {
                    const isAfter = ev.ts >= split.rplTs;
                    const evLembar = ev.lembar || 0;
                    if (ev.type === 'dispense') {
                        if (isAfter) { split.dispAfter += ev.amount; split.dispAfterLembar += evLembar; }
                        else { split.dispBefore += ev.amount; split.dispBeforeLembar += evLembar; }
                    } else {
                        if (isAfter) { split.depAfter += ev.amount; split.depAfterLembar += evLembar; }
                        else { split.depBefore += ev.amount; split.depBeforeLembar += evLembar; }
                    }
                }
                if (isTwoWay) runningSaldo2 += (ev.type === 'deposit' ? ev.amount : -ev.amount);
                else runningSaldo2 -= ev.amount;
            }
        });
    }
    dailyTable.forEach(d => {
        const split = rplSplitByDate.get(d.dateKey);
        if (split) {
            d.rplSplit = {
                saldoBeforeRpl: split.saldoBeforeRpl !== null ? split.saldoBeforeRpl : d.saldoAwal,
                saldoAfterRplStart: split.saldoAfterRplStart,
                dispBefore: split.dispBefore, dispAfter: split.dispAfter,
                depBefore: split.depBefore, depAfter: split.depAfter,
                dispBeforeLembar: split.dispBeforeLembar, dispAfterLembar: split.dispAfterLembar,
                depBeforeLembar: split.depBeforeLembar, depAfterLembar: split.depAfterLembar,
            };
        }
    });

    const totalTrx = sorted.length;

    const totalDispAmount = dailyTable.reduce((s, d) => s + d.dispAmount, 0);
    const totalDepAmount = dailyTable.reduce((s, d) => s + d.depAmount, 0);
    const totalDispLembar = dailyTable.reduce((s, d) => s + d.dispLembar, 0);
    const totalDepLembar = dailyTable.reduce((s, d) => s + d.depLembar, 0);

    let conclusion = {
        totalDispAmount,
        totalDepAmount,
        totalDispLembar,
        totalDepLembar,
    };

    if (isTwoWay) {
        const ratio = totalDispAmount > 0 ? (totalDepAmount / totalDispAmount) : (totalDepAmount > 0 ? Infinity : 0);
        let dominance = 'BALANCE';
        if (ratio > 1.3) dominance = 'DOMINAN SETOR';
        else if (ratio < 0.7) dominance = 'DOMINAN TARIK';
        conclusion.dominance = dominance;
        conclusion.ratio = ratio;
    }

    conclusion.replenishCount = rplMarkers.length;

    // ---- Daily Rate: statistik mean & median LEMBAR harian (BUKAN jumlah transaksi) + nominal ----
    // FIX: nominal mean/median DIBULATKAN ke kelipatan roundUnit (denom mesin) supaya angka yg
    // ditampilkan tetap realistis (uang fisik selalu kelipatan 50rb/100rb, statistik mentah bisa
    // menghasilkan pecahan yang tidak mungkin ada secara fisik).
    // FIX (poin 5 dari user): mean/median WAJIB cuma pakai hari yang datanya sepenuhnya berada
    // di DALAM periode penuh (diapit 2 event RPL) - hari sebelum RPL pertama & sesudah RPL
    // terakhir (periode masih "terbuka", belum ditutup replenish berikutnya) DIBUANG dari
    // statistik ini supaya tidak mencemari mean/median dgn periode yg belum tentu representatif
    // (bisa saja baru mulai/durasinya beda). Grafik & tabel harian di ATAS *tetap* tampilkan
    // semua hari apa adanya - filter ini HANYA berlaku utk kartu Daily Rate (mean/median).
    let statsDailyMap = dailyMap;
    if (rplMarkers.length >= 2) {
        const sortedRpl = [...rplMarkers].filter(m => m.resetAmount !== null && m.resetAmount !== undefined).sort((a, b) => a.ts - b.ts);
        if (sortedRpl.length >= 2) {
            const fullPeriodStart = sortedRpl[0].ts;
            const fullPeriodEnd = sortedRpl[sortedRpl.length - 1].ts;
            statsDailyMap = new Map();
            transactions.filter(t => t.ts >= fullPeriodStart && t.ts < fullPeriodEnd).forEach(t => {
                const dk = dateKeyLocal(t.ts);
                if (!statsDailyMap.has(dk)) {
                    statsDailyMap.set(dk, { dispLembar: 0, dispAmount: 0, dispLembar100: 0, dispLembar50: 0, depLembar: 0, depAmount: 0, depLembar100: 0, depLembar50: 0 });
                }
                const d = statsDailyMap.get(dk);
                if (t.type === 'dispense') {
                    d.dispLembar += t.lembar; d.dispAmount += t.amount;
                    d.dispLembar100 += (t.lembar100 || 0); d.dispLembar50 += (t.lembar50 || 0);
                } else {
                    d.depLembar += t.lembar; d.depAmount += t.amount;
                    d.depLembar100 += (t.lembar100 || 0); d.depLembar50 += (t.lembar50 || 0);
                }
            });
        } else {
            statsDailyMap = new Map(); // cuma 1 RPL valid -> tidak ada periode penuh sama sekali
        }
    } else {
        statsDailyMap = new Map(); // <2 RPL -> tidak ada periode penuh sama sekali
    }
    const statsDailyTable = [...statsDailyMap.values()];

    const dispLembarPerDay = statsDailyTable.map(d => d.dispLembar);
    const dispAmountsPerDay = statsDailyTable.map(d => d.dispAmount);
    const dispLembar100PerDay = statsDailyTable.map(d => d.dispLembar100);
    const dispLembar50PerDay = statsDailyTable.map(d => d.dispLembar50);
    const dailyRateDisp = {
        meanLembar: statMean(dispLembarPerDay), medianLembar: statMedian(dispLembarPerDay),
        meanAmount: roundToNearest(statMean(dispAmountsPerDay), roundUnit),
        medianAmount: roundToNearest(statMedian(dispAmountsPerDay), roundUnit),
        meanLembar100: statMean(dispLembar100PerDay), medianLembar100: statMedian(dispLembar100PerDay),
        meanLembar50: statMean(dispLembar50PerDay), medianLembar50: statMedian(dispLembar50PerDay),
    };
    let dailyRateDep = null;
    let dailyRateNet = null;
    if (isTwoWay) {
        const depLembarPerDay = statsDailyTable.map(d => d.depLembar);
        const depAmountsPerDay = statsDailyTable.map(d => d.depAmount);
        const depLembar100PerDay = statsDailyTable.map(d => d.depLembar100);
        const depLembar50PerDay = statsDailyTable.map(d => d.depLembar50);
        dailyRateDep = {
            meanLembar: statMean(depLembarPerDay), medianLembar: statMedian(depLembarPerDay),
            meanAmount: roundToNearest(statMean(depAmountsPerDay), roundUnit),
            medianAmount: roundToNearest(statMedian(depAmountsPerDay), roundUnit),
            meanLembar100: statMean(depLembar100PerDay), medianLembar100: statMedian(depLembar100PerDay),
            meanLembar50: statMean(depLembar50PerDay), medianLembar50: statMedian(depLembar50PerDay),
        };
        // FIX Net Daily Rate ("selaras"): Net diturunkan LANGSUNG dari Deposit-Dispense yang
        // SUDAH DIBULATKAN di atas (bukan lagi median/mean dari Net harian mentah) - supaya
        // 3 angka di kartu (Dispense/Deposit/Net) SELALU bisa dicocokkan manual oleh user
        // (median tidak linear, median(net harian) != median(dep)-median(disp) secara matematis,
        // itulah sumber "kelihatan keliru" yang dilaporkan).
        dailyRateNet = {
            meanLembar: dailyRateDep.meanLembar - dailyRateDisp.meanLembar,
            medianLembar: dailyRateDep.medianLembar - dailyRateDisp.medianLembar,
            meanAmount: dailyRateDep.meanAmount - dailyRateDisp.meanAmount,
            medianAmount: dailyRateDep.medianAmount - dailyRateDisp.medianAmount,
            // FIX: Net skrg juga pecah lembar 50rb/100rb (sebelumnya cuma ada di Dispense/Deposit)
            meanLembar100: dailyRateDep.meanLembar100 - dailyRateDisp.meanLembar100,
            medianLembar100: dailyRateDep.medianLembar100 - dailyRateDisp.medianLembar100,
            meanLembar50: dailyRateDep.meanLembar50 - dailyRateDisp.meanLembar50,
            medianLembar50: dailyRateDep.medianLembar50 - dailyRateDisp.medianLembar50,
        };
    }

    const dateRangeStart = dailyTable.length > 0 ? dailyTable[0].date : null;
    const dateRangeEnd = dailyTable.length > 0 ? dailyTable[dailyTable.length - 1].date : null;

    return {
        dailyTable,
        hourlyDispCount,
        hourlyDispAmount,
        hourlyDispLembar,
        hourlyDispLembar100,
        hourlyDispLembar50,
        hourlyDepCount,
        hourlyDepAmount,
        hourlyDepLembar,
        hourlyDepLembar100,
        hourlyDepLembar50,
        totalTrx,
        conclusion,
        dailyRateDisp,
        dailyRateDep,
        dailyRateNet,
        dateRangeStart,
        dateRangeEnd,
        roundUnit,
    };
}

// ============================================================
// POIN 2 — SUMMARY UI (modal fullscreen, tombol, rendering)
// Semua elemen UI dibuat via DOM manipulation (bukan edit HTML 6 halaman
// existing) supaya risiko ke halaman yang sudah benar = nol.
// ============================================================

const SUMMARY_MACHINE_CONFIG = {
    crm: { pageId: 'page-crm', textareaId: 'crmLogInput', label: 'CRM HITACHI', isTwoWay: true, color: '#FF7A29' },
    dn: { pageId: 'page-crm-dinabold', textareaId: 'dnLogInput', label: 'CRM DINABOLD', isTwoWay: true, color: '#FF7A29' },
    oky: { pageId: 'page-crm-oki', textareaId: 'okyLogInput', label: 'CRM OKI', isTwoWay: true, color: '#FF7A29' },
    hyosung: { pageId: 'page-hyosung', textareaId: 'hyosungLogInput', label: 'ATM HYOSUNG', isTwoWay: false, color: '#2E8EFF' },
    wincor: { pageId: 'page-wincor', textareaId: 'wincorLogInput', label: 'ATM WINCOR', isTwoWay: false, color: '#2E8EFF' },
    ncr: { pageId: 'page-ncr', textareaId: 'ncrLogInput', label: 'ATM NCR', isTwoWay: false, color: '#2E8EFF' },
    jalin: { pageId: 'page-jalin', textareaId: 'jalinLogInput', label: 'ATM JALIN', isTwoWay: false, color: '#FF2A3D' },
    crmHyosung: { pageId: 'page-crm-hyosung', textareaId: 'crmHyosungLogInput', label: 'CRM HYOSUNG', isTwoWay: true, color: '#FF7A29' },
};

let summaryChartInstance = null;
// FITUR BARU: state toggle 4/8 kuadran (default 4, sesuai permintaan) - direset tiap modal
// Summary dibuka baru (lihat openSummaryModal), dipertahankan selama modal yg sama terbuka
// supaya re-render akibat toggle tidak perlu scan ulang log.
let summaryQuadrantMode = 4;
let summaryRadarAnimFrame = null;
let summaryDonutChartInstance = null;

function injectSummaryButtons() {
    Object.entries(SUMMARY_MACHINE_CONFIG).forEach(([machineKey, cfg]) => {
        const page = document.getElementById(cfg.pageId);
        if (!page) return;
        const container = page.querySelector('.back-button-container');
        if (!container || container.querySelector('.summary-button')) return;

        const btn = document.createElement('button');
        btn.className = 'summary-button px-6 py-3 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800/50 flex items-center gap-3 text-slate-300 hover:text-white transition-all group w-fit';
        btn.innerHTML = '<span class="font-mono font-bold tracking-wide">SUMMARY</span> <span class="text-xl group-hover:translate-x-1 transition-transform">📊</span>';
        btn.addEventListener('click', () => openSummaryModal(machineKey));
        container.appendChild(btn);
    });
}

function ensureSummaryModalExists() {
    let overlay = document.getElementById('summary-modal-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'summary-modal-overlay';
    overlay.className = 'summary-modal-overlay hidden';
    overlay.innerHTML = `
        <div class="max-w-[1400px] mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h2 id="summary-modal-title" class="text-3xl font-black text-white tracking-tight">SUMMARY TRANSAKSI</h2>
                <button id="summary-modal-close" class="px-5 py-2.5 rounded-lg border border-slate-700 hover:border-red-500 bg-slate-800/50 hover:bg-red-500/10 text-slate-300 hover:text-red-400 transition-all font-mono font-bold">✕ TUTUP</button>
            </div>
            <div id="summary-modal-body" class="flex flex-col gap-6"></div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('summary-modal-close').addEventListener('click', closeSummaryModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSummaryModal(); });
    return overlay;
}

function closeSummaryModal() {
    const overlay = document.getElementById('summary-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (summaryChartInstance) { summaryChartInstance.destroy(); summaryChartInstance = null; }
    if (summaryRadarAnimFrame) { cancelAnimationFrame(summaryRadarAnimFrame); summaryRadarAnimFrame = null; }
    if (summaryDonutChartInstance) { summaryDonutChartInstance.destroy(); summaryDonutChartInstance = null; }
}

function formatRp(n) {
    const rounded = Math.round(n);
    const sign = rounded < 0 ? '-' : '';
    return sign + 'Rp' + Math.abs(rounded).toLocaleString('id-ID');
}

function openSummaryModal(machineKey) {
    const cfg = SUMMARY_MACHINE_CONFIG[machineKey];
    if (!cfg) return;
    const textarea = document.getElementById(cfg.textareaId);
    if (!textarea || !textarea.value || textarea.value.trim().length === 0) {
        alert('Upload / paste log terlebih dahulu sebelum melihat Summary.');
        return;
    }

    const overlay = ensureSummaryModalExists();
    summaryQuadrantMode = 4; // selalu default 4 kuadran tiap modal dibuka baru
    // Judul pakai TID (bukan nama merek mesin). Fallback ke label mesin kalau TID tak ketemu.
    const rawTextForTid = cleanAnsiCodes(textarea.value);
    let tid = (machineKey === 'jalin') ? findJalinTID(rawTextForTid) : findATM_ID(rawTextForTid);
    if (!tid || tid === 'Not Found' || tid === 'N/A') {
        document.getElementById('summary-modal-title').textContent = `SUMMARY TRANSAKSI — ${cfg.label}`;
    } else {
        document.getElementById('summary-modal-title').textContent = `SUMMARY TRANSAKSI — TID ${tid}`;
    }
    const body = document.getElementById('summary-modal-body');
    body.innerHTML = '<div class="text-center text-slate-400 font-mono py-20">Menganalisis log, mohon tunggu...</div>';
    overlay.classList.remove('hidden');

    // Proses berat (scan seluruh log) ditunda 1 tick via setTimeout supaya UI
    // sempat render pesan loading dulu, tidak freeze tanpa umpan balik.
    setTimeout(() => {
        try {
            const lines = rawTextForTid.split('\n');
            const extractor = SUMMARY_EXTRACTORS[machineKey];
            const { transactions, rplMarkers, machineDenom } = extractor(lines);

            if (transactions.length === 0) {
                body.innerHTML = '<div class="text-center text-slate-400 font-mono py-20">Tidak ditemukan transaksi pada log ini.</div>';
                return;
            }

            // FIX pembulatan Daily Rate: CRM (2 denom) selalu kelipatan 50rb; ATM (1 denom fisik)
            // pakai denom asli mesin yg baru saja terdeteksi (100rb atau 50rb).
            const roundUnit = cfg.isTwoWay ? 50000 : (machineDenom || 50000);
            const agg = aggregateSummaryData(transactions, rplMarkers, cfg.isTwoWay, roundUnit);
            agg.machineDenom = machineDenom || null;
            renderSummaryContent(body, cfg, agg);
        } catch (err) {
            body.innerHTML = `<div class="text-center text-danger font-mono py-20">Terjadi kesalahan saat menganalisis: ${err.message}</div>`;
            console.error('Summary error:', err);
        }
    }, 30);
}

// ============================================================================
// FITUR BARU: radar analog 12-jam yang HIDUP (jarum menyapu otomatis) untuk
// menggantikan chart polarArea statis - sesuai request: "grafiknya dinamis
// bergerak dan berubah otomatis dan merepresentasikan nilai transaksi di jam
// tersebut". Dial tetap 12 jam (jam dunia nyata cuma 12) dengan indikator
// AM/PM di tengah, seperti contoh yang diberikan user - tapi disederhanakan
// dari tema "radar militer" jadi selaras dengan bahasa visual aplikasi kita
// (JetBrains Mono, palet cyan netral utk elemen radar, merah/hijau HANYA
// dipakai utk makna setor/tarik seperti kartu kuadran, bukan warna dasar
// radar). Jarum menyapu 1 putaran = 12 jam, lalu gantian fase AM/PM (persis
// cara kerja jam analog biasa dipakai utk 24 jam kalender). Jumlah irisan per
// fase otomatis ikut toggle 4/8 kuadran (2 irisan/fase utk mode 4, 4
// irisan/fase utk mode 8) - dari SATU sumber data yang sama (qLabels dst.).
// Kuadran yg sedang disapu menyala di radar SEKALIGUS di kartu kiri (via
// class .active-sweep), dan panel di bawah radar menampilkan nominal +
// jumlah transaksi kuadran itu, ikut berganti live mengikuti jarum.
// ============================================================================
function initSummaryRadar({ qLabels, qDispAmount, qNetAmount, qTotals, isTwoWay, themeColor, quadrantMode }) {
    if (summaryRadarAnimFrame) { cancelAnimationFrame(summaryRadarAnimFrame); summaryRadarAnimFrame = null; }

    const svg = document.getElementById('summary-radar-svg');
    const needlePivot = document.getElementById('summary-radar-needle-pivot');
    const timeEl = document.getElementById('summary-radar-time');
    const phaseEl = document.getElementById('summary-radar-phase');
    const labelsWrap = document.getElementById('summary-radar-labels');
    const readout = document.getElementById('summary-radar-readout');
    if (!svg || !needlePivot || !timeEl || !phaseEl || !labelsWrap || !readout) return;

    const segPerPhase = quadrantMode / 2;      // 2 (mode 4) atau 4 (mode 8) irisan tiap putaran
    const hoursPerSeg = 12 / segPerPhase;       // lebar tiap irisan dalam jam kalender
    const degPerSeg = 360 / segPerPhase;        // lebar tiap irisan dalam derajat

    function polarToXY(cx, cy, r, deg) {
        const rad = (deg - 90) * Math.PI / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }
    function describeArc(cx, cy, r, startDeg, endDeg) {
        const start = polarToXY(cx, cy, r, endDeg);
        const end = polarToXY(cx, cy, r, startDeg);
        const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
        return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
    }

    const magnitudes = isTwoWay ? qNetAmount.map(v => Math.abs(v)) : qDispAmount;
    const maxAbs = Math.max(...magnitudes, 1);
    // FIX: baseR sebelumnya (24) lebih KECIL dari radius badge waktu di tengah (~30 unit
    // viewBox) - akibatnya irisan bernilai kecil (mis. net +Rp5,3jt vs -Rp117jt) tergambar
    // tapi TERTUTUP TOTAL oleh badge, kelihatan seperti "kosong". Dinaikkan supaya semua
    // irisan, sekecil apa pun nilainya, tetap mengintip keluar dari badge.
    const baseR = 40, maxR = 96;

    function renderPhase(isPM) {
        svg.innerHTML = '';
        labelsWrap.innerHTML = '';
        const offset = isPM ? segPerPhase : 0;
        for (let i = 0; i < segPerPhase; i++) {
            const qi = offset + i;
            const val = isTwoWay ? qNetAmount[qi] : qDispAmount[qi];
            const r = baseR + (Math.abs(val) / maxAbs) * (maxR - baseR);
            const startDeg = i * degPerSeg, endDeg = startDeg + degPerSeg;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', describeArc(100, 100, r, startDeg, endDeg));
            // FIX: sebelumnya "!isTwoWay || val >= 0" salah - utk ATM (isTwoWay=false) ini
            // SELALU true (hijau) apa pun nilainya. ATM cuma dispense (uang selalu keluar),
            // jadi harus SELALU merah; CRM ikuti tanda net-nya seperti semula.
            const positive = isTwoWay ? (val >= 0) : false;
            path.setAttribute('class', `summary-radar-segment ${positive ? 'positive' : 'negative'}`);
            path.dataset.qi = String(qi);
            svg.appendChild(path);

            // FIX: label posisinya HARUS di batas AWAL irisan (bukan tengah-tengah irisan) -
            // supaya "12" pas presisi di posisi jam 12 sungguhan (atas-tengah), bukan geser
            // setengah lebar irisan (yang bikin pola berlian miring seperti dilaporkan user).
            const pos = polarToXY(50, 50, 43, startDeg);
            const startHour = (qi * hoursPerSeg) % 24;
            const lbl = document.createElement('div');
            lbl.className = 'summary-radar-hour-label';
            lbl.style.left = pos.x + '%';
            lbl.style.top = pos.y + '%';
            lbl.textContent = String(startHour).padStart(2, '0');
            labelsWrap.appendChild(lbl);
        }
    }

    let angle = 0;
    let isPM = false;
    const speed = 0.55; // derajat per frame - ritme tenang, ~11 detik per putaran 12 jam
    renderPhase(isPM);
    phaseEl.textContent = 'AM';

    function updateReadout(qi) {
        const cardSelector = `.summary-quadrant-cell[data-quad="${qi}"]`;
        document.querySelectorAll('.summary-quadrant-cell').forEach(el => el.classList.remove('active-sweep'));
        const card = document.querySelector(cardSelector);
        if (card) card.classList.add('active-sweep');

        const trxCount = qTotals[qi] || 0;
        if (isTwoWay) {
            const net = qNetAmount[qi];
            const sign = net >= 0 ? '+' : '';
            const color = net >= 0 ? '#39FF6A' : '#FF2A3D';
            readout.innerHTML = `<span class="text-slate-400">${qLabels[qi]}</span><span class="mx-2 text-slate-600">|</span><span style="color:${color}" class="font-black">${sign}${formatRp(net)}</span><span class="mx-2 text-slate-600">|</span><span class="text-slate-400">${trxCount.toLocaleString('id-ID')} transaksi</span>`;
        } else {
            readout.innerHTML = `<span class="text-slate-400">${qLabels[qi]}</span><span class="mx-2 text-slate-600">|</span><span style="color:${themeColor}" class="font-black">${formatRp(qDispAmount[qi])}</span><span class="mx-2 text-slate-600">|</span><span class="text-slate-400">${trxCount.toLocaleString('id-ID')} transaksi</span>`;
        }
    }

    function tick() {
        angle += speed;
        if (angle >= 360) {
            angle -= 360;
            isPM = !isPM;
            phaseEl.textContent = isPM ? 'PM' : 'AM';
            renderPhase(isPM);
        }
        needlePivot.style.transform = `rotate(${angle}deg)`;

        const hourFloat = (angle / 360) * 12;
        const totalHourFloat = isPM ? hourFloat + 12 : hourFloat;
        const hh = Math.floor(totalHourFloat) % 24;
        const mm = Math.floor((totalHourFloat - Math.floor(totalHourFloat)) * 60);
        timeEl.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

        const localIdx = Math.min(segPerPhase - 1, Math.floor((angle / 360) * segPerPhase));
        const activeQi = (isPM ? segPerPhase : 0) + localIdx;

        svg.querySelectorAll('.summary-radar-segment').forEach(el => el.classList.remove('active'));
        const activeSeg = svg.querySelector(`[data-qi="${activeQi}"]`);
        if (activeSeg) activeSeg.classList.add('active');

        updateReadout(activeQi);

        summaryRadarAnimFrame = requestAnimationFrame(tick);
    }
    tick();
}

function renderSummaryContent(body, cfg, agg) {
    const { dailyTable, hourlyDispCount, hourlyDispAmount, hourlyDispLembar,
        hourlyDepCount, hourlyDepAmount, hourlyDepLembar,
        totalTrx, conclusion, dailyRateDisp, dailyRateDep, dailyRateNet,
        dateRangeStart, dateRangeEnd } = agg;

    const dateRangeText = (dateRangeStart && dateRangeEnd)
        ? `${formatDateShort(dateRangeStart)} - ${formatDateShort(dateRangeEnd)}`
        : '-';

    // ---- Kartu ringkasan atas ----
    let statsHtml = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="glass-panel p-5 rounded-xl text-center border border-slate-600">
                <div class="text-xs font-bold text-slate-300 mb-2 tracking-widest uppercase">Total Transaksi</div>
                <div class="text-3xl font-mono font-black text-white">${totalTrx.toLocaleString('id-ID')}</div>
                <div class="text-xs font-mono text-slate-400 mt-2">${dateRangeText}</div>
            </div>
            <div class="glass-panel p-5 rounded-xl text-center border border-danger/50">
                <div class="text-xs font-bold text-danger mb-2 tracking-widest uppercase">Total Dispense</div>
                <div class="text-2xl font-mono font-black text-danger">${formatRp(conclusion.totalDispAmount)}</div>
            </div>`;
    if (cfg.isTwoWay) {
        statsHtml += `
            <div class="glass-panel p-5 rounded-xl text-center border border-success/50">
                <div class="text-xs font-bold text-success mb-2 tracking-widest uppercase">Total Deposit</div>
                <div class="text-2xl font-mono font-black text-success">${formatRp(conclusion.totalDepAmount)}</div>
            </div>
            <div class="glass-panel p-5 rounded-xl border-2 flex items-center gap-4" style="border-color:${cfg.color}">
                <div class="flex-1 text-center">
                    <div class="text-xs font-bold mb-2 tracking-widest uppercase" style="color:${cfg.color}">Klasifikasi Mesin</div>
                    <div class="text-xl font-mono font-black" style="color:${cfg.color}">${conclusion.dominance}</div>
                </div>
                <div class="w-[72px] h-[72px] shrink-0 relative">
                    <canvas id="summary-donut-canvas" width="72" height="72"></canvas>
                </div>
            </div>`;
    } else {
        statsHtml += `
            <div class="glass-panel p-5 rounded-xl text-center border border-slate-600">
                <div class="text-xs font-bold text-slate-300 mb-2 tracking-widest uppercase">Jml Replenish</div>
                <div class="text-3xl font-mono font-black text-white">${conclusion.replenishCount}</div>
            </div>
            <div class="glass-panel p-5 rounded-xl border border-slate-600 flex flex-col">
                <div class="text-xs font-bold text-slate-300 mb-2 tracking-widest uppercase text-center">Daily Rate Harian</div>
                <div class="flex divide-x divide-slate-600 flex-1 items-center">
                    <div class="flex-1 text-center px-2">
                        <div class="text-xs text-slate-400 uppercase font-bold mb-1">Rata-rata</div>
                        <div class="text-lg font-mono font-black text-white">${formatRp(dailyRateDisp.meanAmount)}</div>
                        <div class="text-xs font-mono text-slate-400 mt-0.5">${Math.round(dailyRateDisp.meanLembar)} lembar</div>
                    </div>
                    <div class="flex-1 text-center px-2">
                        <div class="text-xs text-slate-400 uppercase font-bold mb-1">Median</div>
                        <div class="text-lg font-mono font-black text-white">${formatRp(dailyRateDisp.medianAmount)}</div>
                        <div class="text-xs font-mono text-slate-400 mt-0.5">${Math.round(dailyRateDisp.medianLembar)} lembar</div>
                    </div>
                </div>
            </div>`;
    }
    statsHtml += `</div>`;

    // ---- Kuadran jam ----
    // FITUR BARU: dikelompokkan dari data PER JAM sesuai mode toggle saat ini (4 default / 8),
    // ditambah toggle switch kecil & chart radial "jam dinding" sebagai visualisasi tambahan
    // (nilai lembar/nominal yang sudah ada sama sekali tidak dihilangkan).
    const qLabels = getQuadrantLabels(summaryQuadrantMode);
    const qDispCount = groupHourlyToQuadrants(hourlyDispCount, summaryQuadrantMode);
    const qDispAmount = groupHourlyToQuadrants(hourlyDispAmount, summaryQuadrantMode);
    const qDispLembar = groupHourlyToQuadrants(hourlyDispLembar, summaryQuadrantMode);
    const qDepCount = groupHourlyToQuadrants(hourlyDepCount, summaryQuadrantMode);
    const qDepAmount = groupHourlyToQuadrants(hourlyDepAmount, summaryQuadrantMode);
    const qDepLembar = groupHourlyToQuadrants(hourlyDepLembar, summaryQuadrantMode);
    const qTotals = qDispCount.map((v, i) => v + qDepCount[i]);
    const qNetAmount = qDepAmount.map((v, i) => v - qDispAmount[i]);
    const busiestIdx = qTotals.indexOf(Math.max(...qTotals));
    const busiestLabel = qLabels[busiestIdx];
    const busiestPct = totalTrx > 0 ? (qTotals[busiestIdx] / totalTrx * 100) : 0;

    let quadrantHtml = `
        <div class="glass-panel rounded-xl p-6 border border-slate-700/50">
            <div class="flex items-start justify-between flex-wrap gap-3 mb-1">
                <div class="text-sm font-black text-slate-300 tracking-[0.15em] uppercase">Distribusi Jam Transaksi (Kuadran)</div>
                <label class="mini-toggle-wrap">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wide">8 Kuadran</span>
                    <span class="mini-toggle">
                        <input type="checkbox" id="summary-quadrant-toggle" ${summaryQuadrantMode === 8 ? 'checked' : ''}>
                        <span class="mini-toggle-slider"></span>
                    </span>
                </label>
            </div>
            ${cfg.isTwoWay ? '<div class="text-xs text-slate-500 mb-4">Nilai = Setor &minus; Tarik per kuadran jam (positif = dominan setor, negatif = dominan tarik). Detail lengkap ada di tabel bawah.</div>' : '<div class="mb-4"></div>'}
            <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">`;

    if (cfg.isTwoWay) {
        const maxAbsNet = Math.max(...qNetAmount.map(v => Math.abs(v)), 1);
        qLabels.forEach((label, i) => {
            const netAmount = qNetAmount[i];
            const totalTrxQuadrant = qDispCount[i] + qDepCount[i];
            const isPositive = netAmount >= 0;
            const netColor = isPositive ? '#39FF6A' : '#FF2A3D';
            const intensity = Math.abs(netAmount) / maxAbsNet;
            const bg = isPositive
                ? `rgba(16, 185, 129, ${0.08 + intensity * 0.3})`
                : `rgba(239, 68, 68, ${0.08 + intensity * 0.3})`;
            const sign = isPositive ? '+' : '';
            quadrantHtml += `
            <div class="summary-quadrant-cell" data-quad="${i}" style="background:${bg}; border-color:${netColor}40">
                <div class="text-xs font-bold text-slate-300 mb-2">${label}</div>
                <div class="text-xl font-mono font-black" style="color:${netColor}">${sign}${formatRp(netAmount)}</div>
                <div class="text-xs font-mono mt-1 font-bold text-slate-400">${totalTrxQuadrant.toLocaleString('id-ID')} transaksi</div>
            </div>`;
        });
    } else {
        const maxQ = Math.max(...qDispAmount, 1);
        // FIX: kartu ATM sebelumnya cuma tampilkan nominal + lembar - ditambahkan jumlah
        // transaksi (sudah tersedia di qDispCount), samakan pola dgn kartu CRM.
        qLabels.forEach((label, i) => {
            const intensity = qDispAmount[i] / maxQ;
            const bg = `rgba(${parseInt(cfg.color.slice(1,3),16)}, ${parseInt(cfg.color.slice(3,5),16)}, ${parseInt(cfg.color.slice(5,7),16)}, ${0.1 + intensity * 0.5})`;
            quadrantHtml += `
            <div class="summary-quadrant-cell" data-quad="${i}" style="background:${bg}">
                <div class="text-xs font-bold text-slate-300 mb-2">${label}</div>
                <div class="text-xl font-mono font-black text-white">${formatRp(qDispAmount[i])}</div>
                <div class="text-xs font-mono text-slate-300 mt-1">${qDispLembar[i]} lembar</div>
                <div class="text-xs font-mono mt-0.5 font-bold text-slate-400">${qDispCount[i].toLocaleString('id-ID')} transaksi</div>
            </div>`;
        });
    }
    // FITUR BARU: radar analog 12-jam yang hidup, menggantikan chart polarArea statis -
    // jarum menyapu otomatis, kuadran yang disapu menyala (di radar MAUPUN kartu di
    // sebelah kiri - lihat JS initSummaryRadar), info nominal+transaksi ikut berganti live.
    quadrantHtml += `</div>
            <div class="flex flex-col items-center gap-3 shrink-0">
                <div class="summary-radar-dial" id="summary-radar-dial">
                    <div class="summary-radar-ring-outer"></div>
                    <div class="summary-radar-ring-mid"></div>
                    <div class="summary-radar-crosshair-h"></div>
                    <div class="summary-radar-crosshair-v"></div>
                    <div class="summary-radar-crosshair-d1"></div>
                    <div class="summary-radar-crosshair-d2"></div>
                    <div id="summary-radar-labels"></div>
                    <svg class="summary-radar-svg" viewBox="0 0 200 200" id="summary-radar-svg"></svg>
                    <div class="summary-radar-needle-pivot" id="summary-radar-needle-pivot">
                        <div class="summary-radar-needle"></div>
                    </div>
                    <div class="summary-radar-center">
                        <div class="summary-radar-time font-mono" id="summary-radar-time">00:00</div>
                        <div class="summary-radar-phase" id="summary-radar-phase">AM</div>
                    </div>
                </div>
                <div class="summary-radar-readout font-mono" id="summary-radar-readout">&nbsp;</div>
            </div>
            </div>
            <div class="text-xs font-mono text-slate-400 mt-4">Jam tersibuk: <span class="text-white font-bold">${busiestLabel}</span> (${busiestPct.toFixed(1)}% dari total transaksi)</div>
        </div>`;

    // ---- Daily Rate khusus CRM (ruang tersendiri - inti summary CRM): 3 kolom Dispense/Deposit/Net,
    // nominal jadi angka utama, breakdown lembar 50rb/100rb jadi keterangan kecil di bawahnya ----
    let crmDailyRateHtml = '';
    if (cfg.isTwoWay && dailyRateDep && dailyRateNet) {
        const renderStatBlock = (title, disp, dep, net) => {
            return `
                <div class="bg-slate-900/60 rounded-xl p-5 border border-slate-700">
                    <div class="text-xs font-black text-slate-200 uppercase tracking-widest mb-4 text-center">${title}</div>
                    <div class="grid grid-cols-3 gap-3">
                        <div class="text-center">
                            <div class="text-xs font-bold text-danger uppercase tracking-wide mb-1">Dispense (Out)</div>
                            <div class="text-lg font-mono font-black text-danger">${formatRp(disp.amount)}</div>
                            <div class="text-xs font-mono text-slate-400 mt-1 leading-relaxed">50rb: ${Math.round(disp.lembar50)} lbr<br>100rb: ${Math.round(disp.lembar100)} lbr</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xs font-bold text-success uppercase tracking-wide mb-1">Deposit (In)</div>
                            <div class="text-lg font-mono font-black text-success">${formatRp(dep.amount)}</div>
                            <div class="text-xs font-mono text-slate-400 mt-1 leading-relaxed">50rb: ${Math.round(dep.lembar50)} lbr<br>100rb: ${Math.round(dep.lembar100)} lbr</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xs font-bold uppercase tracking-wide mb-1" style="color:${net.amount >= 0 ? '#39FF6A' : '#FF2A3D'}">Net</div>
                            <div class="text-lg font-mono font-black" style="color:${net.amount >= 0 ? '#39FF6A' : '#FF2A3D'}">${net.amount >= 0 ? '+' : ''}${formatRp(net.amount)}</div>
                            <div class="text-xs font-mono mt-1 leading-relaxed" style="color:${net.amount >= 0 ? '#39FF6A' : '#FF2A3D'}">50rb: ${net.lembar50 >= 0 ? '+' : ''}${Math.round(net.lembar50)} lbr<br>100rb: ${net.lembar100 >= 0 ? '+' : ''}${Math.round(net.lembar100)} lbr</div>
                        </div>
                    </div>
                </div>`;
        };
        crmDailyRateHtml = `
        <div class="glass-panel rounded-xl p-6 border-2" style="border-color:${cfg.color}80">
            <div class="text-sm font-black tracking-[0.15em] uppercase mb-1" style="color:${cfg.color}">📊 Daily Rate</div>
            <div class="text-xs text-slate-400 mb-5">Rata-rata & median transaksi harian per jenis (Net = Deposit &minus; Dispense), sebagai bahan evaluasi Anda menentukan interval replenish yang optimal.</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                ${renderStatBlock('Rata-rata (Mean) / Hari',
                    { amount: dailyRateDisp.meanAmount, lembar50: dailyRateDisp.meanLembar50, lembar100: dailyRateDisp.meanLembar100 },
                    { amount: dailyRateDep.meanAmount, lembar50: dailyRateDep.meanLembar50, lembar100: dailyRateDep.meanLembar100 },
                    { amount: dailyRateNet.meanAmount, lembar50: dailyRateNet.meanLembar50, lembar100: dailyRateNet.meanLembar100 })}
                ${renderStatBlock('Median / Hari',
                    { amount: dailyRateDisp.medianAmount, lembar50: dailyRateDisp.medianLembar50, lembar100: dailyRateDisp.medianLembar100 },
                    { amount: dailyRateDep.medianAmount, lembar50: dailyRateDep.medianLembar50, lembar100: dailyRateDep.medianLembar100 },
                    { amount: dailyRateNet.medianAmount, lembar50: dailyRateNet.medianLembar50, lembar100: dailyRateNet.medianLembar100 })}
            </div>
        </div>`;
    }

    // ---- Grafik harian: Saldo (direset ke nilai add-cash riil tiap REPLENISH) + arus kas + Net ----
    // CRM: batang Saldo/Pemasukan/Pengeluaran + garis Net (Saldo+Pemasukan-Pengeluaran).
    // ATM: batang Saldo/Dispense + garis Net (Saldo-Pengeluaran) - tanpa batang setor krn ATM cuma dispense.
    const netFormula = cfg.isTwoWay ? 'Saldo + Pemasukan &minus; Pengeluaran' : 'Saldo &minus; Pengeluaran';
    let chartHtml = `
        <div class="glass-panel rounded-xl p-6 border border-slate-700/50">
            <div class="text-sm font-black text-slate-300 tracking-[0.15em] uppercase mb-1">Grafik Nominal Harian</div>
            <div class="text-xs text-slate-500 mb-4">Saldo direset ke nilai isi ulang (add-cash) sesungguhnya tiap ada event REPLENISH ${dailyTable.some(d=>d.hasReplenish) ? '<span class="text-teal-400">(↻)</span>' : ''}; Net = ${netFormula}.</div>
            <div style="height:340px"><canvas id="summary-daily-chart"></canvas></div>
            <div id="summary-chart-fallback" class="hidden text-center text-slate-500 font-mono text-sm py-16">Grafik tidak dapat dimuat (koneksi ke library grafik gagal). Data lengkap tetap tersedia di tabel di bawah.</div>
        </div>`;

    // ---- Tabel rekap harian ----
    // CRM: kolom dipecah per denominasi (50rb/100rb) + kolom Net di paling kanan, sesuai simulasi.
    // ATM: format tetap sama seperti sebelumnya, HANYA nilainya sekarang benar (lembar sungguhan,
    // bukan lagi jumlah transaksi).
    let tableHtml = `<div class="glass-panel rounded-xl overflow-hidden border border-slate-700/50"><table class="w-full text-sm text-left">`;
    if (cfg.isTwoWay) {
        // FIX Poin 1d: header "DISPENSE"/"DEPOSIT" membawahi 3 sub-kolom masing2 (50.000/100.000/
        // Total), garis bawah group menyatu (bukan terpisah jauh dari labelnya), lalu garis tipis
        // vertikal memisahkan antar grup. Kolom "Net Transaksi" disederhanakan: LANGSUNG nominal
        // saja, tanpa lembar (breakdown lembar Net sudah ada di kartu Daily Rate di atas).
        // FIX (permintaan user): kolom "Total" (lembar 50rb+100rb dijumlah) diganti "Nominal" (Rupiah) -
        // total lembar gabungan 2 denom tidak informatif (mis. "150 lembar" tidak menunjukkan nilai uangnya,
        // beda dgn ATM yg 1 denom). Nilai nominal = dispAmount/depAmount, SUDAH tersedia di data (dipakai jg
        // oleh grafik & kolom Net Transaksi) - bukan hitungan baru, murni ganti apa yang ditampilkan.
        tableHtml += `
            <thead class="text-xs font-black text-slate-300 uppercase bg-slate-900/80 border-b border-slate-700">
                <tr>
                    <th rowspan="2" class="px-4 py-3 text-left align-middle">Tanggal</th>
                    <th colspan="3" class="px-4 py-2 text-center border-b-2 border-danger/60 border-l-2 border-l-slate-600">Dispense</th>
                    <th colspan="3" class="px-4 py-2 text-center border-b-2 border-success/60 border-l-2 border-l-slate-600">Deposit</th>
                    <th rowspan="2" class="px-4 py-3 text-center align-middle border-l-2 border-l-slate-600">Net Transaksi</th>
                </tr>
                <tr>
                    <th class="px-3 py-2 text-center font-bold border-l-2 border-l-slate-600">50.000</th>
                    <th class="px-3 py-2 text-center font-bold">100.000</th>
                    <th class="px-3 py-2 text-center font-bold">Nominal</th>
                    <th class="px-3 py-2 text-center font-bold border-l-2 border-l-slate-600">50.000</th>
                    <th class="px-3 py-2 text-center font-bold">100.000</th>
                    <th class="px-3 py-2 text-center font-bold">Nominal</th>
                </tr>
            </thead>
            <tbody class="font-mono text-slate-100 divide-y divide-slate-700/30">`;
        dailyTable.forEach(d => {
            const dateLabel = formatDateShort(d.date);
            const netPositive = d.netAmount >= 0;
            const netColorClass = netPositive ? 'text-success' : 'text-danger';
            const sign = netPositive ? '+' : '';
            tableHtml += `
                    <tr class="summary-daily-row hover:bg-white/5 transition-colors ${d.hasReplenish ? 'has-replenish' : ''}">
                        <td class="px-4 py-3 font-bold whitespace-nowrap">${dateLabel} ${d.hasReplenish ? '<span class="text-teal-400 text-xs ml-1 font-bold" title="Ada event REPLENISH pada tanggal ini">↻ REPLENISH</span>' : ''}</td>
                        <td class="px-3 py-3 text-center border-l-2 border-l-slate-700/50">${d.dispLembar50}</td>
                        <td class="px-3 py-3 text-center">${d.dispLembar100}</td>
                        <td class="px-3 py-3 text-center font-bold text-danger">${Math.round(d.dispAmount).toLocaleString('id-ID')}</td>
                        <td class="px-3 py-3 text-center border-l-2 border-l-slate-700/50">${d.depLembar50}</td>
                        <td class="px-3 py-3 text-center">${d.depLembar100}</td>
                        <td class="px-3 py-3 text-center font-bold text-success">${Math.round(d.depAmount).toLocaleString('id-ID')}</td>
                        <td class="px-4 py-3 text-center font-bold ${netColorClass} border-l-2 border-l-slate-700/50">${sign}${formatRp(d.netAmount)}</td>
                    </tr>`;
        });
        tableHtml += `</tbody>`;
    } else {
        // FIX Poin 2c (ATM): tabel dirombak jadi Saldo Awal / Dispense / Saldo Akhir (lembar
        // transaksi) + Nominal Dispense, sesuai contoh desain - lebih informatif drpd cuma
        // 1 kolom lembar seperti sebelumnya, dan Saldo di sini konsisten dgn grafik di atas.
        tableHtml += `
            <thead class="text-xs font-black text-slate-300 uppercase bg-slate-900/80 border-b border-slate-700">
                <tr>
                    <th rowspan="2" class="px-4 py-3 text-left align-middle">Tanggal</th>
                    <th rowspan="2" class="px-4 py-3 text-center align-middle border-l-2 border-l-slate-600">Saldo Awal</th>
                    <th colspan="3" class="px-4 py-2 text-center border-b-2 border-slate-500 border-l-2 border-l-slate-600">Lembar Transaksi</th>
                    <th rowspan="2" class="px-4 py-3 text-center align-middle border-l-2 border-l-slate-600">Nominal Dispense</th>
                </tr>
                <tr>
                    <th class="px-3 py-2 text-center font-bold border-l-2 border-l-slate-600">Saldo</th>
                    <th class="px-3 py-2 text-center font-bold text-danger">Dispense</th>
                    <th class="px-3 py-2 text-center font-bold">Saldo Akhir</th>
                </tr>
            </thead>
            <tbody class="font-mono text-slate-100 divide-y divide-slate-700/30">`;
        dailyTable.forEach(d => {
            const dateLabel = formatDateShort(d.date);
            const saldoAwalLembar = agg.roundUnit ? Math.round(d.saldoAwal / agg.roundUnit) : d.saldoAwal;
            const saldoAkhirLembar = agg.roundUnit ? Math.round(d.saldoAkhir / agg.roundUnit) : d.saldoAkhir;
            // FIX (poin baru dari user, samakan dgn contoh gambar): kolom "Saldo Awal" berdiri
            // sendiri sekarang HANYA menampilkan nominal replenish SEGAR hari itu (kosong "-"
            // di hari biasa) - beda dgn sub-kolom "Saldo" di grup Lembar Transaksi yg tetap
            // menampilkan saldo BAWAAN dari hari sebelumnya (kontinu, setiap hari).
            const freshReplenishLembar = (d.hasReplenish && d.rplSplit && d.rplSplit.saldoAfterRplStart !== null)
                ? (agg.roundUnit ? Math.round(d.rplSplit.saldoAfterRplStart / agg.roundUnit) : d.rplSplit.saldoAfterRplStart)
                : null;
            // Hari yg ada event REPLENISH, kolom Dispense pecah jadi "lembar-sebelum-RPL |
            // lembar-sesudah-RPL" - bagian SESUDAH RPL digarisbawahi hijau (sudah masuk
            // periode baru). Murni tampilan; d.dispLembar (total harian penuh, dipakai di
            // Nominal Dispense & tempat lain) TIDAK diubah/disentuh.
            // FIX (koreksi user): kiri = periode BARU (sesudah RPL), kanan = periode LAMA
            // (sebelum RPL) - garis bawah SELALU di nilai periode lama (kanan), krn itu yg
            // menandakan "titik ini periode/perhitungan berhenti". Dipakai grid 2 kolom lebar
            // tetap (bukan teks lepas rata-tengah) supaya karakter "|" presisi di tengah cell
            // berapa pun jumlah digit di kiri/kanannya - tidak lagi miring kalau lembar lama
            // vs baru beda jumlah digit (mis. "0" vs "1.293").
            const dispCell = (d.hasReplenish && d.rplSplit)
                ? `<span class="inline-grid grid-cols-[1fr_auto_1fr] items-center w-full max-w-[110px]">
                        <span class="text-right pr-1.5">${d.rplSplit.dispAfterLembar.toLocaleString('id-ID')}</span>
                        <span class="text-slate-600">|</span>
                        <span class="text-left pl-1.5 underline decoration-hijau decoration-2 underline-offset-2">${d.rplSplit.dispBeforeLembar.toLocaleString('id-ID')}</span>
                   </span>`
                : `${d.dispLembar.toLocaleString('id-ID')}`;
            const saldoCarryCell = d.hasReplenish
                ? `<span class="underline decoration-hijau decoration-2 underline-offset-2">${saldoAwalLembar.toLocaleString('id-ID')}</span>`
                : `${saldoAwalLembar.toLocaleString('id-ID')}`;
            tableHtml += `
                    <tr class="summary-daily-row hover:bg-white/5 transition-colors ${d.hasReplenish ? 'has-replenish' : ''}">
                        <td class="px-4 py-3 font-bold whitespace-nowrap">${dateLabel} ${d.hasReplenish ? '<span class="text-teal-400 text-xs ml-1 font-bold" title="Ada event REPLENISH pada tanggal ini">↻ REPLENISH</span>' : ''}</td>
                        <td class="px-4 py-3 text-center font-bold border-l-2 border-l-slate-600">${freshReplenishLembar !== null ? freshReplenishLembar.toLocaleString('id-ID') : '-'}</td>
                        <td class="px-3 py-3 text-center border-l-2 border-l-slate-700/50">${saldoCarryCell}</td>
                        <td class="px-3 py-3 text-center font-bold text-danger">${dispCell}</td>
                        <td class="px-3 py-3 text-center">${saldoAkhirLembar.toLocaleString('id-ID')}</td>
                        <td class="px-4 py-3 text-center text-danger font-bold border-l-2 border-l-slate-600">${formatRp(d.dispAmount)}</td>
                    </tr>`;
        });
        tableHtml += `</tbody>`;
    }
    tableHtml += `</table></div>`;

    body.innerHTML = statsHtml + quadrantHtml + crmDailyRateHtml + chartHtml + tableHtml;

    // ---- FITUR BARU: toggle 4/8 kuadran - re-render seluruh konten pakai `agg` yang SAMA
    // (tidak scan ulang log, cukup kelompokkan ulang data per-jam yang sudah tersedia) ----
    const quadrantToggle = document.getElementById('summary-quadrant-toggle');
    if (quadrantToggle) {
        quadrantToggle.addEventListener('change', () => {
            summaryQuadrantMode = quadrantToggle.checked ? 8 : 4;
            renderSummaryContent(body, cfg, agg);
        });
    }

    // ---- FITUR BARU: radar analog 12-jam hidup utk distribusi kuadran - murni tambahan
    // visual, semua angka lembar/nominal di kartu kuadran tetap ada seperti sebelumnya.
    // Radius irisan = besar nilai kuadran itu; warna (CRM) = arah dominan (hijau=setor/
    // merah=tarik). Jarum menyapu otomatis & menyorot kuadran yg sedang disapu (di radar
    // MAUPUN kartu di sebelah kiri) - lihat initSummaryRadar().
    initSummaryRadar({
        qLabels, qDispAmount, qNetAmount, qTotals,
        isTwoWay: cfg.isTwoWay, themeColor: cfg.color, quadrantMode: summaryQuadrantMode,
    });

    // ---- FITUR BARU: cincin donat kecil Setor vs Tarik (khusus CRM), di kartu Klasifikasi Mesin ----
    if (summaryDonutChartInstance) { summaryDonutChartInstance.destroy(); summaryDonutChartInstance = null; }
    const donutCtx = document.getElementById('summary-donut-canvas');
    if (typeof Chart !== 'undefined' && donutCtx && cfg.isTwoWay) {
        summaryDonutChartInstance = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: ['Setor', 'Tarik'],
                datasets: [{
                    data: [conclusion.totalDepAmount, conclusion.totalDispAmount],
                    backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(239, 68, 68, 0.85)'],
                    borderColor: 'rgba(15, 23, 42, 0.9)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '65%',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (item) => `${item.label}: ${formatRp(item.raw)}` } }
                }
            }
        });
    }

    // ---- Render Chart.js ----
    if (summaryChartInstance) { summaryChartInstance.destroy(); summaryChartInstance = null; }
    const ctx = document.getElementById('summary-daily-chart');
    if (typeof Chart === 'undefined') {
        // Chart.js gagal dimuat (mis. CDN bermasalah) - tampilkan fallback yang jelas,
        // bukan area kosong tanpa keterangan.
        const fallback = document.getElementById('summary-chart-fallback');
        if (fallback) fallback.classList.remove('hidden');
        if (ctx) ctx.classList.add('hidden');
        console.warn('Chart.js tidak termuat - grafik Summary tidak bisa ditampilkan.');
    } else if (ctx) {
        // Label tanggal polos - ikon RPL TIDAK lagi ditempel di teks label (digambar
        // terpisah oleh rplIconPlugin di bawah tanggal, lihat blok plugin).
        const labels = dailyTable.map(d => `${String(d.date.getDate()).padStart(2,'0')}/${String(d.date.getMonth()+1).padStart(2,'0')}`);

        // ---- FIX VISUALISASI RPL: hari yang ada event REPLENISH dipecah jadi 2 SEGMEN
        // bertumpuk (bawah = periode BARU yang baru direset, atas = SISA periode LAMA
        // sebelum RPL terjadi) - sebelumnya 1 hari RPL cuma nampilin 1 angka gabungan yang
        // menyesatkan (grafik jadi pendek/tidak representatif krn cuma bagian setelah RPL
        // yang kehitung). Warna tiap segmen mengikuti KETEBALAN nilainya sendiri (bukan
        // gabungan) - makin tipis makin muda, makin tebal/full makin tua - jadi user
        // langsung lihat transisi antar periode dari kontras warnanya, bukan cuma dari
        // pembatas garis. Hari TANPA RPL: segmen "lama" = 0 (tidak tampak), perilaku sama
        // persis seperti sebelumnya.
        const saldoBaseVals = dailyTable.map(d => d.rplSplit ? d.rplSplit.saldoAfterRplStart : d.saldoAwal);
        // Math.max(0, ...): khusus hari PERTAMA di file yang diupload, saldo sebelum RPL bisa
        // hitung minus (krn tidak ada data konteks SEBELUM file itu mulai) - jangan digambar
        // sebagai batang negatif, cukup dianggap 0 (tidak ada info) di grafik.
        const saldoOldVals = dailyTable.map(d => d.rplSplit ? Math.max(0, d.rplSplit.saldoBeforeRpl) : 0);
        const dispBaseVals = dailyTable.map(d => d.rplSplit ? d.rplSplit.dispAfter : d.dispAmount);
        const dispOldVals = dailyTable.map(d => d.rplSplit ? d.rplSplit.dispBefore : 0);
        const depBaseVals = dailyTable.map(d => d.rplSplit ? d.rplSplit.depAfter : d.depAmount);
        const depOldVals = dailyTable.map(d => d.rplSplit ? d.rplSplit.depBefore : 0);

        // Skala warna per kategori: makin tipis (rasio kecil thd nilai tertinggi kategori itu)
        // makin muda (lightness tinggi), makin tebal/full makin tua (lightness rendah).
        const shadeScale = (hue, sat, value, maxRef) => {
            const ratio = maxRef > 0 ? Math.max(0, Math.min(1, value / maxRef)) : 0;
            const lightness = 78 - ratio * 42; // 78% (nyaris kosong) -> 36% (penuh/tebal)
            return `hsla(${hue}, ${sat}%, ${lightness}%, 0.88)`;
        };
        const maxOf = (...arrs) => Math.max(1, ...arrs.flat());
        const saldoMaxRef = maxOf(saldoBaseVals, saldoOldVals);
        const dispMaxRef = maxOf(dispBaseVals, dispOldVals);
        const depMaxRef = maxOf(depBaseVals, depOldVals);
        const colorArray = (vals, maxRef, hue, sat) => vals.map(v => shadeColorSafe(hue, sat, v, maxRef, shadeScale));
        function shadeColorSafe(hue, sat, v, maxRef, fn) { return fn(hue, sat, v, maxRef); }

        // Border pembatas antar 2 segmen: segmen "lama" (atas) dikasih border kontras supaya
        // transisi periode lama/baru kelihatan tegas, bukan cuma dari beda warna saja.
        const dividerBorder = (vals) => vals.map(v => v > 0 ? '#fbbf24' : 'transparent');

        const netAreaGradient = (context) => {
            const { ctx: c, chartArea } = context.chart;
            if (!chartArea) return 'rgba(232, 121, 249, 0.12)';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(232, 121, 249, 0.38)');
            gradient.addColorStop(1, 'rgba(232, 121, 249, 0.02)');
            return gradient;
        };
        const netLineStyle = (label, order) => ({
            type: 'line',
            label,
            data: dailyTable.map(d => d.saldoAkhir),
            borderColor: '#e879f9',
            backgroundColor: netAreaGradient,
            fill: true,
            borderWidth: 3.5,
            tension: 0.35,
            borderCapStyle: 'round',
            borderJoinStyle: 'round',
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#e879f9',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBorderWidth: 3,
            order,
        });
        const datasets = [
            {
                type: 'bar', label: 'Saldo', stack: 'saldo',
                data: saldoBaseVals,
                backgroundColor: colorArray(saldoBaseVals, saldoMaxRef, 217, 91),
                order: 1,
            },
            {
                type: 'bar', label: 'Saldo (sisa periode lama)', stack: 'saldo',
                data: saldoOldVals,
                backgroundColor: colorArray(saldoOldVals, saldoMaxRef, 217, 91),
                borderColor: dividerBorder(saldoOldVals), borderWidth: 2, borderSkipped: false,
                order: 1, // legend disembunyikan via filter callback di bawah (lihat plugins.legend.labels.filter)
            },
        ];
        if (cfg.isTwoWay) {
            // Urutan diminta: Saldo -> Pengeluaran -> Pemasukan (kiri ke kanan)
            datasets.push({
                type: 'bar', label: 'Pengeluaran', stack: 'disp',
                data: dispBaseVals,
                backgroundColor: colorArray(dispBaseVals, dispMaxRef, 0, 84),
                order: 2,
            });
            datasets.push({
                type: 'bar', label: 'Pengeluaran (periode lama)', stack: 'disp',
                data: dispOldVals,
                backgroundColor: colorArray(dispOldVals, dispMaxRef, 0, 84),
                borderColor: dividerBorder(dispOldVals), borderWidth: 2, borderSkipped: false,
                order: 2,
            });
            datasets.push({
                type: 'bar', label: 'Pemasukan', stack: 'dep',
                data: depBaseVals,
                backgroundColor: colorArray(depBaseVals, depMaxRef, 158, 84),
                order: 3,
            });
            datasets.push({
                type: 'bar', label: 'Pemasukan (periode lama)', stack: 'dep',
                data: depOldVals,
                backgroundColor: colorArray(depOldVals, depMaxRef, 158, 84),
                borderColor: dividerBorder(depOldVals), borderWidth: 2, borderSkipped: false,
                order: 3,
            });
            datasets.push(netLineStyle('Net (Saldo + Pemasukan - Pengeluaran)', 4));
        } else {
            datasets.push({
                type: 'bar', label: 'Dispense', stack: 'disp',
                data: dispBaseVals,
                backgroundColor: colorArray(dispBaseVals, dispMaxRef, 0, 84),
                order: 2,
            });
            datasets.push({
                type: 'bar', label: 'Dispense (periode lama)', stack: 'disp',
                data: dispOldVals,
                backgroundColor: colorArray(dispOldVals, dispMaxRef, 0, 84),
                borderColor: dividerBorder(dispOldVals), borderWidth: 2, borderSkipped: false,
                order: 2,
            });
            datasets.push(netLineStyle('Net (Saldo - Pengeluaran)', 3));
        }

        // Plugin kecil: gambar ikon RPL (↻) hijau menyala TEPAT DI BAWAH label tanggal
        // (bukan lagi nempel di kanan teks tanggal) - hanya utk hari yang ada event RPL.
        // FIX: posisi X diambil dari elemen bar yang SUDAH DIRENDER (getDatasetMeta(0).data[i].x)
        // - lebih reliable drpd getPixelForTick() utk chart stacked/mixed spt ini.
        const rplIconPlugin = {
            id: 'rplIconPlugin',
            afterDraw(chart) {
                const xScale = chart.scales.x;
                const yPos = (xScale ? xScale.bottom : chart.chartArea.bottom) + 14;
                const meta = chart.getDatasetMeta(0);
                const c2 = chart.ctx;
                c2.save();
                c2.font = 'bold 14px system-ui, sans-serif';
                c2.fillStyle = '#22c55e';
                c2.textAlign = 'center';
                c2.textBaseline = 'top';
                dailyTable.forEach((d, i) => {
                    if (!d.hasReplenish) return;
                    // Utamakan posisi elemen bar yang sudah dirender; kalau tidak tersedia,
                    // fallback ke posisi kategori langsung dari skala x.
                    let x = (meta && meta.data && meta.data[i]) ? meta.data[i].x : undefined;
                    if (x === undefined && xScale && typeof xScale.getPixelForValue === 'function') {
                        x = xScale.getPixelForValue(i);
                    }
                    if (x === undefined || x === null || isNaN(x)) return;
                    c2.fillText('↻', x, yPos);
                });
                c2.restore();
            }
        };

        summaryChartInstance = new Chart(ctx, {
            data: { labels, datasets },
            plugins: [rplIconPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { bottom: 32 } },
                plugins: {
                    legend: {
                        labels: {
                            color: '#e2e8f0', font: { weight: 'bold' },
                            filter: (item) => item.text !== undefined && !item.text.includes('(periode lama)') && !item.text.includes('(sisa periode lama)'),
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (item) => `${item.dataset.label}: ${formatRp(item.raw)}`
                        }
                    }
                },
                scales: {
                    x: { stacked: true, ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                    y: { stacked: true, ticks: { color: '#cbd5e1', callback: (v) => (v/1000000).toFixed(0) + 'jt' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                }
            }
        });
    }
}

function findHyosungPeriods(logLines) {
    const periods = [];
    const addCashIndices = [];

    // Cari semua baris "ADD CASH:"
    for (let i = 0; i < logLines.length; i++) {
        if (logLines[i].includes('ADD CASH:')) {
            const totalAddCash = parseHyosungAddCashNew(logLines, i);
            if (totalAddCash === 0) continue;

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
                displayText: `${startDate} - ${endDate || hyosungLastTrxDate(logLines, startIdx, endIdx) || startDate}`
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

    // FIX: validasi silang waktu ASLI transaksi vs batas periode (lihat blok
    // RECON_* di awal file) - lindungi dari transaksi yg secara index masuk
    // rentang ini tapi waktu aslinya di luar periode (akibat urutan fisik baris
    // kurang presisi setelah gabung banyak file yang saling overlap).
    const hyTsStart = period ? reconHyosungMarkerTimestamp(logLines, period.startIndex) : null;
    const hyTsEnd = (period && period.endIndex < logLines.length) ? reconHyosungMarkerTimestamp(logLines, period.endIndex) : null;

    const cashLists = { 'hyosungCash1': [], 'hyosungCash2': [], 'hyosungCash3': [], 'hyosungCash4': [] };

    for (let i = startLineDispense; i <= endLineDispense; i++) {
        const match = logLines[i].match(/Request Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
        if (match) {
            if (!reconIsWithinPeriod(logLines, i, hyTsStart, hyTsEnd, reconHyosungTrxTimestamp)) continue;
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
        const currentLine = normalizeLogLine(logLines[i]);
        if (/CASH\s+ADDED/.test(currentLine)) {
            const totalAddCash = parseNcrCashAddedNew(logLines, i);
            if (totalAddCash === 0) continue;

            const dateStr = extractNcrDateAround(logLines, i);

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
            if (/NOTES\s+PRESENTED/.test(normalizeLogLine(logLines[j]))) {
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
                displayText: `${startDate} - ${endDate || ncrLastTrxDate(logLines, startIdx, endIdx) || startDate}`
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

    // FIX: validasi silang waktu ASLI transaksi vs batas periode (lihat blok
    // RECON_* di awal file) - sama alasannya dgn CRM/Hyosung/Wincor.
    const ncrTsStart = period ? reconNcrMarkerTimestamp(logLines, period.startIndex) : null;
    const ncrTsEnd = (period && period.endIndex < logLines.length) ? reconNcrMarkerTimestamp(logLines, period.endIndex) : null;

    const cashLists = { 'ncrCash1': [], 'ncrCash2': [], 'ncrCash3': [], 'ncrCash4': [] };

    for (let i = startLineDispense; i <= endLineDispense; i++) {
        const normalizedLine = normalizeLogLine(logLines[i]);
        const match = normalizedLine.match(/NOTES\s+PRESENTED\s+(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (match) {
            if (!reconIsWithinPeriod(logLines, i, ncrTsStart, ncrTsEnd, reconNcrTrxTimestamp)) continue;
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
    const ncrLogInput = document.getElementById('ncrLogInput');
    const logTextRaw = ncrLogInput.value;
    const logText = cleanAnsiCodes(logTextRaw);
    if (logText !== logTextRaw) {
        ncrLogInput.value = logText;
    }
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
                let formattedDates;
                if (dates.length > 0) {
                    formattedDates = dates.map(date => {
                        const [day, month, year] = date.split('/');
                        return `${day}/${month}/${year.slice(-2)}`;
                    });
                } else {
                    // FIX Poin 1: dulu periode ini di-drop diam-diam kalau CASH PRESENTED
                    // tidak ketemu (transaksi terakhir belum "closed"). Sekarang fallback
                    // ke tanggal transaksi dispense terakhir yang bisa ditemukan.
                    const fallbackDate = wincorLastTrxDate(logLines, lastIdx, logLines.length) || '?';
                    formattedDates = [fallbackDate, fallbackDate];
                }

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
            let formattedDates;
            if (dates.length > 0) {
                formattedDates = dates.map(date => {
                    const [day, month, year] = date.split('/');
                    return `${day}/${month}/${year.slice(-2)}`;
                });
            } else {
                // FIX Poin 1: fallback tanggal transaksi terakhir, bukan drop diam-diam
                const fallbackDate = wincorLastTrxDate(logLines, startIdx, logLines.length) || '?';
                formattedDates = [fallbackDate, fallbackDate];
            }

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

    // FIX: validasi silang waktu ASLI transaksi vs batas periode (lihat blok
    // RECON_* di awal file) - sama alasannya dgn CRM/Hyosung.
    const wcTsStart = period ? reconWincorMarkerTimestamp(logLines, period.startIndex) : null;
    const wcTsEnd = (period && period.endIndex < logLines.length) ? reconWincorMarkerTimestamp(logLines, period.endIndex) : null;

    const cashLists = { 'wincorCash1': [], 'wincorCash2': [], 'wincorCash3': [], 'wincorCash4': [] };

    for (let i = startLineDispense; i <= endLineDispense; i++) {
        const match = logLines[i].match(/CASH\s+(\d+):(\d+),(\d+);/);
        if (match) {
            if (!reconIsWithinPeriod(logLines, i, wcTsStart, wcTsEnd, reconWincorTrxTimestamp)) continue;
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

    const cstValues = [0, 0, 0, 0];
    const seenCassettes = new Set();
    const stopIndex = findFirstDispenseLine(logLines, startIndex, line => line.includes('Request Count'));

    for (let i = startIndex + 1; i < stopIndex && i < logLines.length; i++) {
        const line = cleanAnsiCodes(logLines[i]).trim();
        const match = line.match(/^(\d+)CST:\s*(\d+)$/);
        if (!match) continue;

        const [, cassetteNumStr, amountStr] = match;
        const cassetteNum = parseInt(cassetteNumStr);
        const amount = parseInt(amountStr);
        if (cassetteNum < 1 || cassetteNum > 4) return 0;
        if (amount !== 2000 && amount !== 0) return 0;
        if (seenCassettes.has(cassetteNum)) continue;

        cstValues[cassetteNum - 1] = amount;
        seenCassettes.add(cassetteNum);
    }

    totalAddCash = cstValues.reduce((sum, val) => sum + val, 0);
    return isValidAtmAddCashTotal(totalAddCash) ? totalAddCash : 0;
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
    if (!/CASH\s+ADDED/.test(normalizeLogLine(logLines[startIndex]))) return 0;

    const firstTypeValues = [0, 0, 0, 0];
    const lastTypeValues = [0, 0, 0, 0];
    const seenTypes = new Set();
    const stopIndex = findFirstDispenseLine(logLines, startIndex, line => line.includes('NOTES PRESENTED'));

    for (let i = startIndex + 1; i < stopIndex && i < logLines.length; i++) {
        const line = normalizeLogLine(logLines[i]);
        const matches = [...line.matchAll(/TYPE\s+(\d+)\s*=\s*(\d+)/g)];
        if (matches.length === 0) continue;

        for (const match of matches) {
            const [, typeNumStr, amountStr] = match;
            const typeNum = parseInt(typeNumStr);
            const amount = parseInt(amountStr);
            if (typeNum < 1 || typeNum > 4) return 0;
            lastTypeValues[typeNum - 1] = amount;
            if (!seenTypes.has(typeNum)) {
                firstTypeValues[typeNum - 1] = amount;
                seenTypes.add(typeNum);
            }
        }
    }

    const totalFirst = firstTypeValues.reduce((sum, val) => sum + val, 0);
    if (isValidAtmAddCashTotal(totalFirst)) return totalFirst;

    const totalLast = lastTypeValues.reduce((sum, val) => sum + val, 0);
    if (isValidAtmAddCashTotal(totalLast)) return totalLast;

    const cassetteValues = [];
    const totalValues = [];
    for (let i = startIndex + 1; i < stopIndex && i < logLines.length; i++) {
        const line = normalizeLogLine(logLines[i]);

        let match = line.match(/^CASSETTE\s+0*(\d+)\s+0*(\d+)/i);
        if (match) {
            cassetteValues.push(parseInt(match[1], 10), parseInt(match[2], 10));
            if (cassetteValues.length >= 4) break;
            continue;
        }

        match = line.match(/^=TOTAL\s+0*(\d+)\s+0*(\d+)/i);
        if (match) {
            totalValues.push(parseInt(match[1], 10), parseInt(match[2], 10));
        }
    }

    if (cassetteValues.length >= 4) {
        const totalCassette = cassetteValues.slice(0, 4).reduce((sum, val) => sum + val, 0);
        if (isValidAtmAddCashTotal(totalCassette)) return totalCassette;
    }

    if (totalValues.length >= 4) {
        const totalFromTotalLine = totalValues.slice(0, 4).reduce((sum, val) => sum + val, 0);
        if (isValidAtmAddCashTotal(totalFromTotalLine)) return totalFromTotalLine;
    }

    totalAddCash = totalFirst;
    return 0;
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
    const match = cleanAnsiCodes(logText).match(/MACHINE\s+NO\s*:\s*(\d+)/);
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
            const addCashResult = parseJalinAddCash(logLines, i);
            if (!addCashResult.foundValid) continue;

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

    // FIX Poin 1: sebelumnya Jalin WAJIB 2 marker berurutan (marker terakhir tanpa
    // penutup selalu diabaikan, walau ada transaksi dispense sesudahnya). Sekarang
    // marker terakhir tetap dibentuk jadi periode, dgn label akhir = tanggal
    // dispense terakhir yang ditemukan (bukan "Sekarang").
    if (printLines.length > 0) {
        const lastMarker = printLines[printLines.length - 1];
        const startIdx = lastMarker.index;
        const endIdx = logLines.length;

        let hasDispense = false;
        for (let j = startIdx + 1; j < endIdx; j++) {
            if (logLines[j].includes('DISPENSED:')) {
                hasDispense = true;
                break;
            }
        }

        if (hasDispense) {
            const finalEndDate = jalinLastTrxDate(logLines, startIdx, endIdx) || lastMarker.date;
            periods.push({
                startIndex: startIdx,
                endIndex: endIdx,
                startDate: lastMarker.date,
                endDate: null,
                displayText: `${lastMarker.date} - ${finalEndDate}`
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

    const cuValues = { 2: 0, 3: 0, 4: 0, 5: 0 };
    const seenCus = new Set();
    const stopIndex = findFirstDispenseLine(logLines, periodIndex, line => line.includes('DISPENSED:'));

    for (let i = periodIndex + 1; i < stopIndex && i < logLines.length; i++) {
        const line = cleanAnsiCodes(logLines[i]).trim();
        const matches = [...line.matchAll(/CU([2-5])_TOTAL=(\d+)/g)];
        if (matches.length === 0) continue;

        for (const match of matches) {
            const cuNumber = parseInt(match[1]);
            const value = parseInt(match[2]);
            if (seenCus.has(cuNumber)) continue;

            cuValues[cuNumber] = value;
            seenCus.add(cuNumber);
        }
    }

    totalAddCash = Object.values(cuValues).reduce((sum, val) => sum + val, 0);

    if (isValidAtmAddCashTotal(totalAddCash)) {
        foundValid = true;
    } else {
        totalAddCash = 0; // Reset jika tidak valid
    }
    
    return { totalAddCash, foundValid };
}

// Fungsi untuk mencari dan memproses data dispense Jalin
// FIX: tambah tsStart/tsEnd (opsional) - validasi silang waktu ASLI transaksi
// (baris DISPENSED: sendiri sudah bawa timestamp ISO-nya) vs batas periode,
// lihat blok RECON_* di awal file.
function findJalinDispenseData(logLines, startIndex, endIndex, tsStart = null, tsEnd = null) {
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
            if (!reconIsWithinPeriod(logLines, i, tsStart, tsEnd, reconJalinTrxTimestamp)) continue;
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
    
    // FIX: validasi silang waktu ASLI transaksi vs batas periode (lihat blok
    // RECON_* di awal file) - sama alasannya dgn CRM/Hyosung/Wincor/NCR.
    const jlTsStart = period ? reconJalinMarkerTimestamp(logLines, period.startIndex) : null;
    const jlTsEnd = (period && period.endIndex < logLines.length) ? reconJalinMarkerTimestamp(logLines, period.endIndex) : null;

    // Ekstrak data dispense untuk periode ini
    const cashLists = findJalinDispenseData(logLines, startLineDispense, endLineDispense, jlTsStart, jlTsEnd);
    
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
