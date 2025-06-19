document.addEventListener('DOMContentLoaded', function() {
    const qrInput = document.getElementById('qrInput');
    const generateQrBtn = document.getElementById('generateQr');
    const qrcodeDiv = document.getElementById('qrcode');

    // 引入 qrcode.min.js 库
    const script = document.createElement('script');
    script.src = '../js/qrcode.min.js';
    script.onload = () => {
        generateQrBtn.addEventListener('click', () => {
            const text = qrInput.value;
            if (text) {
                qrcodeDiv.innerHTML = ''; // 清空之前的二维码
                new QRCode(qrcodeDiv, {
                    text: text,
                    width: 256,
                    height: 256,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            } else {
                alert('请输入要生成二维码的内容！');
            }
        });
    };
    document.head.appendChild(script);
});