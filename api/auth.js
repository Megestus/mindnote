const axios = require('axios');

module.exports = async (req, res) => {
  const { code } = req.query;

  try {
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        Accept: 'application/json'
      }
    });

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`
      }
    });

    res.redirect(`/?login=${userResponse.data.login}&name=${userResponse.data.name}&avatar_url=${userResponse.data.avatar_url}&access_token=${accessToken}`);
  } catch (error) {
    console.error('Error in auth callback:', error);
    res.status(500).send('Authentication failed');
  }
};
