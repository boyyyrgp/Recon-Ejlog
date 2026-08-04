# Changelog Perbaikan — REKONSILIATOR v14

Ringkasan seluruh perbaikan pada sesi ini. Diverifikasi terhadap EJ log asli (Dinabold, Hitachi, Oki, Wincor, Hyosung, NCR, Jalin) via harness Node.js + jsdom, dan dicocokkan terhadap laporan settlement/internal milik mesin sendiri sebagai ground truth di mana tersedia.

## 1. CRM Dinabold — validasi periode & REPLENISH (akar masalah REMAINING negatif)
`findValidMarkers()` sebelumnya menolak marker CLEAR CASH+SOP kalau salah satu dari 4 nilai kaset AFTER SOP tidak bulat kelipatan 50 — padahal test-dispense teknisi saat SOP membuat sebagian uang "hilang" ke REJECTS/RETRACTS (uangnya tetap di dalam mesin). Sekarang validasi menjumlahkan 4 nilai kaset + REJECTS + RETRACTS dari blok yang sama sebelum dicek kelipatan 50 (pola yang sama dengan Wincor, yang sudah benar). Hasil: 2 marker replenish asli (02/07, 06/07) yang sebelumnya terbuang kini dikenali; REMAINING tidak lagi negatif di seluruh periode. DISPENSED tervalidasi 100% presisi terhadap laporan internal mesin. DEPOSITED presisi ~99.8% (selisih residual kecil, lihat bagian "Belum Tuntas" di bawah).

## 2. CRM Dinabold — kolom RETRACK diaktifkan
Baris RETRACK yang sebelumnya placeholder "0" sekarang menampilkan jumlah lembar riil, diambil dari kolom RETRACTS pada blok "CASH COUNTERS BEFORE SOP" milik marker penutup tiap periode (denominasi tidak diketahui dari log, jadi ditampilkan sebagai satu angka gabungan lembar, bukan per-100rb/50rb). Tampilan dipisah agak renggang dari tabel utama dan dibuat ringkas sesuai permintaan. Periode yang masih terbuka (belum ditutup replenish berikutnya) menampilkan "-".

## 3. CRM Hyosung — sengaja TIDAK diubah
Dicek: test-dispense SOP Hyosung tercatat di bagian log yang terpisah dan tidak mengurangi nilai ADD CASH, jadi validasi kelipatan-2000 yang ada saat ini sudah sesuai karakter mesin ini dan tetap dipertahankan.

## 4. CRM Oki — perbaikan menyeluruh (akar masalah rekonsiliasi salah di semua periode)
Tiga masalah independen ditemukan dan diperbaiki:
- **Duplikasi konten dalam 1 file**: file EJ Oki bisa berisi satu hari penuh yang ke-print dua kali (termasuk blok marker "Replenishment" dan laporan "---Settlement---"). Ditambahkan dedup khusus untuk blok-blok ini (fungsi `dedupOkyReplenishmentBlocks`), dan fitur dedup yang sebelumnya hanya aktif untuk upload multi-file sekarang juga berjalan untuk upload 1 file.
- **Offset jam 2 jam**: timestamp di struk transaksi (TANGGAL/WAKTU) terbukti konsisten tertinggal 2 jam dari jam perangkat keras mesin (2232 dari 2269 sampel = persis 120 menit), sementara batas periode (tsStart/tsEnd) berbasis jam perangkat keras — menyebabkan transaksi sah tersisih dari periode yang salah. Validasi periode Oki sekarang pakai jam mentah (`reconFindOkyTransactionTimestamp`), bukan struk.
- **Request vs Dispense**: saat kaset kehabisan di tengah transaksi, jumlah yang diminta ("Request Count") bisa lebih besar dari yang benar-benar keluar secara fisik ("Dispense Count") — REMAINING harus mengikuti fisik, bukan permintaan awal. Sekarang `calculateDISP` membaca "Dispense Count", bukan "Request Count".

Hasil: DISPENSED dan DEPOSITED cocok 100% persis dengan laporan settlement internal mesin di seluruh periode yang bisa diverifikasi.

## 5. Summary — Daily Rate (mean/median) hanya pakai periode penuh
Statistik mean/median pada kartu Daily Rate sebelumnya memakai seluruh hari kalender, termasuk hari-hari di luar periode yang benar-benar diapit 2 event RPL (mis. sebelum RPL pertama, atau setelah RPL terakhir yang belum ditutup replenish berikutnya). Sekarang mean/median hanya menghitung transaksi yang berada di dalam periode penuh (antara RPL pertama dan RPL terakhir dalam data). Grafik & tabel harian di atasnya tetap menampilkan semua hari apa adanya — filter ini hanya berlaku untuk mean/median, berlaku di semua mesin karena satu fungsi statistik dipakai bersama.

## 6. Grafik Nominal Harian — dikonfirmasi TIDAK diubah
Sempat diinvestigasi sebagai potensi bug ("saldo periode lama" tidak sama dengan sisa saldo hari sebelumnya di hari RPL), namun setelah dicek ulang oleh pemilik aplikasi, ini adalah perilaku yang disengaja (garis saldo memang mengikuti transaksi pada hari itu sebelum reset RPL, bukan otomatis carry-over). Tidak ada perubahan kode di bagian ini.

## 1b. CRM Dinabold — REPLENISH tidak lagi berkurang gara-gara reject/retrack (update)
Setelah dikonfirmasi lebih lanjut: nilai REPLENISH per marker sebelumnya memakai bacaan kaset AFTER SOP apa adanya (mis. 999, bukan 1000), padahal selisihnya sudah tercatat di REJECTS/RETRACTS blok yang sama dan uangnya masih di dalam mesin. Sekarang REJECTS+RETRACTS didistribusikan ke kaset yang belum kelipatan 50 (kaset yang sudah bulat, termasuk kaset nonaktif "0*", tidak disentuh) sebelum init100/init50 dihitung — jadi REPLENISH tidak lagi understated. Diverifikasi: pola 999→1000 dan 499→500 pada data asli sekarang menghasilkan REPLENISH bulat (mis. Rp150.000.000, bukan Rp149.950.000).


- Jendela pencocokan regex dedup transaksi (`STANDARD_TRX_DEDUP_REGEX`) diperlebar dari 800 ke 2000 karakter — beberapa transaksi setoran Oki punya field lebih panjang dari batas lama sehingga lolos tanpa dedup.
- `jalinAdminKeyResolver` diperbaiki — sebelumnya salah mengambil field timestamp placeholder ("0000-00-00 00:00:00") alih-alih timestamp kejadian asli, yang tanpa sengaja membuat marker replenish ATM Jalin yang sah dianggap duplikat dan terhapus begitu fitur dedup diaktifkan untuk upload 1 file. Sudah diperbaiki dan diverifikasi ulang terhadap data asli.

## Belum tuntas — mohon jadi perhatian
**CRM Dinabold, DEPOSITED**: masih ada selisih residual kecil (~3-5 lembar dari total ±2600 lembar per periode, atau ±0,2%) dibanding laporan internal mesin. DISPENSED sudah 100% presisi dengan mekanisme yang sama. Sudah dicoba pendekatan lain (anchor langsung ke "SERIAL NUMBERS SUCCESSFULLY STORED") namun itu justru menghitung juga upaya setor yang gagal/tidak dikonfirmasi (hasil jadi jauh lebih salah, ~2x lipat) sehingga di-revert. Root cause pasti dari selisih kecil ini belum ditemukan dalam waktu yang tersedia — direkomendasikan investigasi lanjutan sebelum dianggap final 100%.
