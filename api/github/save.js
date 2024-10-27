const axios = require('axios');

module.exports = async (req, res) => {
    const { content, fileName } = req.body;
    const accessToken = req.headers['authorization'].split(' ')[1];

    try {
        // 检查仓库是否存在
        const repoResponse = await axios.get('https://api.github.com/repos/P5093/mindnote-blog', {
            headers: { Authorization: `token ${accessToken}` }
        });

        if (repoResponse.status === 404) {
            // 创建仓库
            await axios.post('https://api.github.com/user/repos', {
                name: 'mindnote-blog',
                description: 'Blog posts from MindNote',
                private: false
            }, {
                headers: { Authorization: `token ${accessToken}` }
            });
        }

        // 保存文件
        const saveResponse = await axios.put(`https://api.github.com/repos/P5093/mindnote-blog/contents/${fileName}`, {
            message: 'Update from MindNote',
            content: Buffer.from(content).toString('base64')
        }, {
            headers: { Authorization: `token ${accessToken}` }
        });

        res.status(200).json({ success: true, message: 'File saved successfully' });
    } catch (error) {
        console.error('Error saving to GitHub:', error);
        res.status(500).json({ success: false, error: 'Failed to save file' });
    }
};
