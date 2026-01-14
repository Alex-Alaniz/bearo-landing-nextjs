import * as jose from 'jose';
import { readFileSync } from 'fs';

const keyId = 'LMD32MVV62';
const issuerId = '69acd06e-c9ff-4bba-9b96-f61e80020882';
const appId = '6756630286';

// Read the key directly
const privateKeyPem = readFileSync('/Users/alexalaniz/Desktop/AuthKey_LMD32MVV62.p8', 'utf-8');
console.log('Key loaded, first line:', privateKeyPem.split('\n')[0]);

try {
  const privateKey = await jose.importPKCS8(privateKeyPem, 'ES256');
  console.log('Key imported successfully');

  const token = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setIssuedAt()
    .setExpirationTime('20m')
    .setAudience('appstoreconnect-v1')
    .sign(privateKey);

  console.log('JWT generated, length:', token.length);

  // Test the token
  const response = await fetch(
    `https://api.appstoreconnect.apple.com/v1/apps/${appId}/betaGroups?limit=1`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('API Response status:', response.status);
  const data = await response.text();
  console.log('API Response:', data.substring(0, 500));

} catch (error) {
  console.error('Error:', error.message);
}
