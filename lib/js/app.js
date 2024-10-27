 $(function () {
    var editor;

    function initEditor() {
        editor = editormd("editor", {
            width: "100%",
            height: "70vh",
            path: "https://cdn.jsdelivr.net/npm/editor.md@1.5.0/lib/",
            theme: "dark",
            previewTheme: "dark",
            editorTheme: "pastel-on-dark",
            markdown: localStorage.getItem('mindnote-content') || "# Welcome to MindNote",
            codeFold: true,
            saveHTMLToTextarea: true,
            searchReplace: true,
            watch: true,
            htmlDecode: "style,script,iframe|on*",
            toolbar: true,
            previewCodeHighlight: true,
            emoji: true,
            taskList: true,
            tocm: true,
            tex: true,
            flowChart: true,
            sequenceDiagram: true,
            onchange: function () {
                localStorage.setItem('mindnote-content', this.getValue());
            }
        });
    }

    // 显示工作流程提示
    if (!localStorage.getItem('workflowHintSeen')) {
        $("#workflowHint").removeClass('hidden');
        localStorage.setItem('workflowHintSeen', 'true');
    }

    // 折叠/展开工作原理说明
    $("#toggleHint").click(function() {
        $("#workflowHint").toggleClass("collapsed");
        $(this).toggleClass("collapsed");
        
        if ($("#workflowHint").hasClass("collapsed")) {
            $(this).attr("title", "展开工作原理");
        } else {
            $(this).attr("title", "折叠工作原理");
        }
    });

    // 新建文章按钮
    $("#newNoteButton").click(function() {
        if ($("#editor-container").hasClass('hidden')) {
            // 如果编辑器是隐藏的，则显示它
            $("#editor-container").removeClass('hidden').addClass('slide-in');
            if (!editor) {
                initEditor();
            }
            // 当打开编辑器时，折叠工作原理说明
            $("#workflowHint").addClass("collapsed");
            $("#toggleHint").addClass("collapsed");
            $(this).text("折叠编辑器"); // 更改按钮文本
        } else {
            // 如果编辑器已经显示，则隐藏它
            $("#editor-container").addClass('hidden').removeClass('slide-in');
            $(this).html('<iconify-icon icon="mdi:plus"></iconify-icon>新建文章'); // 恢复按钮原始文本和图标
        }
    });

    // GitHub 保存功能
    $("#saveButton").click(function () {
        alert('GitHub 保存功能即将推出！');
    });

    // 下载功能
    $("#downloadButton").click(function() {
        var fileName = $("#fileNameInput").val().trim() || "mindnote.md";
        if (!fileName.toLowerCase().endsWith('.md')) {
            fileName += '.md';
        }
        var content = editor ? editor.getValue() : "";
        var blob = new Blob([content], {type: "text/markdown;charset=utf-8"});
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    });

    // 页面切换逻辑
    $("#homeLink").click(function(e) {
        e.preventDefault();
        $("#homePage").removeClass('hidden');
        $("#authPage").addClass('hidden');
    });

    $("#authLink").click(function(e) {
        e.preventDefault();
        $("#homePage").addClass('hidden');
        $("#authPage").removeClass('hidden');
    });

    // 授权按钮点击事件
    $("#authorizeButton").click(function() {
        const clientId = '实际的Client ID';
        const redirectUri = encodeURIComponent('实际的回调URL');
        const scope = 'public_repo';
        const state = generateRandomState(); // 实现这个函数来生成随机状态
        
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
        
        // 将状态保存到 localStorage，以便在回调时验证
        localStorage.setItem('oauth_state', state);
        
        // 重定向到 GitHub 授权页面
        window.location.href = authUrl;
    });

    function generateRandomState() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // 检查 URL 参数
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
        // 验证 state
        const savedState = localStorage.getItem('oauth_state');
        if (state === savedState) {
            // 发送 code 到后端
            $.ajax({
                url: '/api/auth/callback/github',
                method: 'GET',
                data: { code: code, state: state },
                success: function(response) {
                    if (response.success) {
                        // 登录成功，更新 UI
                        console.log('Logged in as:', response.user.login);
                        // 这里可以更新 UI，显示用户信息等
                    } else {
                        console.error('Login failed');
                    }
                },
                error: function() {
                    console.error('Error during login');
                }
            });
        } else {
            console.error('Invalid state');
        }
        // 清除保存的 state
        localStorage.removeItem('oauth_state');
    }
});
