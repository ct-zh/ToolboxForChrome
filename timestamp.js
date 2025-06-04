function updateTimestamp() {
    const timestamp = Math.floor(Date.now() / 1000);
    document.getElementById('currentTimestamp').textContent = timestamp;
}

function setupEventListeners() {
    const timestampElement = document.getElementById('currentTimestamp');
    if (timestampElement) {
        timestampElement.addEventListener('click', function() {
            const timestamp = this.textContent;
            navigator.clipboard.writeText(timestamp).then(() => {
                const checkmark = document.createElement('span');
                checkmark.textContent = ' ✅';
                checkmark.style.transition = 'opacity 2s';
                this.appendChild(checkmark);
                setTimeout(() => {
                    checkmark.style.opacity = '0';
                    setTimeout(() => checkmark.remove(), 2000);
                }, 1000);
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    updateTimestamp();
    setInterval(updateTimestamp, 1000);
    setupEventListeners();
});