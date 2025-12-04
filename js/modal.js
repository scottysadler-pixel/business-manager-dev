// Modal Dialog System

export function showModal(content, options = {}) {
    const {
        title = '',
        buttons = [{ text: 'OK', primary: true }],
        onClose = null,
        className = ''
    } = options;

    // Remove any existing modals
    const existing = document.querySelector('.modal-overlay');
    if (existing) {
        existing.remove();
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Create modal dialog
    const modal = document.createElement('div');
    modal.className = `modal-dialog ${className}`;
    
    // Add title if provided
    if (title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'modal-header';
        titleEl.innerHTML = `<h3>${title}</h3>`;
        modal.appendChild(titleEl);
    }
    
    // Add content
    const contentEl = document.createElement('div');
    contentEl.className = 'modal-content';
    if (typeof content === 'string') {
        contentEl.innerHTML = content;
    } else {
        contentEl.appendChild(content);
    }
    modal.appendChild(contentEl);
    
    // Add buttons
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    const buttonPromises = [];
    
    buttons.forEach((btn, index) => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.className = btn.primary ? 'btn btn-primary' : 'btn btn-secondary';
        
        const promise = new Promise((resolve) => {
            button.addEventListener('click', () => {
                if (btn.onClick) {
                    btn.onClick();
                }
                overlay.remove();
                resolve(index);
            });
        });
        
        buttonPromises.push(promise);
        footer.appendChild(button);
    });
    
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onClose) onClose();
        }
    });
    
    // Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            if (onClose) onClose();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Return promise that resolves when any button is clicked
    return Promise.race(buttonPromises);
}

export function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

export function showConfirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
        showModal(message, {
            title,
            buttons: [
                { text: 'Cancel', primary: false, onClick: () => resolve(false) },
                { text: 'OK', primary: true, onClick: () => resolve(true) }
            ]
        });
    });
}

export function showAlert(message, title = 'Alert') {
    return showModal(message, {
        title,
        buttons: [{ text: 'OK', primary: true }]
    });
}