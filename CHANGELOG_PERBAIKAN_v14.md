# Changelog Perbaikan — REKONSILIATOR v14

Ringkasan seluruh perbaikan pada sesi ini. Diverifikasi terhadap EJ log asli (Dinabold, Hitachi, Oki, Wincor, Hyosung, NCR, Jalin, CRM Hyosung) via harness Node.js + jsdom, dan dicocokkan terhadap laporan settlement/internal milik mesin sendiri sebagai ground truth di mana tersedia.

## 1. CRM Dinabold — validasi periode & REPLENISH (akar masalah REMAINING negatif)
`findValidMarkers()` sebelumnya menolak marker CLEAR CASH+SOP kalau salah satu dari 4 nilai kaset AFTER SOP tidak bulat kelipatan 50 — padahal test-dispense teknisi saat SOP membuat sebagian uang "hilang" ke REJECTS/RETRACTS (uangnya tetap di dalam mesin). Sekarang validasi menjumlahkan 4 nilai kaset + REJECTS + RETRACTS dari blok yang sama sebelum dicek kelipatan 50 (pola yang sama dengan Wincor, yang sudah benar). Hasil: 2 marker replenish asli (02/07, 06/07) yang sebelumnya terbuang kini dikenali; REMAINING tidak lagi negatif di seluruh periode. DISPENSED tervalidasi 100% presisi terhadap laporan internal mesin. DEPOSITED presisi ~99.8% (selisih residual kecil, lihat bagian "Belum Tuntas" di bawah).

## 2. CRM Dinabold — kolom RETRACK diaktifkan
Baris RETRACK yang sebelumnya placeholder "0" sekarang menampilkan jumlah lembar riil, diambil dari kolom RETRACTS pada blok "CASH COUNTERS BEFORE SOP" milik marker penutup tiap periode (denominasi tidak diketahui dari log, jadi ditampilkan sebagai satu angka gabungan lembar, bukan per-100rb/50rb). Tampilan dipisah agak renggang dari tabel utama dan dibuat ringkas sesuai permintaan. Periode yang masih terbuka (belum ditutup replenish berikutnya) menampilkan "-".

## 3. ATM Hyosung — sengaja TIDAK diubah
Dicek: test-dispense SOP Hyosung tercatat di bagian log yang terpisah dan tidak mengurangi nilai ADD CASH, jadi validasi kelipatan-2000 yang ada saat ini sudah sesuai karakter mesin ini dan tetap dipertahankan. *(Catatan: judul asli entri ini adalah "CRM Hyosung" — sudah diluruskan menjadi "ATM Hyosung" karena kini ada CRM Hyosung sungguhan, lihat bagian 7 di bawah, dan penamaan lama berpotensi membingungkan.)*

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

## 7. CRM Hyosung — mesin ke-8 ditambahkan (modul baru, terisolasi penuh)
Dianalisis langsung dari sample EJ log asli (`EJ_CRM_Hyosung.jrn`, 8 hari data, ~305rb baris, 5 event ADD CASH/4 periode tertutup + 1 periode berjalan). Struktur log memang mirip ATM Hyosung seperti dugaan awal (marker "ADD CASH:" bare label, jam mentah di baris sebelumnya, baris kaset "NCST:jumlah"), tapi dua hal krusial BERBEDA dan disesuaikan:
- **Konvensi kaset**: mengikuti aturan CRM yang sudah baku di aplikasi ini (SAMA seperti Hitachi/Dinabold/Oki) — kaset 1&2 = IDR100.000, kaset 3&4 = IDR50.000 — dikonfirmasi eksplisit oleh pemilik aplikasi DAN tervalidasi dari data asli (baris "RCY IDR 100K"/"RCY IDR 50K" pada laporan "Print Cash" milik log itu sendiri). TIDAK memakai deteksi 1-denominasi-per-mesin ala ATM Hyosung.
- **Format DEPOSIT berbeda dari Hitachi/Oki**: bukan baris "Stored Count" tunggal + lookahead "[100000,N]"/"[50000,N]", melainkan sudah bracket 4-kolom langsung dalam 1 baris: `Store Count [c1,c2,c3,c4]`.

Dispense pakai "Dispense Count" (fisik riil), sama seperti fix presisi lembar Oki. Timestamp tsStart/tsEnd dan validasi tiap transaksi konsisten sama-sama pakai jam mentah (bukan struk TANGGAL/WAKTU), mengikuti pelajaran dari fix Oki di atas.

Hasil: DISPENSED tervalidasi 100% cocok persis dengan laporan "Print Cash" internal log di 4 periode yang bisa diverifikasi. DEPOSITED lihat catatan di bagian "Belum tuntas" di bawah.

UI/UX halaman baru (dropzone, input fisik per-denominasi, tabel, list transaksi, tombol SUMMARY) mengikuti struktur baku CRM (kloning dari halaman Oki) sesuai permintaan pemilik aplikasi. Kartu navigasinya diletakkan sejajar 3 CRM lain dalam 1 baris tersendiri full-width (4 kartu, simetris & rata tengah, sedikit lebih lebar dari kartu ATM secara proporsional).

## 8. CRM Hyosung, DEPOSITED — REVISI ke presisi 100% (setelah investigasi bersama user)
Implementasi awal (lihat bagian 7) memakai "Store Count [c1,c2,c3,c4]" dan terbukti UNDERCOUNT: field ini hanya mencatat lembar yang berhasil masuk ke kaset 1-4, tidak termasuk lembar yang disortir mesin ke kaset "MIX" (kondisi lembar kurang sempurna, tetap sah sebagai setoran nasabah). Dibuktikan dari transaksi nyata: `AMOUNT: RP 2.850.000` pada struk, tapi `Store Count [02,00,00,00]` cuma mencatat Rp200.000 — selisihnya (Rp2.650.000) persis sama dengan field `[MIX CASSETTE]` periode tsb.

**Percobaan fix pertama** (anchor ke `Host Store: Stored` + `IDR100000:N`/`IDR50000:N`, breakdown lengkap termasuk MIX) awalnya masih meleset karena baris ini bisa muncul lebih dari sekali per transaksi. Sempat disangka murni duplikat/echo (skip semua kecuali satu), tapi **user mengoreksi**: bisa jadi juga batch store yang genuinely berbeda dalam satu sesi nasabah (ada limit lembar per-batch), jadi tidak boleh main-skip.

**Fix final** (arahan user): pakai daftar serial number di bawah "Stored Note" sebagai kunci dedup — kalau dua blok `Host Store: Stored` punya serial number identik, itu echo dari batch yang sama (hitung 1x); kalau beda, itu batch yang genuinely berbeda (hitung semua). Ditemukan juga kasus tepi: blok `Host Store: Stored` yang TIDAK diikuti "Stored Note" sama sekali ternyata transaksi yang gagal & di-retract (ada kasus nyata "Host Communication Down" → "Reset" → "Notes retracted:") — uangnya tidak jadi masuk, jadi dikecualikan dari hitungan.

**Hasil: cocok 100% persis ke rupiah di ke-4 periode yang diuji** (sebelumnya di bagian 7 masih ada selisih 0,05%-1,5%). DISPENSED tetap 100% presisi seperti sebelumnya. Status "belum tuntas" untuk CRM Hyosung DEPOSITED (yang tadinya tercatat di bagian bawah) sudah **selesai**, tidak berlaku lagi.

## Belum tuntas — mohon jadi perhatian
**CRM Dinabold, DEPOSITED**: masih ada selisih residual kecil (~3-5 lembar dari total ±2600 lembar per periode, atau ±0,2%) dibanding laporan internal mesin. DISPENSED sudah 100% presisi dengan mekanisme yang sama. Sudah dicoba pendekatan lain (anchor langsung ke "SERIAL NUMBERS SUCCESSFULLY STORED") namun itu justru menghitung juga upaya setor yang gagal/tidak dikonfirmasi (hasil jadi jauh lebih salah, ~2x lipat) sehingga di-revert. Root cause pasti dari selisih kecil ini belum ditemukan dalam waktu yang tersedia — direkomendasikan investigasi lanjutan sebelum dianggap final 100%. *(Catatan: pola bug di Dinabold ini KEMUNGKINAN mirip akar masalah CRM Hyosung di atas — mungkin juga butuh anchor + dedup berbasis serial number, bukan field ringkasan. Belum dicoba ulang dengan pendekatan ini.)*
