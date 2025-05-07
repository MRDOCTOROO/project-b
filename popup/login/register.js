document.getElementById("registerBtn").addEventListener("click", function() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const relname = document.getElementById("relname").value;

    if (!username || !password || !confirmPassword ||!relname) {
        alert("所有字段都是必填项！");
        return;
    }

    if (password !== confirmPassword) {
        alert("两次输入的密码不一致！");
        return;
    }

    // 向后端发送注册请求
    registerUser(username, password, relname);
});

function registerUser(username, password, relname) {
    fetch("http://127.0.0.1:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, relname})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("注册成功，请登录！");
            // 跳转到登录页面
            window.location.href = "login.html";
        } else {
            alert("注册失败：" + data.message);
        }
    })
    .catch(error => console.error("请求失败:", error));
}
