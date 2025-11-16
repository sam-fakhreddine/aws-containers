# Example Verbose Debug Logs

When DEBUG=1 is enabled, you'll see detailed logs showing exactly why each profile is classified as SSO or credentials-based.

## Example Output

### SSO Profile Detection

```
[0.001s] → Building profile info for: my-sso-profile
[0.001s]   → Checking config file for SSO markers
[0.002s]   → Reading config for profile: my-sso-profile
[0.002s]     → Found profile section [my-sso-profile]
[0.002s]       • sso_session = my-session
[0.002s]       • sso_region = us-east-1
[0.002s]       • sso_account_id = 123456789012
[0.002s]       • sso_role_name = MyRole
[0.003s]   ✓ Found config for profile: my-sso-profile (5 keys)
[0.003s]   → Found config for my-sso-profile
[0.003s]   ✓ CLASSIFIED AS SSO - Found markers: sso_session=my-session
[0.003s]   → SSO profile details
[0.003s]       sso_region: us-east-1
[0.003s]       sso_account_id: 123456789012
[0.003s]       sso_role_name: MyRole
[0.003s]   ✓ Final classification: SSO (has_credentials=False)
```

### Credentials-Based Profile Detection

```
[0.004s] → Building profile info for: my-creds-profile
[0.004s]   → Checking config file for SSO markers
[0.005s]   → Reading config for profile: my-creds-profile
[0.005s]   ✗ No config found for profile: my-creds-profile
[0.005s]   → No config found - checking credentials file only
[0.006s]   → Parsing credentials
[0.006s]     → Found credential key: aws_access_key_id
[0.006s]   ✓ Using cached data for credentials (5 profiles)
[0.006s]   ✓ CLASSIFIED AS CREDENTIALS - Found only in credentials file (no config)
[0.006s]   ✓ Final classification: CREDENTIALS (has_credentials=True)
```

### Profile With Config But No SSO (e.g., role assumption)

```
[0.007s] → Building profile info for: my-role-profile
[0.007s]   → Checking config file for SSO markers
[0.008s]   → Reading config for profile: my-role-profile
[0.008s]     → Found profile section [my-role-profile]
[0.008s]   ✓ Found config for profile: my-role-profile (3 keys)
[0.008s]   → Found config for my-role-profile
[0.008s]   → Config found but NO SSO markers - checking credentials file
[0.009s]   → Parsing credentials
[0.009s]   ✓ Using cached data for credentials (5 profiles)
[0.009s]   ✗ Not found in credentials file - checking if it's role assumption
[0.009s]   ✓ Final classification: CREDENTIALS (has_credentials=False)
```

### Summary at End

```
[0.010s] ✓ Profile classification summary:
[0.010s]   • SSO profiles (3): my-sso-profile, another-sso, third-sso
[0.010s]   • Credential profiles (5): default, prod, staging, dev, test
```

## What to Look For

### If SSO profiles show as credentials:
Look for these log patterns:
- "Config found but NO SSO markers" - means the profile config doesn't have `sso_start_url` or `sso_session`
- "No config found" - means the profile only exists in credentials file
- Check that your config file has the correct SSO fields

### If credentials show as SSO:
Look for these log patterns:
- "CLASSIFIED AS SSO - Found markers:" - shows which SSO field triggered classification
- Check if you accidentally have `sso_session` or `sso_start_url` in that profile's config

### File parsing issues:
- "Using cached data" - means we're using cached file parsing (good for performance)
- "Parsed X profiles from config/credentials" - shows what was found in each file
- "Found profile section [name]" - confirms the profile exists in the config file
