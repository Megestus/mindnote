const axios = require('axios');

module.exports = async (req, res) => {
  const { code, state } = req.query;

  try {
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.REDIRECT_URI
    }, {
      headers: {
        accept: 'application/json'
      }
    });

    const accessToken = tokenResponse.data.access_token;

    // 获取用户信息
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`
      }
    });

    res.status(200).json({ success: true, message: "Authorization successful" });
  } catch (error) {
    console.error('Error in auth callback:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};