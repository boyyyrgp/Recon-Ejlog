# REKONSILIATOR - Automatic Reconciliation System v7

## 📋 Deskripsi Aplikasi
Aplikasi **REKONSILIATOR** adalah sistem otomatis untuk analisis dan rekonsiliasi data log ATM berbasis EJ Log. Aplikasi ini dirancang khusus untuk kebutuhan **BG Jambi** dengan fitur periode filter cerdas yang hanya menampilkan periode dengan transaksi dispense.

## 🎯 Fitur Utama
1. **Multi-Vendor Support**: CRM Hitachi, Hyosung, Wincor, NCR, ATM Jalin
2. **Period Filter Enhanced**: Sistem otomatis mendeteksi dan memfilter periode berdasarkan transaksi dispense
3. **Drag & Drop File**: Support file .txt, .log, .zip
4. **Analisis Otomatis**: Parsing log otomatis dengan algoritma cerdas
5. **Hasil Visual**: Tampilan hasil rekonsiliasi dengan warna indikator
6. **Copy to Clipboard**: Fitur copy data untuk Excel
7. **Security Gate**: Sistem login dengan password

## 🚀 Cara Penggunaan

### 1. Akses Aplikasi
- Password: `9910`
- Sistem akan terbuka setelah login berhasil

### 2. Upload File Log
+ **Metode 1**: Drag & drop file ke area dropzone
+ **Metode 2**: Klik area dropzone untuk memilih file
+ **Format file**: .txt, .log, .zip

### 3. Input Data Fisik
+ Masukkan data fisik remaining sesuai hasil hitung fisik
+ Untuk CRM: input per denominasi (100.000 & 50.000)
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

## 📁 Struktur File