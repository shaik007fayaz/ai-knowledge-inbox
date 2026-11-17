import { describe, expect, it } from 'vitest';
import { assertPublicUrl, isPrivateIp } from '../src/services/ssrf';

const lookupTo = (ip: string) => async () => [ip];

describe('isPrivateIp', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1'])(
    'blocks %s',
    (ip) => expect(isPrivateIp(ip)).toBe(true),
  );
  it.each(['8.8.8.8', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111'])('allows %s', (ip) =>
    expect(isPrivateIp(ip)).toBe(false),
  );
});

describe('assertPublicUrl', () => {
  it('rejects non-http protocols', async () => {
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toMatchObject({ status: 422 });
    await expect(assertPublicUrl('ftp://example.com')).rejects.toMatchObject({ status: 422 });
  });

  it('rejects literal private IPs and the metadata endpoint', async () => {
    await expect(assertPublicUrl('http://127.0.0.1:8080/admin')).rejects.toMatchObject({ code: 'BLOCKED_URL' });
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data')).rejects.toMatchObject({ code: 'BLOCKED_URL' });
    await expect(assertPublicUrl('http://[::1]/')).rejects.toMatchObject({ code: 'BLOCKED_URL' });
  });

  it('rejects hostnames that resolve to a private address', async () => {
    await expect(assertPublicUrl('http://internal.example.com', lookupTo('10.0.0.5'))).rejects.toMatchObject({ code: 'BLOCKED_URL' });
  });

  it('rejects when any resolved address is private', async () => {
    await expect(assertPublicUrl('http://mixed.example.com', async () => ['8.8.8.8', '192.168.0.2'])).rejects.toMatchObject({
      code: 'BLOCKED_URL',
    });
  });

  it('allows hostnames that resolve to public addresses', async () => {
    await expect(assertPublicUrl('https://example.com/page', lookupTo('93.184.216.34'))).resolves.toBeUndefined();
  });
});
