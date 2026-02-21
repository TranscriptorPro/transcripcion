# Apps Script Deployment Information

## Current Deployment
- **Deployment ID:** `AKfycbw9xT0IdmPbpIsncavlktd3a9vJgao1wR-kwaEZA2PUUVXEo2GIIfV-FgJpBHE_-u9ofg`
- **Web App URL:** `https://script.google.com/macros/s/AKfycbw9xT0IdmPbpIsncavlktd3a9vJgao1wR-kwaEZA2PUUVXEo2GIIfV-FgJpBHE_-u9ofg/exec`
- **Library URL:** `https://script.google.com/macros/library/d/1Oj1P1a443VcU7uuHkVYASOi26_zMUmcCz_PZfJq9_i-NthvAlcD07JOS/2`
- **Last Updated:** 2026-02-20
- **Version:** 2 (includes CORS fix)

## Configuration
- **Sheet Name:** `Usuarios_Transcriptor`
- **Admin Key:** Set via `adminKey` in `admin_config.json` (⚠️ Change to a secure random string in production; ideally use Apps Script Properties Service)
- **Access Level:** Anyone, even anonymous (required for web app)

## CORS Configuration
✅ Includes `Access-Control-Allow-Origin: *` headers
✅ Supports `OPTIONS` preflight requests via `doOptions()` function
✅ Compatible with GitHub Pages deployment

## Endpoints
1. **GET** `?action=admin_list_users&adminKey=XXX` - List all users
2. **POST** `action=admin_update_user` - Update user fields
3. **GET** `?id=USER_ID&deviceId=DEVICE_ID` - Validate user (for main app)
4. **POST** `action=update_usage` - Increment usage counter

## Notes
- URL changes with each new deployment version
- After updating the script, create a new version in "Gestionar implementaciones"
- Copy the new URL and update `admin.html` and `admin_config.json`
