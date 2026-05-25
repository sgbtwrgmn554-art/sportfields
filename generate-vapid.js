const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('Copy these to Vercel env vars:\n');
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('CRON_SECRET=' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
