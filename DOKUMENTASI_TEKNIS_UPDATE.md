# Dokumentasi Teknis — Update REKONSILIATOR v13

**Untuk:** Tim IT / Developer
**Cakupan:** Seluruh perubahan pada `script.js`, `index.html`, `style.css` dalam siklus update ini
**Sifat dokumen:** Referensi teknis detail — nama fungsi, baris kode, alasan desain, dan metodologi pengujian tiap perubahan, supaya tim IT bisa memahami, memelihara, atau melanjutkan pekerjaan ini tanpa perlu reverse-engineering ulang.

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Peta Perubahan File](#2-peta-perubahan-file)
3. [Bagian A — Mesin Rekonsiliasi (ANALISIS): Perbaikan Kritikal](#3-bagian-a--mesin-rekonsiliasi-analisis-perbaikan-kritikal)
4. [Bagian B — Fitur SUMMARY: Perbaikan & Fitur Baru](#4-bagian-b--fitur-summary-perbaikan--fitur-baru)
5. [Metodologi Pengujian](#5-metodologi-pengujian)
6. [Keterbatasan yang Diketahui & Rekomendasi Sebelum Rilis](#6-keterbatasan-yang-diketahui--rekomendasi-sebelum-rilis)
7. [Referensi Fungsi](#7-referensi-fungsi)

---

## 1. Ringkasan Eksekutif

Update ini menyasar dua area besar:

- **Mesin ANALISIS (rekonsiliasi inti)** — ditemukan & diperbaiki **3 lapis bug berbeda** yang bertumpuk, semuanya bermuara pada satu gejala: hasil REMAINING bisa keluar **negatif** (mustahil secara fisik) ketika user upload banyak file log yang saling overlap. Ini bug **kritikal** karena memengaruhi hasil resmi rekonsiliasi, bukan sekadar tampilan.
- **Fitur SUMMARY** — 1 bug (grafik saldo salah reset di hari RPL), plus serangkaian fitur baru: toggle 4/8 kuadran, radar analog 12-jam hidup pengganti chart statis, donut Setor/Tarik, dan perbaikan tipografi di seluruh modal.

Semua perbaikan mesin ANALISIS sudah diverifikasi ketat memakai **log EJ asli** (CRM Hitachi, TID 161054, 6 hari data, 3 event REPLENISH) yang diberikan user, bukan data sintetis semata. Regresi akhir: **10/10** percobaan acak lolos sempurna untuk skenario gabung-file yang merepresentasikan pola pemakaian nyata.

---

## 2. Peta Perubahan File

| File | Jenis perubahan |
|---|---|
| `script.js` | Mayoritas perubahan — lihat detail per bagian di bawah |
| `index.html` | 1 baris: pelebaran bobot font Google Fonts `JetBrains Mono` (lihat §4.5) |
| `style.css` | CSS baru: toggle switch kuadran, radar analog (dial/needle/segment/label), highlight kartu tersinkron |

---

## 3. Bagian A — Mesin Rekonsiliasi (ANALISIS): Perbaikan Kritikal

### A0. Konteks masalah

Laporan awal: hasil ANALISIS pada dataset gabungan banyak file (24 file untuk rentang 18 hari) menunjukkan REMAINING negatif besar, padahal hasil yang sama pada file tunggal (tidak digabung) benar dan positif. Investigasi menemukan **3 bug independen** yang saling menumpuk pada mekanisme yang sama: proses gabung banyak file (`mergeSortDedupLogs`, baris 722) dan pemotongan periode berbasis index baris pada tiap class mesin (`DataFilterCRMHitachi`, `DataFilterCRMDinabold`, `DataFilterCRMOky`, serta fungsi `analyzeHyosungPeriod`/`analyzeWincorPeriod`/`analyzeNcrPeriod`/`analyzeJalinPeriod` untuk ATM).

### A1. Kontaminasi batas periode akibat urutan baris tidak presisi

**Gejala teknis:** `calculateDISP`/`calculateDEP` (dan padanannya di tiap mesin) memotong data transaksi berdasarkan **index baris** antara 2 marker REPLENISH (`period.startIndex+1` s/d `period.endIndex-1`). Asumsi ini valid untuk 1 file tunggal (urutan baris = urutan kronologis), tapi **tidak valid** untuk hasil gabungan banyak file karena `mergeSortDedupLogs` mengurutkan **per file** (bukan per baris transaksi individual) — kalau file-file yang digabung saling overlap waktu, transaksi dari sebelum/sesudah batas periode bisa secara index "nyasar" masuk ke periode yang salah, walau tanggal di barisnya sendiri tetap benar.

**Perbaikan:** ditambahkan lapisan **validasi silang waktu asli** pada level kalkulasi. Helper baru (baris 1009–1113):

```js
function reconParseMarkerTimestamp(line) { ... }              // timestamp marker RPL dari baris itu sendiri
function reconFindTransactionTimestamp(lines, idx, windowSize) { ... }  // cari TANGGAL/WAKTU terdekat (format struk Hitachi/Oki)
function reconFindTransactionTimestampGeneric(lines, idx, ...) { ... }  // varian format Dinabold (dd/mm/yyyy hh:mm:ss langsung)
function reconIsWithinPeriod(lines, idx, tsStart, tsEnd, finderFn) { ... } // validator utama
// + varian khusus per mesin ATM: reconHyosungMarkerTimestamp/TrxTimestamp,
//   reconWincorMarkerTimestamp/TrxTimestamp, reconNcrMarkerTimestamp/TrxTimestamp,
//   reconJalinMarkerTimestamp/TrxTimestamp (baris 1062–1113)
```

Setiap transaksi kini divalidasi: **waktu ASLI**-nya (bukan cuma posisi index-nya) harus berada dalam rentang `[tsStart, tsEnd)` periode yang sedang dihitung — kalau tidak, transaksi diabaikan dari perhitungan periode itu, berapa pun posisi index-nya di array. Desain **fail-open**: kalau timestamp asli tidak bisa ditemukan (format tidak standar dsb.), transaksi tetap dihitung seperti perilaku lama (index-based) — supaya fix ini tidak menghilangkan data valid.

**Cakupan:** diterapkan di `DataFilterCRMHitachi.findReplenishmentPeriod/calculateDISP/calculateDEP`, `DataFilterCRMDinabold.resolvePeriodBounds/calculateDISP/calculateDEP`, `DataFilterCRMOky.resolvePeriodBounds/calculateDISP/calculateDEP`, dan fungsi `analyze*Period` keempat mesin ATM (Hyosung/NCR/Wincor/Jalin).

**Bukti pengujian:** disimulasikan dengan mengambil 1 blok transaksi UTUH dan ASLI dari log Hitachi (lengkap dgn timestamp aslinya), lalu menyisipkannya secara fisik ke posisi index yang salah (meniru efek merge yang tidak presisi) — terbukti bekerja simetris baik kontaminasi di **awal** maupun **akhir** periode.

### A2. (Akar masalah paling dalam) Baris indikator transaksi "yatim" setelah dedup

Ini bug yang **baru terlihat setelah A1 diperbaiki** — pengujian dengan log EJ asli yang digabung ulang tetap menunjukkan hasil salah, membuktikan ada mekanisme lain yang belum tertangani A1.

**Root cause:** dedup transaksi saat gabung file (`STANDARD_TRX_DEDUP_REGEX`, awalnya baris ~612) cuma mencakup bagian **struk** transaksi (`TANGGAL:...WAKTU:...ATM ID:...NO.REF:...AMOUNT:...`). Baris **indikator** (`Request Count`/`Stored Count`/`CASH REQUEST`/`Cash-In OK`/`NOTES PRESENTED`/dst — bagian protokol mentah, letaknya **SEBELUM** struk dalam 1 blok transaksi) **tidak ikut match** oleh regex ini. Akibatnya: kalau 1 transaksi yang sama muncul di 2 file yang overlap, struknya berhasil dibuang duplikatnya oleh dedup — tapi baris indikatornya jadi **"yatim"** (kehilangan struk pasangannya, karena strukanya sudah dihapus duluan). Karena baris indikator yatim ini sudah tidak ada struk terdekat lagi untuk divalidasi ulang, ia **tetap terhitung dobel** oleh `calculateDISP`/`calculateDEP` — bahkan setelah fix A1 (karena secara timestamp pun ia valid berada di dalam periode yang benar, cuma jumlahnya yang dobel).

**Pembuktian kuantitatif** (log Hitachi asli, simulasi gabung 12 file overlap): dari 1.040 transaksi valid di 1 periode, hasil gabung-dedup versi lama menyisakan **1.767** transaksi terhitung (69 transaksi kehitung berulang, total 1.062 baris ekstra) — pola inflasi persis yang membuat DISP jauh melebihi INIT+DEP sehingga REMAINING jatuh ke minus.

**Perbaikan** (2 bagian, di `mergeSortDedupLogs`, baris 722, dan konstanta terkait):

1. **`STANDARD_TRX_DEDUP_REGEX` diperlebar** (sekarang baris 626) supaya **satu match** mencakup baris indikator SEKALIGUS strukanya:
   ```js
   const STANDARD_TRX_DEDUP_REGEX = /(?:Request Count|Stored Count|CASH REQUEST|Cash-In OK|NOTES\s+PRESENTED|CASH\s+\d+:\d+,\d+;)\b[\s\S]{0,800}?TANGGAL:\s*(\d{2}\/\d{2}\/\d{2})\s+WAKTU\s*:\s*(\d{2}:\d{2}:\d{2})[\s\S]{0,60}?ATM ID\s*:\s*(\S+)\s+NO\.REF:\s*(\S+)[\s\S]{0,400}?AMOUNT\s*:\s*RP\s*([\d.,]+)/;
   ```
   Kalau strukanya dianggap duplikat & dibuang, baris indikatornya (yang sekarang jadi bagian dari SATU match yang sama) ikut terbuang bersamaan — tidak ada lagi yang yatim.

2. **`standardFileDateFinder` (baris 594) diperbaiki presisinya.** Sebelumnya cuma mengambil **tanggal** file (tanpa jam) untuk menentukan urutan gabung. Masalahnya: 2 file yang overlap tapi kebetulan "mulai" di tanggal kalender yang sama (lazim terjadi kalau file punya buffer overlap beberapa jam) jadi **seri** urutannya — dan pemenangnya jadi tergantung urutan upload yang acak (bukan kronologi asli), yang bisa menggeser dedup jadi salah keputusan. Sekarang ikut mengambil jam:menit:detik untuk presisi lebih tinggi:
   ```js
   const m = text.match(/(\d{2})\/(\d{2})\/(\d{2,4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
   ```

**Cakupan:** perbaikan #1 otomatis berlaku untuk semua adapter yang memakai `STANDARD_TRX_DEDUP_REGEX` (crm, dn, oky, hyosung, ncr, wincor — lihat `LOG_MERGE_ADAPTERS`). Adapter `jalin` tidak perlu diubah — dedup-nya sudah berbasis per-baris utuh (`trxKeyPerLine`), arsitekturnya beda dan sudah aman dari bug ini sejak awal.

**Hasil verifikasi akhir** (log Hitachi asli, 6 hari, 3 periode RPL):

| Skenario | Hasil |
|---|---|
| File tunggal (ground truth) | Periode 1: 91/1.021 lembar — Periode 2: 1.653/523 lembar |
| 6 file harian + buffer overlap 3 jam (skenario realistis), 10× urutan upload acak | **10/10 lolos sempurna** |
| Pola persis sesuai deskripsi user (file per-periode RPL, batas tepat di jam RPL, termasuk rantai 3 file berurutan) | **10/10 lolos sempurna** |
| 12 file dengan overlap 50% window (skenario adversarial ekstrem, jauh lebih padat dari pola nyata) | Masih ada residual — didokumentasikan sebagai keterbatasan (lihat §6) |

### A3. Cakupan ke Mesin ATM

Pola arsitektur pemotongan periode berbasis index yang sama ditemukan **identik** di `analyzeHyosungPeriod`, `analyzeNcrPeriod`, `analyzeWincorPeriod`, `analyzeJalinPeriod` — sama-sama rawan bug A1. Validasi silang waktu (A1) diterapkan ke keempatnya, reuse fungsi ekstraksi timestamp yang sama persis dengan yang sudah dipakai & tervalidasi di fitur SUMMARY masing-masing mesin (`summaryExtractHyosung`, dst. — baris 2914–3139), supaya tidak menciptakan asumsi format baru yang belum teruji. Bug A2 (regex dedup) otomatis ikut berlaku untuk Hyosung/NCR/Wincor (berbagi `STANDARD_TRX_DEDUP_REGEX`).

**⚠️ Catatan penting untuk tim IT:** perluasan ke ATM ini sudah lolos smoke-test (tidak ada error/regresi saat dijalankan), **tapi belum diuji seketat CRM Hitachi** karena tidak ada log ATM asli yang overlap untuk diuji ulang di sesi pengembangan ini. **Rekomendasi: lakukan pengujian serupa §5 dengan log ATM produksi sebelum rilis penuh ke mesin ATM.**

---

## 4. Bagian B — Fitur SUMMARY: Perbaikan & Fitur Baru

### B1. Bug grafik Saldo Harian — reset saldo salah di hari RPL

**Gejala:** grafik "Saldo Harian" bisa menampilkan nilai minus pada hari terjadinya REPLENISH — mustahil secara fisik.

**Root cause:** `aggregateSummaryData` (baris 3191) mereset saldo ke nilai REPLENISH berdasarkan **tanggal kalender** kejadian, lalu memotong **seluruh transaksi 1 hari penuh** dari nilai baru itu. Padahal REPLENISH jarang terjadi tepat jam 00:00 (mis. jam 18:41) — transaksi SEBELUM jam itu di hari yang sama sebenarnya masih menguras saldo **lama** (siklus sebelumnya), bukan saldo **baru** yang belum masuk.

**Perbaikan:** diganti dengan **timeline kronologis** — transaksi + event RPL digabung & diurutkan per detik dalam satu array (`timeline`, di dalam `aggregateSummaryData`), saldo direset TEPAT di detik RPL terjadi, bukan di awal hari kalendernya. Tabel rekap harian (In/Out per hari) sengaja **tidak diubah** — tetap agregasi kalender penuh, karena tujuannya memang melihat volume in/out per hari, bukan perjalanan saldo.

### B2. Toggle 4/8 Kuadran

Data distribusi jam direfaktor dari basis 4-slot tetap menjadi **basis per jam (24 slot)** sebagai satu sumber data (`hourlyDispCount`, `hourlyDispAmount`, dst. — dikembalikan oleh `aggregateSummaryData`), lalu dikelompokkan ulang di level tampilan lewat:

```js
function groupHourlyToQuadrants(hourlyArr, n) {  // baris 3157
    const groupSize = 24 / n;
    const out = new Array(n).fill(0);
    for (let h = 0; h < 24; h++) out[Math.floor(h / groupSize)] += hourlyArr[h];
    return out;
}
```

Toggle (switch kecil "8 Kuadran" di pojok kanan atas judul) memicu `renderSummaryContent(body, cfg, agg)` dipanggil ulang dengan `summaryQuadrantMode` (4 atau 8) yang sudah di-flip — **tidak perlu scan ulang log**, cukup kelompokkan ulang data hourly yang sudah ada. Default selalu 4 (di-reset tiap modal Summary dibuka baru, lihat `openSummaryModal`).

Label 8-kuadran (format inklusif sesuai spek): `00:00-02:59, 03:00-05:59, 06:00-08:59, 09:00-11:59, 12:00-14:59, 15:00-17:59, 18:00-20:59, 21:00-23:59` (konstanta `QUADRANT_LABELS_8`, baris ~3155). Label 4-kuadran tidak diubah dari sebelumnya (`QUADRANT_LABELS_4`).

**Verifikasi:** total tiap pasangan slot 8-kuadran selalu pas sama dengan slot 4-kuadran yang bersesuaian (`q8[i*2]+q8[i*2+1] === q4[i]` untuk semua i) — dibuktikan dengan log Hitachi asli, tidak ada data hilang/dobel akibat pengelompokan ulang.

### B3. Radar Analog 12-Jam Hidup (pengganti chart `polarArea` Chart.js)

Chart `polarArea` Chart.js awal **diganti total** dengan radar analog 12-jam yang bergerak otomatis — dibangun manual pakai SVG + CSS + `requestAnimationFrame` (fungsi `initSummaryRadar`, baris 3592), karena efek "hidup" seperti ini tidak bisa dibuat pakai chart library statis biasa.

**Mekanisme:**
- Dial **12 jam** (bukan 24 — sesuai keputusan final: jam dunia nyata cuma 12, indikator AM/PM di tengah cukup untuk membedakan). 1 putaran jarum penuh = 12 jam simulasi, lalu otomatis gantian fase AM/PM.
- Jumlah irisan tiap fase mengikuti toggle kuadran: `segPerPhase = quadrantMode / 2` (2 irisan/fase utk mode 4, 4 irisan/fase utk mode 8).
- Tiap irisan digambar sebagai SVG `<path>` (fungsi `describeArc`, geometri polar standar) — **radius** = besar nilai transaksi kuadran itu (dinormalisasi ke rentang `[baseR, maxR]` = `[40, 96]` unit viewBox), **warna** = arah (CRM: hijau jika net setor ≥0, merah jika net tarik <0; ATM: **selalu merah**, karena ATM cuma dispense = uang selalu keluar).
- Kuadran yang sedang "disapu" jarum menyala (class `.active`, animasi pulsing) **di radar SEKALIGUS di kartu kuadran** yang bersangkutan di sisi kiri (class `.active-sweep`, disinkronkan lewat atribut `data-quad` yang sama pada kartu & path SVG).
- Panel `#summary-radar-readout` di bawah dial menampilkan label jam + nominal + jumlah transaksi kuadran yang sedang disapu, ikut berganti live mengikuti posisi jarum.
- Animasi dihentikan bersih (`cancelAnimationFrame`) saat modal ditutup (`closeSummaryModal`) atau saat toggle 4/8 diklik (yang memicu re-render penuh) — mencegah loop animasi numpuk jalan ganda di background.

**Riwayat perbaikan bug (4 putaran iterasi berdasarkan screenshot user):**

| # | Bug | Root cause | Fix |
|---|---|---|---|
| 1 | Jarum tidak presisi di tengah | Kombinasi `translate()+rotate()` pada 1 elemen sama — urutan aplikasi transform ambigu | Dipecah jadi 2 lapis: `.summary-radar-needle-pivot` (elemen 0-ukuran, rotasi murni) membungkus `.summary-radar-needle` (bar statis yang menjulur dari titik pivot) |
| 2 | Segmen ATM selalu hijau | Logic `const positive = !isTwoWay \|\| val >= 0;` — utk ATM (`isTwoWay=false`) hasilnya SELALU `true` | Diganti `const positive = isTwoWay ? (val >= 0) : false;` — ATM selalu `negative` (merah) |
| 3 | Segmen CRM bernilai positif kecil tampak "kosong" | `baseR` (radius minimum, 24) lebih kecil dari radius badge waktu di tengah (~30 unit) — segmen kecil tertutup total oleh badge | `baseR` dinaikkan ke 40 (`maxR` ke 96) supaya semua segmen, sekecil apa pun nilainya, tetap mengintip keluar dari badge |
| 4 | Label jam (12/15/18/21 dst.) posisinya miring/serong, bukan tegak lurus di 4 arah mata angin | Label ditempatkan di **titik tengah** busur irisan (`midDeg = startDeg + degPerSeg/2`), padahal labelnya merepresentasikan **jam AWAL** irisan itu — selisih setengah lebar irisan menghasilkan pola berlian miring | Diganti ke `startDeg` (batas awal irisan) sebagai titik penempatan label |

Semua perbaikan di atas HANYA menyentuh area radar (rendering visual) — tidak menyentuh `aggregateSummaryData` atau logika kalkulasi apa pun, jadi tidak berisiko terhadap akurasi angka.

### B4. Donat Setor vs Tarik (khusus CRM)

Cincin donat kecil (Chart.js `doughnut`, `summaryDonutChartInstance`) ditambahkan di kartu "Klasifikasi Mesin", menampilkan proporsi `conclusion.totalDepAmount` vs `conclusion.totalDispAmount` — memperkuat kesimpulan tekstual DOMINAN SETOR/TARIK/BALANCE secara visual. Hanya render untuk mesin CRM (`cfg.isTwoWay === true`).

### B5. Perbaikan Tipografi (keluhan "tulisan blur saat zoom out")

**Root cause:** hampir seluruh angka di Summary memakai font `JetBrains Mono` dengan ketebalan `font-bold`/`font-black` (700/900) — tapi Google Fonts cuma dimuat di bobot **400 dan 800**. Browser terpaksa mereka-reka bobot yang filenya tidak ada (*synthetic/faux bold*), menghasilkan tampilan lembek/blur, makin kentara saat di-zoom out. Ditemukan di 22 titik pemakaian di `script.js`.

**Perbaikan:**
- `index.html`: link Google Fonts JetBrains Mono diperlebar dari `wght@400;800` ke `wght@400;500;600;700;800;900`.
- 18 titik ukuran teks custom super kecil (`text-[10px]`/`text-[11px]`) dirapikan ke skala standar Tailwind `text-xs`, khusus di dalam `renderSummaryContent` (tidak menyentuh bagian aplikasi lain).

### B6. Kartu kuadran ATM — tambah jumlah transaksi

Kartu kuadran ATM sebelumnya cuma menampilkan nominal + lembar. Ditambahkan baris jumlah transaksi (`qDispCount[i]`), menyamakan pola dengan kartu CRM yang sudah lebih dulu menampilkannya.

---

## 5. Metodologi Pengujian

Karena lingkungan pengembangan sesi ini **tidak punya browser** (hanya Node.js + bash), pengujian dibagi 2 kategori:

**A. Logika data (bisa diuji penuh di Node.js)** — dilakukan dengan cara:
1. Ekstrak fungsi terkait (class `DataFilterCRMHitachi`, `mergeSortDedupLogs`, `aggregateSummaryData`, dkk.) dari `script.js` ke harness Node.js terisolasi (dengan stub minimal utk `document`).
2. Jalankan terhadap **log EJ asli** yang diberikan user (bukan data sintetis semata), termasuk simulasi realistis multi-file overlap (potong 1 file besar jadi beberapa file kecil dengan pola overlap yang meniru pola upload nyata, lalu gabung ulang & bandingkan hasilnya dengan ground truth file tunggal).
3. Semua bug rekonsiliasi (A1–A3) dan konsistensi data kuadran (B2) diverifikasi dengan metode ini — hasil tercantum di tabel §3.A2 dan §4.B2.

**B. Rendering visual (Chart.js, SVG, animasi CSS)** — **tidak bisa diverifikasi otomatis** di lingkungan ini (butuh browser sungguhan). Pendekatan yang dipakai: penulisan kode mengikuti API standar (Chart.js v4 `doughnut`, SVG path generation manual dengan rumus polar-ke-kartesian standar), lalu **iterasi berdasarkan screenshot yang dikirim user** setelah dipasang di lingkungan produksi mereka (lihat riwayat 4 bug radar di §4.B3 — semuanya ditemukan & diperbaiki lewat siklus screenshot-dari-user, bukan lewat pengujian otomatis).

**Rekomendasi untuk tim IT:** kalau ada perubahan lanjutan di area rendering visual (radar, chart), siapkan environment dengan browser (atau headless browser seperti Puppeteer/Playwright) untuk mempercepat siklus pengujian — pendekatan "kirim screenshot" yang dipakai di sesi ini valid tapi lambat untuk iterasi.

---

## 6. Keterbatasan yang Diketahui & Rekomendasi Sebelum Rilis

1. **Skenario overlap file yang sangat ekstrem** (banyak file kecil dengan overlap window 50%+, jauh lebih padat dari pola upload wajar) masih punya residual kesalahan kecil pada mesin ANALISIS — akar masalahnya berbeda dari A1/A2 (pencarian timestamp "terdekat" bisa salah tangkap milik transaksi tetangga kalau interleaving-nya sangat halus). **Tidak berdampak pada pola pemakaian nyata** yang sudah diverifikasi (upload per-hari atau per-periode-RPL, lihat tabel §3.A2), tapi perlu diketahui tim IT sebagai batas kemampuan sistem saat ini.
2. **Perluasan fix A1/A2 ke mesin ATM** (Hyosung/NCR/Wincor/Jalin) belum diuji dengan log ATM produksi yang overlap — hanya smoke-test. **Rekomendasi: uji dengan data ATM asli sebelum rilis penuh** (metodologi sama seperti §5.A, tinggal ganti sumber log).
3. **Rendering visual radar & chart** belum diverifikasi otomatis (lihat §5.B) — sudah melalui beberapa putaran perbaikan berdasarkan screenshot user, tapi disarankan 1 putaran QA visual manual terakhir sebelum dianggap final, terutama di berbagai ukuran layar/browser yang berbeda dari yang sudah diuji user.
4. **Kecepatan sapuan jarum radar** (0.55°/frame, ±11 detik per putaran 12 jam) dipilih berdasarkan pertimbangan "ritme tenang, tidak mengganggu" — belum ada masukan eksplisit dari user soal preferensi kecepatan ini, silakan disesuaikan di `initSummaryRadar` (variabel `speed`) kalau ada feedback lanjutan.

---

## 7. Referensi Fungsi

Ringkasan fungsi/konstanta kunci yang ditambah atau diubah signifikan pada `script.js` (baris merujuk ke versi saat dokumen ini ditulis — bisa bergeser sedikit pada commit berikutnya):

| Fungsi / Konstanta | Baris (~) | Peran |
|---|---|---|
| `standardFileDateFinder` | 594 | Menentukan tanggal+jam representatif tiap file utk urutan gabung (§3.A2) |
| `STANDARD_TRX_DEDUP_REGEX` | 626 | Pola dedup transaksi (indikator+struk dalam 1 match, §3.A2) |
| `mergeSortDedupLogs` | 722 | Pipeline utama gabung banyak file (sort → dedup admin → dedup transaksi) |
| `reconParseMarkerTimestamp` dst. | 1009–1113 | Helper validasi silang waktu (§3.A1) |
| `DataFilterCRMHitachi` / `Dinabold` / `Oky` | 1118+ | Class rekonsiliasi CRM, sudah dipatch dgn validasi waktu |
| `analyzeHyosungPeriod` dst. | — | Fungsi rekonsiliasi ATM, sudah dipatch dgn validasi waktu (§3.A3) |
| `summaryExtractCrmHitachi` dst. | 2701–3139 | Ekstraksi transaksi per mesin utk fitur Summary |
| `getQuadrantLabels` / `groupHourlyToQuadrants` | 3156–3157 | Helper toggle 4/8 kuadran (§4.B2) |
| `aggregateSummaryData` | 3191 | Agregasi utama Summary (saldo kronologis §4.B1, data hourly §4.B2) |
| `initSummaryRadar` | 3592 | Radar analog 12-jam hidup (§4.B3) |
| `renderSummaryContent` | 3713 | Orkestrasi render seluruh isi modal Summary |
