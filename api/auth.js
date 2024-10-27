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

    // 重定向回主页面，并将用户信息作为查询参数传递
    res.status(200).json({ 
      success: true, 
      message: "Authorization successful",
      user: {
        login: userResponse.data.login,
        name: userResponse.data.name,
        avatar_url: userResponse.data.avatar_url
      },
      accessToken: accessToken
    });
  } catch (error) {
    console.error('Error in auth callback:', error);
    res.redirect('/?error=Authorization failed');
  }
};
