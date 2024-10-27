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

    // 重定向回主页面，并将用户信息和 accessToken 作为查询参数传递
    const redirectUrl = new URL(process.env.FRONTEND_URL || 'https://mindnote.vercel.app');
    redirectUrl.searchParams.append('login', userResponse.data.login);
    redirectUrl.searchParams.append('name', userResponse.data.name || '');
    redirectUrl.searchParams.append('avatar_url', userResponse.data.avatar_url);
    redirectUrl.searchParams.append('accessToken', accessToken);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Error in auth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=Authorization failed`);
  }
};
