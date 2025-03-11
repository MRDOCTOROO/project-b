export function setupFileUpload(buttonId, dropAreaId, allowedFormats) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = allowedFormats.join(",");
    fileInput.style.display = "none";
    
    // 确保 fileInput 附加到当前 HTML（iframe 内的 upload.html）
    document.querySelector(".upload-container").appendChild(fileInput);

    const button = document.getElementById(buttonId);
    const dropArea = document.getElementById(dropAreaId);

    // 点击按钮弹出文件选择框
    button.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (event) => {
        handleFiles(event.target.files, allowedFormats);
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
        handleFiles(event.dataTransfer.files, allowedFormats);
    });

    function handleFiles(files, allowedFormats) {
        const file = files[0];
        if (!file) return;

        const fileType = file.type;
        if (!allowedFormats.includes(fileType)) {
            alert("不支持的文件格式！");
            return;
        }

        console.log("选中文件：", file.name);
        uploadFile(file);
    }

    function uploadFile(file) {
        console.log("预留上传文件到API的逻辑，文件：", file.name);
        // 这里可以添加 API 上传逻辑
    }
}
