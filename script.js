// --- AI ENHANCEMENTS: GLOBAL STATE ---
let aiContext = {
    lastQuestion: '',
    lastResponse: '',
    machineType: '',
    logCharacteristics: {},
    conversationHistory: []
};

let userPatterns = {
    frequentQueries: [],
    commonErrors: [],
    preferredMetrics: []
};

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
    new DataFilterCRMHitachi(); 
    setupDragAndDrop('dropzone-crm', 'file-crm', 'crmLogInput');
    setupDragAndDrop('dropzone-wincor', 'file-wincor', 'wincorLogInput');
    setupDragAndDrop('dropzone-hyosung', 'file-hyosung', 'hyosungLogInput');
    setupDragAndDrop('dropzone-ncr', 'file-ncr', 'ncrLogInput');
    setupDragAndDrop('dropzone-jalin', 'file-jalin', 'jalinLogInput');

    // Event Listeners Filter
    const wincorBtn = document.getElementById('wincorFilterButton');
    if(wincorBtn) wincorBtn.addEventListener('click', filterCash);

    const hyosungBtn = document.getElementById('hyosungFilterButton');
    if(hyosungBtn) hyosungBtn.addEventListener('click', filterHyosung);

    const ncrBtn = document.getElementById('ncrFilterButton');
    if(ncrBtn) ncrBtn.addEventListener('click', filterNcr);

    const jalinBtn = document.getElementById('jalinFilterButton');
    if(jalinBtn) jalinBtn.addEventListener('click', filterJalin);

    // Load user patterns
    loadUserPatterns();
});

// --- UTILITY FUNCTIONS ---
function cleanAnsiCodes(str) {
    const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\u0000/g;
    return str.replace(ansiRegex, '');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
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

    // Reset AI input
    const aiInput = document.getElementById(`ai-input-${type}`);
    if (aiInput) aiInput.value = '';
    const aiResult = document.getElementById(`ai-result-${type}`);
    if (aiResult) aiResult.innerHTML = '<div class="text-neon">🤖 AI Assistant siap!</div><div class="mt-2 text-[10px] text-slate-400"><strong>Klik contoh pertanyaan di bawah atau ketik permintaan khusus:</strong></div>';

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

    alert('Form has been reset!');
}

// --- COPY FUNCTIONALITY ---
function copyListToClipboard(listId, btnElement) {
    const list = document.getElementById(listId);
    if (!list) return;
    
    const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent).join('\n');
    
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

// --- 1. DRAG & DROP LOGIC ---
function setupDragAndDrop(dropzoneId, inputId, textareaId) {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(inputId);
    const textarea = document.getElementById(textareaId);

    if(!dropzone) return;

    dropzone.addEventListener('click', (e) => {
        if (e.target !== textarea) {
            fileInput.click();
        }
    });

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
        handleFiles(files, textarea);
    }, false);
}

function handleFiles(files, textarea) {
    textarea.value = "Membaca file...";
    const readers = [];
    let combinedText = "";

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        const promise = new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
        });
        readers.push(promise);
        reader.readAsText(file);
    });

    Promise.all(readers).then(contents => {
        combinedText = contents.join("\n\n--- MERGED FILE ---\n\n");
        textarea.value = combinedText;
    });
}

// --- ENHANCED AI ASSISTANT LOGIC ---
function askAI(type) {
    const inputId = `ai-input-${type}`;
    const resultId = `ai-result-${type}`;
    const logInputId = type === 'crm' ? 'crmLogInput' : `${type}LogInput`;
    
    const question = document.getElementById(inputId).value.trim();
    const logContent = document.getElementById(logInputId).value;
    const resultDiv = document.getElementById(resultId);

    if (!question) return;

    resultDiv.innerHTML = '<span class="ai-typing text-neon">Sedang menganalisis</span>';
    
    // Update context
    aiContext.machineType = type;
    aiContext.lastQuestion = question;
    
    setTimeout(() => {
        const analysis = enhancedAIAnalysis(question, logContent, type);
        resultDiv.innerHTML = analysis;
        
        // Update context dengan response
        aiContext.lastResponse = analysis;
        aiContext.conversationHistory.push({
            question,
            response: analysis,
            timestamp: Date.now()
        });
        
        // Learning (sederhana)
        learnFromInteraction(question, analysis, true);
    }, 800);
}

function enhancedAIAnalysis(question, logContent, type) {
    const cleanLog = cleanAnsiCodes(logContent || "");
    if (!cleanLog || cleanLog.length < 50) {
        return formatAIResponse("Log kosong atau terlalu pendek. Harap upload log terlebih dahulu.", "error");
    }

    // NLP Dasar: Normalisasi pertanyaan
    const normalizedQ = question.toLowerCase().trim();
    
    // Context-aware: Jika pertanyaan mengacu pada konteks sebelumnya
    if (isFollowUpQuestion(normalizedQ)) {
        return handleFollowUpQuestion(normalizedQ, cleanLog, type);
    }

    // Pattern Recognition & Anomaly Detection
    const anomalies = detectAnomalies(cleanLog, type);
    const insights = generateProactiveInsights(cleanLog, type);

    // Multi-step Queries
    if (isComplexQuery(normalizedQ)) {
        return handleComplexQuery(normalizedQ, cleanLog, type);
    }

    // Smart Suggestions berdasarkan analisis log
    let smartSuggestions = generateSmartSuggestions(cleanLog, type);

    // Coba tangani dengan logika lama terlebih dahulu
    const legacyAnalysis = generateAIAnalysis(question, logContent, type);
    if (legacyAnalysis && !legacyAnalysis.includes("AI Siap")) {
        return formatAIResponse(legacyAnalysis, "info") + 
               (anomalies.length > 0 ? formatAIResponse("🚨 <strong>Anomali terdeteksi:</strong> " + anomalies.join(", "), "warning") : "") +
               (insights.length > 0 ? formatAIResponse("💡 <strong>Insights:</strong> " + insights.join(" "), "insight") : "") +
               (smartSuggestions.length > 0 ? formatAIResponse("📋 <strong>Saran:</strong> " + smartSuggestions.join(" "), "success") : "");
    }

    // Jika tidak ditangani oleh logika lama, gunakan enhanced analysis
    return performEnhancedAnalysis(normalizedQ, cleanLog, type, anomalies, insights, smartSuggestions);
}

// --- AI ENHANCEMENTS: SUPPORT FUNCTIONS ---

function formatAIResponse(message, type = 'info') {
    const formats = {
        info: 'text-white',
        warning: 'text-warning',
        error: 'text-danger',
        success: 'text-success',
        insight: 'text-neon font-bold'
    };

    const icons = {
        info: '💡',
        warning: '⚠️',
        error: '❌',
        success: '✅',
        insight: '🔍'
    };

    return `<div class="${formats[type]} text-sm font-mono mb-2">
        ${icons[type]} ${message}
    </div>`;
}

function isFollowUpQuestion(question) {
    const followUpKeywords = ['itu', 'tersebut', 'sebelumnya', 'lalu', 'lagi', 'lanjut'];
    return followUpKeywords.some(keyword => question.includes(keyword)) && aiContext.lastQuestion;
}

function handleFollowUpQuestion(question, logContent, type) {
    return formatAIResponse("Berdasarkan pertanyaan sebelumnya: " + aiContext.lastQuestion, "info") +
           formatAIResponse("Response: " + aiContext.lastResponse, "info") +
           formatAIResponse("Ada yang ingin didalami lagi dari analisis sebelumnya?", "info");
}

function detectAnomalies(logContent, type) {
    const anomalies = [];
    const lines = logContent.split('\n');

    // Deteksi retract beruntun
    const retractCount = (logContent.match(/retract/gi) || []).length;
    if (retractCount > 5) anomalies.push(`Tingkat retract tinggi (${retractCount}x)`);

    // Deteksi error beruntun
    const errorCount = (logContent.match(/error/gi) || []).length;
    if (errorCount > 3) anomalies.push(`Banyak error (${errorCount}x)`);

    // Deteksi berdasarkan mesin
    if (type === 'hyosung') {
        const d000Count = (logContent.match(/d000/gi) || []).length;
        if (d000Count > 0) anomalies.push(`Error d000: ${d000Count}x`);
    }
    if (type === 'wincor') {
        const cmdRejectCount = (logContent.match(/cmd_reject/gi) || []).length;
        if (cmdRejectCount > 0) anomalies.push(`CMD_REJECT: ${cmdRejectCount}x`);
    }
    if (type === 'jalin') {
        const dispenseFailCount = (logContent.match(/DISPENSE FAIL/gi) || []).length;
        if (dispenseFailCount > 0) anomalies.push(`DISPENSE FAIL: ${dispenseFailCount}x`);
    }

    return anomalies;
}

function generateProactiveInsights(logContent, type) {
    const insights = [];

    // Insight berdasarkan jumlah transaksi
    const transactionCount = (logContent.match(/Request Count/gi) || []).length;
    if (transactionCount > 50) insights.push(`Tingkat transaksi tinggi (${transactionCount}x)`);

    // Insight berdasarkan waktu
    const timePatterns = logContent.match(/\d{2}:\d{2}:\d{2}/g);
    if (timePatterns) {
        const hours = timePatterns.map(time => parseInt(time.split(':')[0]));
        const morningCount = hours.filter(h => h >= 8 && h < 12).length;
        const afternoonCount = hours.filter(h => h >= 12 && h < 17).length;
        if (morningCount > afternoonCount) insights.push("Puncak transaksi: pagi hari");
        else if (afternoonCount > morningCount) insights.push("Puncak transaksi: siang/sore hari");
    }

    return insights;
}

function isComplexQuery(question) {
    const complexKeywords = ['bandingkan', 'prediksi', 'ringkasan', 'analisis pattern', 'deteksi anomaly', 'visualisasi'];
    return complexKeywords.some(keyword => question.includes(keyword));
}

function handleComplexQuery(question, logContent, type) {
    if (question.includes('bandingkan')) {
        return handleComparisonQuery(question, logContent, type);
    } else if (question.includes('prediksi')) {
        return handlePredictionQuery(question, logContent, type);
    } else if (question.includes('ringkasan')) {
        return handleSummaryQuery(question, logContent, type);
    } else if (question.includes('analisis pattern') || question.includes('deteksi anomaly')) {
        return handlePatternAnalysisQuery(question, logContent, type);
    }

    return formatAIResponse("Maaf, saya belum bisa menangani pertanyaan kompleks tersebut. Coba gunakan kata kunci yang lebih sederhana.", "error");
}

function handleComparisonQuery(question, logContent, type) {
    const lines = logContent.split('\n');
    const todayErrors = lines.filter(line => line.toLowerCase().includes('error')).length;
    const todayRetracts = lines.filter(line => line.toLowerCase().includes('retract')).length;
    
    // Simulasi perbandingan dengan "kemarin" (dummy data)
    const yesterdayErrors = Math.floor(todayErrors * 0.7);
    const yesterdayRetracts = Math.floor(todayRetracts * 0.8);

    return formatAIResponse("📊 <strong>Perbandingan Performance:</strong>", "info") +
           formatAIResponse(`- Error Hari Ini: ${todayErrors} vs Kemarin: ${yesterdayErrors}`, 
                          todayErrors > yesterdayErrors ? "warning" : "success") +
           formatAIResponse(`- Retract Hari Ini: ${todayRetracts} vs Kemarin: ${yesterdayRetracts}`, 
                          todayRetracts > yesterdayRetracts ? "warning" : "success") +
           formatAIResponse(`Trend: ${todayErrors > yesterdayErrors ? '⚠️ Peningkatan Error' : '✅ Perbaikan'}`, 
                          todayErrors > yesterdayErrors ? "warning" : "success");
}

function handlePredictionQuery(question, logContent, type) {
    const lines = logContent.split('\n');
    let dispenseCount = 0;
    lines.forEach(line => {
        if (line.includes('Request Count') || line.includes('DISPENSE') || line.includes('CASH')) {
            dispenseCount++;
        }
    });

    // Prediksi sederhana
    const averagePerTransaction = 500000;
    const totalDispense = dispenseCount * averagePerTransaction;
    const replenishThreshold = 8000000;

    if (totalDispense > replenishThreshold) {
        return formatAIResponse("🚨 <strong>PREDIKSI REPLENISH:</strong> ASAP!", "warning") +
               formatAIResponse(`Saldo diperkirakan hampir habis. Total dispense: Rp ${totalDispense.toLocaleString('id-ID')}`, "warning");
    } else {
        const remaining = replenishThreshold - totalDispense;
        const daysLeft = Math.floor(remaining / (averagePerTransaction * 10));
        return formatAIResponse("📈 <strong>PREDIKSI REPLENISH:</strong>", "success") +
               formatAIResponse(`Dalam ${daysLeft} hari lagi (estimasi)`, "success") +
               formatAIResponse(`Sisa kapasitas: Rp ${remaining.toLocaleString('id-ID')}`, "info");
    }
}

function handleSummaryQuery(question, logContent, type) {
    const transactionCount = (logContent.match(/Request Count/gi) || []).length;
    const errorCount = (logContent.match(/error/gi) || []).length;
    const retractCount = (logContent.match(/retract/gi) || []).length;

    // Analisis jam sibuk
    const timePatterns = logContent.match(/\d{2}:\d{2}:\d{2}/g);
    let peakHour = "Tidak terdeteksi";
    if (timePatterns) {
        const hours = timePatterns.map(time => parseInt(time.split(':')[0]));
        const hourCounts = hours.reduce((acc, hour) => {
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});
        peakHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b) + ':00';
    }

    return formatAIResponse("📋 <strong>RINGKASAN TRANSAKSI:</strong>", "info") +
           formatAIResponse(`- Total Transaksi: ${transactionCount}`, "info") +
           formatAIResponse(`- Total Error: ${errorCount}`, errorCount > 0 ? "warning" : "success") +
           formatAIResponse(`- Total Retract: ${retractCount}`, retractCount > 0 ? "warning" : "success") +
           formatAIResponse(`- Jam Sibuk: ${peakHour}`, "info") +
           formatAIResponse("📊 <strong>SARAN VISUALISASI:</strong> Grafik line transaksi per jam, pie chart error vs success, heatmap jam sibuk.", "insight");
}

function handlePatternAnalysisQuery(question, logContent, type) {
    const anomalies = detectAnomalies(logContent, type);
    const insights = generateProactiveInsights(logContent, type);

    let response = formatAIResponse("🔍 <strong>ANALISIS PATTERN & ANOMALI:</strong>", "info");
    
    if (anomalies.length > 0) {
        response += formatAIResponse("🚨 <strong>ANOMALI TERDETEKSI:</strong>", "warning");
        anomalies.forEach(anomaly => {
            response += formatAIResponse(`- ${anomaly}`, "warning");
        });
    } else {
        response += formatAIResponse("✅ <strong>Tidak ada anomali signifikan terdeteksi.</strong>", "success");
    }

    if (insights.length > 0) {
        response += formatAIResponse("💡 <strong>INSIGHTS:</strong>", "insight");
        insights.forEach(insight => {
            response += formatAIResponse(`- ${insight}`, "insight");
        });
    }

    // Tambahkan rekomendasi
    if (anomalies.length > 0) {
        response += formatAIResponse("🎯 <strong>REKOMENDASI:</strong> Cek fisik modul, lakukan preventive maintenance.", "warning");
    }

    return response;
}

function generateSmartSuggestions(logContent, type) {
    const suggestions = [];

    const errorCount = (logContent.match(/error/gi) || []).length;
    if (errorCount > 5) {
        suggestions.push("Cek detail error dengan: 'analisis pattern error'");
    }

    const retractCount = (logContent.match(/retract/gi) || []).length;
    if (retractCount > 3) {
        suggestions.push("Analisis retract dengan: 'deteksi anomaly'");
    }

    const transactionCount = (logContent.match(/Request Count/gi) || []).length;
    if (transactionCount > 30) {
        suggestions.push("Lihat ringkasan dengan: 'buat ringkasan transaksi'");
    }

    return suggestions;
}

function performEnhancedAnalysis(question, logContent, type, anomalies, insights, smartSuggestions) {
    let response = formatAIResponse("🤖 <strong>ENHANCED AI ANALYSIS:</strong>", "info") +
                 formatAIResponse("Saya menganalisis log dengan kemampuan AI yang ditingkatkan.", "info");

    // Jika ada anomalies atau insights, tampilkan
    if (anomalies.length > 0) {
        response += formatAIResponse("🚨 <strong>Anomali terdeteksi:</strong> " + anomalies.join(", "), "warning");
    }
    if (insights.length > 0) {
        response += formatAIResponse("💡 <strong>Insights:</strong> " + insights.join(" "), "insight");
    }
    if (smartSuggestions.length > 0) {
        response += formatAIResponse("📋 <strong>Saran analisis lanjutan:</strong> " + smartSuggestions.join(" "), "success");
    }

    response += formatAIResponse("🔧 <strong>Coba fitur analisis lanjutan dengan contoh pertanyaan di atas!</strong>", "info");

    return response;
}

function learnFromInteraction(question, response, wasHelpful) {
    if (wasHelpful) {
        userPatterns.frequentQueries.push({
            question: question.toLowerCase(),
            timestamp: Date.now(),
            machineType: aiContext.machineType
        });

        // Simpan ke localStorage
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem('aiUserPatterns', JSON.stringify(userPatterns));
        }
    }
}

function loadUserPatterns() {
    if (typeof(Storage) !== "undefined") {
        const stored = localStorage.getItem('aiUserPatterns');
        if (stored) {
            userPatterns = JSON.parse(stored);
        }
    }
}

// --- LOGIKA AI LAMA (DIJAGA UNTUK KOMPATIBILITAS) ---
function generateAIAnalysis(question, log, type) {
    const cleanLog = cleanAnsiCodes(log || "");
    if (!cleanLog || cleanLog.length < 50) return "Log kosong atau terlalu pendek. Harap upload log terlebih dahulu.";

    const lowerLog = cleanLog.toLowerCase();
    const lowerQ = question.toLowerCase();
    const lines = cleanLog.split('\n');

    // FITUR BARU 1: PENCARIAN KATA KUNCI (SEARCH)
    if (lowerQ.startsWith('cari ')) {
        const keyword = lowerQ.replace('cari ', '').trim();
        if (!keyword) return "Kata kunci pencarian tidak boleh kosong.";
        
        const matches = lines.filter(line => line.toLowerCase().includes(keyword));
        if (matches.length === 0) return `Tidak ditemukan baris yang mengandung kata "<span class="text-danger">${keyword}</span>".`;
        
        const preview = matches.slice(0, 10).map(l => l.trim()).join('<br>');
        const moreCount = matches.length > 10 ? `<br>...dan ${matches.length - 10} baris lainnya.` : '';
        
        return `Ditemukan <b>${matches.length}</b> baris dengan kata "<span class="text-neon">${keyword}</span>".<br><br>Preview:<br><div class='text-[10px] font-mono mt-2 p-2 bg-black/30 rounded border border-slate-700 overflow-x-auto'>${preview}${moreCount}</div>`;
    }

    // FITUR BARU 2: KALKULATOR / PENGHITUNG (COUNT)
    if (lowerQ.startsWith('hitung total ') || lowerQ.startsWith('hitung jumlah ') || lowerQ.startsWith('berapa kali ')) {
         const keyword = lowerQ.replace(/hitung total |hitung jumlah |berapa kali /g, '').trim();
         if (!keyword) return "Kata kunci penghitungan tidak boleh kosong.";
         
         const count = (lowerLog.match(new RegExp(escapeRegExp(keyword), 'g')) || []).length;
         return `Kata kunci "<span class="text-warning">${keyword}</span>" muncul sebanyak <b>${count}</b> kali dalam seluruh file log.`;
    }

    // FITUR BARU 3: PENJUMLAHAN NILAI (SUM)
    if (lowerQ.startsWith('jumlahkan ') || lowerQ.startsWith('total nilai ')) {
        const keyword = lowerQ.replace(/jumlahkan nilai |jumlahkan |total nilai /g, '').trim();
        if (!keyword) return "Kata kunci penjumlahan tidak boleh kosong.";
        
        const matchedLines = lines.filter(line => line.toLowerCase().includes(keyword));
        let totalSum = 0;
        let countFound = 0;
        
        matchedLines.forEach(line => {
            const numbers = line.match(/\d+/g);
            if (numbers) {
                numbers.forEach(numStr => {
                    const val = parseInt(numStr);
                    if (!isNaN(val)) {
                        totalSum += val;
                    }
                });
                countFound++;
            }
        });
        
        return `Total akumulasi angka pada baris yang mengandung "${keyword}":<br><span class="text-neon text-xl font-bold">Rp ${totalSum.toLocaleString('id-ID')}</span><br><span class="text-xs text-slate-400">(Data diambil dari ${matchedLines.length} baris relevan)</span>`;
    }

    // --- LOGIKA LAMA (FALLBACK) ---
    
    if (lowerQ.includes('sisa') || lowerQ.includes('remaining') || lowerQ.includes('balance') || lowerQ.includes('akhir')) {
        let elId = '';
        if (type === 'crm') elId = 'remAmount';
        else if (type === 'hyosung') elId = 'hyosungTotalRemaining';
        else if (type === 'wincor') elId = 'wincorTotalRemaining';
        else if (type === 'ncr') elId = 'ncrTotalRemaining';
        else if (type === 'jalin') elId = 'jalinTotalRemaining';

        const val = document.getElementById(elId)?.textContent || '0';
        return `Berdasarkan filter di layar, <b>Sisa Uang (Remaining)</b> tercatat sebesar: <span class="text-warning font-bold">${val}</span>.`;
    }

     if (lowerQ.includes('dispense') || lowerQ.includes('keluar') || lowerQ.includes('total amount')) {
        let elId = '';
        if (type === 'crm') elId = 'dispAmount';
        else if (type === 'hyosung') elId = 'hyosungTotalAmount';
        else if (type === 'wincor') elId = 'wincorTotalAmount';
        else if (type === 'ncr') elId = 'ncrTotalAmount';
        else if (type === 'jalin') elId = 'jalinTotalAmount';

        const val = document.getElementById(elId)?.textContent || '0';
        return `Total <b>Dispensed (Uang Keluar)</b> berdasarkan filter adalah: <span class="text-danger font-bold">${val}</span>.`;
    }
    
    if (lowerQ.includes('error') || lowerQ.includes('masalah') || lowerQ.includes('analisa') || lowerQ.includes('cek') || lowerQ.includes('aneh')) {
        const errors = [];
        
        if (lowerLog.includes('retract')) errors.push("- Terdeteksi 'RETRACT'.");
        if (lowerLog.includes('reject')) errors.push("- Terdeteksi 'REJECT'.");
        if (lowerLog.includes('dispense fail') || lowerLog.includes('dispenser error')) errors.push("- Terdeteksi kegagalan Dispense.");
        if (lowerLog.includes('jam') || lowerLog.includes('jammed')) errors.push("- Terdeteksi 'JAM'.");
        if (lowerLog.includes('hardware error')) errors.push("- Terdeteksi Hardware Error.");
        
        if (type === 'hyosung') {
            if (lowerLog.includes('d000')) errors.push("- Error Code 'd000' (Dispenser Failure).");
            if (lowerLog.includes('20001')) errors.push("- Error Code '20001' (Return Error/Jam).");
            if (lowerLog.includes('2d000')) errors.push("- Error Code '2d000' (Dispenser Fatal Error).");
        }
        if (type === 'wincor') {
            if (lowerLog.includes('cmd_reject')) errors.push("- 'CMD_REJECT'.");
            if (lowerLog.includes('cassette empty')) errors.push("- Peringatan Kaset Kosong.");
        }
        if (type === 'ncr') {
            if (lowerLog.includes('m-status') && lowerLog.includes('fail')) errors.push("- NCR M-Status Failure.");
        }
        if (type === 'jalin') {
            if (lowerLog.includes('dispense fail')) errors.push("- Dispense Fail terdeteksi.");
            if (lowerLog.includes('cassette empty')) errors.push("- Peringatan Kaset Kosong.");
        }
        
        if (errors.length > 0) {
            return "Ditemukan indikasi anomali/error:<br>" + errors.join("<br>") + "<br>Saran: Cek fisik modul.";
        } else {
            return "Tidak ditemukan kata kunci error umum (Jam/Reject/Code Spesifik). Transaksi terlihat wajar.";
        }
    }

    if (question.includes('id') || question.includes('mesin')) {
        return "ID Mesin telah diekstrak dan ditampilkan di panel hasil sebelah kiri/atas.";
    }

    return "AI Enhanced siap. Gunakan contoh pertanyaan di atas untuk analisis lanjutan.";
}

// --- LOGIKA BISNIS & REKONSILIASI (TIDAK DIUBAH) ---

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

// CRM CLASS (TIDAK DIUBAH)
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

        if (this.filterButton) {
            this.filterButton.addEventListener('click', () => this.filterData());
        }
    }

    findReplenishmentPeriod(lines) {
        const replenishmentIndices = [];
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().endsWith('REPLENISHMENT')) {
                replenishmentIndices.push(i);
                if (replenishmentIndices.length === 2) break; 
            }
        }
        if (replenishmentIndices.length === 2) {
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

    calculateDISP(lines) {
        const { start, end } = this.findReplenishmentPeriod(lines);
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

    calculateDEP(lines) {
        const { start, end } = this.findReplenishmentPeriod(lines);
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

    calculateINIT(lines) {
        const { initIndex } = this.findReplenishmentPeriod(lines);
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

    calculateREM(lines) {
        const [totalDisp1, totalDisp2, totalDisp3, totalDisp4] = this.calculateDISP(lines);
        const [totalDep1, totalDep2] = this.calculateDEP(lines);
        const [init100, init50] = this.calculateINIT(lines);
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

    extractCashPresented(lines) {
        const { start, end } = this.findReplenishmentPeriod(lines);
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

    extractStoredCount(lines) {
        const { start, end } = this.findReplenishmentPeriod(lines);
        const [totalDep1, totalDep2] = this.calculateDEP(lines);
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
        
        const [totalDisp1, totalDisp2, totalDisp3, totalDisp4] = this.calculateDISP(lines);
        const [totalDep1, totalDep2] = this.calculateDEP(lines);
        const [init100, init50] = this.calculateINIT(lines);
        const [rem100, rem50] = this.calculateREM(lines);
        
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
        
        const cashPresented = this.extractCashPresented(lines);
        this.cashPresentedCount.textContent = cashPresented.count;
        this.cashPresentedTotal.textContent = cashPresented.total.toLocaleString('id-ID');
        this.cashPresentedList.innerHTML = '';
        cashPresented.list.forEach(amount => {
            const li = document.createElement('li');
            li.textContent = amount.toLocaleString('id-ID');
            li.classList.add('py-1', 'border-b', 'border-slate-800/50');
            this.cashPresentedList.appendChild(li);
        });

        const storedCountData = this.extractStoredCount(lines);
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

// WINCOR LOGIC (TIDAK DIUBAH)
function filterCash() {
    const logTextRaw = document.getElementById('wincorLogInput').value;
    const logText = cleanAnsiCodes(logTextRaw);
    const cashLists = { 'wincorCash1': [], 'wincorCash2': [], 'wincorCash3': [], 'wincorCash4': [] };
    
    if (!logText) {
        return;
    }
    const logLines = logText.split('\n');
    const atmID = findATM_ID(logText); 
    displayWincorATM_ID(atmID);
    
    let lastAddCashIndex = -1;
    let lastAddCashValue = 0;
    for (let i = logLines.length - 1; i >= 0; i--) {
        if (logLines[i].includes('CASH COUNTERS AFTER SOP')) {
            const value = parseWincorAddCashNewValidated(logLines, i); 
            if (value > 0) { 
                lastAddCashIndex = i;
                lastAddCashValue = value;
                break; 
            }
        }
    }
    
    let secondLastAddCashIndex = -1;
    let secondLastAddCashValue = 0;
    for (let i = lastAddCashIndex - 1; i >= 0; i--) {
        if (logLines[i].includes('CASH COUNTERS AFTER SOP')) {
            const value = parseWincorAddCashNewValidated(logLines, i); 
            if (value > 0) { 
                secondLastAddCashIndex = i;
                secondLastAddCashValue = value;
                break; 
            }
        }
    }
    
    // CEK INPUT MANUAL ADD CASH
    const manualAddCash = parseInt(document.getElementById('wincorAddCashManual').value);
    let totalAddCashAwal;
    
    if (!isNaN(manualAddCash) && manualAddCash > 0) {
        totalAddCashAwal = manualAddCash;
    } else {
        if (secondLastAddCashIndex !== -1) {
            totalAddCashAwal = secondLastAddCashValue;
        } else if (lastAddCashIndex !== -1) {
            totalAddCashAwal = lastAddCashValue;
        } else {
            totalAddCashAwal = 0;
        }
    }
    
    displayWincorTotalAddCash(totalAddCashAwal.toLocaleString('id-ID'));
    
    // PERBAIKAN: PERIODE DISPENSE HANYA DALAM RENTANG 2 ADD CASH
    let startLineDispense = 0;
    let endLineDispense = logLines.length - 1;
    
    if (secondLastAddCashIndex !== -1 && lastAddCashIndex !== -1) {
        startLineDispense = secondLastAddCashIndex + 1;
        endLineDispense = lastAddCashIndex - 1;
    } else if (lastAddCashIndex !== -1) {
        startLineDispense = lastAddCashIndex + 1;
    } else {
        startLineDispense = 0;
        endLineDispense = logLines.length - 1;
    }
    
    for (let i = startLineDispense; i <= endLineDispense; i++) {
        const match = logLines[i].match(/CASH\s+(\d+):(\d+),(\d+);/);
        if (match) {
            const [, cassetteNum, code, amount] = match;
            const cassNum = parseInt(cassetteNum);
            const dispAmount = parseInt(amount);
            if (!isNaN(cassNum) && !isNaN(dispAmount) && cassNum >= 1 && cassNum <= 4) {
                cashLists[`wincorCash${cassNum}`].push(dispAmount);
            }
        }
    }
    
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
function displayWincorResult(list, id) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    let totalAmount = 0;
    list.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.toLocaleString('id-ID');
        li.classList.add('py-1', 'border-b', 'border-slate-700/50');
        ul.appendChild(li);
        totalAmount += item;
    });
    const totalLi = document.createElement('li');
    totalLi.textContent = `Total: ${totalAmount.toLocaleString('id-ID')}`;
    totalLi.style.fontWeight = 'bold';
    totalLi.classList.add('text-accent', 'border-b', 'border-slate-700', 'pb-2', 'mb-2', 'pt-2');
    ul.insertBefore(totalLi, ul.firstChild);
}
function calculateTotalRemaining(totalAddCash, totalAmount) { return totalAddCash - totalAmount; }
function findATM_ID(logText) {
    const match = logText.match(/ATM ID\s*:\s*(\d+)/);
    return match ? match[1] : "Not Found";
}

// HYOSUNG LOGIC (TIDAK DIUBAH)
function filterHyosung() {
    const logTextRaw = document.getElementById('hyosungLogInput').value;
    const logText = cleanAnsiCodes(logTextRaw);
    const cashLists = { 'hyosungCash1': [], 'hyosungCash2': [], 'hyosungCash3': [], 'hyosungCash4': [] };
    const logLines = logText.split('\n');
    const atmID = findHyosungATM_ID(logText);
    displayHyosungATM_ID(atmID);
    
    let lastAddCashIndex = -1;
    let lastAddCashValue = 0;
    for (let i = logLines.length - 1; i >= 0; i--) {
        if (logLines[i].includes('ADD CASH:')) {
            const value = parseHyosungAddCashNew(logLines, i);
            if (value > 0) { 
                lastAddCashIndex = i;
                lastAddCashValue = value;
                break; 
            }
        }
    }
    
    let secondLastAddCashIndex = -1;
    let secondLastAddCashValue = 0;
    for (let i = lastAddCashIndex - 1; i >= 0; i--) {
        if (logLines[i].includes('ADD CASH:')) {
            const value = parseHyosungAddCashNew(logLines, i);
            if (value > 0) { 
                secondLastAddCashIndex = i;
                secondLastAddCashValue = value;
                break; 
            }
        }
    }
    
    // CEK INPUT MANUAL ADD CASH
    const manualAddCash = parseInt(document.getElementById('hyosungAddCashManual').value);
    let totalAddCashAwal;
    
    if (!isNaN(manualAddCash) && manualAddCash > 0) {
        totalAddCashAwal = manualAddCash;
    } else {
        totalAddCashAwal = secondLastAddCashIndex !== -1 ? secondLastAddCashValue : lastAddCashValue;
    }
    
    displayHyosungTotalAddCash(totalAddCashAwal.toLocaleString('id-ID'));
    
    // PERIODE ANALISIS
    let startLineDispense = 0;
    let endLineDispense = logLines.length - 1;
    if (secondLastAddCashIndex !== -1) {
        startLineDispense = secondLastAddCashIndex + 1;
        endLineDispense = lastAddCashIndex - 1;
    } else if (lastAddCashIndex !== -1) {
        startLineDispense = lastAddCashIndex + 1;
    }
    
    for (let i = startLineDispense; i <= endLineDispense; i++) {
        const match = logLines[i].match(/Request Count\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/);
        if (match) {
            const [, disp1, disp2, disp3, disp4] = match;
            cashLists['hyosungCash1'].push(parseInt(disp1));
            cashLists['hyosungCash2'].push(parseInt(disp2));
            cashLists['hyosungCash3'].push(parseInt(disp3));
            cashLists['hyosungCash4'].push(parseInt(disp4));
        }
    }
    
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
function displayHyosungResult(list, id) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    let totalAmount = 0;
    list.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.toLocaleString('id-ID');
        li.classList.add('py-1', 'border-b', 'border-slate-700/50');
        ul.appendChild(li);
        totalAmount += item;
    });
    const totalLi = document.createElement('li');
    totalLi.textContent = `Total: ${totalAmount.toLocaleString('id-ID')}`;
    totalLi.style.fontWeight = 'bold';
    totalLi.classList.add('text-accent', 'border-b', 'border-slate-700', 'pb-2', 'mb-2', 'pt-2');
    ul.insertBefore(totalLi, ul.firstChild);
}
function findHyosungATM_ID(logText) {
    const match = logText.match(/Terminal Id\s*:\s*(\d+)/);
    return match ? match[1] : "Not Found";
}
function displayHyosungATM_ID(atmID) { document.getElementById('hyosungAtmId').textContent = `${atmID}`; }
function displayHyosungTotalAddCash(totalAddCash) { document.getElementById('hyosungTotalAddCash').textContent = `${totalAddCash}`; }
function displayHyosungTotalRemaining(totalRemaining) { document.getElementById('hyosungTotalRemaining').textContent = `${totalRemaining}`; }

// NCR LOGIC (TIDAK DIUBAH)
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

function filterNcr() {
    const logTextRaw = document.getElementById('ncrLogInput').value;
    const logText = cleanAnsiCodes(logTextRaw);
    const cashLists = { 'ncrCash1': [], 'ncrCash2': [], 'ncrCash3': [], 'ncrCash4': [] };
    const logLines = logText.split('\n');
    const atmID = findNcrATM_ID(logText);
    displayNcrATM_ID(atmID);
    
    let lastCashAddedIndex = -1;
    let lastCashAddedValue = 0;
    for (let i = logLines.length - 1; i >= 0; i--) {
        if (logLines[i].includes('CASH ADDED')) { 
            const value = parseNcrCashAddedNew(logLines, i); 
            if (value > 0) { 
                lastCashAddedIndex = i;
                lastCashAddedValue = value;
                break; 
            }
        }
    }
    
    let secondLastCashAddedIndex = -1;
    let secondLastCashAddedValue = 0;
    for (let i = lastCashAddedIndex - 1; i >= 0; i--) {
        if (logLines[i].includes('CASH ADDED')) { 
            const value = parseNcrCashAddedNew(logLines, i); 
            if (value > 0) { 
                secondLastCashAddedIndex = i;
                secondLastCashAddedValue = value;
                break; 
            }
        }
    }
    
    // CEK INPUT MANUAL ADD CASH
    const manualAddCash = parseInt(document.getElementById('ncrAddCashManual').value);
    let totalAddCashAwal;
    
    if (!isNaN(manualAddCash) && manualAddCash > 0) {
        totalAddCashAwal = manualAddCash;
    } else {
        totalAddCashAwal = secondLastCashAddedIndex !== -1 ? secondLastCashAddedValue : lastCashAddedValue;
    }
    
    displayNcrTotalAddCash(totalAddCashAwal.toLocaleString('id-ID'));
    
    // PERIODE ANALISIS
    let startLineDispense = 0;
    let endLineDispense = logLines.length - 1;
    if (secondLastCashAddedIndex !== -1) {
        startLineDispense = secondLastCashAddedIndex + 1;
        endLineDispense = lastCashAddedIndex - 1;
    } else if (lastCashAddedIndex !== -1) {
        startLineDispense = lastCashAddedIndex + 1;
    }
    
    for (let i = startLineDispense; i <= endLineDispense; i++) {
        const match = logLines[i].match(/NOTES PRESENTED\s+(\d+),(\d+),(\d+),(\d+)/);
        if (match) {
            const [, disp1, disp2, disp3, disp4] = match;
            cashLists['ncrCash1'].push(parseInt(disp1));
            cashLists['ncrCash2'].push(parseInt(disp2));
            cashLists['ncrCash3'].push(parseInt(disp3));
            cashLists['ncrCash4'].push(parseInt(disp4));
        }
    }
    
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
function displayNcrResult(list, id) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    let totalAmount = 0;
    list.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.toLocaleString('id-ID');
        li.classList.add('py-1', 'border-b', 'border-slate-700/50');
        ul.appendChild(li);
        totalAmount += item;
    });
    const totalLi = document.createElement('li');
    totalLi.textContent = `Total: ${totalAmount.toLocaleString('id-ID')}`;
    totalLi.style.fontWeight = 'bold';
    totalLi.classList.add('text-accent', 'border-b', 'border-slate-700', 'pb-2', 'mb-2', 'pt-2');
    ul.insertBefore(totalLi, ul.firstChild);
}
function findNcrATM_ID(logText) {
    const match = logText.match(/MACHINE NO:\s*(\d+)/);
    return match ? match[1] : "Not Found";
}
function displayNcrATM_ID(atmID) { document.getElementById('ncrAtmId').textContent = `${atmID}`; }
function displayNcrTotalAddCash(totalAddCash) { document.getElementById('ncrTotalAddCash').textContent = `${totalAddCash}`; }
function displayNcrTotalRemaining(totalRemaining) { document.getElementById('ncrTotalRemaining').textContent = `${totalRemaining}`; }

// --- JALIN SPECIFIC LOGIC ---

// Fungsi untuk mencari TID (Terminal ID)
function findJalinTID(logText) {
    // Mencari baris yang mengandung "TID=xxxx" (contoh: T0203024|0|002|0000-00-00 00:00:00|2025-08-27 13:13:38|TID=T0203024)
    const match = logText.match(/TID=(\w+)/);
    return match ? match[1] : "Not Found";
}

// Fungsi untuk mencari periode analisis (add cash) berdasarkan keyword "Printing 'PRT_SHOW_CASSETTES.xml'"
function findJalinAddCashPeriods(logLines) {
    const periods = [];
    
    // Cari dari bawah ke atas (bottom-up)
    for (let i = logLines.length - 1; i >= 0; i--) {
        if (logLines[i].includes("Printing 'PRT_SHOW_CASSETTES.xml'")) {
            periods.push(i);
            if (periods.length === 2) break; // Kita butuh 2 periode
        }
    }
    
    return periods;
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

// Fungsi untuk mencari dan memproses data dispense
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
            // Format: "DISPENSED: 0 x 0,00 , 0 x 50.000,00 IDR, 6 x 50.000,00 IDR, 0 x 50.000,00 IDR, 0 x 50.000,00 IDR"
            // Kita ambil 4 ruas setelah ruas pertama yang diabaikan
            // Ruas 2: 0 x 50.000,00 IDR -> kaset 1
            // Ruas 3: 6 x 50.000,00 IDR -> kaset 2
            // Ruas 4: 0 x 50.000,00 IDR -> kaset 3
            // Ruas 5: 0 x 50.000,00 IDR -> kaset 4
            
            // Pattern untuk menangkap 4 kelompok setelah ruas pertama
            const dispensePattern = /DISPENSED:\s*\d+\s*x\s*[\d.,]+\s*,?\s*(\d+)\s*x\s*[\d.,]+\s*IDR,?\s*(\d+)\s*x\s*[\d.,]+\s*IDR,?\s*(\d+)\s*x\s*[\d.,]+\s*IDR,?\s*(\d+)\s*x\s*[\d.,]+\s*IDR/;
            const match = line.match(dispensePattern);
            
            if (match) {
                // Ambil nilai untuk setiap kaset (angka pertama di setiap ruas)
                // Kaset 1: match[1], Kaset 2: match[2], Kaset 3: match[3], Kaset 4: match[4]
                const disp1 = parseInt(match[1]);
                const disp2 = parseInt(match[2]);
                const disp3 = parseInt(match[3]);
                const disp4 = parseInt(match[4]);
                
                // Tambahkan ke daftar yang sesuai
                if (disp1 > 0) cashLists['jalinCash1'].push(disp1);
                if (disp2 > 0) cashLists['jalinCash2'].push(disp2);
                if (disp3 > 0) cashLists['jalinCash3'].push(disp3);
                if (disp4 > 0) cashLists['jalinCash4'].push(disp4);
            } else {
                // Alternatif: jika regex tidak match, coba dengan split
                console.log("Regex tidak match, mencoba alternatif parsing...");
                const parts = line.split('DISPENSED:')[1].split(',');
                if (parts.length >= 5) {
                    // Abaikan bagian pertama (0 x 0,00), ambil 4 bagian berikutnya
                    for (let j = 1; j <= 4; j++) {
                        const part = parts[j].trim();
                        const amountMatch = part.match(/(\d+)\s*x\s*[\d.,]+\s*IDR/);
                        if (amountMatch) {
                            const amount = parseInt(amountMatch[1]);
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

// Fungsi untuk menampilkan hasil dispense ke UI
function displayJalinResult(list, id) {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    let totalAmount = 0;
    list.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.toLocaleString('id-ID');
        li.classList.add('py-1', 'border-b', 'border-slate-700/50');
        ul.appendChild(li);
        totalAmount += item;
    });
    
    if (list.length > 0) {
        const totalLi = document.createElement('li');
        totalLi.textContent = `Total: ${totalAmount.toLocaleString('id-ID')}`;
        totalLi.style.fontWeight = 'bold';
        totalLi.classList.add('text-jalinAccent', 'border-b', 'border-slate-700', 'pb-2', 'mb-2', 'pt-2');
        ul.insertBefore(totalLi, ul.firstChild);
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
    
    // 1. Cari TID
    const tid = findJalinTID(logText);
    document.getElementById('jalinTid').textContent = tid;
    
    // 2. Cari periode analisis (add cash)
    const periods = findJalinAddCashPeriods(logLines);
    
    let lastAddCashIndex = -1;
    let lastAddCashValue = 0;
    let secondLastAddCashIndex = -1;
    let secondLastAddCashValue = 0;
    
    if (periods.length >= 1) {
        const lastPeriodResult = parseJalinAddCash(logLines, periods[0]);
        if (lastPeriodResult.foundValid) {
            lastAddCashIndex = periods[0];
            lastAddCashValue = lastPeriodResult.totalAddCash;
        }
    }
    
    if (periods.length >= 2) {
        const secondLastPeriodResult = parseJalinAddCash(logLines, periods[1]);
        if (secondLastPeriodResult.foundValid) {
            secondLastAddCashIndex = periods[1];
            secondLastAddCashValue = secondLastPeriodResult.totalAddCash;
        }
    }
    
    // 3. Tentukan nilai add cash awal
    const manualAddCash = parseInt(document.getElementById('jalinAddCashManual').value);
    let totalAddCashAwal;
    
    if (!isNaN(manualAddCash) && manualAddCash > 0) {
        totalAddCashAwal = manualAddCash;
    } else {
        totalAddCashAwal = secondLastAddCashIndex !== -1 ? secondLastAddCashValue : lastAddCashValue;
    }
    
    document.getElementById('jalinTotalAddCash').textContent = totalAddCashAwal.toLocaleString('id-ID');
    
    // 4. Tentukan periode dispense
    let startLineDispense = 0;
    let endLineDispense = logLines.length - 1;
    
    if (secondLastAddCashIndex !== -1 && lastAddCashIndex !== -1) {
        startLineDispense = secondLastAddCashIndex + 1;
        endLineDispense = lastAddCashIndex - 1;
    } else if (lastAddCashIndex !== -1) {
        startLineDispense = lastAddCashIndex + 1;
    }
    
    // 5. Ekstrak data dispense
    const cashLists = findJalinDispenseData(logLines, startLineDispense, endLineDispense);
    
    // 6. Tampilkan hasil dispense
    for (const [cashType, list] of Object.entries(cashLists)) {
        displayJalinResult(list, cashType);
    }
    
    // 7. Hitung total dispense
    const totalAmount = Object.values(cashLists).flat().reduce((acc, val) => acc + val, 0);
    document.getElementById('jalinTotalAmount').textContent = totalAmount.toLocaleString('id-ID');
    
    // 8. Hitung total remaining
    const totalRemaining = totalAddCashAwal - totalAmount;
    document.getElementById('jalinTotalRemaining').textContent = totalRemaining.toLocaleString('id-ID');
    
    // 9. Tampilkan hasil rekonsiliasi
    const physInput = document.getElementById('jalinPhysInput');
    if (physInput.value !== "") {
        const physVal = parseInt(physInput.value) || 0;
        document.getElementById('jalinDisplayPhys').textContent = physVal.toLocaleString('id-ID');
        updateReconciliationUI(physVal, totalRemaining, "jalinReconBox", "jalinReconResult", "jalinExpression");
    }
}