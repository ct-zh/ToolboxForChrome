// 图片Base64转换功能实现
let currentImageFile = null;
let currentBase64 = null;

// 文件大小格式化函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 显示复制状态
function showCopyStatus(message = '✅ 已复制') {
    const copyStatus = document.getElementById('copyStatus');
    if (copyStatus) {
        copyStatus.textContent = message;
        copyStatus.style.opacity = '1';
        setTimeout(() => {
            copyStatus.style.opacity = '0';
            setTimeout(() => copyStatus.textContent = '', 1000);
        }, 1500);
    }
}

// 处理文件上传
function handleFileUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert('请选择有效的图片文件！');
        return;
    }
    
    // 检查文件大小 (限制10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('图片文件大小不能超过10MB！');
        return;
    }
    
    currentImageFile = file;
    
    // 显示图片预览
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('previewImage');
        const previewSection = document.getElementById('previewSection');
        const imageInfo = document.getElementById('imageInfo');
        const base64Output = document.getElementById('base64Output');
        
        previewImage.src = e.target.result;
        currentBase64 = e.target.result;
        
        // 显示图片信息
        imageInfo.innerHTML = `
            <strong>文件名:</strong> ${file.name}<br>
            <strong>文件大小:</strong> ${formatFileSize(file.size)}<br>
            <strong>文件类型:</strong> ${file.type}<br>
            <strong>Base64长度:</strong> ${e.target.result.length.toLocaleString()} 字符
        `;
        
        // 显示Base64字符串（截取前500字符用于预览）
        const base64String = e.target.result;
        const previewLength = 500;
        base64Output.textContent = base64String.length > previewLength 
            ? base64String.substring(0, previewLength) + '...\n\n[完整Base64字符串长度: ' + base64String.length.toLocaleString() + ' 字符]'
            : base64String;
        
        previewSection.style.display = 'block';
    };
    
    reader.readAsDataURL(file);
}

// 处理Base64解码
function handleBase64Decode() {
    const base64Input = document.getElementById('base64Input');
    const decodePreviewSection = document.getElementById('decodePreviewSection');
    const decodePreviewImage = document.getElementById('decodePreviewImage');
    const decodeImageInfo = document.getElementById('decodeImageInfo');
    const downloadImageBtn = document.getElementById('downloadImageBtn');
    
    let base64String = base64Input.value.trim();
    
    if (!base64String) {
        alert('请输入Base64字符串！');
        return;
    }
    
    try {
        // 检查是否是完整的data URL
        if (!base64String.startsWith('data:')) {
            // 如果不是data URL，尝试添加默认的image/png前缀
            base64String = 'data:image/png;base64,' + base64String;
        }
        
        // 验证Base64格式
        const base64Data = base64String.split(',')[1];
        if (!base64Data) {
            throw new Error('无效的Base64格式');
        }
        
        // 尝试解码验证
        atob(base64Data);
        
        // 显示图片
        decodePreviewImage.src = base64String;
        decodePreviewImage.onload = function() {
            // 图片加载成功，显示信息
            const img = new Image();
            img.src = base64String;
            img.onload = function() {
                decodeImageInfo.innerHTML = `
                    <strong>图片尺寸:</strong> ${img.width} × ${img.height} 像素<br>
                    <strong>数据类型:</strong> ${base64String.split(';')[0].replace('data:', '')}<br>
                    <strong>Base64长度:</strong> ${base64String.length.toLocaleString()} 字符<br>
                    <strong>估算文件大小:</strong> ${formatFileSize(Math.round(base64Data.length * 0.75))}
                `;
            };
            
            decodePreviewSection.style.display = 'block';
            downloadImageBtn.style.display = 'inline-flex';
            downloadImageBtn.onclick = () => downloadImage(base64String);
        };
        
        decodePreviewImage.onerror = function() {
            throw new Error('无法解析为有效图片');
        };
        
    } catch (error) {
        alert('解码失败：' + error.message + '\n\n请检查Base64字符串是否正确！');
        decodePreviewSection.style.display = 'none';
        downloadImageBtn.style.display = 'none';
    }
}

// 复制Base64到剪贴板
function copyBase64() {
    if (!currentBase64) {
        alert('没有可复制的Base64数据！');
        return;
    }
    
    navigator.clipboard.writeText(currentBase64).then(() => {
        showCopyStatus('✅ Base64已复制到剪贴板');
    }).catch(err => {
        console.error('复制失败:', err);
        showCopyStatus('❌ 复制失败');
    });
}

// 下载Base64文件
function downloadBase64File() {
    if (!currentBase64 || !currentImageFile) {
        alert('没有可下载的数据！');
        return;
    }
    
    const blob = new Blob([currentBase64], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentImageFile.name.replace(/\.[^/.]+$/, '') + '_base64.txt';
    a.click();
    URL.revokeObjectURL(url);
    showCopyStatus('✅ Base64文件已下载');
}

// 下载图片文件
function downloadImage(base64String) {
    try {
        const link = document.createElement('a');
        link.href = base64String;
        
        // 从Base64字符串中提取文件扩展名
        const mimeType = base64String.split(';')[0].replace('data:', '');
        const extension = mimeType.split('/')[1] || 'png';
        
        link.download = 'decoded_image.' + extension;
        link.click();
        showCopyStatus('✅ 图片已下载');
    } catch (error) {
        alert('下载失败：' + error.message);
    }
}

// 清除当前数据
function clearCurrentData() {
    currentImageFile = null;
    currentBase64 = null;
    
    const previewSection = document.getElementById('previewSection');
    const fileInput = document.getElementById('fileInput');
    
    previewSection.style.display = 'none';
    fileInput.value = '';
    
    showCopyStatus('🗑️ 已清除');
}

// 设置拖拽事件
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 文件输入
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }
    
    // 操作按钮
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyBase64);
    }
    
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadBase64File);
    }
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCurrentData);
    }
    
    // Base64解码
    const decodeBtn = document.getElementById('decodeBtn');
    if (decodeBtn) {
        decodeBtn.addEventListener('click', handleBase64Decode);
    }
    
    // Base64输入框支持粘贴
    const base64Input = document.getElementById('base64Input');
    if (base64Input) {
        base64Input.addEventListener('paste', () => {
            // 延迟一点时间让粘贴完成
            setTimeout(() => {
                if (base64Input.value.trim()) {
                    // 如果粘贴的内容看起来像Base64，自动尝试解码
                    const content = base64Input.value.trim();
                    if (content.startsWith('data:image/') || content.length > 100) {
                        setTimeout(handleBase64Decode, 100);
                    }
                }
            }, 50);
        });
    }
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 设置navbar标题
    const navbarFrame = document.getElementById('navbarFrame');
    if (navbarFrame) {
        navbarFrame.onload = () => {
            navbarFrame.contentWindow.postMessage({ type: 'setTitle', title: '图片Base64转换' }, '*');
        };
    }
    
    // 监听来自 navbar.js 的消息
    window.addEventListener('message', function(event) {
        // 如果收到 goHome 消息，则转发到父窗口
        if (event.data && event.data.type === 'goHome') {
            window.parent.postMessage({ type: 'goHome' }, '*');
        }
    });
    
    // 初始化功能
    setupEventListeners();
    setupDragAndDrop();
});