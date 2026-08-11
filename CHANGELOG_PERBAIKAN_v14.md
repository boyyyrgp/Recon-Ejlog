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

## 9. CRM Dinabold, DEPOSITED — dikonfirmasi ulang 100% AKURAT (catatan "belum tuntas" sebelumnya SUDAH BASI, dihapus)
Setelah diberi sample EJ log Dinabold asli (`EJ_Dinabold.jrn`, ~408rb baris), catatan "belum tuntas" sebelumnya (selisih residual ~3-5 lembar) diuji ulang secara empiris — bukan cuma dipercaya dari dokumentasi lama. `calculateDISP`/`calculateDEP` yang ADA SEKARANG dicocokkan ke 3 laporan "cash count" asli (ground truth, lengkap dgn field INIT/DISP/DEP/CST):

| Periode | DISP (aplikasi) | DISP (laporan asli) | DEP (aplikasi) | DEP (laporan asli) |
|---|---|---|---|---|
| 01/07→02/07 | 337.750.000 | 337.750.000 | 223.350.000 | 223.350.000 |
| 02/07→04/07 | 518.300.000 | 518.300.000 | 403.200.000 | 403.200.000 |
| 04/07→06/07 | 444.950.000 | 444.950.000 | 351.600.000 | 351.600.000 |

**Cocok 100% persis di ketiganya.** Dikonfirmasi oleh pemilik aplikasi: selisih lama itu terjadi SEBELUM fix REJECTS/RETRACTS→REPLENISH (bagian 1b) diterapkan; setelah fix itu, hasilnya sudah akurat. Catatan "belum tuntas" untuk Dinabold DEPOSITED (termasuk seluruh spekulasi root-cause di update sebelumnya) **dihapus** dari bagian "Belum tuntas" karena sudah basi dan tidak relevan lagi.

## 10. CRM Oki — bug "periode hantu" (marker Replenishment terduplikasi) diperbaiki
Ditemukan saat audit dgn EJ log Oki asli: 2 marker "Replenishment" (baris ~17759 & ~59532, terpaut 41.773 baris) punya `Serial No.` DAN `Date:` yang PERSIS SAMA (`000012`, `19/07/2026 13:17:30`). Dibuktikan lewat pencarian transaksi spesifik (jam 10:36:11 & 11:00:56 tanggal 19/07 masing-masing muncul 2x di file, di baris berbeda jauh) — ini blok yang keduplikasi utuh di file (kemungkinan artefak saat file diekspor/disiapkan), bukan 2 replenishment nyata.

Sebelum fix: karena kedua marker punya timestamp identik, lebar periode di antaranya jadi nol secara matematis — pengaman jam yg sudah ada (`reconIsWithinPeriod`) otomatis menolak seluruh transaksi duplikat itu (jadi TIDAK ada uang yang kehitung dobel), tapi tombol periode kosong (`19/07/26 - 19/07/26`, isi Rp0 semua) tetap muncul di UI dan membingungkan.

**Fix**: `findValidMarkers` sekarang mendeteksi marker dgn timestamp PERSIS sama (sampai ke detik) dgn marker sebelumnya, dan men-skip-nya total — tidak dianggap batas periode baru. Diverifikasi ulang: periode "hantu" itu sekarang tidak lagi muncul; periode-periode lain tetap menghasilkan angka yang sama persis seperti sebelum fix (DISP/DEP 3 periode nyata masih cocok 100% ke laporan Settlement asli).

## 11. RETRACK — ditambahkan untuk CRM Oki & CRM Hyosung (CRM Dinabold sudah lebih dulu punya)
Fitur murni informasi, TIDAK menyentuh rumus REM=INIT−DISP+DEP sama sekali (sesuai arahan eksplisit pemilik aplikasi). Menampilkan tally retrack (lembar notes yang sempat keluar/diproses tapi ditarik balik ke mesin) per periode, diambil dari laporan kunjungan BERIKUTNYA (prinsip sama persis dgn `dnRetrackLembar` milik Dinabold yang sudah ada sebelumnya) — periode yang masih berjalan (belum ada penutup) tampil "-".

- **CRM Oki**: sumber baris `RET` pada laporan `---Settlement---`. Kebetulan ada rincian per-denominasi (tabel `NO DENOM REM+DPC+RET=TOTAL`), jadi ditampilkan **lembar sekaligus rupiah**. Catatan: di sample log yang tersedia, nilai RET selalu 0 di seluruh file — logika parsing sudah dibangun sesuai format yang jelas teramati, tapi belum tervalidasi terhadap kasus nilai non-zero riil.
- **CRM Hyosung**: sumber `RETRACT CASSETTE COUNT` + blok `[RETRACT CASSETTE]` pada laporan Print Cash. Sama seperti Oki, py rincian denominasi lengkap sehingga **lembar sekaligus rupiah**. Ada 1 contoh nilai non-zero nyata di sample log (1 lembar Rp100.000, 26/07/2026) yang dipakai memvalidasi format parsing-nya.
- **CRM Dinabold**: tidak ada perubahan (`dnRetrackLembar` sudah berfungsi sebelumnya) — bedanya, Dinabold cuma bisa lembar (field `RETRACTS:` tidak merinci denominasi), sementara Oki & Hyosung bisa lembar+rupiah karena laporannya lebih detail.

## Belum tuntas — mohon jadi perhatian
- **CRM Oki, retrack**: parsing sudah dibangun mengikuti format yang jelas teramati di laporan Settlement, tapi belum ada 1 pun contoh nilai non-zero di sample log yang tersedia untuk memvalidasi penuh. Kalau ada log Oki lain dengan retrack yang benar-benar terjadi, sebaiknya divalidasi ulang.
- Tidak ada item terbuka lain per pembaruan changelog ini — CRM Hitachi, Oki (DISP/DEP), Dinabold (DISP/DEP), dan Hyosung (DISP/DEP) semuanya sudah diverifikasi 100% akurat terhadap laporan ground truth internal masing-masing log yang tersedia.
