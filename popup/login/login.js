// 获取 HTML 元素
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const switchToRegisterBtn = document.getElementById('switch-to-register');
const switchToLoginBtn = document.getElementById('switch-to-login');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');

// 切换到注册页面
switchToRegisterBtn.addEventListener('click', function() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});

// 切换到登录页面
// switchToLoginBtn.addEventListener('click', function() {
//     registerForm.style.display = 'none';
//     loginForm.style.display = 'block';
// });

// 登录功能
loginBtn.addEventListener('click', function() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // 通过 fetch 向后端发送登录请求
    loginUser(username, password);
});

// 注册功能
// registerBtn.addEventListener('click', function() {
//     const username = document.getElementById('new-username').value;
//     const password = document.getElementById('new-password').value;
    
//     // 通过 fetch 向后端发送注册请求
//     registerUser(username, password);
// });

// 登录用户函数
function loginUser(username, password) {
    fetch('http://10.100.1.122:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // ✅ 使用 chrome.storage.local 存储用户 ID
            chrome.storage.local.set({ user_id: username }, () => {
                console.log('登录成功！用户ID:', username);
                // 跳转到插件主界面或欢迎页面
                window.location.href = "../popup.html";
            });
        } else {
            alert('登录失败：' + data.message);
        }
    })
    .catch(error => console.error('请求失败:', error));
}

// // 注册用户函数
// function registerUser(username, password) {
//     fetch('https://yourserver.com/api/register', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ username, password })
//     })
//     .then(response => response.json())
//     .then(data => {
//         if (data.success) {
//             sessionStorage.setItem('user_id', data.userId);
//             console.log('注册成功！用户ID:', data.userId);
//             // 跳转到插件主界面或欢迎页面
//             window.close();  // 关闭当前弹窗
//         } else {
//             alert('注册失败：' + data.message);
//         }
//     })
//     .catch(error => console.error('请求失败:', error));
// }
