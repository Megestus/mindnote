$(function () {
    let editor;

    function initEditor() {
        console.log("Initializing editor...");
        if (editor && typeof editor.remove === 'function') {
            console.log("Removing existing editor...");
            editor.remove();
        }
        console.log("Creating new editor...");
        editor = editormd("editor", {
            width: "100%",
            height: "500px",
            path: "https://cdn.jsdelivr.net/npm/editor.md@1.5.0/lib/",
            theme: "dark",
            previewTheme: "dark",
            editorTheme: "pastel-on-dark",
            markdown: localStorage.getItem('mindnote-content') || "# Welcome to MindNote",
            codeFold: true,
            saveHTMLToTextarea: true,
            searchReplace: true,
            watch: false,
            htmlDecode: "style,script,iframe|on*",
            toolbar: true,
            previewCodeHighlight: true,
            emoji: true,
            taskList: true,
            tocm: true,
            tex: true,
            flowChart: true,
            sequenceDiagram: true,
            onload: function() {
                this.watch();
            },
            onchange: function () {
                localStorage.setItem('mindnote-content', this.getValue());
            }
        });
        console.log("Editor initialized:", editor);
    }

    function toggleWorkflowHint() {
        $("#workflowHint").toggleClass("collapsed");
        const $toggleHint = $("#toggleHint");
        $toggleHint.toggleClass("collapsed");
        $toggleHint.attr("title", $("#workflowHint").hasClass("collapsed") ? "展开工作原理" : "折叠工作理");
    }

    function downloadMarkdown() {
        const fileName = ($("#fileNameInput").val().trim() || "mindnote") + ".md";
        const content = editor ? editor.getValue() : "";
        const blob = new Blob([content], {type: "text/markdown;charset=utf-8"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    }

    function switchPage(showPage, hidePage) {
        $(showPage).removeClass('hidden');
        $(hidePage).addClass('hidden');
    }

    function authorizeGitHub() {
        try {
            const clientId = 'Ov23liuUeW5EaeuLZJtJ';
            const redirectUri = encodeURIComponent('https://mindnote.vercel.app/api/auth/callback/github');
            const scope = 'public_repo';
            const state = Math.random().toString(36).substring(2, 15);
            const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
            console.log('Authorization URL:', authUrl);
            localStorage.setItem('oauth_state', state);
            window.location.href = authUrl;
        } catch (error) {
            console.error('Error in authorizeGitHub:', error);
            alert('启动授权过程时出错，请重试。');
        }
    }

    function handleAuthCallback(code, state) {
        const savedState = localStorage.getItem('oauth_state');
        if (state !== savedState) {
            console.error('Invalid state');
            return;
        }
        $.ajax({
            url: '/api/auth/callback/github',
            method: 'GET',
            data: { code, state },
            success: function(response) {
                if (response.success) {
                    console.log('Authorization successful:', response.message);
                    response.user.accessToken = response.accessToken; // 添加这行
                    localStorage.setItem('user', JSON.stringify(response.user));
                    updateUIForLoggedInUser(response.user);
                    switchPage("#homePage", "#authPage");
                    toggleEditor();
                } else {
                    console.error('Login failed:', response.error);
                    alert('登录失败，请重试。');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error during login:', status, error);
                alert('登录过程中发生错误，请重试。');
            }
        });
        localStorage.removeItem('oauth_state');
    }

    function updateUIForLoggedInUser(user) {
        $("#authLink").hide();
        $("#userInfo").show();
        $("#userAvatar").attr("src", user.avatar_url);
        $("#userName").text(user.name || user.login);
        $("#authorizeButton").hide();
        $("#saveButton").show();
        console.log("User logged in:", user);
        getFileList();
    }

    function updateUIForLoggedOutUser() {
        $("#authLink").show();
        $("#userInfo").hide();
        $("#authorizeButton").show();
        $("#saveButton").hide();
    }

    function logout() {
        localStorage.removeItem('user');
        updateUIForLoggedOutUser();
        console.log("User logged out"); // 添加这行来调试
    }

    function saveToGitHub(isUpdate = false) {
        const content = editor.getValue();
        let fileName = $("#fileNameInput").val().trim();
        
        // 检查文件名是否包含中文字符
        if (/[\u4e00-\u9fa5]/.test(fileName)) {
            alert('警告：文件名不能包含中文字符。请使用英文字母、数字和常见符号。');
            return;
        }
        
        // URL 编码文件名
        fileName = encodeURIComponent(fileName);
        
        const user = JSON.parse(localStorage.getItem('user'));
        const currentFileSha = localStorage.getItem('currentFileSha');
        
        if (!user || !user.accessToken) {
            alert('请先登录并授权 GitHub');
            return;
        }
        
        showLoadingIndicator();
        $.ajax({
            url: '/api/github/save',
            method: 'POST',
            data: JSON.stringify({ content, fileName, sha: isUpdate ? currentFileSha : null }),
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${user.accessToken}`
            },
            success: function(response) {
                hideLoadingIndicator();
                if (response.success) {
                    alert(isUpdate ? '文件更新成功！' : '新文件保存成功！');
                    getFileList();
                    if (!isUpdate) {
                        localStorage.setItem('currentFileSha', response.sha);
                    }
                } else {
                    alert('保存失败：' + response.error);
                    console.error('Save error details:', response.details);
                }
            },
            error: function(xhr, status, error) {
                hideLoadingIndicator();
                alert('保存时发生错误，请重试。');
                console.error('Error saving to GitHub:', status, error);
                console.error('Response:', xhr.responseText);
            }
        });
    }

    function handleAuthRedirect() {
        const urlParams = new URLSearchParams(window.location.search);
        const login = urlParams.get('login');
        const name = urlParams.get('name');
        const avatarUrl = urlParams.get('avatar_url');
        const accessToken = urlParams.get('accessToken');
        const error = urlParams.get('error');
    
        if (login || name || avatarUrl || accessToken || error) {
            console.log('Auth redirect params:', { login, name, avatarUrl, accessToken, error });

            if (login && avatarUrl && accessToken) {
                const user = { login, name, avatar_url: avatarUrl, accessToken };
                localStorage.setItem('user', JSON.stringify(user));
                updateUIForLoggedInUser(user);
                toggleEditor(); // 自动打开编辑器
            } else if (error) {
                console.error('Authorization error:', error);
                alert('授权失败，重试');
            } else {
                console.error('Missing required auth parameters');
            }

            // 清除URL参数
            window.history.replaceState({}, document.title, "/");
        }
    }

    // 初始化
    if (!localStorage.getItem('workflowHintSeen')) {
        $("#workflowHint").removeClass('hidden');
        localStorage.setItem('workflowHintSeen', 'true');
    }

    // 初始化编辑器
    initEditor();

    // 事件绑定
    $("#toggleHint").click(toggleWorkflowHint);
    $("#newNoteButton").click(createNewNote);
    $("#saveButton").click(() => saveToGitHub(false));
    $("#updateButton").click(() => saveToGitHub(true));
    $("#downloadButton").click(downloadMarkdown);
    $("#homeLink").click(e => { e.preventDefault(); switchPage("#homePage", "#authPage"); });
    $("#authLink").click(e => { e.preventDefault(); switchPage("#authPage", "#homePage"); });
    $("#authorizeButton").click(authorizeGitHub);
    $("#logoutButton").click(logout);

    // 页面加载时检查是否是从授权页面重定向回来的
    handleAuthRedirect();

    // 检查用户是否已登录
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        console.log("Found user in localStorage:", user);
        updateUIForLoggedInUser(user);
    } else {
        $("#saveButton").hide(); // 确保未登录时"发送到GitHub"按钮隐藏
    }

    function updateFileList(repoName, files) {
        const $fileList = $('#fileList');
        $fileList.empty();
        $fileList.append(`<h3>${repoName}</h3>`);
        
        const fileTree = buildFileTree(files);
        $fileList.append(renderFileTree(fileTree));
    }

    function buildFileTree(files) {
        const root = { name: '', type: 'dir', children: {} };
        files.forEach(file => {
            const parts = file.path.split('/');
            let current = root;
            parts.forEach((part, index) => {
                if (!current.children[part]) {
                    current.children[part] = { name: part, type: index === parts.length - 1 ? file.type : 'dir', children: {} };
                }
                current = current.children[part];
            });
            if (file.type === 'file') {
                current.sha = file.sha;
            }
        });
        return root;
    }

    function renderFileTree(node, path = '') {
        let html = '<ul>';
        for (const [name, child] of Object.entries(node.children)) {
            const fullPath = path ? `${path}/${name}` : name;
            if (child.type === 'dir') {
                html += `<li><span class="folder">${name}</span>${renderFileTree(child, fullPath)}</li>`;
            } else {
                html += `<li><a href="#" data-path="${fullPath}" data-sha="${child.sha}">${name}</a></li>`;
            }
        }
        html += '</ul>';
        return html;
    }

    function getFileList() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.accessToken) {
            console.error('User not logged in');
            return;
        }

        showLoadingIndicator();
        $.ajax({
            url: '/api/github/list',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${user.accessToken}`
            },
            success: function(response) {
                hideLoadingIndicator();
                if (response.success) {
                    updateFileList(response.repoName, response.files);
                } else {
                    console.error('Failed to get file list:', response.error);
                }
            },
            error: function(xhr, status, error) {
                hideLoadingIndicator();
                console.error('Error getting file list:', status, error);
            }
        });
    }

    // 修改文件点击事件
    $('#fileList').on('click', 'a', function(e) {
        e.preventDefault();
        const filePath = $(this).data('path');
        const sha = $(this).data('sha');
        loadFile(filePath, sha);
    });

    function loadFile(filePath, sha) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.accessToken) {
            console.error('User not logged in');
            return;
        }

        showLoadingIndicator();
        $.ajax({
            url: `https://api.github.com/repos/${user.login}/mindnote-blog/contents/${filePath}`,
            method: 'GET',
            headers: {
                'Authorization': `token ${user.accessToken}`,
                'Accept': 'application/vnd.github.v3.raw'
            },
            success: function(content) {
                hideLoadingIndicator();
                $("#fileNameInput").val(filePath.split('/').pop());
                localStorage.setItem('currentFileSha', sha);
                
                // 确保编辑器展开并初始化
                const $editorContainer = $("#editor-container");
                if ($editorContainer.hasClass('hidden')) {
                    toggleEditor();
                }
                
                // 使用Promise来等待编辑器初始化
                function waitForEditor() {
                    return new Promise((resolve, reject) => {
                        let attempts = 0;
                        const maxAttempts = 50;
                        const checkInterval = setInterval(() => {
                            if (editor && typeof editor.setValue === 'function') {
                                clearInterval(checkInterval);
                                resolve();
                            } else if (attempts >= maxAttempts) {
                                clearInterval(checkInterval);
                                reject(new Error('Editor initialization timeout'));
                            }
                            attempts++;
                        }, 100);
                    });
                }

                waitForEditor()
                    .then(() => {
                        editor.setValue(content);
                        $("#saveButton").hide();
                        $("#updateButton").show();
                    })
                    .catch((error) => {
                        console.error(error);
                        alert('编辑器初始化超时，请刷新页面重试。');
                    });
            },
            error: function(xhr, status, error) {
                hideLoadingIndicator();
                console.error('Error loading file:', status, error);
                alert('加载文件时发生错误，请重试。');
            }
        });
    }

    // 添加到 $(function () { ... }) 中
    $('#fileList').on('click', '.folder', function(e) {
        e.preventDefault();
        $(this).toggleClass('open');
        $(this).next('ul').toggle();
    });

    function showLoadingIndicator() {
        $("#loadingIndicator").removeClass("hidden");
    }

    function hideLoadingIndicator() {
        $("#loadingIndicator").addClass("hidden");
    }

    function createNewNote() {
        if (!editor) {
            initEditor();
        }
        editor.setValue("# 新文章\n\n开始写作...");
        $("#fileNameInput").val("新文章.md");
        localStorage.removeItem('currentFileSha');
        $("#saveButton").show();
        $("#updateButton").hide();
        
        // 确保编辑器可见
        const $editorContainer = $("#editor-container");
        if ($editorContainer.hasClass('hidden')) {
            toggleEditor();
        }
    }

    // 在文档加载完成后初始化编辑器
    $(document).ready(function() {
        console.log("Document ready, initializing editor...");
        initEditor();
    });
});
