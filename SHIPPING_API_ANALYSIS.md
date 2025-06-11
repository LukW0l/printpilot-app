# Shipping API Authentication Analysis

## Apaczka.pl API Issues

### Problem
- Error: "Signature doesn't match" despite correct HMAC-SHA256 implementation
- New credentials: App ID: `1348967_z5nmNo3rYhL7dofphCBVAxVj`, Secret: `w6pdfrydw8uvg7umvtiawgj4eazvdgyd`

### Root Causes Found

1. **Wrong Credentials in .env file**
   - The .env file had old/different credentials
   - Updated to use the correct App ID and Secret

2. **Request Data Format**
   - The `orders` endpoint requires specific JSON format: `{"page": 1, "limit": 10}`
   - Empty objects `{}` or arrays `[]` may cause signature mismatch

3. **Signature String Format**
   - Must be exactly: `{app_id}:{route}:{data}:{expires}`
   - Route should not include trailing slashes
   - Data must be JSON-stringified

### Solution Applied

```javascript
// Correct signature generation
const route = 'orders'  // No trailing slash
const requestData = JSON.stringify({ page: 1, limit: 10 })
const expires = Math.floor(Date.now() / 1000) + (10 * 60)
const stringToSign = `${appId}:${route}:${requestData}:${expires}`
const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex')
```

### Test Endpoints
- `/api/shipping/test-simple` - Basic connection test
- `/api/shipping/test-debug` - Detailed debug information
- `/api/shipping/test-comprehensive` - Tests multiple formats

## Furgonetka.pl API Issues

### Problem
- OAuth2 authentication fails
- Sandbox mode: "invalid_client" error
- Production mode: "invalid_grant" error (wrong password)

### Root Causes

1. **Missing Credentials**
   - Need to add Furgonetka credentials to .env file:
   ```
   FURGONETKA_CLIENT_ID="your_actual_client_id"
   FURGONETKA_CLIENT_SECRET="your_actual_client_secret"
   FURGONETKA_USERNAME="your_email"
   FURGONETKA_PASSWORD="your_password"
   ```

2. **OAuth2 Flow**
   - Uses password grant type
   - Requires: client_id, client_secret, username, password, scope='api'

3. **Environment Detection**
   - Sandbox URL: `https://api.sandbox.furgonetka.pl`
   - Production URL: `https://api.furgonetka.pl`

### Error Meanings
- `invalid_client`: Wrong Client ID or Client Secret
- `invalid_grant`: Wrong username/password combination
- Both errors indicate credential issues

## Next Steps

1. **For Apaczka.pl**:
   - Test with `/api/shipping/test-comprehensive` to verify the fix
   - If still failing, check with support if the new credentials are activated

2. **For Furgonetka.pl**:
   - Add the actual Furgonetka OAuth2 credentials to .env file
   - Verify which environment (sandbox/production) the credentials are for
   - Test with `/api/shipping/test-furgonetka`

## Configuration Files Updated

1. `.env` - Updated with new Apaczka credentials and Furgonetka placeholders
2. `src/lib/apaczka.ts` - Fixed signature generation and request format
3. `src/lib/furgonetka.ts` - Added debugging for OAuth flow
4. Created comprehensive test endpoint for debugging both APIs