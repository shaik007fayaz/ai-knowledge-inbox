import dns from 'node:dns/promises';
import net from 'node:net';
import { UnprocessableError } from '../errors';

export type HostLookup = (hostname: string) => Promise<string[]>;
export type UrlGuard = (url: string) => Promise<void>;

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast + reserved
  );
}

export function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateV4(ip);
  if (version === 6) {
    const v6 = ip.toLowerCase();
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateV4(mapped[1]);
    return (
      v6 === '::1' ||
      v6 === '::' ||
      v6.startsWith('fc') ||
      v6.startsWith('fd') || // fc00::/7 unique local
      /^fe[89ab]/.test(v6) // fe80::/10 link-local
    );
  }
  return true; // not an IP at all: refuse
}

const defaultLookup: HostLookup = async (hostname) =>
  (await dns.lookup(hostname, { all: true })).map((r) => r.address);

/** Throws UnprocessableError unless the URL is http(s) and every address it resolves to is public. */
export async function assertPublicUrl(rawUrl: string, lookup: HostLookup = defaultLookup): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnprocessableError('That is not a valid URL', 'INVALID_URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnprocessableError('Only http and https URLs are supported', 'INVALID_URL');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: string[];
  if (net.isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = await lookup(host);
    } catch {
      throw new UnprocessableError(`Could not resolve host "${host}"`, 'UNREACHABLE_URL');
    }
  }
  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new UnprocessableError('That URL points to a private or internal address and cannot be fetched', 'BLOCKED_URL');
  }
}
