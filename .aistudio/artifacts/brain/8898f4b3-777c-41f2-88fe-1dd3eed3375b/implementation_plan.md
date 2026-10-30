# AutoWebP Pro — Automated Batch WebP Converter & Optimizer

Aplikasi penukar dan pemampat imej kelompok pintar yang menukar sebarang format imej (PNG, JPG, JPEG, GIF, AVIF, BMP, SVG) kepada WebP secara automatik dengan sokongan pengubahan saiz serentak, arkib ZIP segera, mod pemprosesan luar talian 100% dalam pelayar, pemberitahuan sistem, integrasi eksport awan (Google Drive), dan papan pemuka analitik penjimatan saiz.

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan maklum balas anda dalam fasa soal selidik, keputusan berikut telah disahkan dan ditetapkan sebagai asas reka bentuk:

- **Bahasa Antaramuka Disahkan**: Dwibahasa penuh (Bahasa Melayu & English) dengan penukar bahasa segera satu-klik di bar navigasi.
- **Profil Mampatan Disahkan**: Profil lalai Seimbang (*Balanced* - kualiti 80% dengan nisbah pemampatan saiz maksimum tanpa degradasi visual ketara), dengan pilihan Kualiti Maksimum (95%+) dan Mampatan Web (65%).
- **Kaedah Storan Awan & Muat Turun**: Pilihan muat turun ZIP kelompok berbilang fail, simpanan terus ke folder peranti (*File System Access API*), dan penyediaan eksport pintar ke Google Drive (muat naik terus atau sokongan Google Drive Web Picker/OAuth).

---

### 1. Overview & Core Concept

- **What It Does**: Membolehkan pengguna memuat naik pelbagai gambar serentak melalui seret-dan-lepas (*drag & drop*) atau pemilihan fail pantas, memproses penukaran format WebP dengan pemampatan adaptif secara kelompok dalam pelayar tanpa bergantung kepada pelayan luar, mengubah dimensi saiz (peratusan skala, lebar/tinggi maksimum, dimensi khusus), dan memuat turun hasil dalam format ZIP atau fail individu, serta menyimpan sejarah ke papan pemuka.
- **Target Audience / Persona**: Pereka web, pembangun perisian, pencipta kandungan, pengurus e-dagang, dan jurugambar yang memerlukan fail imej ringan, pantas, dan bersaiz kecil untuk prestasi laman web optimum.
- **Key Value**: 
  - **100% Privasi & Kepantasan Luar Talian**: Pemprosesan imej berlaku terus di dalam pelayar pengguna (*client-side HTML5 Canvas & Blob API*), menjimatkan kuota data, selamat tanpa penghantaran gambar peribadi ke pelayan luar, dan berfungsi sepenuhnya walaupun terputus sambungan internet (*offline-first*).
  - **Penjimatan Masa**: Pemprosesan berkelompok (*batch processing*) dengan status masa nyata, anggaran peratusan penjimatan saiz fail, dan muat turun pukal satu klik.
  - **Pemberitahuan Automatik**: Notifikasi desktop pelayar (*Web Notification API*) dan bunyi isyarat audio lembut apabila semua pemprosesan kelompok selesai.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Muat Naik Pantas (Quick Upload Zone)**:
   - Pengguna menyeret imej ke zon seret-lepas moden berjalur kemas atau klik untuk memilih fail (*supports multiple selection* & *folder drop*).
   - Pengguna juga boleh menampal imej terus daripada papan keratan (*Ctrl+V / Cmd+V paste*).
2. **Konfigurasi Kelompok (Batch Control Bar)**:
   - Peluncur Kualiti (*Quality Slider* 1–100%) dengan pratetap pintar (Seimbang 80%, Kualiti Tinggi 95%, Mampatan Web 65%).
   - Tetapan Saiz Semula Kelompok (*Batch Resize*): Pilihan asal (100%), skala peratus (75%, 50%, 25%), lebar tetap (cth. 1920px, 1280px, 800px), atau dimensi nisbah aspek dikekalkan (*lock aspect ratio*).
   - Tukar mod nama fail: Awalan/akhiran nama (cth: `nama-imej.webp` atau `nama-imej_min.webp`).
3. **Pemprosesan & Pemantauan Status (Live Progress Queue)**:
   - Paparan kad imej interaktif yang memaparkan: pratonton imej, saiz asal, saiz WebP yang terhasil, nisbah peratus penjimatan saiz (*bandwidth saved*), dan penunjuk status (*Menunggu*, *Sedang Memproses*, *Selesai*, *Ralat*).
   - Bar kemajuan utama (*Overall Progress Bar*) dengan peratusan keseluruhan kelompok.
4. **Pemberitahuan & Muat Turun**:
   - Apabila bar kemajuan mencecah 100%, sistem mencetuskan *Web Notification* dan audio ding pemberitahuan.
   - Pilihan tindakan: **Muat Turun Semua (ZIP)**, **Eksport ke Google Drive**, atau **Simpan ke Folder Peranti**.
5. **Papan Pemuka Sejarah (Conversion History & Analytics)**:
   - Ringkasan metrik: Jumlah fail diproses, jumlah megabait (MB) dijimatkan, dan purata peratus mampatan.
   - Jadual sejarah penukaran dengan fungsi carian, penapisan tarikh, muat turun semula daripada simpanan tempatan, dan pembersihan rekod.

#### Visual Identity & Theme
- **Aesthetic Direction**: *Precision Engineering SaaS Tool* — Minimalis, moden, dan fokus pada kejelasan data tanpa kekusutan visual.
- **Color Palette & Mood**:
  - Dominan Neutral (60%): Latar belakang bersih Slate/Zinc (`#0F172A` untuk mod gelap dan `#F8FAFC` untuk mod terang).
  - Permukaan Berstruktur (30%): Kad panel dengan sempadan halus (`border-slate-200 dark:border-slate-800`), kontras tinggi untuk teks.
  - Aksen Fokus (10%): Biru Kobalt / Emerald (`#2563EB` & `#10B981`) khusus untuk butang tindakan utama, status penjimatan hijau, dan bar kemajuan aktif.
- **Typography & Hierarchy**:
  - Tajuk & Penjenamaan: `Plus Jakarta Sans` / `Outfit` untuk struktur fon paparan moden dan kemas.
  - Teks Badan: `Public Sans` / `DM Sans` untuk kebolehbacaan optimum.
  - Data Numerik & Saiz Fail: Fon tabular monoruang (`tabular-nums font-mono`) untuk perbandingan saiz bait (KB/MB) yang tegak dan teratur.
- **Prinsip Bebas Slop (Anti-Slop Discipline)**:
  - Tiada butang berbentuk pil kapsul berulang-ulang untuk teks metadata statik (guna pemisah titik tengah `·`).
  - Tiada komen kod sintaks palsu seperti `// 01_CORE`.
  - Tiada indikator status buatan yang mengelirukan; hanya data pemprosesan sebenar.

---

### 3. Key Product Decisions & Trade-Offs

- **Pemprosesan Dalam Pelayar (Client-Side Canvas vs Server Processing)**:
  - *Pendekatan*: Menggunakan Web API standard pelayar (`HTMLCanvasElement.toBlob('image/webp', quality)` bersama `createImageBitmap`).
  - *Sebab*: Menepati kehendak sokongan luar talian 100%, sifar kos pengehosan pemprosesan imej, tiada kekangan saiz muat naik pelayan, dan privasi penuh kepada pengguna.
  - *Alternatif*: Penukaran pelayan dengan Sharp/ImageMagick ditolak kerana memerlukan sambungan internet berterusan dan memindahkan data pengguna.
- **Pengurusan Muat Turun ZIP Kelompok**:
  - *Pendekatan*: Pustaka `jszip` berprestasi tinggi untuk menjana arkib arkib ZIP secara tempatan di dalam pelayar dengan struktur nama fail teratur.
- **Integrasi Google Drive & Storan Awan**:
  - *Pendekatan*: Dwi-kaedah — butang muat naik terus ke Google Drive melalui Google Drive File Upload API / Web Share API / Google Picker, digabungkan dengan eksport fail tempatan melalui *File System Access API* (`showSaveFilePicker` / `showDirectoryPicker`) untuk peranti moden.
- **Penyimpanan Sejarah Penukaran**:
  - *Pendekatan*: Penyimpanan data transaksi dalam *IndexedDB* & *localStorage* pelayar supaya rekod sejarah tidak hilang apabila tab dimuat semula, lengkap dengan metadata saiz sebelum/selepas dan masa penukaran.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AutoWebP Pro Application Core                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
     ┌─────────────────────────────────┼─────────────────────────────────┐
     ▼                                 ▼                                 ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│     Top Navigation    │  │   Control Panel Hub   │  │   Offline & PWA SW    │
│  · Language Switcher  │  │  · Quality Slider     │  │  · Service Worker     │
│  · Theme Toggle       │  │  · Batch Resize Specs │  │  · Offline Asset Cache│
│  · PWA Install Button │  │  · Prefix/Suffix Rule │  │  · Notification API   │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Batch Upload & Drag-and-Drop Area                        │
│               (Files, Folders, Clipboard Paste & Multi-select)              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Client-Side Image Processing Queue                      │
│             (Canvas 2D / OffscreenCanvas / WebP Compression Pipeline)        │
│                                                                             │
│  Original File ──▶ ImageBitmap ──▶ Resize Matrix ──▶ WebP Blob (Quality)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
     ┌─────────────────────────────────┴─────────────────────────────────┐
     ▼                                                                   ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     Real-time Queue Monitor View     │  │    Conversion History Dashboard   │
│  · Individual File Status & Progress │  │  · Total MB Saved KPI             │
│  · Before vs After Size Ratio        │  │  · Total Files Processed KPI      │
│  · Action: Download, Preview, Remove │  │  · History Log & Search           │
└──────────────────┬───────────────────┘  └───────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Export & Delivery Engine                             │
│  · Batch ZIP Generation (JSZip)                                             │
│  · Direct Device Save (File System Access API)                              │
│  · Google Drive Export Flow & Web Share API                                 │
│  · Audio Ding & System Desktop Notification Dispatcher                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Komponen Utama:
1. `App.tsx`: Pengawal keadaan induk (*state controller*), pengurusan tema, dan pensuisan bahasa (BM / EN).
2. `components/Navbar.tsx`: Bar navigasi atas mematuhi kontrak 3-zon (Logo AutoWebP Pro, pautan navigasi ringkas, butang pasang PWA & pensuisan bahasa).
3. `components/Dropzone.tsx`: Zon muat naik pantas dengan sokongan seret-lepas, tampal *clipboard*, dan butang telusuri fail.
4. `components/ConversionSettings.tsx`: Panel kawalan mampatan WebP (kualiti 1–100%, saiz semula piksel/peratus, nama fail).
5. `components/QueueList.tsx`: Senarai barisan pemprosesan interaktif dengan kad fail, nisbah mampatan, dan butang pratonton perbandingan (Sebelum vs Selepas).
6. `components/DashboardHistory.tsx`: Papan pemuka analitik metrik (jumlah fail, jumlah penjimatan data, carta ringkasan saiz, dan log sejarah).
7. `components/ExportModal.tsx`: Dialog eksport pantas ke ZIP, simpan ke peranti, atau eksport ke storan awan (Google Drive).
8. `services/imageConverter.ts`: Enjin penukaran imej berasaskan *HTML5 Canvas* berkecekapan tinggi dengan sokongan pengubahan saiz berkadar.
9. `services/notificationService.ts`: Pengendali notifikasi desktop pelayar dan audio amaran apabila tugasan selesai.
10. `services/historyStorage.ts`: Pengurusan storan tempatan untuk rekod sejarah penukaran.
