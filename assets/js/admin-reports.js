document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('adminReports');
    const toast = document.getElementById('adminToast');
    const csrfToken = container.dataset.csrfToken;
    let toastTimer;

    function showMessage(message, isError = false) {
        toast.textContent = message;
        toast.style.borderColor = isError ? 'rgba(239, 68, 68, 0.55)' : '';
        toast.classList.add('is-visible');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 4000);
    }

    function addText(parent, tagName, className, text) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = decodeStoredText(text || '');
        parent.appendChild(element);
        return element;
    }

    function decodeStoredText(value) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = value;
        return textarea.value;
    }

    function createReportCard(report) {
        const card = document.createElement('article');
        card.className = 'admin-report-card';

        const main = document.createElement('div');
        main.className = 'admin-report-main';
        card.appendChild(main);

        if (typeof report.image === 'string' && /^uploads\/[A-Za-z0-9._-]+$/.test(report.image)) {
            const image = document.createElement('img');
            image.className = 'admin-report-image';
            image.src = `../${report.image}`;
            image.alt = 'Gambar laporan';
            main.appendChild(image);
        }

        const details = document.createElement('div');
        details.className = 'admin-report-details';
        main.appendChild(details);
        addText(details, 'h2', '', report.kategori);
        addText(details, 'p', 'admin-report-meta', `${report.id} · ${report.date_formatted}`);
        if (report.file_name && report.file_name !== 'Tidak ada gambar') {
            addText(details, 'p', 'admin-report-meta', `File: ${report.file_name}`);
        }
        addText(details, 'p', 'admin-report-description', report.deskripsi || 'Tidak ada deskripsi.');

        const actions = document.createElement('div');
        actions.className = 'admin-report-actions';
        card.appendChild(actions);

        const status = document.createElement('select');
        status.className = 'admin-report-status';
        status.setAttribute('aria-label', `Status laporan ${report.id}`);
        [
            ['reviewing', 'Sedang Ditinjau'],
            ['reported', 'Sudah Dilaporkan']
        ].forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            status.appendChild(option);
        });
        status.value = report.status_code === 'reported' ? 'reported' : 'reviewing';
        actions.appendChild(status);

        const updateButton = document.createElement('button');
        updateButton.type = 'button';
        updateButton.className = 'btn btn-primary';
        updateButton.textContent = 'Simpan Status';
        updateButton.addEventListener('click', () => updateReportStatus(report.id, status.value, updateButton));
        actions.appendChild(updateButton);

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn admin-delete-button';
        deleteButton.textContent = 'Hapus Laporan';
        deleteButton.addEventListener('click', () => deleteReport(report.id, deleteButton));
        actions.appendChild(deleteButton);

        return card;
    }

    async function request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            }
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            throw new Error(result.message || 'Permintaan gagal. Silakan coba kembali.');
        }
        return result;
    }

    async function loadReports() {
        try {
            const result = await request('../api/report.php', { method: 'GET' });
            container.replaceChildren();
            if (!result.data.length) {
                addText(container, 'p', 'admin-muted', 'Belum ada laporan yang diterima.');
                return;
            }
            result.data.forEach(report => container.appendChild(createReportCard(report)));
        } catch (error) {
            container.replaceChildren();
            addText(container, 'p', 'admin-alert', error.message);
        }
    }

    async function updateReportStatus(id, statusCode, button) {
        button.disabled = true;
        try {
            await request('../api/report.php', {
                method: 'PATCH',
                body: JSON.stringify({ id, status_code: statusCode })
            });
            showMessage('Status laporan berhasil diperbarui.');
            await loadReports();
        } catch (error) {
            showMessage(error.message, true);
            button.disabled = false;
        }
    }

    async function deleteReport(id, button) {
        if (!window.confirm(`Hapus laporan ${id}? Tindakan ini tidak dapat dibatalkan.`)) return;
        button.disabled = true;
        try {
            const result = await request('../api/report.php', {
                method: 'DELETE',
                body: JSON.stringify({ id })
            });
            showMessage(result.warnings && result.warnings.length
                ? `${result.message} ${result.warnings.join(' ')}`
                : result.message);
            await loadReports();
        } catch (error) {
            showMessage(error.message, true);
            button.disabled = false;
        }
    }

    loadReports();
});
