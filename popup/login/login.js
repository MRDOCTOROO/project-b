document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const username = usernameInput.value;
            const password = passwordInput.value;

            if (!username || !password) {
                alert('请输入用户名和密码。');
                return;
            }
            
            loginUser(username, password);
        });
    }
});

function loginUser(username, password) {
    fetch('http://10.100.1.122:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            chrome.storage.local.set({ user_id: data.user_id || username }, () => {
                console.log('登录成功！用户ID:', data.user_id || username);
                window.location.href = "../popup.html";
            });
        } else {
            alert('登录失败：' + data.message);
        }
    })
    .catch(error => {
        console.error('请求失败:', error);
        alert('登录请求失败，请检查网络或联系管理员。');
    });
}
