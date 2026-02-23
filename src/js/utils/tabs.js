// ============ TABS SYSTEM ============

window.createTabs = function () {
    const tabsContainer = document.getElementById('tabsContainer');
    if (!tabsContainer || !window.transcriptions) return;

    tabsContainer.innerHTML = '';

    // Safety check - force index to be within bounds
    if (window.activeTabIndex >= window.transcriptions.length) {
        window.activeTabIndex = window.transcriptions.length - 1;
    }
    if (window.activeTabIndex < 0 && window.transcriptions.length > 0) {
        window.activeTabIndex = 0;
    }

    if (window.transcriptions.length > 0) {
        const editor = document.getElementById('editor');
        if (editor) {
            editor.innerHTML = window.transcriptions[window.activeTabIndex].text;
            if (typeof updateWordCount === 'function') updateWordCount();
        }
    }

    window.transcriptions.forEach((item, index) => {
        const tab = document.createElement('div');
        tab.className = `tab ${index === window.activeTabIndex ? 'active' : ''}`;

        const titleSpan = document.createElement('span');
        // Mostrar nombre del archivo si está disponible, sino número de pestaña
        const rawName = item.fileName || '';
        const displayName = rawName
            ? rawName.replace(/\.[^/.]+$/, '').substring(0, 28) + (rawName.replace(/\.[^/.]+$/, '').length > 28 ? '…' : '')
            : `Transcripción ${index + 1}`;
        titleSpan.textContent = displayName;
        titleSpan.title = rawName || `Transcripción ${index + 1}`; // tooltip con nombre completo
        tab.appendChild(titleSpan);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            closeTab(index);
        };
        tab.appendChild(closeBtn);

        tab.onclick = () => switchTab(index);
        tabsContainer.appendChild(tab);
    });
}

window.switchTab = function (index) {
    if (window.activeTabIndex === index || !window.transcriptions || index >= window.transcriptions.length) return;

    const editor = document.getElementById('editor');
    if (editor) {
        // Save current active tab text before switching
        if (window.transcriptions[window.activeTabIndex]) {
            window.transcriptions[window.activeTabIndex].text = editor.innerHTML;
        }

        window.activeTabIndex = index;
        editor.innerHTML = window.transcriptions[index].text;

        if (typeof updateWordCount === 'function') updateWordCount();
        createTabs(); // force re-render tabs UI
    }
}

window.closeTab = function (index) {
    if (!window.transcriptions || index >= window.transcriptions.length) return;

    window.transcriptions.splice(index, 1);

    if (window.transcriptions.length === 0) {
        const editor = document.getElementById('editor');
        if (editor) editor.innerHTML = '';
        window.activeTabIndex = 0;

        if (typeof updateButtonsVisibility === 'function') updateButtonsVisibility('IDLE');
        if (typeof disableButtons === 'function') disableButtons();

        // Return to first step of wizard if present
        const wizardUploadCard = document.getElementById('wizardUploadCard');
        const wizardTemplateCard = document.getElementById('wizardTemplateCard');
        if (wizardUploadCard) wizardUploadCard.style.display = 'block';
        if (wizardTemplateCard) wizardTemplateCard.style.display = 'none';

        // Clear processing status
        const processingStatus = document.getElementById('processingStatus');
        if (processingStatus) processingStatus.classList.remove('active');

        const transcribeBtn = document.getElementById('transcribeBtn');
        if (transcribeBtn) {
            // Re-enable transcribe if files are still loaded
            transcribeBtn.disabled = !(window.uploadedFiles && window.uploadedFiles.length > 0);
        }
    } else {
        if (index <= window.activeTabIndex && window.activeTabIndex > 0) {
            window.activeTabIndex--;
        }

        // Force the text update of the new active tab
        const editor = document.getElementById('editor');
        if (editor && window.transcriptions[window.activeTabIndex]) {
            editor.innerHTML = window.transcriptions[window.activeTabIndex].text;
        }
    }

    createTabs();
    if (typeof updateWordCount === 'function') updateWordCount();
}
