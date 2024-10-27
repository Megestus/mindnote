const axios = require('axios');

module.exports = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        return res.status(401).json({ success: false, error: 'No access token provided' });
    }

    try {
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` }
        });
        const username = userResponse.data.login;

        const repoResponse = await axios.get(`https://api.github.com/repos/${username}/mindnote-blog/contents`, {
            headers: { Authorization: `token ${accessToken}` }
        });

        const files = repoResponse.data.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            sha: item.sha
        }));

        res.status(200).json({ success: true, repoName: 'mindnote-blog', files });
    } catch (error) {
        console.error('Error fetching file list:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch file list', details: error.response ? error.response.data : error.message });
    }
};
