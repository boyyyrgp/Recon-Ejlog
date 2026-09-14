# CHANGELOG PERBAIKAN v15 — Konsistensi Kartu ATM ID / TID

**Tanggal:** 4 September 2026
**Trigger:** Laporan user — kartu "ATM ID" di halaman HYOSUNG ANALYSIS menampilkan "Not Found", padahal modal SUMMARY (judul "SUMMARY TRANSAKSI — TID xxxxxx") berhasil menampilkan TID yang benar untuk file log yang sama persis.
**Prinsip kerja perbaikan:** aditif (fallback) saja. TIDAK mengubah satu pun logika perhitungan ADD CASH/DISPENSE/DEPOSITED/REMAINING, deteksi periode, atau proses merge-dedup multi-file. Pola pencarian ID yang lama selalu tetap dicoba lebih dulu di urutan yang sama seperti sebelumnya — pola baru hanya jadi jaring pengaman kalau pola lama gagal ketemu.

---

## 1. [ATM Hyosung] `findHyosungATM_ID()` — TERKONFIRMASI & DIPERBAIKI

**Root cause:** fungsi ini mencari label `"Terminal Id :"`, padahal log Hyosung yang sebenarnya berlabel `"ATM ID :"` — dibuktikan langsung dari raw log yang diupload user (baris `ATM ID : 440607 NO.REF : 313|3001000`), dan didukung komentar `STANDARD_TRX_DEDUP_REGEX` (baris ~706) yang sejak lama menyatakan Hyosung tervalidasi memakai pola "ATM ID". Label "Terminal Id" sendiri tidak ditemukan di manapun juga dalam basis kode ini sebagai pola valid untuk Hyosung — kemungkinan besar peninggalan asumsi lama yang tak pernah dicocokkan ke log produksi.

**Fix:** tetap coba `"Terminal Id :"` dulu (jalur lama tidak dihapus), baru fallback ke `"ATM ID :"` kalau tidak ketemu.

**Verifikasi:** diuji dengan potongan log ASLI dari screenshot user → hasil sekarang `440607` (sebelumnya `Not Found`). Diuji juga pola lama tetap berfungsi dan tetap menang bila kedua label muncul sekaligus (regresi nol).

## 2. [ATM NCR] `findNcrATM_ID()` — TERVERIFIKASI DENGAN LOG PRODUKSI ASLI (4 Sep 2026)

**Alasan awal diubah:** struktur kodenya identik dengan kasus Hyosung — mencari label `"MACHINE NO :"` yang berbeda dari `"ATM ID :"` yang dipakai SUMMARY, dan NCR juga disebut di komentar baris ~706 yang sama sebagai mesin yang tervalidasi memakai pola "ATM ID :" pada struk transaksinya.

**Fix:** `"MACHINE NO :"` tetap dicoba dulu, fallback ke `"ATM ID :"` kalau gagal.

**Verifikasi (4 September 2026):** dikonfirmasi dengan potongan EJ NCR asli dari user. Log tsb memuat KEDUA label sekaligus — `"MACHINE NO: 054789"` di sesi SUPERVISOR MODE, dan `"ATM ID : 54789"` di tiap struk transaksi — mesin yang sama persis, cuma beda format digit (dengan/tanpa angka nol di depan). Untuk file lengkap ini, pola lama sudah ketemu duluan, jadi hasil OLD vs NEW **identik** (`054789`) — dites byte-per-byte, cocok. Untuk membuktikan manfaat fallback-nya secara nyata, diuji juga versi file yang sesi SUPERVISOR MODE-nya dihapus (mensimulasikan upload yang cuma berisi baris transaksi) — pada skenario itu kode LAMA gagal total (`Not Found`), kode BARU tetap berhasil (`54789`) lewat fallback.

**Catatan format:** tergantung isi file, kartu ATM ID NCR bisa menampilkan `054789` (lewat jalur lama) atau `54789` (lewat fallback) — mesinnya identik, cuma beda representasi digit. Ini murni kosmetik, tidak memengaruhi perhitungan apa pun; sengaja tidak ditambah logika padding supaya perubahan tetap seminimal mungkin.

## 3. [CRM Hitachi] `DataFilterCRMHitachi.findMachineID()` — TERVERIFIKASI DENGAN LOG PRODUKSI ASLI (4 Sep 2026)

**Alasan awal diubah:** badge "MACHINE: ..." di halaman Hitachi memakai pola berbeda, `"Terminal ID [xxx]"` (format kurung siku), sementara SUMMARY tetap memakai `"ATM ID :"`. Hitachi juga disebut di komentar baris ~706 sebagai tervalidasi memakai pola "ATM ID :".

**Fix:** pola bracket `"Terminal ID [xxx]"` tetap dicoba dulu (tidak disentuh — Hitachi adalah mesin paling banyak divalidasi di app ini, DISPENSED/DEPOSITED sudah presisi 100% ke laporan settlement), fallback ke `"ATM ID :"` hanya kalau bracket tidak ketemu.

**Verifikasi (4 September 2026):** dikonfirmasi dengan potongan EJ CRM Hitachi asli dari user. Log tsb memuat KEDUA label — `"Terminal ID    [161054]"` persis di awal tiap sesi transaksi, dan `"ATM ID : 161054"` di tiap struk — sama persis, tanpa beda format sama sekali. Untuk file lengkap ini, pola bracket (lama) sudah ketemu duluan, jadi hasil OLD vs NEW **identik** (`161054`) — dites byte-per-byte, cocok, fix tidak mengubah apa pun untuk file yang sudah punya marker ini. Diuji juga versi file dengan baris "Terminal ID [xxx]" dihapus (mensimulasikan upload yang mulai dari tengah sesi, tanpa marker awal) — kode LAMA gagal (`Not Found`), kode BARU tetap berhasil (`161054`) lewat fallback.

## 4. Mesin yang TIDAK disentuh (sudah konsisten sejak awal)

- **Wincor** — kartu ATM ID sudah memanggil fungsi generik `findATM_ID()` yang sama persis dengan SUMMARY.
- **Jalin** — punya fungsi TID sendiri (`findJalinTID`, format "TID=..."), dan SUMMARY sudah punya pengecualian khusus untuk memanggil fungsi yang sama.
- **CRM Dinabold, CRM Oki, CRM Hyosung** — `findMachineID()` masing-masing class sudah dari awal mencari pola `"ATM ID :"` yang sama dengan SUMMARY.

## 5. Cakupan perubahan (dikonfirmasi lewat diff baris-per-baris terhadap file asli)

Hanya 3 fungsi di atas (§1–§3) yang berubah, total 3 blok fallback ditambahkan, nol baris lama dihapus/diubah urutannya. Tidak ada perubahan di `calculateDISP`, `calculateDEP`, `calculateINIT`, `calculateREM`, deteksi periode/marker, proses merge-sort-dedup, maupun `SUMMARY_EXTRACTORS`/modal SUMMARY. `index.html`, `style.css`, dan `README.md` tidak disentuh sama sekali. Dicek ulang tanggal 4 September 2026 dengan `diff` baris-per-baris terhadap file original — hasilnya identik dengan yang dilaporkan di sini (33 baris berubah, seluruhnya di dalam 3 fungsi §1–§3), dan `node -c script.js` tetap valid tanpa error sintaks.

## 6. Metodologi & hasil pengujian otomatis (4 September 2026)

Setelah user mengirim potongan EJ asli NCR & CRM Hitachi, dijalankan 22 test otomatis (Node.js) yang membandingkan fungsi versi LAMA vs BARU secara langsung dari source code yang sebenarnya (bukan tulis ulang manual), dalam 4 kelompok:

- **File lengkap asli** (Hyosung/NCR/Hitachi) — untuk NCR & Hitachi, hasil LAMA vs BARU **identik** (§2, §3) karena pola lama sudah ketemu duluan di file yg dikirim; untuk Hyosung, LAMA gagal (`Not Found`) vs BARU berhasil (`440607`), sesuai temuan awal.
- **File yang sengaja dipotong** (menghapus sesi administratif dari NCR & Hitachi, simulasi upload tanpa marker awal) — di sinilah manfaat fallback terbukti nyata: kode LAMA gagal (`Not Found`) di kedua kasus, kode BARU tetap berhasil menampilkan ID yang benar.
- **Konsistensi silang dengan `findATM_ID()`** (fungsi SUMMARY, tidak diubah) — nilai kartu ATM ID/MACHINE untuk NCR & Hitachi dikonfirmasi mengacu ke mesin yang sama dengan yang ditampilkan SUMMARY.
- **Regresi dasar** (7 skenario sintetis: pola lama tetap menang saat kedua label ada, fallback hanya aktif saat pola lama gagal, dsb).

**Hasil: 22/22 lulus, 0 gagal.** Tidak ada card/rekening/saldo nasabah dari sampel log yang disertakan di changelog ini maupun di file aplikasi mana pun — hanya nomor mesin (ATM ID/TID) yang dikutip sebagai bukti, karena itu satu-satunya field yang relevan dengan perbaikan ini.

## 7. Status

Semua 3 fix (§1–§3) sudah **terverifikasi** dengan log produksi asli. Tidak ada rekomendasi tertunda dari investigasi ini.
