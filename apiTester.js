// Logic for apiTester.html

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const sendButton = document.getElementById('send');
    const generateCodeButton = document.getElementById('generateCode');
    const responseContent = document.getElementById('response-content');
    const urlInput = document.getElementById('url');
    const methodSelect = document.getElementById('method');
    const codePanel = document.getElementById('codePanel');
    const generatedCode = document.getElementById('generatedCode');
    const copyCodeButton = document.getElementById('copyCode');

    const paramsContainer = document.getElementById('params-container');
    const addParamBtn = document.getElementById('add-param-btn');
    const headersContainer = document.getElementById('headers-container');
    const addHeaderBtn = document.getElementById('add-header-btn');

    let isUpdatingUrl = false;
    let isUpdatingParams = false;

    // --- Tab switching logic ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');

            tab.classList.add('active');
            const contentId = tab.getAttribute('data-tab');
            document.getElementById(contentId).style.display = 'block';
        });
    });

    // --- Key-Value Pair Management ---
    const createKeyValueRow = (container, key = '', value = '', isParam = false) => {
        const row = document.createElement('div');
        row.className = 'key-value-row';
        row.innerHTML = `
            <input type="text" class="key" placeholder="Key" value="${key}">
            <input type="text" class="value" placeholder="Value" value="${value}">
            <button class="delete-btn">-</button>
        `;
        container.appendChild(row);

        const updateFn = isParam ? updateUrlFromParams : () => {};
        row.querySelector('.key').addEventListener('input', updateFn);
        row.querySelector('.value').addEventListener('input', updateFn);
        row.querySelector('.delete-btn').addEventListener('click', () => {
            row.remove();
            updateFn();
        });
    };

    addParamBtn.addEventListener('click', () => createKeyValueRow(paramsContainer, '', '', true));
    addHeaderBtn.addEventListener('click', () => createKeyValueRow(headersContainer));


    // --- URL and Params Sync ---
    const updateParamsFromUrl = () => {
        if (isUpdatingParams) return;
        isUpdatingUrl = true;

        try {
            const url = new URL(urlInput.value);
            paramsContainer.innerHTML = ''; // Clear existing params
            url.searchParams.forEach((value, key) => {
                createKeyValueRow(paramsContainer, key, value, true);
            });
        } catch (e) {
            // Invalid URL, do nothing
        } finally {
            isUpdatingUrl = false;
        }
    };

    const updateUrlFromParams = () => {
        if (isUpdatingUrl) return;
        isUpdatingParams = true;

        try {
            const url = new URL(urlInput.value.split('?')[0]);
            paramsContainer.querySelectorAll('.key-value-row').forEach(row => {
                const key = row.querySelector('.key').value.trim();
                const value = row.querySelector('.value').value.trim();
                if (key) {
                    url.searchParams.append(key, value);
                }
            });
            urlInput.value = url.toString();
        } catch (e) {
            // Base URL might be invalid, do nothing
        } finally {
            isUpdatingParams = false;
        }
    };

    urlInput.addEventListener('input', updateParamsFromUrl);
    // Use a timeout to let the DOM update before syncing
    paramsContainer.addEventListener('input', () => setTimeout(updateUrlFromParams, 0));
    paramsContainer.addEventListener('click', (e) => {
         if (e.target.classList.contains('delete-btn')) {
              setTimeout(updateUrlFromParams, 0);
         }
    });


    // --- Send request logic (暂时禁用) ---
    // sendButton.addEventListener('click', async () => {
    //     // 发送请求功能暂时禁用
    // });

    // --- Generate cURL code logic ---
    generateCodeButton.addEventListener('click', () => {
        const curlCode = generateCurlCode();
        generatedCode.textContent = curlCode;
        codePanel.style.display = 'block';
    });

    // --- Copy code to clipboard ---
    copyCodeButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(generatedCode.textContent);
            const originalText = copyCodeButton.textContent;
            copyCodeButton.textContent = '已复制';
            setTimeout(() => {
                copyCodeButton.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        }
    });

    // --- Generate cURL code function ---
    function generateCurlCode() {
        const method = methodSelect.value;
        const url = urlInput.value.trim();
        
        if (!url) {
            return '请先输入 URL';
        }

        let curlCommand = `curl -X ${method}`;

        // 添加请求头
        const headers = [];
        headersContainer.querySelectorAll('.key-value-row').forEach(row => {
            const key = row.querySelector('.key').value.trim();
            const value = row.querySelector('.value').value.trim();
            if (key && value) {
                headers.push(`-H "${key}: ${value}"`);
            }
        });

        if (headers.length > 0) {
            curlCommand += ' \\\n  ' + headers.join(' \\\n  ');
        }

        // 添加请求体（如果不是GET或HEAD请求）
        if (method !== 'GET' && method !== 'HEAD') {
            const bodyText = document.querySelector('#body textarea').value.trim();
            if (bodyText) {
                // 转义特殊字符
                const escapedBody = bodyText.replace(/'/g, "'\"'\"'");
                curlCommand += ` \\\n  -d '${escapedBody}'`;
            }
        }

        // 添加URL（放在最后）
        curlCommand += ` \\\n  "${url}"`;

        return curlCommand;
    }

    // Initial population of params from URL if any
    updateParamsFromUrl();
});
