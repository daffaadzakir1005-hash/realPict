/**
 * RealPict - Forensik Foto Digital & Deteksi AI
 * Client-side Controller & Interactive Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. Navigation & Tab Routing System
    // ---------------------------------------------------------
    const navLinks = document.querySelectorAll('.nav-link, .footer-link, [data-tab-target]');
    const pageTabs = document.querySelectorAll('.page-tab');

    function switchTab(tabId) {
        // Normalize tab id
        const targetId = tabId.replace('#', '');
        const targetElement = document.getElementById(`tab-${targetId}`);

        if (!targetElement) return;

        // Hide all tabs
        pageTabs.forEach(tab => {
            tab.classList.remove('active-tab');
        });

        // Show target tab
        targetElement.classList.add('active-tab');

        // Update nav pills
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-tab') === targetId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update URL hash without jumping
        if (history.pushState) {
            history.pushState(null, null, `#${targetId}`);
        } else {
            location.hash = `#${targetId}`;
        }

        // Scroll to top of content smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Attach click listeners to all tab links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.getAttribute('data-tab') || link.getAttribute('data-tab-target');
            if (tab) {
                switchTab(tab);
            }
        });
    });

    // Check initial hash on load
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && document.getElementById(`tab-${initialHash}`)) {
        switchTab(initialHash);
    }

    window.addEventListener('popstate', () => {
        const currentHash = window.location.hash.replace('#', '') || 'beranda';
        if (document.getElementById(`tab-${currentHash}`)) {
            switchTab(currentHash);
        }
    });

    // ---------------------------------------------------------
    // 2. SVG Donut Chart Animator Helper
    // ---------------------------------------------------------
    function updateDonutChart(svgArc, textPercent, percent, isAiVerdict = false) {
        const circumference = 2 * Math.PI * 52; // r=52 -> ~326.72
        const offset = circumference - (percent / 100) * circumference;

        svgArc.style.strokeDasharray = `${circumference} ${circumference}`;
        svgArc.style.strokeDashoffset = offset;

        // Color coding
        if (percent > 65) {
            svgArc.style.stroke = '#ef4444'; // Red
        } else if (percent > 30) {
            svgArc.style.stroke = '#f59e0b'; // Amber/Yellow
        } else {
            svgArc.style.stroke = '#86efac'; // Emerald/Green
        }

        // Animate counter
        let start = 0;
        const duration = 600;
        const stepTime = 15;
        const totalSteps = duration / stepTime;
        const increment = percent / totalSteps;

        const counter = setInterval(() => {
            start += increment;
            if (start >= percent) {
                textPercent.textContent = `${percent}%`;
                clearInterval(counter);
            } else {
                textPercent.textContent = `${Math.round(start)}%`;
            }
        }, stepTime);
    }

    // Initialize Hero Donut
    const heroArc = document.getElementById('heroDonutArc');
    const heroPercentText = document.getElementById('heroDonutPercent');
    if (heroArc && heroPercentText) {
        updateDonutChart(heroArc, heroPercentText, 12);
    }

    // ---------------------------------------------------------
    // 3. Cek Foto (Single Check) Logic
    // ---------------------------------------------------------
    const singleDropzone = document.getElementById('singleDropzone');
    const singleFileInput = document.getElementById('singleFileInput');
    const singleScanOverlay = document.getElementById('singleScanOverlay');
    const singleResultCard = document.getElementById('singleResultCard');
    const scanStatusText = document.getElementById('scanStatusText');
    const scanStepText = document.getElementById('scanStepText');

    if (singleDropzone && singleFileInput) {
        singleDropzone.addEventListener('click', () => singleFileInput.click());

        singleDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            singleDropzone.classList.add('dragover');
        });

        singleDropzone.addEventListener('dragleave', () => {
            singleDropzone.classList.remove('dragover');
        });

        singleDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            singleDropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleSingleFile(e.dataTransfer.files[0]);
            }
        });

        singleFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleSingleFile(e.target.files[0]);
            }
        });
    }

    const scanSteps = [
        "Membaca struktur biner file gambar...",
        "Menghubungi model AI Hugging Face (Vision Classifier)...",
        "Menganalisis pola distribusi piksel & artefak difusi...",
        "Memeriksa keaslian metadata EXIF & header sensor kamera...",
        "Mengalkulasi skor probabilitas AI vs RealPic..."
    ];

    function handleSingleFile(file) {
        // Validate type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showToast('Format file tidak didukung. Harap pilih JPG, PNG, atau WEBP.', 'error');
            return;
        }

        // Show scanning state
        singleDropzone.style.display = 'none';
        singleResultCard.style.display = 'none';
        singleScanOverlay.style.display = 'block';

        let stepIndex = 0;
        scanStatusText.textContent = `Memindai "${file.name}"...`;
        scanStepText.textContent = scanSteps[0];

        const stepInterval = setInterval(() => {
            stepIndex++;
            if (stepIndex < scanSteps.length) {
                scanStepText.textContent = scanSteps[stepIndex];
            } else {
                clearInterval(stepInterval);
            }
        }, 320);

        // Upload and analyze via PHP backend
        const formData = new FormData();
        formData.append('image', file);

        // Create local object URL for preview
        const previewUrl = URL.createObjectURL(file);

        fetch('api/analyze.php', {
            method: 'POST',
            body: formData
        })
            .then(res => res.json())
            .then(data => {
                setTimeout(() => {
                    clearInterval(stepInterval);
                    singleScanOverlay.style.display = 'none';

                    if (data.status === 'success') {
                        displaySingleResult(data, previewUrl);
                    } else {
                        singleDropzone.style.display = 'flex';
                        showToast(data.message || 'Gagal menganalisis file.', 'error');
                    }
                }, 1200);
            })
            .catch(err => {
                clearInterval(stepInterval);
                singleScanOverlay.style.display = 'none';
                singleDropzone.style.display = 'flex';
                showToast('Terjadi gangguan jaringan saat memproses gambar.', 'error');
            });
    }

    function displaySingleResult(data, previewUrl) {
        singleResultCard.style.display = 'block';
        singleDropzone.style.display = 'none';

        // Set Preview
        const previewImg = document.getElementById('singlePreviewImg');
        if (previewImg) previewImg.src = previewUrl;

        // Set basic file info
        document.getElementById('resultFileName').textContent = data.file_name;
        document.getElementById('resultDimensions').textContent = data.dimensions;
        document.getElementById('resultFileSize').textContent = data.file_size_formatted;

        // Set Verdict Badge
        const verdictBadge = document.getElementById('resultVerdictBadge');
        verdictBadge.textContent = data.status_label;
        verdictBadge.className = 'result-verdict ' + (
            data.status_type === 'real' ? 'verdict-real' :
                data.status_type === 'ai' || data.status_type === 'suspect' ? 'verdict-ai' : 'verdict-edited'
        );

        // Set Donut
        const resultArc = document.getElementById('resultDonutArc');
        const resultPercent = document.getElementById('resultDonutPercent');
        updateDonutChart(resultArc, resultPercent, data.ai_percentage);

        // Set Summary
        document.getElementById('resultSummaryText').textContent = data.summary;

        // Set Progress Bars
        updateBar('barPolaPiksel', 'valPolaPiksel', data.metrics.pola_piksel);
        updateBar('barMetadata', 'valMetadata', data.metrics.metadata);
        updateBar('barNoise', 'valNoise', data.metrics.noise_pattern);
        updateBar('barStruktur', 'valStruktur', data.metrics.struktur_gambar);

        // Set EXIF Table
        document.getElementById('exifKamera').textContent = data.camera;
        document.getElementById('exifSoftware').textContent = data.software;
        document.getElementById('exifTanggal').textContent = data.date_taken;
        document.getElementById('exifResolusi').textContent = data.dimensions;

        // Findings list
        const findingsList = document.getElementById('resultFindingsList');
        if (findingsList) {
            findingsList.innerHTML = '';
            if (data.findings && data.findings.length > 0) {
                data.findings.forEach(f => {
                    const li = document.createElement('li');
                    li.textContent = f;
                    li.style.color = '#cbd5e1';
                    li.style.fontSize = '0.85rem';
                    li.style.marginBottom = '4px';
                    findingsList.appendChild(li);
                });
            }
        }
    }

    function updateBar(barId, valId, percent) {
        const bar = document.getElementById(barId);
        const val = document.getElementById(valId);
        if (bar && val) {
            bar.style.width = `${percent}%`;
            val.textContent = `${percent}%`;

            if (percent > 65) {
                bar.style.backgroundColor = '#ef4444';
            } else if (percent > 30) {
                bar.style.backgroundColor = '#f59e0b';
            } else {
                bar.style.backgroundColor = '#86efac';
            }
        }
    }

    // Reset button for Cek Foto
    const btnResetSingle = document.getElementById('btnResetSingle');
    if (btnResetSingle) {
        btnResetSingle.addEventListener('click', () => {
            singleResultCard.style.display = 'none';
            singleDropzone.style.display = 'flex';
            if (singleFileInput) singleFileInput.value = '';
        });
    }

    // ---------------------------------------------------------
    // 4. Upload Massal (Batch Audit - Output Langsung di Web)
    // ---------------------------------------------------------
    const massalDropzone = document.getElementById('massalDropzone');
    const massalFileInput = document.getElementById('massalFileInput');
    const batchContainer = document.getElementById('batchContainer');
    const batchProgressBar = document.getElementById('batchProgressInner');
    const batchProgressText = document.getElementById('batchProgressText');
    const batchTableBody = document.getElementById('batchTableBody');
    const batchSummarySection = document.getElementById('batchSummarySection');
    const btnResetBatch = document.getElementById('btnResetBatch');

    // Batch Detail Modal Elements
    const batchDetailModal = document.getElementById('batchDetailModal');
    const btnModalClose = document.getElementById('btnModalClose');
    const modalBatchImg = document.getElementById('modalBatchImg');
    const modalBatchFileName = document.getElementById('modalBatchFileName');
    const modalBatchDimensions = document.getElementById('modalBatchDimensions');
    const modalBatchFileSize = document.getElementById('modalBatchFileSize');
    const modalBatchVerdict = document.getElementById('modalBatchVerdict');
    const modalBatchDonutArc = document.getElementById('modalBatchDonutArc');
    const modalBatchDonutPercent = document.getElementById('modalBatchDonutPercent');
    const modalBatchSummary = document.getElementById('modalBatchSummary');
    const modalBatchFindings = document.getElementById('modalBatchFindings');

    let batchItems = [];

    if (massalDropzone && massalFileInput) {
        massalDropzone.addEventListener('click', () => massalFileInput.click());

        massalDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            massalDropzone.classList.add('dragover');
        });

        massalDropzone.addEventListener('dragleave', () => {
            massalDropzone.classList.remove('dragover');
        });

        massalDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            massalDropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleBatchFiles(Array.from(e.dataTransfer.files));
            }
        });

        massalFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleBatchFiles(Array.from(e.target.files));
            }
        });
    }

    async function handleBatchFiles(files) {
        const imageFiles = files.filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type));

        if (imageFiles.length === 0) {
            showToast('Tidak ada file gambar valid (JPG, PNG, WEBP) yang dipilih.', 'error');
            return;
        }

        // Setup UI
        massalDropzone.style.display = 'none';
        batchContainer.style.display = 'block';
        batchTableBody.innerHTML = '';
        if (batchSummarySection) batchSummarySection.style.display = 'none';
        if (btnResetBatch) btnResetBatch.style.display = 'none';
        batchItems = [];

        const total = imageFiles.length;
        let completed = 0;

        batchProgressText.textContent = `Memproses 0 dari ${total} file...`;
        batchProgressBar.style.width = '0%';

        for (let i = 0; i < total; i++) {
            const file = imageFiles[i];
            const previewUrl = URL.createObjectURL(file);

            // Add skeleton row
            const rowId = `batch-row-${i}`;
            const row = document.createElement('tr');
            row.id = rowId;
            row.className = 'batch-row';
            row.innerHTML = `
                <td style="width: 60px;">
                    <img src="${previewUrl}" class="batch-thumb" alt="preview">
                </td>
                <td>
                    <div style="font-weight: 600; color: #fff;">${file.name}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${(file.size / 1024).toFixed(1)} KB</div>
                </td>
                <td style="width: 220px;">
                    <span style="font-size: 0.8rem; color: #94a3b8;">Sedang menganalisis forensik...</span>
                </td>
                <td style="width: 140px; text-align: center;">
                    <div class="status-dot" style="display: inline-block;"></div>
                </td>
                <td style="width: 130px; text-align: right;">
                    <span style="font-size: 0.75rem; color: #64748b;">Memproses...</span>
                </td>
            `;
            batchTableBody.appendChild(row);

            // Send to analyze.php
            const formData = new FormData();
            formData.append('image', file);

            try {
                const res = await fetch('api/analyze.php', { method: 'POST', body: formData });
                if (!res.ok) {
                    throw new Error(`Server error (${res.status})`);
                }
                const data = await res.json();

                completed++;
                const percentDone = Math.round((completed / total) * 100);
                batchProgressBar.style.width = `${percentDone}%`;
                batchProgressText.textContent = `Selesai ${completed} dari ${total} foto (${percentDone}%)`;

                if (data.status === 'success') {
                    const itemIndex = batchItems.length;
                    batchItems.push({ data: data, previewUrl: previewUrl });
                    updateBatchRow(rowId, data, itemIndex);
                } else {
                    document.getElementById(rowId).innerHTML = `
                        <td><img src="${previewUrl}" class="batch-thumb" alt="preview"></td>
                        <td><div style="color: #fff;">${file.name}</div></td>
                        <td colspan="3" style="color: #ef4444; font-size: 0.8rem;">${data.message || 'Gagal menganalisis file'}</td>
                    `;
                }
            } catch (err) {
                completed++;
                const percentDone = Math.round((completed / total) * 100);
                batchProgressBar.style.width = `${percentDone}%`;
                batchProgressText.textContent = `Selesai ${completed} dari ${total} foto (${percentDone}%)`;
                const rowEl = document.getElementById(rowId);
                if (rowEl) {
                    rowEl.innerHTML = `
                        <td><img src="${previewUrl}" class="batch-thumb" alt="preview"></td>
                        <td><div style="color: #fff;">${file.name}</div></td>
                        <td colspan="3" style="color: #ef4444; font-size: 0.8rem;">Gagal menganalisis file (${err.message || 'Kesalahan jaringan'})</td>
                    `;
                }
            }
        }

        // Summary calculations
        let aiCount = 0;
        let realCount = 0;
        let suspectCount = 0;

        batchItems.forEach(item => {
            if (item.data.status_type === 'real') {
                realCount++;
            } else if (item.data.ai_percentage > 50 || item.data.status_type === 'ai') {
                aiCount++;
            } else {
                suspectCount++;
            }
        });

        if (batchSummarySection) {
            document.getElementById('batchStatTotal').textContent = batchItems.length;
            document.getElementById('batchStatAi').textContent = aiCount;
            document.getElementById('batchStatReal').textContent = realCount;
            document.getElementById('batchStatSuspect').textContent = suspectCount;
            batchSummarySection.style.display = 'grid';
        }

        if (btnResetBatch) {
            btnResetBatch.style.display = 'inline-block';
        }

        showToast(`Audit massal ${completed} foto selesai! Hasil dapat dilihat langsung di bawah.`, 'success');
    }

    function updateBatchRow(rowId, data, index) {
        const row = document.getElementById(rowId);
        if (!row) return;

        const isAi = data.ai_percentage > 50;
        const badgeColor = data.status_type === 'real' ? '#34d399' : (isAi ? '#f87171' : '#fbbf24');
        const badgeBg = data.status_type === 'real' ? 'rgba(16, 185, 129, 0.15)' : (isAi ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)');
        const existingImg = row.querySelector('img');
        const imgSrc = existingImg ? existingImg.src : '';
        const shortStatus = (data.status_label || 'TERINDIKASI').split(' ')[0];

        row.innerHTML = `
            <td style="width: 60px;">
                <img src="${imgSrc}" class="batch-thumb" alt="preview" style="cursor: pointer;" onclick="window.viewBatchDetail(${index})">
            </td>
            <td>
                <div style="font-weight: 600; color: #fff;">${data.file_name}</div>
                <div style="font-size: 0.75rem; color: #64748b;">${data.dimensions} · ${data.file_size_formatted}</div>
            </td>
            <td style="width: 220px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                    <span style="color: #94a3b8;">Probabilitas AI</span>
                    <span style="color: #fff; font-weight: 600;">${data.ai_percentage}%</span>
                </div>
                <div class="progress-track" style="height: 6px;">
                    <div class="progress-fill" style="width: ${data.ai_percentage}%; background-color: ${badgeColor};"></div>
                </div>
            </td>
            <td style="width: 140px; text-align: center;">
                <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}40; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; display: inline-block;">
                    ${shortStatus}
                </span>
            </td>
            <td style="width: 130px; text-align: right;">
                <button type="button" class="btn btn-secondary" style="padding: 5px 12px; font-size: 0.75rem;" onclick="window.viewBatchDetail(${index})">
                    🔍 Detail
                </button>
            </td>
        `;
    }

    // Modal popup logic for batch detail view
    window.viewBatchDetail = function(index) {
        const item = batchItems[index];
        if (!item || !batchDetailModal) return;

        const data = item.data;

        // Preview Image & Info
        if (modalBatchImg) modalBatchImg.src = item.previewUrl;
        if (modalBatchFileName) modalBatchFileName.textContent = data.file_name;
        if (modalBatchDimensions) modalBatchDimensions.textContent = data.dimensions;
        if (modalBatchFileSize) modalBatchFileSize.textContent = data.file_size_formatted;

        // Verdict Badge
        if (modalBatchVerdict) {
            modalBatchVerdict.textContent = data.status_label;
            modalBatchVerdict.className = 'result-verdict ' + (
                data.status_type === 'real' ? 'verdict-real' :
                    data.status_type === 'ai' || data.status_type === 'suspect' ? 'verdict-ai' : 'verdict-edited'
            );
        }

        // Donut Chart
        if (modalBatchDonutArc && modalBatchDonutPercent) {
            updateDonutChart(modalBatchDonutArc, modalBatchDonutPercent, data.ai_percentage);
        }

        // Summary
        if (modalBatchSummary) modalBatchSummary.textContent = data.summary;

        // 4 Indicators
        updateBar('modalBarPolaPiksel', 'modalValPolaPiksel', data.metrics.pola_piksel);
        updateBar('modalBarMetadata', 'modalValMetadata', data.metrics.metadata);
        updateBar('modalBarNoise', 'modalValNoise', data.metrics.noise_pattern);
        updateBar('modalBarStruktur', 'modalValStruktur', data.metrics.struktur_gambar);

        // Technical EXIF
        const elKamera = document.getElementById('modalExifKamera');
        const elSoftware = document.getElementById('modalExifSoftware');
        const elTanggal = document.getElementById('modalExifTanggal');
        const elDimensi = document.getElementById('modalExifDimensi');

        if (elKamera) elKamera.textContent = data.camera || 'Tidak ada data EXIF';
        if (elSoftware) elSoftware.textContent = data.software || 'Tidak terdeteksi';
        if (elTanggal) elTanggal.textContent = data.date_taken || '-';
        if (elDimensi) elDimensi.textContent = data.dimensions || '-';

        // Findings
        if (modalBatchFindings) {
            modalBatchFindings.innerHTML = '';
            if (data.findings && data.findings.length > 0) {
                data.findings.forEach(f => {
                    const li = document.createElement('li');
                    li.textContent = f;
                    li.style.color = '#cbd5e1';
                    li.style.fontSize = '0.8rem';
                    li.style.marginBottom = '4px';
                    modalBatchFindings.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'Tidak ditemukan anomali signifikan pada struktur file.';
                li.style.color = '#94a3b8';
                li.style.fontSize = '0.8rem';
                modalBatchFindings.appendChild(li);
            }
        }

        // Show modal
        batchDetailModal.classList.add('active');
    };

    function closeBatchModal() {
        if (batchDetailModal) {
            batchDetailModal.classList.remove('active');
        }
    }

    if (btnModalClose) {
        btnModalClose.addEventListener('click', closeBatchModal);
    }

    if (batchDetailModal) {
        batchDetailModal.addEventListener('click', (e) => {
            if (e.target === batchDetailModal) {
                closeBatchModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && batchDetailModal && batchDetailModal.classList.contains('active')) {
            closeBatchModal();
        }
    });

    // Reset Batch Button
    if (btnResetBatch) {
        btnResetBatch.addEventListener('click', () => {
            batchContainer.style.display = 'none';
            massalDropzone.style.display = 'flex';
            if (massalFileInput) massalFileInput.value = '';
            batchItems = [];
            batchTableBody.innerHTML = '';
            if (batchSummarySection) batchSummarySection.style.display = 'none';
            btnResetBatch.style.display = 'none';
        });
    }

    // ---------------------------------------------------------
    // 5. Laporan Form Logic
    // ---------------------------------------------------------
    const reportDropzone = document.getElementById('reportDropzone');
    const reportFileInput = document.getElementById('reportFileInput');
    const reportPreviewContainer = document.getElementById('reportPreviewContainer');
    const reportPreviewImg = document.getElementById('reportPreviewImg');
    const reportForm = document.getElementById('reportForm');
    const btnSubmitReport = document.getElementById('btnSubmitReport');
    const reportsListContainer = document.getElementById('reportsListContainer');

    let currentReportFile = null;

    if (reportDropzone && reportFileInput) {
        reportDropzone.addEventListener('click', () => reportFileInput.click());

        reportDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            reportDropzone.classList.add('dragover');
        });

        reportDropzone.addEventListener('dragleave', () => {
            reportDropzone.classList.remove('dragover');
        });

        reportDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            reportDropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                setReportImage(e.dataTransfer.files[0]);
            }
        });

        reportFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                setReportImage(e.target.files[0]);
            }
        });
    }

    function setReportImage(file) {
        currentReportFile = file;
        reportPreviewImg.src = URL.createObjectURL(file);
        reportDropzone.style.display = 'none';
        reportPreviewContainer.style.display = 'block';
    }

    window.removeReportImage = function () {
        currentReportFile = null;
        if (reportFileInput) reportFileInput.value = '';
        reportDropzone.style.display = 'flex';
        reportPreviewContainer.style.display = 'none';
    };

    if (reportForm) {
        reportForm.addEventListener('submit', (e) => {
            e.preventDefault();

            btnSubmitReport.disabled = true;
            btnSubmitReport.innerHTML = 'Mengirim Laporan...';

            const formData = new FormData();
            if (currentReportFile) {
                formData.append('image', currentReportFile);
            }
            formData.append('kategori', document.getElementById('reportKategori').value);
            formData.append('deskripsi', document.getElementById('reportDeskripsi').value);

            fetch('api/report.php', {
                method: 'POST',
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    btnSubmitReport.disabled = false;
                    btnSubmitReport.innerHTML = 'Kirim Laporan';

                    if (data.status === 'success') {
                        showToast('Laporan Anda berhasil diterima oleh tim forensik RealPict.', 'success');
                        reportForm.reset();
                        removeReportImage();
                        loadRecentReports();
                    } else {
                        showToast('Gagal mengirim laporan. Silakan coba kembali.', 'error');
                    }
                })
                .catch(() => {
                    btnSubmitReport.disabled = false;
                    btnSubmitReport.innerHTML = 'Kirim Laporan';
                    showToast('Terjadi kesalahan koneksi saat mengirim laporan.', 'error');
                });
        });
    }

    function loadRecentReports() {
        if (!reportsListContainer) return;

        fetch('api/report.php')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.data) {
                    if (data.data.length === 0) {
                        reportsListContainer.innerHTML = '<div style="color: #64748b; font-size: 0.85rem; text-align: center; padding: 20px;">Belum ada laporan foto yang masuk.</div>';
                        return;
                    }

                    reportsListContainer.innerHTML = '';
                    data.data.slice(0, 5).forEach(rep => {
                        const item = document.createElement('div');
                        item.className = 'history-card-item';
                        item.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${rep.image ? `<img src="${rep.image}" style="width: 42px; height: 42px; border-radius: 8px; object-fit: cover;" alt="thumb">` : `<div style="width: 42px; height: 42px; background: #1c212a; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">📷</div>`}
                            <div>
                                <div style="font-weight: 600; color: #fff; font-size: 0.9rem;">${rep.kategori}</div>
                                <div style="color: #64748b; font-size: 0.775rem;">${rep.id} · ${rep.date_formatted}</div>
                            </div>
                        </div>
                        <span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;">
                            ${rep.status}
                        </span>
                    `;
                        reportsListContainer.appendChild(item);
                    });
                }
            })
            .catch(() => { });
    }

    // Load initial reports on startup
    loadRecentReports();

    // ---------------------------------------------------------
    // 6. Toast Notification Helper
    // ---------------------------------------------------------
    function showToast(message, type = 'info') {
        let toast = document.getElementById('globalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'globalToast';
            toast.className = 'toast-notice';
            document.body.appendChild(toast);
        }

        const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
        const iconColor = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#f59e0b');

        toast.innerHTML = `
            <span style="color: ${iconColor}; font-weight: 700; font-size: 1.1rem;">${icon}</span>
            <span>${message}</span>
        `;

        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3800);
    }
});
