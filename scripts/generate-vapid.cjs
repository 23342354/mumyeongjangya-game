// 서버에 직접 배포하지 마세요. 운영진 컴퓨터에서 node 명령으로 한 번 실행합니다.
// VAPID 비밀키는 GitHub Pages, config.js, 채팅에 절대 올리지 마세요.
const {createECDH}=require('node:crypto');
const v=createECDH('prime256v1');v.generateKeys();
const publicKey=v.getPublicKey('base64url','uncompressed');
const privateKey=v.getPrivateKey('base64url');
console.log('MMJY_VAPID_PUBLIC_KEY = '+publicKey);
console.log('MMJY_VAPID_PRIVATE_KEY = '+privateKey);
console.log('MMJY_VAPID_SUBJECT = https://ignorance.site');
console.log('\n두 키는 Supabase Edge Function Secrets에만 입력하세요.');
