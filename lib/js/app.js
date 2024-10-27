

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
            height: "calc(100vh - 150px)", // 调整高度
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
            onload: function () {
                this.watch();
                generateTOC();
                console.log("Editor fully loaded");
            },
            onchange: function () {
                localStorage.setItem('mindnote-content', this.getValue());
                generateTOC();
            }
        });
        console.log("Editor initialization started");

        $("#editor-container").show();
        $("#editor").show();

        // 在编辑器初始化完成后显示保存按钮
        $("#saveButton").show();
    }

    // 移除 toggleTheme 函数

    // 其他函数保持不变...

    // 移除主题切换按钮的事件监听
    // $("#themeToggle").click(toggleTheme);

    // 移除主题恢复逻辑


    // 始化编辑器
    initEditor();

    // 添加手动调整编辑器大小的功能
    $(window).on('resize', function () {
        if (this.resizeTO) clearTimeout(this.resizeTO);
        this.resizeTO = setTimeout(function () {
            $(this).trigger('resizeEnd');
        }, 300);

        // 如果文件名不以 .md 结尾，添加 .md 后缀
        if (!fileName.toLowerCase().endsWith('.md')) {
            fileName += '.md';
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
            success: function (response) {
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
            error: function (xhr, status, error) {
                hideLoadingIndicator();
                alert('保存���发生错误，请重试。');
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
        $("#saveButton").hide(); // 确保未登录时"发送到GitHub"按隐藏
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
                    current.children[part] = {
                        name: part,
                        type: index === parts.length - 1 ? file.type : 'dir',
                        children: {},
                        path: parts.slice(0, index + 1).join('/'),
                        sha: file.sha
                    };
                }
                current = current.children[part];
            });
        });
        return root;
    }

    function renderFileTree(node, level = 0) {
        let html = '<ul' + (level > 0 ? ' style="display:none;"' : '') + '>';
        for (const [name, child] of Object.entries(node.children)) {
            const indent = '  '.repeat(level);
            if (child.type === 'dir') {
                html += `<li>${indent}<span class="folder" data-path="${child.path}">${name}</span>`;
                html += renderFileTree(child, level + 1);
                html += '</li>';
            } else {
                html += `<li>${indent}<a href="#" data-path="${child.path}" data-sha="${child.sha}">${name}</a></li>`;
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
            success: function (response) {
                hideLoadingIndicator();
                if (response.success) {
                    updateFileList(response.repoName, response.files);
                } else {
                    console.error('Failed to get file list:', response.error);
                }
            },
            error: function (xhr, status, error) {
                hideLoadingIndicator();
                console.error('Error getting file list:', status, error);
            }
        });
    }

    // 修改���件点击事件
    $('#fileList').on('click', 'a', function (e) {
        e.preventDefault();
        const filePath = $(this).data('path');
        const sha = $(this).data('sha');
        loadFile(filePath, sha);

    });

    $(window).on('resizeEnd', function () {
        if (editor) {
            editor.resize();
        }
        // 强制重新计算布局
        $('body').hide().show(0);
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

        // 保编辑器可见
        const $editorContainer = $("#editor-container");
        if ($editorContainer.hasClass('hidden')) {
            toggleEditor();
        }
    }

    function checkEditorVisibility() {
        console.log("Editor container display:", $("#editor-container").css("display"));
        console.log("Editor display:", $("#editor").css("display"));
        console.log("Editor container dimensions:", $("#editor-container").width(), "x", $("#editor-container").height());
        console.log("Editor dimensions:", $("#editor").width(), "x", $("#editor").height());
    }

    // 在初始化编辑器后调用此函数
    $(document).ready(function () {
        console.log("Document ready, initializing editor...");
        initEditor();
        setTimeout(checkEditorVisibility, 1000); // 延迟1秒检查可见性
    });

    function generateTOC() {
        console.log("Generating TOC...");
        if (!editor || !editor.getValue) {
            console.log("Editor not ready for TOC generation");
            return;
        }

        const content = editor.getValue();
        const lines = content.split('\n');
        const toc = [];
        const tocList = $('#tocList');
        tocList.empty();

        lines.forEach(line => {
            if (line.startsWith('#')) {
                const level = line.split(' ')[0].length;  // 计算标题级别
                const title = line.substring(level + 1);
                toc.push({ level, title });
            }
        });

        toc.forEach(item => {
            const li = $('<li>').css('margin-left', (item.level - 1) * 10 + 'px');
            const a = $('<a>').attr('href', '#').text(item.title);
            a.click(function (e) {
                e.preventDefault();
                const cursor = editor.getCursor();
                editor.setCursor(cursor.line, 0);
                editor.find(item.title);
            });
            li.append(a);
            tocList.append(li);
        });
    }

    // 确保在编辑器内容变化时调用 generateTOC
    editor.on('change', function () {
        generateTOC();
    });

    // 使用 setTimeout 来确保 DOM 完全加载
    setTimeout(initEditor, 0);

    // 在编辑器初始化后调用 generateTOC
    generateTOC();

    // 其他初始化代码保持不变...

    // 如果有 createNewNote 函数，确保它显示保存按钮
    function createNewNote() {
        // ... 其他代码 ...
        $("#saveButton").show();
        $("#updateButton").hide();
    }


    // 在加载现有文件时，显示更新按钮而不是保存按钮
    function loadFile(filePath, sha) {
        // ... 其他代码 ...
        $("#saveButton").hide();
        $("#updateButton").show();
    }


    // 确保有保存按钮的点击事件处理
    $("#saveButton").click(function() {
        saveToGitHub(false);
    });

    $("#updateButton").click(function() {
        saveToGitHub(true);
    });

    // ... 其他代码保持不变...

    function authorizeGitHub() {
        const clientId = 'YOUR_ACTUAL_GITHUB_CLIENT_ID'; // 替换为你的实际 GitHub OAuth App 客户端 ID
        const redirectUri = encodeURIComponent('https://mindnote.vercel.app/api/auth/callback/github'); // 使用你的实际部署 URL
        const scope = 'public_repo';
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
        window.location.href = authUrl;
    }

    // 合并登录按钮的点击事件
    $("#authLink, #authorizeButton").click(function(e) {
        e.preventDefault();
        authorizeGitHub();
    });

});

// 保留窗口大小调整相关的代码...
