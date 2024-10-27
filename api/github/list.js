const axios = require('axios');

async function getDirectoryContents(username, repo, path, accessToken) {
    const response = await axios.get(`https://api.github.com/repos/${username}/${repo}/contents/${path}`, {
        headers: { Authorization: `token ${accessToken}` }
    });

    let files = [];
    for (const item of response.data) {
        if (item.type === 'file') {
            files.push({
                name: item.name,
                path: item.path,
                type: item.type,
                sha: item.sha
            });
        } else if (item.type === 'dir') {
            const subFiles = await getDirectoryContents(username, repo, item.path, accessToken);
            files = files.concat(subFiles);
        }
    }
    return files;
}

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

        const files = await getDirectoryContents(username, 'mindnote-blog', '', accessToken);

        res.status(200).json({ success: true, repoName: 'mindnote-blog', files });
    } catch (error) {
        console.error('Error fetching file list:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch file list', details: error.response ? error.response.data : error.message });
    }
};
