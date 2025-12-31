document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById('model-select');
    const customModelSettings = document.getElementById('custom-model-settings');
    const apiInfo = document.getElementById('api-info');
    const apiUrlInput = document.getElementById('api-url');
    const apiKeyInput = document.getElementById('api-key');
    const modelNameInput = document.getElementById('model-name');
    const saveBtn = document.getElementById('save-btn');
    const verifyBtn = document.getElementById('verify-btn');
    const verificationResult = document.getElementById('verification-result');
    const backBtn = document.getElementById('back-btn');

    // 返回按钮
    backBtn.addEventListener('click', () => {
        window.location.href = '../popup.html';
    });

    // 更新自定义设置区域的显示/隐藏
    function updateCustomSettingsVisibility() {
        if (modelSelect.value === 'custom') {
            customModelSettings.classList.remove('hidden');
            apiInfo.classList.remove('hidden');
            verificationResult.classList.remove('hidden');
        } else {
            customModelSettings.classList.add('hidden');
            apiInfo.classList.add('hidden');
            verificationResult.classList.add('hidden');
        }
    }

    // 加载保存的设置
    chrome.storage.local.get(['modelConfig'], (result) => {
        if (result.modelConfig) {
            const { type, url, key, name } = result.modelConfig;
            modelSelect.value = type;
            if (type === 'custom') {
                apiUrlInput.value = url || '';
                apiKeyInput.value = key || '';
                modelNameInput.value = name || '';
            }
        }
        updateCustomSettingsVisibility();
    });

    // 模型选择变化
    modelSelect.addEventListener('change', updateCustomSettingsVisibility);

    // 保存设置
    saveBtn.addEventListener('click', () => {
        const type = modelSelect.value;
        let config = { type };

        if (type === 'custom') {
            config.url = apiUrlInput.value.trim();
            config.key = apiKeyInput.value.trim();
            config.name = modelNameInput.value.trim();

            // 验证必填字段
            if (!config.url) {
                showVerificationResult('请输入 API 地址', 'error');
                return;
            }
            if (!config.key) {
                showVerificationResult('请输入 API 密钥', 'error');
                return;
            }
            if (!config.name) {
                showVerificationResult('请输入模型名称', 'error');
                return;
            }

            // 验证 URL 格式
            try {
                new URL(config.url);
            } catch (e) {
                showVerificationResult('API 地址格式不正确，请输入完整的 URL（如 https://api.example.com/v1/chat/completions）', 'error');
                return;
            }
        }

        chrome.storage.local.set({ modelConfig: config }, () => {
            showVerificationResult('设置已保存！', 'success');
            // 3秒后隐藏成功消息
            setTimeout(() => {
                verificationResult.classList.add('hidden');
            }, 3000);
        });
    });

    // 验证 API 连接
    verifyBtn.addEventListener('click', async () => {
        const url = apiUrlInput.value.trim();
        const key = apiKeyInput.value.trim();
        const name = modelNameInput.value.trim();

        if (!url || !key || !name) {
            showVerificationResult('验证前请填写所有字段', 'warning');
            return;
        }

        // 验证 URL 格式
        try {
            new URL(url);
        } catch (e) {
            showVerificationResult('API 地址格式不正确', 'error');
            return;
        }

        showVerificationResult('正在验证连接...', 'warning');
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = `
            <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            验证中...
        `;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: name,
                    messages: [{ role: 'user', content: 'Hello' }],
                    max_tokens: 5
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('API验证响应:', data);
                showVerificationResult('验证成功！API 连接正常', 'success');
            } else {
                const errorText = await response.text();
                let errorMsg = `HTTP ${response.status}`;

                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error?.message) {
                        errorMsg += `: ${errorData.error.message}`;
                    } else if (errorData.message) {
                        errorMsg += `: ${errorData.message}`;
                    }
                } catch {
                    if (errorText) {
                        errorMsg += `: ${errorText.substring(0, 100)}`;
                    }
                }

                showVerificationResult(`验证失败: ${errorMsg}`, 'error');
            }
        } catch (error) {
            console.error('验证错误:', error);
            let errorMsg = error.message;

            if (error.message.includes('fetch')) {
                errorMsg = '网络连接失败，请检查 URL 是否正确或网络连接';
            } else if (error.message.includes('CORS')) {
                errorMsg = 'CORS 错误：API 服务器不允许跨域请求';
            }

            showVerificationResult(`验证失败: ${errorMsg}`, 'error');
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                验证连接
            `;
        }
    });

    // 显示验证结果
    function showVerificationResult(message, type) {
        verificationResult.textContent = message;
        verificationResult.className = 'verification-result'; // 重置类名

        if (type === 'success') {
            verificationResult.classList.add('success');
        } else if (type === 'error') {
            verificationResult.classList.add('error');
        } else if (type === 'warning') {
            verificationResult.classList.add('warning');
        }

        verificationResult.classList.remove('hidden');
    }
});
