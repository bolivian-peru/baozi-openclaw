export interface PostResult {
  ok: boolean;
  status: number;
  response: unknown;
}

export async function postToAgentBook(args: {
  walletAddress: string;
  content: string;
  endpoint?: string;
}): Promise<PostResult> {
  const endpoint = args.endpoint ?? "https://baozi.bet/api/agentbook/posts";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: args.walletAddress,
      content: args.content,
    }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = await response.text();
  }

  return {
    ok: response.ok,
    status: response.status,
    response: payload,
  };
}
