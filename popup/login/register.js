document.addEventListener('DOMContentLoaded', () => {
    const registerBtn = document.getElementById("registerBtn");
    
    if (registerBtn) {
        registerBtn.addEventListener("click", function() {
            const username = document.getElementById("username").value;
            const relname = document.getElementById("relname").value;
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirm-password").value;

            if (!username || !relname || !password || !confirmPassword) {
                alert("所有字段都是必填项！");
                return;
            }

            if (password !== confirmPassword) {
                alert("两次输入的密码不一致！");
                return;
            }

            registerUser(username, password, relname);
        });
    }
});

function registerUser(username, password, relname) {
    fetch("http://10.100.1.122:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, relname })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("注册成功，请登录！");
            window.location.href = "login.html";
        } else {
            alert("注册失败：" + data.message);
        }
    })
    .catch(error => {
        console.error("请求失败:", error);
        alert('注册请求失败，请检查网络或联系管理员。');
    });
}
