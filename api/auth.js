const axios = require('axios');

module.exports = async (req, res) => {
  const { code, state } = req.query;

  console.log('Received auth callback with code:', code, 'and state:', state);

  try {
    console.log('Requesting access token from GitHub...');
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

    console.log('Token response received:', tokenResponse.data);
    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      console.error('No access token received from GitHub');
      throw new Error('Failed to obtain access token');
    }

    console.log('Requesting user information from GitHub...');
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`
      }
    });

    console.log('User information received:', userResponse.data);

    const redirectUrl = new URL(process.env.FRONTEND_URL || 'https://mindnote.vercel.app');
    redirectUrl.searchParams.append('login', userResponse.data.login);
    redirectUrl.searchParams.append('name', userResponse.data.name || '');
    redirectUrl.searchParams.append('avatar_url', userResponse.data.avatar_url);
    redirectUrl.searchParams.append('accessToken', accessToken);

    console.log('Redirecting to:', redirectUrl.toString());
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Error in auth callback:', error.response ? error.response.data : error.message);
    console.error('Error stack:', error.stack);
    res.redirect(`${process.env.FRONTEND_URL || 'https://mindnote.vercel.app'}?error=Authorization failed: ${encodeURIComponent(error.message)}`);
  }
};
