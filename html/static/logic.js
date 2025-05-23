let currentDir = "";

function showFileSize(size) {
    if (size < 1024) {
        return size + " b"
    }
    if (size < 1024 * 1024) {
        return (size / 1024).toFixed(2) + " KB"
    }
    if (size < 1024 * 1024 * 1024) {
        return (size / 1024 / 1024).toFixed(2) + " MB"
    }
    if (size < 1024 * 1024 * 1024 * 1024) {
        return (size / 1024 / 1024 / 1024).toFixed(2) + " GB"
    }

    return (size / 1024 / 1024 / 1024 / 1024).toFixed(2) + " TB"
}

// 更新当前路径的显示
function updatePathDisplay() {
    const pathDisplay = document.getElementById("current-path");
    pathDisplay.textContent = "当前路径：" + (currentDir === "" ? "/" : currentDir + "/");
}

// 删除文件或文件夹
function deleteFileOrFolder(fileName, type) {
    const secretKey = localStorage.getItem("secretKey");
    if (!secretKey) {
        alert("秘钥未填写或无效！");
        return;
    }

    if (!confirm(`确定要删除 ${fileName} 吗？`)) return;

    fetch(`/delete`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            path: currentDir + "/" + fileName,
            type: type, // 传递文件或文件夹类型
            secretKey: secretKey // 传递秘钥
        })
    }).then(res => res.json())
        .then(data => {
            if (data.code === 0) {
                console.log("删除成功!")
                fetchFiles(); // 重新加载文件列表
            } else {
                alert("删除失败: " + data.info);
            }
        }).catch(err => console.error("删除失败", err));
}

function fetchFiles() {
    fetch(`/files?dir=${currentDir}`)
        .then(res => res.json())
        .then(data => {
            let fileList = document.getElementById("file-list");
            fileList.innerHTML = "";
            if (!data || data.length < 1) {
                return;
            }

            updatePathDisplay();

            let listDire = [];
            let listFiles = [];
            data.forEach(file => {
                if (file.type === "file") {
                    listFiles.push(file);
                } else {
                    listDire.push(file);
                }
            });

            if (listFiles.length > 0) {
                listDire.push(...listFiles);
            }

            listDire.forEach(file => {
                let li = document.createElement("li");
                let fileName = document.createElement("span");
                if (file.type === "file") {
                    fileName.innerHTML = `📄${file.name} <a style="background-color: #555555;border-radius: 5px;padding: 5px;color: #ffffff;">${showFileSize(Number(file.size))} </a>`;

                } else {
                    fileName.innerHTML = `📂 ${file.name}/`;
                    fileName.style.color = "#095af1";
                    fileName.style.cursor = "pointer";
                    fileName.onclick = () => {
                        currentDir += "/" + file.name;
                        fetchFiles();
                    };
                }

                let deleteBtn = document.createElement("button");
                deleteBtn.textContent = " 删除 ";
                deleteBtn.classList.add("delete-btn");
                deleteBtn.onclick = () => deleteFileOrFolder(file.name, file.type);

                li.appendChild(fileName);
                li.appendChild(deleteBtn);
                fileList.appendChild(li);
            });
        });
}

function goUp() {
    let parts = currentDir.split("/");
    if (parts.length <= 1) {
        alert("已经是根目录！");
        return;
    }
    parts.pop();
    currentDir = parts.join("/");
    fetchFiles();
}

let uploadList = [];
const dropArea = document.getElementById("drop-area");

["dragenter", "dragover"].forEach(eventName => {
    dropArea.addEventListener(eventName, e => {
        e.preventDefault();
        dropArea.style.borderColor = "black";
    });
});

["dragleave", "drop"].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
        dropArea.style.borderColor = "#009688";
    });
});

dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    let items = e.dataTransfer.items;
    for (let i = 0; i < items.length; i++) {
        // 尝试获取 FileSystemEntry 对象（仅 Chrome 及部分支持 webkit 前缀的浏览器）
        let entry = items[i].webkitGetAsEntry();
        if (entry) {
            traverseFileTree(entry);
        }
    }
    updateUploadList();
});

// 递归读取文件或文件夹中的子文件
function traverseFileTree(item, path = "") {
    if (item.isFile) {
        // 读取文件对象，并将其加入 uploadList
        item.file((file) => {
            // 可选：为 file 增加属性，保存完整路径
            file.fullPath = path + file.name;
            uploadList.push(file);
            updateUploadList();
            console.log(file.fullPath)
        });
    } else if (item.isDirectory) {
        // 如果是文件夹，则创建一个目录读取器
        let dirReader = item.createReader();
        // 读取目录下的所有条目（文件或子文件夹）
        dirReader.readEntries((entries) => {
            for (let i = 0; i < entries.length; i++) {
                // 递归调用，注意路径累加
                traverseFileTree(entries[i], path + item.name + "/");
            }
        });
    }
}

function updateUploadList() {
    let ul = document.getElementById("upload-list");
    ul.innerHTML = "";
    uploadList.forEach((file, index) => {
        let li = document.createElement("li");
        li.textContent = file.fullPath;
        let btn = document.createElement("button");
        btn.textContent = showFileSize(file.size) + " 删除";
        btn.classList.add("delete-btn");
        btn.onclick = () => {
            uploadList.splice(index, 1);
            updateUploadList();
        };
        li.appendChild(btn);
        ul.appendChild(li);

        //网页滚动到底
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth" // 可选，平滑滚动效果
        });
    });
}

document.getElementById("clean-btn").onclick = () => {
    uploadList = [];
    updateUploadList();
};

// 读取本地存储的秘钥并填充到输入框
function loadSecretKey() {
    const secretKey = localStorage.getItem("secretKey");
    if (secretKey) {
        document.getElementById("secret-key").value = secretKey;
    }
}

// 保存秘钥到本地存储
function saveSecretKey() {
    const secretKey = document.getElementById("secret-key").value;

    if (secretKey.indexOf("填写成功") >= 0) {
        return;
    }
    localStorage.setItem("secretKey", secretKey);
    document.getElementById("secret-key").value = secretKey + "  填写成功"
}

document.getElementById("upload-btn").onclick = () => {
    const secretKey = localStorage.getItem("secretKey");
    if (!secretKey) {
        alert("秘钥未填写或无效！");
        return;
    }

    if (!uploadList || uploadList.length < 1) {
        document.getElementById("upload-status").style.display = "none";
        document.getElementById("progress").style.display = "none";
        console.log("没有上传文件");
        return;
    }

    let formData = new FormData();
    uploadList.forEach(file => {
        formData.append("files", file);
        formData.append("paths", file.fullPath); // 发送文件的相对路径
    });
    formData.append("secretKey", secretKey); // 传递秘钥

    let xhr = new XMLHttpRequest();
    xhr.open("POST", `/upload?dir=${currentDir}`, true);

    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            let percent = (e.loaded / e.total) * 100;
            document.getElementById("progress").style.display = "block";
            document.getElementById("progress-bar").style.width = percent + "%";
        }
    };

    xhr.onload = () => {
        if (xhr.status !== 200) {
            return
        }

        let jsonData;
        try {
            jsonData = JSON.parse(xhr.responseText);
            if (jsonData.code !== 0) {
                console.log(jsonData.info)
                return
            }
        } catch (err) {
            console.log(err);
            return
        }


        document.getElementById("upload-status").style.display = "block";
        uploadList = [];
        updateUploadList();
        fetchFiles();
    };

    xhr.send(formData);
};

// 页面加载时加载秘钥
loadSecretKey();
fetchFiles();