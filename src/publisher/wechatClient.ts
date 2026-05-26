import axios from 'axios';
import { marked } from 'marked';

const BASE = 'https://api.weixin.qq.com/cgi-bin';

// In-memory access token cache (expires in ~2 hours from WeChat)
const tokenCache = { value: '', expiresAt: 0 };

async function getAccessToken(): Promise<string> {
  if (Date.now() < tokenCache.expiresAt) return tokenCache.value;

  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  if (!appId || !appSecret) throw new Error('WECHAT_APP_ID and WECHAT_APP_SECRET must be set');

  const res = await axios.get(`${BASE}/token`, {
    params: { grant_type: 'client_credential', appid: appId, secret: appSecret },
  });

  if (res.data.errcode) throw new Error(`WeChat token error: ${res.data.errmsg}`);

  tokenCache.value = res.data.access_token;
  // Refresh 5 minutes before expiry
  tokenCache.expiresAt = Date.now() + (res.data.expires_in - 300) * 1000;
  return tokenCache.value;
}

export async function publishArticle(title: string, contentMd: string): Promise<void> {
  const token = await getAccessToken();
  const contentHtml = await marked(contentMd);

  // Create draft
  const draftRes = await axios.post(`${BASE}/draft/add?access_token=${token}`, {
    articles: [{ title, content: contentHtml, need_open_comment: 0 }],
  });

  if (draftRes.data.errcode) {
    throw new Error(`WeChat draft error ${draftRes.data.errcode}: ${draftRes.data.errmsg}`);
  }

  const mediaId: string = draftRes.data.media_id;

  // Publish draft to followers
  const pubRes = await axios.post(`${BASE}/freepublish/submit?access_token=${token}`, {
    media_id: mediaId,
  });

  if (pubRes.data.errcode) {
    throw new Error(`WeChat publish error ${pubRes.data.errcode}: ${pubRes.data.errmsg}`);
  }
}
