// 移除主题列表和相关变量

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
    });

    $(window).on('resizeEnd', function () {
        if (editor) {
            editor.resize();
        }
        // 强制重新计算布局
        $('body').hide().show(0);
    });

    // 其他初始化代码保持不变...

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
        const clientId = 'YOUR_GITHUB_CLIENT_ID'; // 替换为你的 GitHub OAuth App 客户端 ID
        const redirectUri = encodeURIComponent('https://your-app-url.com/api/auth/callback/github'); // 替换为你的回调 URL
        const scope = 'public_repo';
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
        window.location.href = authUrl;
    }

    // 确保登录按钮点击事件被正确绑定
    $("#authLink, #authorizeButton").click(function(e) {
        e.preventDefault();
        authorizeGitHub();
    });
});

// 保留窗口大小调整相关的代码...
