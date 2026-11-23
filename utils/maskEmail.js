// nimal.perera@example.com -> ni••••@example.com
export default function maskEmail(email) {
  const [name = '', domain = ''] = String(email || '').split('@');

  if (!domain) return String(email || '');

  const visible = name.slice(0, Math.min(2, name.length));

  return `${visible}••••@${domain}`;
}
