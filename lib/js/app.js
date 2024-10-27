$(function () {
    let editor;

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

    function toggleWorkflowHint() {
        $("#workflowHint").toggleClass("collapsed");
        const $toggleHint = $("#toggleHint");
        $toggleHint.toggleClass("collapsed");
        $toggleHint.attr("title", $("#workflowHint").hasClass("collapsed") ? "展开工作原理" : "折叠工作原理");
    }

    function toggleEditor() {
        const $editorContainer = $("#editor-container");
        const $newNoteButton = $("#newNoteButton");
        if ($editorContainer.hasClass('hidden')) {
            $editorContainer.removeClass('hidden').addClass('slide-in');
            if (!editor) {
                initEditor();
            }
            $("#workflowHint, #toggleHint").addClass("collapsed");
            $newNoteButton.text("折叠编辑器");
        } else {
            $editorContainer.addClass('hidden').removeClass('slide-in');
            $newNoteButton.html('<iconify-icon icon="mdi:plus"></iconify-icon>新建文章');
        }
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
        const clientId = 'Ov23liuUeW5EaeuLZJtJ';
        const redirectUri = encodeURIComponent('https://mindnote.vercel.app/api/auth/callback/github');
        const scope = 'public_repo';
        const state = Math.random().toString(36).substring(2, 15);
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
        console.log('Authorization URL:', authUrl); // 添加这行
        localStorage.setItem('oauth_state', state);
        window.location.href = authUrl;
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
        console.log("User logged in:", user); // 添加这行来调试
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

    function saveToGitHub() {
        const content = editor.getValue();
        const fileName = $("#fileNameInput").val().trim() || "mindnote.md";
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user || !user.accessToken) {
            alert('请先登录并授权 GitHub');
            return;
        }
        
        $.ajax({
            url: '/api/github/save',
            method: 'POST',
            data: JSON.stringify({ content, fileName }),
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${user.accessToken}`
            },
            success: function(response) {
                if (response.success) {
                    alert('成功保存到GitHub！文件名: ' + fileName);
                } else {
                    alert('保存失败：' + response.error);
                }
            },
            error: function(xhr, status, error) {
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
    
        console.log('Auth redirect params:', { login, name, avatarUrl, accessToken, error });
    
        if (login && avatarUrl && accessToken) {
            const user = { login, name, avatar_url: avatarUrl, accessToken };
            localStorage.setItem('user', JSON.stringify(user));
            updateUIForLoggedInUser(user);
            toggleEditor(); // 自动打开编辑器
        } else if (error) {
            console.error('Authorization error:', error);
            alert('授权失败，请重试');
        } else {
            console.error('Missing required auth parameters');
        }
    
        // 清除URL参数
        window.history.replaceState({}, document.title, "/");
    }

    // 初始化
    if (!localStorage.getItem('workflowHintSeen')) {
        $("#workflowHint").removeClass('hidden');
        localStorage.setItem('workflowHintSeen', 'true');
    }

    // 事件绑定
    $("#toggleHint").click(toggleWorkflowHint);
    $("#newNoteButton").click(toggleEditor);
    $("#saveButton").click(saveToGitHub);
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
        console.log("No user found in localStorage");
        $("#saveButton").hide(); // 确保未登录时"发送到GitHub"按钮隐藏
    }
});
