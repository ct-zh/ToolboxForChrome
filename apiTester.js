// Logic for apiTester.html will be added here.

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const sendButton = document.getElementById('send');
    const responseContent = document.getElementById('response-content');
    const urlInput = document.getElementById('url');
    const methodSelect = document.getElementById('method');

    // Tab switching logic
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');

            tab.classList.add('active');
            const contentId = tab.getAttribute('data-tab');
            document.getElementById(contentId).style.display = 'block';
        });
    });

    // Send request logic
    sendButton.addEventListener('click', async () => {
        const url = urlInput.value;
        const method = methodSelect.value;

        if (!url) {
            responseContent.textContent = '请输入 URL。';
            return;
        }

        // --- Construct Headers ---
        const headersText = document.querySelector('#headers textarea').value;
        const headers = new Headers();
        try {
            headersText.split('\n').forEach(line => {
                if (line.trim()) {
                    const parts = line.split(/:(.*)/s); // Split only on the first colon
                    if (parts.length === 2) {
                        headers.append(parts[0].trim(), parts[1].trim());
                    }
                }
            });
        } catch (e) {
            responseContent.textContent = `解析请求头时出错: ${e.message}`;
            return;
        }


        // --- Construct Body ---
        const bodyText = document.querySelector('#body textarea').value;
        const body = (method !== 'GET' && method !== 'HEAD') ? bodyText : null;

        // --- Construct URL with Params ---
        const paramsText = document.querySelector('#params textarea').value;
        const finalUrl = new URL(url);
        try {
            paramsText.split('\n').forEach(line => {
                if (line.trim()) {
                    const parts = line.split(/=(.*)/s); // Split only on the first equals sign
                     if (parts.length === 2) {
                        finalUrl.searchParams.append(parts[0].trim(), parts[1].trim());
                    }
                }
            });
        } catch (e) {
            responseContent.textContent = `解析 URL 参数时出错: ${e.message}`;
            return;
        }


        // --- Fetch Request ---
        responseContent.textContent = '正在发送请求...';
        try {
            const response = await fetch(finalUrl.toString(), {
                method: method,
                headers: headers,
                body: body
            });

            const responseBody = await response.text();
            let formattedBody;
            try {
                // Try to format as JSON
                formattedBody = JSON.stringify(JSON.parse(responseBody), null, 2);
            } catch {
                // Fallback to plain text
                formattedBody = responseBody;
            }

            let headersString = '';
            response.headers.forEach((value, key) => {
                headersString += `${key}: ${value}\n`;
            });

            responseContent.textContent = `\nStatus: ${response.status} ${response.statusText}\n\n--- Headers ---\n${headersString}--- Body ---\n${formattedBody}\n            `.trim();

        } catch (error) {
            responseContent.textContent = `请求失败: ${error.message}`;
        }
    });
});
