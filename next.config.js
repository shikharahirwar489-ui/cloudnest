/** @type {import('next').NextConfig} */
const devEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
const nextConfig = { poweredByHeader: false, async headers() { return [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }, { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }, { key: 'Content-Security-Policy', value: `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${devEval}; connect-src 'self'; frame-ancestors 'none';` }] }] } };
module.exports = nextConfig;
