const axios = require('axios');

module.exports = async (req, res) => {
    const { content, fileName } = req.body;
    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        console.error('No access token provided');
        return res.status(401).json({ success: false, error: 'No access token provided' });
    }

    try {
        // 获取用户信息
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` }
        });
        const username = userResponse.data.login;

        console.log('Checking repository...');
        // 检查仓库是否存在
        try {
            await axios.get(`https://api.github.com/repos/${username}/mindnote-blog`, {
                headers: { Authorization: `token ${accessToken}` }
            });
            console.log('Repository exists');
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('Repository not found, creating...');
                // 创建仓库
                await axios.post('https://api.github.com/user/repos', {
                    name: 'mindnote-blog',
                    description: 'Blog posts from MindNote',
                    private: false
                }, {
                    headers: { Authorization: `token ${accessToken}` }
                });
                console.log('Repository created');
            } else {
                throw error;
            }
        }

        console.log('Saving file...');
        // 保存文件
        const saveResponse = await axios.put(`https://api.github.com/repos/${username}/mindnote-blog/contents/${fileName}`, {
            message: 'Update from MindNote',
            content: Buffer.from(content).toString('base64')
        }, {
            headers: { Authorization: `token ${accessToken}` }
        });

        console.log('File saved successfully');
        res.status(200).json({ success: true, message: 'File saved successfully' });
    } catch (error) {
        console.error('Error saving to GitHub:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: 'Failed to save file', details: error.response ? error.response.data : error.message });
    }
};
