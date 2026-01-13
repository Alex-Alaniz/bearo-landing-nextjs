// App Store Connect API integration for TestFlight invites
// Docs: https://developer.apple.com/documentation/appstoreconnectapi

import * as jose from 'jose';

// Environment variables required:
// APP_STORE_CONNECT_KEY_ID - API Key ID from App Store Connect
// APP_STORE_CONNECT_ISSUER_ID - Issuer ID from App Store Connect
// APP_STORE_CONNECT_PRIVATE_KEY - Base64 encoded .p8 private key
// APP_STORE_CONNECT_APP_ID - App's Apple ID for TestFlight

const APP_STORE_API_BASE = 'https://api.appstoreconnect.apple.com/v1';

interface AppStoreConnectConfig {
  keyId: string;
  issuerId: string;
  privateKey: string;
  appId: string;
}

function getConfig(): AppStoreConnectConfig {
  const keyId = process.env.APP_STORE_CONNECT_KEY_ID;
  const issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID;
  const privateKeyBase64 = process.env.APP_STORE_CONNECT_PRIVATE_KEY;
  const appId = process.env.APP_STORE_CONNECT_APP_ID;

  if (!keyId || !issuerId || !privateKeyBase64 || !appId) {
    throw new Error('Missing App Store Connect configuration. Required: APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_PRIVATE_KEY, APP_STORE_CONNECT_APP_ID');
  }

  // Decode base64 private key
  const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');

  return { keyId, issuerId, privateKey, appId };
}

/**
 * Generate JWT for App Store Connect API authentication
 * Token is valid for 20 minutes (max allowed by Apple)
 */
async function generateToken(config: AppStoreConnectConfig): Promise<string> {
  const privateKey = await jose.importPKCS8(config.privateKey, 'ES256');

  const token = await new jose.SignJWT({})
    .setProtectedHeader({
      alg: 'ES256',
      kid: config.keyId,
      typ: 'JWT'
    })
    .setIssuer(config.issuerId)
    .setIssuedAt()
    .setExpirationTime('20m')
    .setAudience('appstoreconnect-v1')
    .sign(privateKey);

  return token;
}

/**
 * Get beta group ID for the app (first public beta group)
 */
async function getBetaGroupId(token: string, appId: string): Promise<string> {
  const response = await fetch(
    `${APP_STORE_API_BASE}/apps/${appId}/betaGroups?filter[isInternalGroup]=false&limit=1`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get beta groups: ${response.status} ${error}`);
  }

  const data = await response.json();

  if (!data.data || data.data.length === 0) {
    throw new Error('No external beta groups found for this app. Create a beta group in App Store Connect first.');
  }

  return data.data[0].id;
}

export interface AddTesterResult {
  success: boolean;
  testerId?: string;
  error?: string;
  alreadyInvited?: boolean;
}

/**
 * Add a beta tester to TestFlight
 * @param email - Email address of the tester
 * @param firstName - First name (optional, defaults to "Bearo")
 * @param lastName - Last name (optional, defaults to "Tester")
 */
export async function addBetaTester(
  email: string,
  firstName: string = 'Bearo',
  lastName: string = 'Tester'
): Promise<AddTesterResult> {
  try {
    const config = getConfig();
    const token = await generateToken(config);

    // Get the beta group ID
    const betaGroupId = await getBetaGroupId(token, config.appId);

    // Create the beta tester
    const createResponse = await fetch(`${APP_STORE_API_BASE}/betaTesters`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'betaTesters',
          attributes: {
            email: email.toLowerCase().trim(),
            firstName,
            lastName,
          },
          relationships: {
            betaGroups: {
              data: [{ type: 'betaGroups', id: betaGroupId }],
            },
          },
        },
      }),
    });

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log(`✅ [TestFlight] Added beta tester: ${email}`);
      return {
        success: true,
        testerId: result.data?.id,
      };
    }

    // Handle error responses
    const errorData = await createResponse.json().catch(() => ({}));
    const errors = errorData.errors || [];

    // Check if already invited (409 conflict or specific error code)
    const alreadyInvited = errors.some(
      (e: { code?: string; status?: string }) =>
        e.code === 'ENTITY_ERROR.RELATIONSHIP.INVALID_BETA_TESTER' ||
        e.status === '409'
    );

    if (alreadyInvited) {
      console.log(`ℹ️ [TestFlight] Tester already invited: ${email}`);
      return {
        success: true,
        alreadyInvited: true,
      };
    }

    const errorMessage = errors[0]?.detail || errors[0]?.title || `HTTP ${createResponse.status}`;
    console.error(`❌ [TestFlight] Failed to add tester ${email}:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [TestFlight] Error adding tester:`, message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Check if App Store Connect is configured
 */
export function isConfigured(): boolean {
  return !!(
    process.env.APP_STORE_CONNECT_KEY_ID &&
    process.env.APP_STORE_CONNECT_ISSUER_ID &&
    process.env.APP_STORE_CONNECT_PRIVATE_KEY &&
    process.env.APP_STORE_CONNECT_APP_ID
  );
}
