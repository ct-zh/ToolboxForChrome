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
                const copyStatusElement = document.getElementById('copyStatus');
                if (copyStatusElement) {
                    copyStatusElement.textContent = '✅';
                    copyStatusElement.style.opacity = '1';
                    setTimeout(() => {
                        copyStatusElement.style.opacity = '0';
                        setTimeout(() => copyStatusElement.textContent = '', 2000);
                    }, 1000);
                }
            });
        });
    }
}

function convertTimestampToDatetime() {
    const timestampInput = document.getElementById('timestampInput').value;
    const timestampUnit = document.getElementById('timestampUnit').value;
    const timezoneSelect = document.getElementById('timezoneSelect1').value;
    const datetimeOutput = document.getElementById('datetimeOutput');

    let timestamp = parseInt(timestampInput, 10);
    if (isNaN(timestamp)) {
        datetimeOutput.value = '无效时间戳';
        return;
    }

    if (timestampUnit === 's') {
        timestamp *= 1000; // Convert to milliseconds
    }

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    datetimeOutput.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function convertDatetimeToTimestamp() {
    const datetimeInput = document.getElementById('datetimeInput').value;
    const timezoneSelect = document.getElementById('timezoneSelect2').value;
    const timestampUnit = document.getElementById('timestampUnit2').value;
    const timestampOutput = document.getElementById('timestampOutput');

    try {
        // Attempt to parse with a specific format if necessary, or rely on Date.parse
        const date = new Date(datetimeInput);
        if (isNaN(date.getTime())) {
            timestampOutput.value = '无效日期时间';
            return;
        }

        let timestamp = date.getTime(); // Milliseconds
        if (timestampUnit === 's') {
            timestamp = Math.floor(timestamp / 1000);
        }
        timestampOutput.value = timestamp;
    } catch (e) {
        timestampOutput.value = '无效日期时间';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const navbarFrame = document.getElementById('navbarFrame');
    if (navbarFrame) {
        navbarFrame.onload = () => {
            navbarFrame.contentWindow.postMessage({ type: 'setTitle', title: '时间戳转换' }, '*');
        };
    }
    
    // 监听来自 navbar.js 的消息
    window.addEventListener('message', function(event) {
        // 如果收到 goHome 消息，则转发到父窗口
        if (event.data && event.data.type === 'goHome') {
            window.parent.postMessage({ type: 'goHome' }, '*');
        }
    });
    updateTimestamp();
    setInterval(updateTimestamp, 1000);
    setupEventListeners();

    // Module Two Event Listeners
    document.getElementById('convertTimestamp').addEventListener('click', convertTimestampToDatetime);
    document.getElementById('convertDatetime').addEventListener('click', convertDatetimeToTimestamp);

    // Add input event listeners for real-time conversion (optional, but good UX)
    document.getElementById('timestampInput').addEventListener('input', convertTimestampToDatetime);
    document.getElementById('timestampUnit').addEventListener('change', convertTimestampToDatetime);
    document.getElementById('timezoneSelect1').addEventListener('change', convertTimestampToDatetime);

    document.getElementById('datetimeInput').addEventListener('input', convertDatetimeToTimestamp);
    document.getElementById('timezoneSelect2').addEventListener('change', convertDatetimeToTimestamp);
    document.getElementById('timestampUnit2').addEventListener('change', convertDatetimeToTimestamp);
});