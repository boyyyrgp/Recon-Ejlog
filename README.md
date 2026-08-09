# REKONSILIATOR - Automatic Reconciliation System v13

## 📋 Deskripsi Aplikasi
Aplikasi **REKONSILIATOR** adalah sistem otomatis untuk analisis dan rekonsiliasi data log ATM berbasis EJ Log. Aplikasi ini dirancang khusus untuk kebutuhan **BG Jambi** dengan fitur periode filter cerdas yang hanya menampilkan periode dengan transaksi dispense.

## 🎯 Fitur Utama
1. **Multi-Vendor Support**: CRM Hitachi, CRM Dinabold, CRM Oki, CRM Hyosung, Hyosung, Wincor, NCR, ATM Jalin (8 mesin)
2. **Period Filter Enhanced**: Sistem otomatis mendeteksi dan memfilter periode berdasarkan transaksi dispense, dengan fallback label periode konsisten di ketujuh mesin (tanggal transaksi terakhir, bukan lagi "Sekarang")
3. **Multi-File Upload dgn Auto-Sort & Dedup**: Upload beberapa file log sekaligus (urutan bebas, boleh acak) — sistem otomatis mengurutkan secara kronologis DAN membuang baris/transaksi duplikat
4. **Summary Transaksi**: Tombol "SUMMARY" di tiap halaman mesin — rekap harian, distribusi jam, Daily Rate (mean/median), Net Setor-Tarik (khusus CRM), grafik Saldo & Net harian, dari **seluruh transaksi di log**, lintas periode (detail di bawah)
5. **Drag & Drop File**: Support file .txt, .log, .zip, .jrn, .csv
6. **Analisis Otomatis**: Parsing log otomatis dengan algoritma cerdas per karakter mesin masing-masing, toleran format tab maupun spasi
7. **Hasil Visual**: Tampilan hasil rekonsiliasi dengan warna indikator
8. **Copy to Clipboard**: Fitur copy data untuk Excel
9. **Security Gate**: Sistem login dengan password
10. **Validasi Silang AMOUNT**: Khusus CRM Dinabold, setiap transaksi divalidasi otomatis terhadap field AMOUNT pada EJ Log
11. **Denominasi ATM Akurat**: Tiap mesin ATM (Hyosung/Wincor/NCR/Jalin) menggunakan metode deteksi denominasi terbaik sesuai karakter log masing-masing (field Denomination, derivasi dari transaksi pertama, atau denom asli per transaksi), bukan lagi asumsi tunggal gaya CRM

## 🆕 CRM Oki
Modul untuk mesin Cash Recycling Machine Oki. Struktur log mirip Hitachi (marker dispense "Request Count", deposit "Stored Count"), namun marker REPLENISH memakai format sendiri ('Replenishment' + baris 'Cnt'). Fungsi & formula rekonsiliasi sama seperti CRM Hitachi/Dinabold (REPLENISH − DISPENSED + DEPOSITED = REMAINING).

## 🆕 CRM Dinabold (DN)
Modul untuk mesin Cash Recycling Machine Dinabold. Fungsi & formula rekonsiliasi sama seperti CRM Hitachi (REPLENISH − DISPENSED + DEPOSITED = REMAINING), namun keyword & struktur EJ Log berbeda total dari Hitachi. Detail lengkap keyword, regex, dan alur parsing ada di dokumen **`Upgrade DN.md`**.

Catatan: baris **RETRACK** pada tabel hasil CRM Dinabold saat ini masih **placeholder (0)** — logic-nya menyusul setelah contoh log kejadian retrack tersedia.

## 🆕 Summary Transaksi
Klik tombol **SUMMARY** (pojok kanan-atas, sejajar tombol Back) di halaman mesin manapun. Judul modal menampilkan **TID mesin** (bukan nama merek), diambil langsung dari log yang dianalisis.

**Untuk ATM** (Hyosung/Wincor/NCR/Jalin):
- Kartu **Daily Rate Harian**: nominal (Rp, dibulatkan ke kelipatan denom asli mesin) sebagai angka utama, jumlah lembar sungguhan sebagai keterangan di bawahnya (mean & median)
- Distribusi jam (4 kuadran, format jam lengkap `00:00 - 06:00` dst): nominal utama, lembar sebagai keterangan
- Tabel rekap harian: Saldo Awal / Dispense / Saldo Akhir (lembar) + Nominal Dispense
- Grafik Nominal Harian: batang Saldo & Dispense + garis Net (Saldo − Pengeluaran)

**Untuk CRM** (Hitachi/Dinabold/Oki/Hyosung) — 2 arah transaksi, jadi ada tambahan:
- Kuadran jam menampilkan **Net (Setor − Tarik)** per kuadran — positif (hijau) = dominan setor, negatif (merah) = dominan tarik; keterangan di bawahnya adalah **total transaksi** kuadran tsb (bukan lembar, karena lembar net tidak menunjukkan komposisi 50rb/100rb)
- Section tersendiri **"Daily Rate"**: 3 kolom (Dispense/Deposit/Net), tiap kolom pecah lembar per denominasi (50rb/100rb) termasuk Net, untuk mean & median. Net = Deposit − Dispense (selaras, dihitung dari angka Dispense/Deposit yang sama-sama sudah dibulatkan ke kelipatan 50rb, sehingga 3 angka di kartu selalu bisa dicocokkan manual)
- Tabel rekap harian pecah kolom per denominasi (Dispense 50rb/100rb/Total, Deposit 50rb/100rb/Total) + kolom Net Transaksi (nominal saja) di paling kanan
- Grafik Nominal Harian: batang Saldo, Pemasukan, Pengeluaran + garis Net (Saldo + Pemasukan − Pengeluaran). Saldo direset ke nilai isi ulang (add-cash) sungguhan dari log setiap ada event REPLENISH, bukan ke 0
- Kartu **"Klasifikasi Mesin"**: DOMINAN SETOR / DOMINAN TARIK / BALANCE, berdasarkan rasio nominal deposit:dispense

Summary ini mencakup **seluruh transaksi di log yang diupload**, tidak terikat ke satu periode RPL tertentu — cocok untuk melihat karakter/pola mesin demi optimasi interval replenish & efisiensi biaya operasional (interval RPL dihitung sendiri oleh user berdasarkan angka Daily Rate, bukan otomatis oleh sistem).

Detail teknis & hasil validasi lengkap ada di dokumen **`Upgrade Summary.md`**.

## 🆕 Multi-File Upload, Auto-Sort & Deduplikasi
Berlaku di **ketujuh mesin**. Kalau Anda drag & drop / pilih beberapa file log sekaligus (misal export harian terpisah untuk beberapa hari):
- Sistem otomatis **mengurutkan file secara kronologis** berdasarkan tanggal isinya — urutan upload TIDAK perlu benar, sistem yang memperbaiki.
- Sistem otomatis **membuang transaksi & baris administratif/RPL yang duplikat** — berguna kalau ada file yang ke-upload dobel, atau 2 file dengan rentang jam yang tumpang tindih untuk tanggal yang sama.
- Info ringkas ditampilkan di bawah kotak upload: jumlah file digabung, apakah urutan diperbaiki, rentang tanggal final, dan jumlah baris duplikat yang dibuang.
- Detail teknis & hasil pengujian lengkap ada di dokumen **`Upgrade_Standarisasi_Summary_Autosort.md`**.

## 🆕 Standarisasi Label Periode Tanpa Penutup
Berlaku di **ketujuh mesin**. Kalau periode terakhir/tunggal tidak punya penutup RPL kedua (misal mesin baru sekali di-RPL dan belum di-RPL lagi sampai log terakhir diexport):
- Label periode sekarang menampilkan **tanggal transaksi (dispense/setor) TERAKHIR yang sungguhan ditemukan** di log — bukan lagi teks generik "Sekarang" (perilaku lama Hyosung/NCR), dan bukan lagi didiamkan/disembunyikan begitu saja (perilaku lama Wincor & Jalin).
- Periode seperti ini tidak otomatis jadi pilihan default (sistem akan lebih memilih periode yang sudah closed kalau tersedia), tapi tetap bisa dipilih manual untuk dianalisis.

## 🚀 Cara Penggunaan

### 1. Akses Aplikasi
- Password: `9910`
- Sistem akan terbuka setelah login berhasil

### 2. Upload File Log
+ **Metode 1**: Drag & drop 1 atau beberapa file sekaligus ke area dropzone
+ **Metode 2**: Klik area dropzone untuk memilih file (bisa multi-select)
+ **Format file**: .txt, .log, .zip, .jrn, .csv
+ Kalau upload lebih dari 1 file, sistem otomatis mengurutkan & membersihkan duplikat sebelum dianalisis (lihat info banner di bawah dropzone)

### 3. Input Data Fisik
+ Masukkan data fisik remaining sesuai hasil hitung fisik
+ Untuk CRM (Hitachi, Dinabold, Oki & Hyosung): input per denominasi (100.000 & 50.000)
+ Untuk ATM lainnya: input total fisik remaining

### 4. Pilih Periode Replenish
+ Sistem otomatis mendeteksi periode berdasarkan transaksi dispense
+ Pilih periode yang ingin dianalisis
+ Hanya periode dengan transaksi dispense yang ditampilkan

### 5. Klik ANALISIS
+ Sistem akan memproses data log
+ Menampilkan hasil rekonsiliasi
+ Menampilkan perbandingan sistem vs fisik

### 6. Interpretasi Hasil
+ **COCOK**: Sistem = Fisik (Hijau)
+ **SHORTAGE**: Sistem > Fisik (Merah)
+ **SURPLUS**: Sistem < Fisik (Kuning/Hijau)

### 7. Lihat Summary (opsional)
+ Klik tombol **SUMMARY** di pojok kanan-atas untuk melihat rekap & karakter transaksi lintas periode

## 📁 Struktur File