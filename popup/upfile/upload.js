export function setupFileUpload(uploadButtonId, dropAreaId, allowedFormats) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = allowedFormats.join(",");
    fileInput.style.display = "none";

    // 确保 fileInput 附加到当前 HTML（iframe 内的 upload.html）
    document.querySelector(".upload-container").appendChild(fileInput);

    const uploadButton = document.getElementById(uploadButtonId);
    const dropArea = document.getElementById(dropAreaId);
    // 打印按钮和文件输入框，确保绑定成功
    console.log("uploadButton:", uploadButton);
    console.log("fileInput:", fileInput);

    if (!uploadButton || !dropArea) {
        console.error("上传按钮或拖拽区域未找到！");
        return;
    }

    // 点击按钮弹出文件选择框
    uploadButton.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (event) => {
        handleFiles(event.target.files);
    });

    // 监听拖放事件
    dropArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        dropArea.classList.add("highlight");
    });

    dropArea.addEventListener("dragleave", () => {
        dropArea.classList.remove("highlight");
    });

    dropArea.addEventListener("drop", (event) => {
        event.preventDefault();
        dropArea.classList.remove("highlight");
        handleFiles(event.dataTransfer.files);
    });

    function handleFiles(files) {
        const file = files[0];
        if (!file) return;

        if (!allowedFormats.includes(file.type)) {
            alert("不支持的文件格式！");
            return;
        }

        console.log("选中文件：", file.name);
        uploadFile(file);
    }

    function uploadFile(file) {
        const url = "https://106d9.pluscdn.eu.org/api/v1/document/upload";
        const formData = new FormData();
        formData.append("file", file);

        fetch(url, {
            method: "POST",
            headers: {
                "Authorization": "Bearer XXK505Z-6ZQMY6E-JQK42BF-W9GJF69"
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log("上传成功:", data);
            alert("文件上传成功！");
        })
        .catch(error => {
            console.error("上传失败:", error);
            alert("文件上传失败，请重试！");
        });
    }
}
