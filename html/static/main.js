let currentDir = "";
let fileToRename = null;  // 用来存储当前正在修改名称的文件对象

function renameFile() {
    const newName = document.getElementById("new-name").value.trim();
    const oldName = fileToRename.name;

    // 如果新名称为空或与原名称相同，关闭弹出框
    if (!newName || newName === oldName) {
        closeRenameModal();
        return;
    }

    // 执行重命名操作
    const secretKey = localStorage.getItem("secretKey");
    fetch(`/change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            path: currentDir + "/" + oldName,
            name: newName,
            type: fileToRename.type,  // 传递文件或文件夹类型
            secretKey: secretKey      // 传递秘钥
        })
    }).then(res => res.json())
        .then(data => {
            if (data.code === 0) {
                console.log("重命名成功!");
                fetchFiles();  // 重新加载文件列表
            } else {
                alert("重命名失败: " + data.info);
            }
        }).catch(err => console.error("重命名失败", err));

    // 关闭弹出框
    closeRenameModal();
}

function closeRenameModal() {
    document.getElementById("rename-modal").style.display = "none";  // 隐藏弹出框
    fileToRename = null;  // 清空当前修改的文件信息
}

//修改名称
function changeName(fileName, type) {
    const secretKey = localStorage.getItem("secretKey");
    if (!secretKey) {
        alert("秘钥未填写或无效！");
        return;
    }

    // 设置正在修改的文件
    fileToRename = { name: fileName, type: type };

    // 显示弹出框
    document.getElementById("rename-modal").style.display = "block";
    document.getElementById("new-name").value = fileName;  // 设置输入框初始值为当前文件名
}

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
        headers: { "Content-Type": "application/json" },
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

//解压文件
function  unzipFile(fileName){
    const secretKey = localStorage.getItem("secretKey");
    if (!secretKey) {
        alert("秘钥未填写或无效！");
        return;
    }

    if (!confirm(`确定要解压 ${fileName} 吗？`)) return;

    fetch(`/unzip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            path: currentDir + "/" + fileName,
            secretKey: secretKey
        })
    }).then(res => res.json())
        .then(data => {
            if (data.code === 0) {
                alert("解压成功！");
                fetchFiles();
            } else {
                alert("解压失败: " + data.info);
            }
        }).catch(err => {
        console.error("解压失败", err);
        alert("解压请求失败！");
    });
}


function fetchFiles() {
    fetch(`/files?dir=${currentDir}`).then(res => res.json()).then(data => {
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

            //添加右键按钮列表
            li.addEventListener('contextmenu', function(e) {
                if (file.type === 'file') {
                    e.preventDefault();
                    contextFile = file;
                    const menu = document.getElementById("context-menu");
                    menu.style.display = "block";
                    // 确保菜单不会超出屏幕边界
                    let x = e.pageX;
                    let y = e.pageY;
                    const menuWidth = 120;
                    if (x + menuWidth > window.innerWidth) x -= menuWidth;

                    menu.style.left = x + "px";
                    menu.style.top = y + "px";
                }
            });

            if (file.type === "file") {
                fileName.innerHTML = `📄${file.name} <a id="file-name">${showFileSize(Number(file.size))} </a>`;
                fileName.onclick = () => {
                    let curFilePath = currentDir + "/" + file.name;
                    console.log(curFilePath);
                }

            } else {
                fileName.innerHTML = `📂 ${file.name}/`;
                fileName.style.color = "#095af1";
                fileName.style.cursor = "pointer";
                fileName.onclick = () => {
                    currentDir += "/" + file.name;
                    console.log(currentDir);
                    updatePathDisplay()
                    fetchFiles();
                };
            }

            // 创建一个容器 div 来包裹按钮
            let buttonContainer = document.createElement("div");
            buttonContainer.style.display = "flex";
            buttonContainer.style.justifyContent = "flex-end"; // 把按钮放在右边
            buttonContainer.style.gap = "10px"; // 按钮之间有一点间隔

            // 仅对 zip 文件添加解压按钮
            if (file.type === "file" && file.name.toLowerCase().endsWith(".zip")) {
                let unzipBtn = document.createElement("button");
                unzipBtn.textContent = "解压";
                unzipBtn.style.backgroundColor = "orange";
                unzipBtn.style.color = "white";
                unzipBtn.style.border = "none";
                unzipBtn.style.borderRadius = "5px";
                unzipBtn.style.cursor = "pointer";
                unzipBtn.onclick = () => unzipFile(file.name);
                buttonContainer.appendChild(unzipBtn);
            }

            let changeBtn = document.createElement("button");
            changeBtn.textContent = "修改名称"
            changeBtn.classList.add("change-btn");
            changeBtn.onclick = () => changeName(file.name, file.type);

            let deleteBtn = document.createElement("button");
            deleteBtn.textContent = " 删除 ";
            deleteBtn.classList.add("delete-btn");
            deleteBtn.onclick = () => deleteFileOrFolder(file.name, file.type);

            // 把按钮添加到容器中
            buttonContainer.appendChild(changeBtn);
            buttonContainer.appendChild(deleteBtn);

            li.appendChild(fileName);
            li.appendChild(buttonContainer);
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
        document.getElementById("secret-value").value = secretKey;
    }
}

// 保存秘钥到本地存储
function saveSecretKey() {
    const secretKey = document.getElementById("secret-value").value;
    if (secretKey.indexOf("填写成功") >= 0) {
        return;
    }
    localStorage.setItem("secretKey", secretKey);
    document.getElementById("secret-value").value = secretKey + "  填写成功"
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

    // ✅ 1. 秘钥必须最先
    formData.append("secretKey", secretKey);

    // ✅ 2. 所有路径其次
    uploadList.forEach(file => {
        formData.append("paths", file.fullPath);
    });

    // ✅ 3. 文件放最后
    uploadList.forEach(file => {
        formData.append("files", file);
    });

    let xhr = new XMLHttpRequest();
    xhr.open("POST", `/upload?dir=${currentDir}`, true);

    let lastLoaded = 0;
    let lastTime = Date.now();

    const startTime = Date.now();
    let totalBytes = 0;

    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            totalBytes = e.total;
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000; // 秒
            const loadedDiff = e.loaded - lastLoaded;  // 这段时间传了多少字节

            // 避免除以0
            const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0;

            // 更新进度条
            let percent = (e.loaded / e.total) * 100;
            document.getElementById("progress").style.display = "block";
            document.getElementById("progress-bar").style.width = percent + "%";

            // 显示速度和剩余时间
            const remaining = speed > 0 ? (e.total - e.loaded) / speed : 0;
            document.getElementById("upload-speed").textContent =
                `${formatSpeed(speed)}  剩余 ${formatTime(remaining)}  ${percent.toFixed(1)}%`;

            lastLoaded = e.loaded;
            lastTime = now;
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

        const totalTime = (Date.now() - startTime) / 1000;
        const avgSpeed = totalTime > 0 ? totalBytes / totalTime : 0;
        document.getElementById("upload-speed").textContent =
            `✅ 上传完成  平均速度 ${formatSpeed(avgSpeed)}  耗时 ${formatTime(totalTime)}`;

        document.getElementById("upload-status").style.display = "block";
        uploadList = [];
        updateUploadList();
        fetchFiles();
    };

    xhr.send(formData);

    //上传的时候隐藏删除按钮
    const deleteButton = document.querySelectorAll("#upload-list .delete-btn");
    deleteButton.forEach((btn) => {
        btn.style.display = "none"; // 隐藏删除按钮
    });

};

function formatSpeed(bytesPerSec) {
    if (bytesPerSec < 1024) return bytesPerSec.toFixed(0) + " B/s";
    if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(1) + " KB/s";
    return (bytesPerSec / 1024 / 1024).toFixed(2) + " MB/s";
}

function formatTime(seconds) {
    if (!isFinite(seconds) || seconds <= 0) return "--";
    if (seconds < 60) return seconds.toFixed(0) + "s";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m${s}s`;
}

let contextFile = null; // 存储当前右键点击的文件信息

// 隐藏右键菜单
window.addEventListener("click", () => {
    document.getElementById("context-menu").style.display = "none";
});

// 下载处理
function handleDownload() {
    if (!contextFile) return;
    const path = currentDir + "/" + contextFile.name;
    // 假设你的下载接口是 /download?path=...
    const downloadUrl = `/download?path=${encodeURIComponent(path)}&secretKey=${localStorage.getItem("secretKey")}`;

    // 创建隐藏的 a 标签触发下载
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = contextFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 复制链接处理
function handleCopyLink() {
    if (!contextFile) return;
    const path = currentDir + "/" + contextFile.name;
    // 构建完整 URL (根据你的后端路由调整)
    const fullUrl = window.location.origin + `/download?path=${encodeURIComponent(path)}&secretKey=${localStorage.getItem("secretKey")}`;

    navigator.clipboard.writeText(fullUrl).then(() => {
        alert("链接已复制到剪贴板！");
    }).catch(err => {
        console.error("复制失败", err);
    });
}

// 页面加载时加载秘钥
loadSecretKey();
fetchFiles();