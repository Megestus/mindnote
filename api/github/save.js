const axios = require('axios');

module.exports = async (req, res) => {
    const { content, fileName, sha } = req.body;
    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        console.error('No access token provided');
        return res.status(401).json({ success: false, error: 'No access token provided' });
    }

    try {
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` }
        });
        const username = userResponse.data.login;

        console.log('Saving file...');
        const saveResponse = await axios.put(`https://api.github.com/repos/${username}/mindnote-blog/contents/${fileName}`, {
            message: 'Update from MindNote',
            content: Buffer.from(content).toString('base64'),
            sha: sha // 添加 sha 参数
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
