import { readFileSync } from 'node:fs';
import { Agent, fetch as undiciFetch } from 'undici';
import { config } from '../config.js';

let agent: Agent | null = null;

function getAgent(): Agent {
  if (!agent) {
    agent = new Agent({
      connect: {
        cert: readFileSync(config.TELLER_CERT_PATH),
        key: readFileSync(config.TELLER_KEY_PATH),
      },
    });
  }
  return agent;
}

export async function tellerGet(path: string, accessToken: string): Promise<unknown> {
  const res = await undiciFetch(`https://api.teller.io${path}`, {
    dispatcher: getAgent(),
    headers: {
      Authorization: `Basic ${Buffer.from(`${accessToken}:`).toString('base64')}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Teller ${res.status}: ${body}`);
  }
  return res.json();
}
