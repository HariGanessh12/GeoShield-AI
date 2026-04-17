# GeoShield-AI Backend: Error Troubleshooting & Deployment Guide

## 🔴 Fixed Issues

### Issue 1: ReferenceError - eventType is not defined
**Cause:** Variable scoping error in externalDataService.js error handler  
**Status:** ✅ FIXED

**What was wrong:**
```javascript
// WRONG - eventType only exists inside try block
try {
    let eventType = 'NORMAL';
    // ... code ...
} catch (error) {
    return getMockData(eventType, geoZone);  // ❌ eventType undefined here
}
```

**Solution:** Fixed in externalDataService.js by:
- Moving variable declarations to function scope
- Adding input validation at function entry
- Ensuring all error paths have safe fallbacks
- Adding proper logging for debugging

---

### Issue 2: Weather API 401 Unauthorized
**Cause:** API key not configured or using hardcoded 'demo_key'  
**Status:** ✅ FIXED

**What was wrong:**
```javascript
// WRONG - demo_key is invalid
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'demo_key';
```

**Solution:** 
- Check environment variable first
- Disable API if key not set (no more demo_key fallback)
- Use safe mock data when API is unavailable
- Added detailed logging to identify API issues

---

### Issue 3: Cascading 500 Errors
**Cause:** One component failure crashed entire endpoint  
**Status:** ✅ FIXED

**Solutions Applied:**
1. **External Data Service** - Multiple independent data fetches with individual error handling
2. **Policy Quote Endpoint** - Each external data call wrapped in try-catch
3. **Claim Triggers Endpoint** - Graceful degradation with empty trigger feed
4. **Zero-Touch Scan** - Returns 503 (Service Unavailable) with graceful messaging

---

## 📋 Configuration Setup

### Step 1: Get Your OpenWeatherMap API Key
1. Visit: https://openweathermap.org/api
2. Sign up for free account
3. Go to API Keys section
4. Copy your API key

### Step 2: Configure Environment Variables

**In Render Dashboard:**
1. Go to your service settings
2. Click "Environment"
3. Add these variables:

```
OPENWEATHER_API_KEY=your_api_key_here
NODE_ENV=production
MONGODB_URI=your_mongo_connection_string
JWT_SECRET=your_secret_key
```

**Locally (.env file):**
```bash
OPENWEATHER_API_KEY=sk_test_xyz123abc456
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/geoshield-ai
JWT_SECRET=dev_secret_key_2026
```

### Step 3: Deploy Changes
```bash
# In your project root
git add -A
git commit -m "Fix: Improve error handling in externalDataService and API endpoints"
git push origin main
```

Render will automatically redeploy!

---

## 🐛 Debugging 500 Errors

### Enable Detailed Logging
Check your backend logs in Render:
1. Go to Render Dashboard → Your Service
2. Click "Logs" tab
3. Look for errors with `[ExternalData]` or `[Policy/Quote]` prefixes

### Common Error Patterns

#### Pattern 1: Weather API Not Responding
```
[ExternalData] Weather API failed (ECONNREFUSED)
```
**Fix:** 
- API key may be invalid
- OpenWeatherMap API may be down
- Network timeout (5 second limit)
- **Solution:** Service uses mock data automatically

#### Pattern 2: Database Connection Failed
```
[Policy/Quote] Failed to fetch claim history
```
**Fix:**
- MongoDB URI incorrect
- Database temporarily down
- Connection pool exhausted
- **Solution:** Quote still generated with empty history

#### Pattern 3: FastAPI Microservice Unavailable
```
AI Engine API unavailable, using local fallback
```
**Fix:**
- FastAPI service not running (optional, fallback is default)
- Network routing issue
- **Solution:** Uses JavaScript risk calculator automatically

---

## 🏗️ Architecture Improvements

### Error Handling Best Practices Applied

#### 1. **Graceful Degradation**
```javascript
// Each data source is independent
const [data1, data2, data3] = await Promise.all([
    fetch1().catch(err => defaultValue1),
    fetch2().catch(err => defaultValue2),
    fetch3().catch(err => defaultValue3)
]);
```

#### 2. **Input Validation**
```javascript
if (!eventType || typeof eventType !== 'string') {
    eventType = 'NORMAL';  // Safe default
}
```

#### 3. **Proper HTTP Status Codes**
- `200 OK` - Success with data
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Auth required
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Unhandled exception (rare now)
- `503 Service Unavailable` - Temporary issue but recoverable

#### 4. **Comprehensive Logging**
```javascript
console.info('[ExternalData] Weather API success (Delhi NCR): ...', {
    temp: 42,
    detected: 'HEATWAVE',
    severity: 0.85
});

console.warn('[Policy/Quote] Failed to fetch claim history:', err.message);

console.error('[Claim/Triggers] Unhandled error:', error.message, error.stack);
```

---

## ✅ Verification Checklist

After deploying, verify each endpoint:

### 1. Policy Quote Endpoint
```bash
curl -X POST https://geoshield-ai-2.onrender.com/api/policy/quote \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_id_here"}'

# Expected: 200 OK with premium quote
```

### 2. Triggers Feed Endpoint
```bash
curl https://geoshield-ai-2.onrender.com/api/claim/triggers/feed \
  -H "Authorization: Bearer your_token"

# Expected: 200 OK with trigger list
```

### 3. Zero-Touch Scan Endpoint
```bash
curl -X POST https://geoshield-ai-2.onrender.com/api/claim/zero-touch-scan \
  -H "Authorization: Bearer your_token"

# Expected: 200 OK with claim status
```

---

## 📊 Expected Behavior After Fix

### Before (Cascading Failures)
```
Request 1: Weather API fails ❌
    ↓
Request 2: eventType undefined ❌
    ↓
Request 3: 500 Server Error ❌
    ↓
Entire endpoint down
```

### After (Graceful Degradation)
```
Request 1: Weather API fails ⚠️ → Use mock data ✅
Request 2: Use mock data ✅
Request 3: Mock data continues working ✅
Endpoint returns 200 with degraded data
```

---

## 🚀 Production Best Practices

### 1. Monitor API Health
Set up alerts for:
- Weather API failures (too many 401s)
- Database connection issues
- FastAPI microservice down
- Mock data usage spikes

### 2. Rate Limiting
Consider adding rate limits to prevent abuse:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100  // limit each IP to 100 requests per windowMs
});

router.use(limiter);
```

### 3. Caching
Cache external data to reduce API calls:
```javascript
const cache = new Map();

function getCached(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.time < 60000) {  // 1 minute
        return cached.data;
    }
    return null;
}
```

### 4. Monitoring & Alerting
- Log all API failures with context
- Alert on high mock data usage
- Track error trends over time
- Set up uptime monitoring

---

## 📝 Code Changes Summary

### Files Modified
1. **backend/services/externalDataService.js**
   - Fixed variable scoping in error handlers
   - Added comprehensive input validation
   - Improved error logging with context
   - Added apiUsed flag to track data source

2. **backend/api/policy.js**
   - Added error handling for each external data fetch
   - Safe defaults for all optional data
   - Better error messages for debugging

3. **backend/api/claim.js**
   - Improved error handling in /triggers/feed
   - Better error handling in /zero-touch-scan
   - Returns 503 instead of 500 for recoverable errors

4. **backend/.env.example**
   - Documentation for required variables
   - Comments on optional integrations

---

## 🆘 Still Getting 500 Errors?

### Check These
1. **Environment Variables**
   ```bash
   # Verify OPENWEATHER_API_KEY is set in Render
   # Check if valid (not 'demo_key' or placeholder)
   ```

2. **MongoDB Connection**
   ```bash
   # Test MongoDB URI
   # Check if credentials are correct
   # Verify IP whitelist allows Render IPs
   ```

3. **Recent Logs**
   ```bash
   # In Render dashboard, check recent error logs
   # Look for [ExternalData], [Policy/Quote], [Claim/] prefixes
   ```

4. **Clear Cache & Redeploy**
   ```bash
   # Force full rebuild
   git push origin main --force
   ```

---

## 📞 Need Help?

Check logs with:
- Format: `[Service] Error message with context`
- Look for `console.error` or `console.warn` lines
- Stack traces show exact line numbers
- Review this guide for that error pattern

**End of Troubleshooting Guide**
