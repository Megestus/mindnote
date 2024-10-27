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
                    localStorage.setItem('user', JSON.stringify(response.user));
                    updateUIForLoggedInUser(response.user);
                    switchPage("#homePage", "#authPage");
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
    }

    // 初始化
    if (!localStorage.getItem('workflowHintSeen')) {
        $("#workflowHint").removeClass('hidden');
        localStorage.setItem('workflowHintSeen', 'true');
    }

    // 事件绑定
    $("#toggleHint").click(toggleWorkflowHint);
    $("#newNoteButton").click(toggleEditor);
    $("#saveButton").click(() => alert('GitHub 保存功能即将推出！'));
    $("#downloadButton").click(downloadMarkdown);
    $("#homeLink").click(e => { e.preventDefault(); switchPage("#homePage", "#authPage"); });
    $("#authLink").click(e => { e.preventDefault(); switchPage("#authPage", "#homePage"); });
    $("#authorizeButton").click(authorizeGitHub);
    $("#logoutButton").click(logout);

    // 检查 URL 参数
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    if (code && state) {
        handleAuthCallback(code, state);
    }

    // 检查用户是否已登录
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        updateUIForLoggedInUser(user);
    } else {
        updateUIForLoggedOutUser();
    }
});
