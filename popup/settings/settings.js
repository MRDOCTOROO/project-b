document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById('model-select');
    const customModelSettings = document.getElementById('custom-model-settings');
    const apiUrlInput = document.getElementById('api-url');
    const apiKeyInput = document.getElementById('api-key');
    const modelNameInput = document.getElementById('model-name');
    const saveBtn = document.getElementById('save-btn');
    const verifyBtn = document.getElementById('verify-btn');
    const verificationResult = document.getElementById('verification-result');
    const backBtn = document.getElementById('back-btn');

    backBtn.addEventListener('click', () => {
        window.location.href = '../popup.html';
    });

    // Load saved settings
    chrome.storage.local.get(['modelConfig'], (result) => {
        if (result.modelConfig) {
            const { type, url, key, name } = result.modelConfig;
            modelSelect.value = type;
            if (type === 'custom') {
                apiUrlInput.value = url || '';
                apiKeyInput.value = key || '';
                modelNameInput.value = name || '';
                customModelSettings.style.display = 'block';
            } else {
                customModelSettings.style.display = 'none';
            }
        } else {
            // Default state
            customModelSettings.style.display = 'none';
        }
    });

    modelSelect.addEventListener('change', () => {
        if (modelSelect.value === 'custom') {
            customModelSettings.style.display = 'block';
        } else {
            customModelSettings.style.display = 'none';
        }
    });

    saveBtn.addEventListener('click', () => {
        const type = modelSelect.value;
        let config = { type };

        if (type === 'custom') {
            config.url = apiUrlInput.value.trim();
            config.key = apiKeyInput.value.trim();
            config.name = modelNameInput.value.trim();

            if (!config.url || !config.key || !config.name) {
                alert('请填写所有自定义模型字段。');
                return;
            }
        }

        chrome.storage.local.set({ modelConfig: config }, () => {
            alert('设置已保存！');
        });
    });

    verifyBtn.addEventListener('click', async () => {
        const url = apiUrlInput.value.trim();
        const key = apiKeyInput.value.trim();
        const name = modelNameInput.value.trim();

        if (!url || !key || !name) {
            verificationResult.textContent = '验证前请填写所有字段。';
            verificationResult.style.color = 'red';
            return;
        }

        verificationResult.textContent = '验证中...';
        verificationResult.style.color = 'orange';

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
                verificationResult.textContent = '验证成功！';
                verificationResult.style.color = 'green';
            } else {
                const errorData = await response.json().catch(() => ({ error: { message: '未知错误' } }));
                verificationResult.textContent = `验证失败: ${response.status} - ${errorData.error.message}`;
                verificationResult.style.color = 'red';
            }
        } catch (error) {
            verificationResult.textContent = `验证失败: ${error.message}`;
            verificationResult.style.color = 'red';
        }
    });
});
