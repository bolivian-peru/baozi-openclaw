import https from 'https';

export async function postToTelegram(
  message: string,
  chatId?: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const target = chatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!token || !target) {
    console.warn('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping Telegram post');
    return { success: false, error: 'Telegram env vars not set' };
  }

  // Telegram message limit: 4096 chars
  const truncated = message.length > 4000 ? message.slice(0, 3997) + '…' : message;
  const body = JSON.stringify({ chat_id: target, text: truncated, parse_mode: 'Markdown' });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ success: (res.statusCode ?? 0) < 300 });
        });
      }
    );
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(body);
    req.end();
  });
}
