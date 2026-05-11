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
  betaGroupId?: string;
}

interface BetaGroupResource {
  id: string;
  attributes?: {
    isInternalGroup?: boolean;
  };
}

interface BetaTesterResource {
  id: string;
  attributes?: {
    email?: string;
  };
}

interface AppStoreConnectApiError {
  code?: string;
  status?: string;
  title?: string;
  detail?: string;
}

interface AppStoreConnectErrorResponse {
  errors?: AppStoreConnectApiError[];
}

function cleanScalarEnv(value: string | undefined): string | undefined {
  return value?.replace(/\\n/g, '').trim();
}

function getConfig(): AppStoreConnectConfig {
  // Trim whitespace and escaped newlines. Vercel env values can accidentally
  // contain a literal "\n", which .trim() does not remove.
  const keyId = cleanScalarEnv(process.env.APP_STORE_CONNECT_KEY_ID);
  const issuerId = cleanScalarEnv(process.env.APP_STORE_CONNECT_ISSUER_ID);
  const privateKeyBase64 = process.env.APP_STORE_CONNECT_PRIVATE_KEY?.trim();
  const appId = cleanScalarEnv(process.env.APP_STORE_CONNECT_APP_ID);
  const betaGroupId = cleanScalarEnv(process.env.APP_STORE_CONNECT_BETA_GROUP_ID);

  if (!keyId || !issuerId || !privateKeyBase64 || !appId) {
    throw new Error('Missing App Store Connect configuration. Required: APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_PRIVATE_KEY, APP_STORE_CONNECT_APP_ID');
  }

  // Try to decode as base64 first, fall back to raw PEM if it fails
  let privateKey: string;
  try {
    const decoded = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
    // Check if decoded looks like a PEM key
    if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = decoded;
    } else {
      // Not base64 encoded, use as-is (might have escaped newlines)
      privateKey = privateKeyBase64.replace(/\\n/g, '\n');
    }
  } catch {
    // Failed to decode, use as-is with escaped newlines converted
    privateKey = privateKeyBase64.replace(/\\n/g, '\n');
  }

  // Debug: log key info (not the actual key)
  console.log('[ASC] Config loaded:', {
    keyId,
    issuerId,
    appId,
    rawKeyLength: privateKeyBase64.length,
    decodedKeyLength: privateKey.length,
    keyStartsWith: privateKey.substring(0, 27), // Just "-----BEGIN PRIVATE KEY-----"
    betaGroupId: betaGroupId ? 'configured' : 'auto-detect',
  });

  return { keyId, issuerId, privateKey, appId, betaGroupId };
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
 * Get beta group ID for the app (first external beta group)
 */
async function getBetaGroupId(token: string, appId: string): Promise<string> {
  const response = await fetch(
    `${APP_STORE_API_BASE}/apps/${appId}/betaGroups?limit=10`,
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
    throw new Error('No beta groups found for this app. Create a beta group in App Store Connect first.');
  }

  // Find the first external (non-internal) beta group, or use the first one if all are internal
  const externalGroup = (data.data as BetaGroupResource[]).find(
    (group) => !group.attributes?.isInternalGroup
  );
  const groupToUse = externalGroup || data.data[0];

  return groupToUse.id;
}

function getHeaders(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function formatApiError(errorData: AppStoreConnectErrorResponse, fallback: string): string {
  const firstError = errorData.errors?.[0];
  return firstError?.detail || firstError?.title || fallback;
}

function mentionsAlreadyAssigned(error: AppStoreConnectApiError): boolean {
  const text = `${error.code || ''} ${error.title || ''} ${error.detail || ''}`.toLowerCase();
  return text.includes('already') || text.includes('exists') || text.includes('duplicate');
}

async function findBetaTesterByEmail(token: string, email: string): Promise<string | null> {
  const params = new URLSearchParams({
    'filter[email]': email.toLowerCase().trim(),
    limit: '1',
  });

  const response = await fetch(`${APP_STORE_API_BASE}/betaTesters?${params.toString()}`, {
    headers: getHeaders(token),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({} as AppStoreConnectErrorResponse));
    throw new Error(formatApiError(errorData, `Failed to find beta tester: HTTP ${response.status}`));
  }

  const data = await response.json() as { data?: BetaTesterResource[] };
  return data.data?.[0]?.id || null;
}

async function addTesterToBetaGroup(
  token: string,
  testerId: string,
  betaGroupId: string
): Promise<{ success: boolean; alreadyInvited?: boolean; error?: string }> {
  const response = await fetch(`${APP_STORE_API_BASE}/betaTesters/${testerId}/relationships/betaGroups`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      data: [{ type: 'betaGroups', id: betaGroupId }],
    }),
  });

  if (response.status === 204) {
    return { success: true };
  }

  const errorData = await response.json().catch(() => ({} as AppStoreConnectErrorResponse));
  const errors = errorData.errors || [];

  if (response.status === 409 && errors.some(mentionsAlreadyAssigned)) {
    return { success: true, alreadyInvited: true };
  }

  return {
    success: false,
    error: formatApiError(errorData, `Failed to add tester to beta group: HTTP ${response.status}`),
  };
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
    const betaGroupId = config.betaGroupId || await getBetaGroupId(token, config.appId);
    const normalizedEmail = email.toLowerCase().trim();

    // Create the beta tester
    const createResponse = await fetch(`${APP_STORE_API_BASE}/betaTesters`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        data: {
          type: 'betaTesters',
          attributes: {
            email: normalizedEmail,
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

    // If the tester already exists, attach them to this app's beta group.
    if (createResponse.status === 409) {
      const testerId = await findBetaTesterByEmail(token, normalizedEmail);

      if (testerId) {
        const groupResult = await addTesterToBetaGroup(token, testerId, betaGroupId);

        if (groupResult.success) {
          console.log(`✅ [TestFlight] Existing tester linked to beta group: ${email}`);
          return {
            success: true,
            testerId,
            alreadyInvited: groupResult.alreadyInvited || false,
          };
        }

        console.error(`❌ [TestFlight] Failed to link existing tester ${email}:`, groupResult.error);
        return {
          success: false,
          error: groupResult.error,
        };
      }

      if (errors.some(mentionsAlreadyAssigned)) {
        console.log(`ℹ️ [TestFlight] Tester already invited: ${email}`);
        return {
          success: true,
          alreadyInvited: true,
        };
      }
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
    cleanScalarEnv(process.env.APP_STORE_CONNECT_KEY_ID) &&
    cleanScalarEnv(process.env.APP_STORE_CONNECT_ISSUER_ID) &&
    process.env.APP_STORE_CONNECT_PRIVATE_KEY &&
    cleanScalarEnv(process.env.APP_STORE_CONNECT_APP_ID)
  );
}
