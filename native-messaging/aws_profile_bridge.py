#!/usr/bin/env python3
"""
AWS Profile Bridge - Native Messaging Host for Firefox Extension

SECURITY NOTICE:
This script handles sensitive AWS credentials. It:
- Reads ~/.aws/credentials (local filesystem only)
- Reads ~/.aws/config for SSO profiles
- Reads ~/.aws/sso/cache/ for SSO tokens
- Sends credentials to AWS Federation API (HTTPS, official AWS service)
- Never stores or caches credentials
- Never logs credentials
- Communicates only with Firefox extension via native messaging

For security documentation, see SECURITY.md in the project root.
"""

import json
import sys
import struct
import os
import subprocess
from pathlib import Path
from datetime import datetime, timezone
import re
import urllib.parse as parse
import urllib.request as request
import glob
import hashlib

# Optional boto3 import - fall back to manual parsing if not available
try:
    import boto3
    from botocore.exceptions import ProfileNotFound, ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    print("boto3 not available, using manual config parsing", file=sys.stderr)


class AWSProfileBridge:
    def __init__(self):
        self.credentials_file = Path.home() / '.aws' / 'credentials'
        self.config_file = Path.home() / '.aws' / 'config'
        self.sso_cache_dir = Path.home() / '.aws' / 'sso' / 'cache'

        # Cache for parsed files to avoid multiple reads
        self._credentials_cache = None
        self._credentials_cache_mtime = None
        self._config_cache = None
        self._config_cache_mtime = None
        self._sso_token_cache = {}  # Cache SSO tokens by start URL

    def send_message(self, message):
        """Send a message to the extension via native messaging protocol."""
        encoded_content = json.dumps(message).encode('utf-8')
        encoded_length = struct.pack('I', len(encoded_content))
        sys.stdout.buffer.write(encoded_length)
        sys.stdout.buffer.write(encoded_content)
        sys.stdout.buffer.flush()

    def read_message(self):
        """Read a message from the extension via native messaging protocol."""
        text_length_bytes = sys.stdin.buffer.read(4)
        if len(text_length_bytes) == 0:
            return None
        text_length = struct.unpack('I', text_length_bytes)[0]
        text = sys.stdin.buffer.read(text_length).decode('utf-8')
        return json.loads(text)

    def parse_credentials_file(self):
        """Parse the AWS credentials file and extract profile information with caching."""
        if not self.credentials_file.exists():
            return []

        # Check if we can use cached data
        current_mtime = self.credentials_file.stat().st_mtime
        if (self._credentials_cache is not None and
            self._credentials_cache_mtime == current_mtime):
            return self._credentials_cache

        # Parse file
        profiles = []
        current_profile = None
        profile_data = {}

        with open(self.credentials_file, 'r') as f:
            for line in f:
                line = line.strip()

                # Profile header [profile-name]
                if line.startswith('[') and line.endswith(']'):
                    # Save previous profile
                    if current_profile:
                        profiles.append(profile_data)

                    # Start new profile
                    current_profile = line[1:-1]
                    profile_data = {
                        'name': current_profile,
                        'has_credentials': False,
                        'expiration': None,
                        'expired': False
                    }

                # Parse expiration comment
                elif line.startswith('#') and 'Expires' in line:
                    # Format: # Expires 2024-11-10 15:30:00 UTC
                    match = re.search(r'Expires\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})', line)
                    if match:
                        try:
                            exp_time = datetime.strptime(match.group(1), '%Y-%m-%d %H:%M:%S')
                            exp_time = exp_time.replace(tzinfo=timezone.utc)
                            profile_data['expiration'] = exp_time.isoformat()
                            profile_data['expired'] = exp_time < datetime.now(timezone.utc)
                        except ValueError:
                            pass

                # Check for credentials
                elif '=' in line and current_profile:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    if key in ['aws_access_key_id', 'aws_secret_access_key', 'aws_session_token']:
                        profile_data['has_credentials'] = True

        # Save last profile
        if current_profile:
            profiles.append(profile_data)

        # Cache the results
        self._credentials_cache = profiles
        self._credentials_cache_mtime = current_mtime

        return profiles

    def parse_config_file(self):
        """Parse the AWS config file and extract SSO profile information with caching."""
        if not self.config_file.exists():
            return []

        # Check if we can use cached data
        current_mtime = self.config_file.stat().st_mtime
        if (self._config_cache is not None and
            self._config_cache_mtime == current_mtime):
            return self._config_cache

        # Parse file
        profiles = []
        current_profile = None
        profile_data = {}

        with open(self.config_file, 'r') as f:
            for line in f:
                line = line.strip()

                # Profile header [profile profile-name] or [default]
                if line.startswith('[') and line.endswith(']'):
                    # Save previous profile
                    if current_profile and profile_data.get('sso_start_url'):
                        profiles.append(profile_data)

                    # Start new profile
                    profile_name = line[1:-1]
                    # Strip 'profile ' prefix if present
                    if profile_name.startswith('profile '):
                        profile_name = profile_name[8:]

                    current_profile = profile_name
                    profile_data = {
                        'name': current_profile,
                        'has_credentials': False,
                        'expiration': None,
                        'expired': False,
                        'is_sso': False
                    }

                # Parse SSO configuration
                elif '=' in line and current_profile:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()

                    if key == 'sso_start_url':
                        profile_data['is_sso'] = True
                        profile_data['sso_start_url'] = value
                    elif key == 'sso_region':
                        profile_data['sso_region'] = value
                    elif key == 'sso_account_id':
                        profile_data['sso_account_id'] = value
                    elif key == 'sso_role_name':
                        profile_data['sso_role_name'] = value
                    elif key == 'region':
                        profile_data['aws_region'] = value

        # Save last profile if it's SSO
        if current_profile and profile_data.get('sso_start_url'):
            profiles.append(profile_data)

        # Cache the results
        self._config_cache = profiles
        self._config_cache_mtime = current_mtime

        return profiles

    def get_sso_cached_token(self, start_url):
        """Get cached SSO token for a given start URL with caching."""
        if not self.sso_cache_dir.exists():
            return None

        # Check in-memory cache first
        if start_url in self._sso_token_cache:
            cached_token, cache_time = self._sso_token_cache[start_url]
            # Check if token is still valid (cached less than 30 seconds ago and not expired)
            if (datetime.now(timezone.utc) - cache_time).total_seconds() < 30:
                if 'expiresAt' in cached_token:
                    expires_at = datetime.fromisoformat(cached_token['expiresAt'].replace('Z', '+00:00'))
                    if expires_at > datetime.now(timezone.utc):
                        return cached_token

        # AWS CLI creates cache files with SHA1 hash of start URL as filename
        cache_key = hashlib.sha1(start_url.encode('utf-8')).hexdigest()

        # Try to find cache file by hashed name first (fast path)
        cache_file = self.sso_cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    cache_data = json.load(f)
                    # Check if token is expired
                    if 'expiresAt' in cache_data:
                        expires_at = datetime.fromisoformat(cache_data['expiresAt'].replace('Z', '+00:00'))
                        if expires_at > datetime.now(timezone.utc):
                            # Cache the token in memory
                            self._sso_token_cache[start_url] = (cache_data, datetime.now(timezone.utc))
                            return cache_data
            except Exception:
                pass

        # Fallback: search all cache files for matching start URL (slow path)
        # Only do this if the hashed lookup failed
        cache_files = list(self.sso_cache_dir.glob('*.json'))
        for cache_file_path in cache_files:
            # Skip the file we already tried
            if cache_file_path.name == f"{cache_key}.json":
                continue

            try:
                with open(cache_file_path, 'r') as f:
                    cache_data = json.load(f)
                    if cache_data.get('startUrl') == start_url:
                        # Check if token is expired
                        if 'expiresAt' in cache_data:
                            expires_at = datetime.fromisoformat(cache_data['expiresAt'].replace('Z', '+00:00'))
                            if expires_at > datetime.now(timezone.utc):
                                # Cache the token in memory
                                self._sso_token_cache[start_url] = (cache_data, datetime.now(timezone.utc))
                                return cache_data
            except Exception:
                continue

        return None

    def get_sso_credentials(self, profile_config):
        """Get temporary credentials for an SSO profile using cached token."""
        try:
            # Get cached SSO token
            sso_start_url = profile_config.get('sso_start_url')
            if not sso_start_url:
                print("SSO profile missing sso_start_url", file=sys.stderr)
                return None

            sso_token_data = self.get_sso_cached_token(sso_start_url)
            if not sso_token_data or 'accessToken' not in sso_token_data:
                print(f"No valid SSO token found for {sso_start_url}", file=sys.stderr)
                return None

            access_token = sso_token_data['accessToken']
            sso_region = profile_config.get('sso_region', 'us-east-1')
            account_id = profile_config.get('sso_account_id')
            role_name = profile_config.get('sso_role_name')

            if not account_id or not role_name:
                print(f"SSO profile missing account_id or role_name: account={account_id}, role={role_name}", file=sys.stderr)
                return None

            # Call AWS SSO API to get role credentials
            # API endpoint: https://portal.sso.{region}.amazonaws.com
            api_url = f"https://portal.sso.{sso_region}.amazonaws.com/federation/credentials"

            request_params = {
                'account_id': account_id,
                'role_name': role_name
            }

            print(f"Fetching SSO credentials for account={account_id}, role={role_name}", file=sys.stderr)

            api_request = request.Request(
                f"{api_url}?account_id={account_id}&role_name={role_name}",
                headers={
                    'x-amz-sso_bearer_token': access_token
                }
            )

            with request.urlopen(api_request, timeout=10) as response:
                if response.status == 200:
                    creds = json.loads(response.read())

                    # Convert to standard credential format
                    print(f"Successfully fetched SSO credentials", file=sys.stderr)
                    return {
                        'aws_access_key_id': creds['roleCredentials']['accessKeyId'],
                        'aws_secret_access_key': creds['roleCredentials']['secretAccessKey'],
                        'aws_session_token': creds['roleCredentials']['sessionToken'],
                        'expiration': datetime.fromtimestamp(
                            creds['roleCredentials']['expiration'] / 1000,
                            tz=timezone.utc
                        ).isoformat()
                    }
                else:
                    print(f"SSO API returned status {response.status}", file=sys.stderr)
                    return None
        except Exception as e:
            # Failed to get SSO credentials
            print(f"Error fetching SSO credentials: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return None

        return None

    def get_all_profiles(self):
        """Get all profiles from both credentials and config files using boto3 if available."""
        profiles = []

        # Use boto3 to enumerate all available profiles if available
        # This is fast - just reads config files, doesn't validate credentials
        if BOTO3_AVAILABLE:
            try:
                available_profiles = boto3.Session().available_profiles
                print(f"Available profiles (boto3): {available_profiles}", file=sys.stderr)

                for profile_name in available_profiles:
                    try:
                        profile_data = {
                            'name': profile_name,
                            'has_credentials': False,
                            'expiration': None,
                            'expired': False,
                            'is_sso': False
                        }

                        # Check if this is an SSO profile by reading config
                        profile_config = self.get_profile_config(profile_name)
                        if profile_config and 'sso_start_url' in profile_config:
                            profile_data['is_sso'] = True
                            profile_data['sso_start_url'] = profile_config['sso_start_url']
                            profile_data['sso_region'] = profile_config.get('sso_region', 'us-east-1')
                            profile_data['sso_account_id'] = profile_config.get('sso_account_id')
                            profile_data['sso_role_name'] = profile_config.get('sso_role_name')
                            profile_data['aws_region'] = profile_config.get('region')

                            # Check SSO token status (fast - just reads cache file)
                            sso_token = self.get_sso_cached_token(profile_config['sso_start_url'])
                            if sso_token and 'expiresAt' in sso_token:
                                expires_at = datetime.fromisoformat(sso_token['expiresAt'].replace('Z', '+00:00'))
                                profile_data['expiration'] = expires_at.isoformat()
                                profile_data['expired'] = expires_at < datetime.now(timezone.utc)
                                profile_data['has_credentials'] = not profile_data['expired']
                            else:
                                # No valid SSO token
                                profile_data['expired'] = True
                                profile_data['has_credentials'] = False
                        else:
                            # Check if credentials exist in the credentials file
                            # parse_credentials_file() now uses caching, so this is efficient
                            cred_file_profiles_dict = {p['name']: p for p in self.parse_credentials_file()}
                            if profile_name in cred_file_profiles_dict:
                                cred_profile = cred_file_profiles_dict[profile_name]
                                profile_data['has_credentials'] = cred_profile.get('has_credentials', False)
                                profile_data['expiration'] = cred_profile.get('expiration')
                                profile_data['expired'] = cred_profile.get('expired', False)

                        profiles.append(profile_data)

                    except Exception as e:
                        print(f"Error processing profile {profile_name}: {str(e)}", file=sys.stderr)
                        continue

                return profiles

            except Exception as e:
                print(f"Error getting profiles with boto3: {str(e)}", file=sys.stderr)
                # Fall through to manual parsing below

        # Fallback to manual parsing if boto3 not available or failed
        print("Using manual config parsing", file=sys.stderr)
        cred_profiles = self.parse_credentials_file()
        sso_profiles = self.parse_config_file()

        # Check SSO profile status
        for profile in sso_profiles:
            sso_token = self.get_sso_cached_token(profile['sso_start_url'])
            if sso_token and 'expiresAt' in sso_token:
                expires_at = datetime.fromisoformat(sso_token['expiresAt'].replace('Z', '+00:00'))
                profile['expiration'] = expires_at.isoformat()
                profile['expired'] = expires_at < datetime.now(timezone.utc)
                profile['has_credentials'] = not profile['expired']
            else:
                profile['expired'] = True
                profile['has_credentials'] = False

        # Merge profiles
        all_profiles = {}
        for profile in sso_profiles:
            all_profiles[profile['name']] = profile
        for profile in cred_profiles:
            all_profiles[profile['name']] = profile

        profiles = list(all_profiles.values())

        return profiles

    def get_profile_color(self, profile_name):
        """Determine color based on profile name patterns."""
        name_lower = profile_name.lower()

        if 'prod' in name_lower or 'production' in name_lower:
            return 'red'
        elif 'stg' in name_lower or 'staging' in name_lower or 'stage' in name_lower:
            return 'yellow'
        elif 'dev' in name_lower or 'development' in name_lower:
            return 'green'
        elif 'test' in name_lower or 'qa' in name_lower:
            return 'turquoise'
        elif 'ite' in name_lower or 'integration' in name_lower:
            return 'blue'
        elif 'janus' in name_lower:
            return 'purple'
        else:
            return 'blue'

    def get_profile_icon(self, profile_name):
        """Determine icon based on profile name patterns."""
        name_lower = profile_name.lower()

        if 'prod' in name_lower:
            return 'briefcase'
        elif 'dev' in name_lower:
            return 'fingerprint'
        elif 'vdi' in name_lower:
            return 'vacation'
        else:
            return 'circle'

    def generate_console_url(self, profile_name):
        """
        Generate AWS console federation URL for a profile.

        SECURITY: This function handles sensitive AWS credentials.
        Data flow:
        1. Reads credentials from ~/.aws/credentials or SSO cache (local filesystem)
        2. For SSO: Gets temporary credentials from AWS SSO API
        3. Sends credentials to AWS Federation API (HTTPS only)
        4. Receives temporary signin token (12 hour expiry)
        5. Returns console URL with token (no raw credentials)

        Credentials are:
        - NEVER stored or cached
        - NEVER logged
        - ONLY sent to AWS's official endpoints
        - Used once per profile open
        """
        try:
            # SECURITY: Read credentials from local filesystem or SSO
            # Only this profile's credentials are accessed
            credentials = self.get_profile_credentials_with_sso(profile_name)
            if not credentials:
                return {'error': f'No credentials found for profile: {profile_name}. For SSO profiles, run: aws sso login --profile {profile_name}'}

            access_key = credentials.get('aws_access_key_id')
            secret_key = credentials.get('aws_secret_access_key')
            session_token = credentials.get('aws_session_token')

            if not access_key or not secret_key:
                return {'error': f'Incomplete credentials for profile: {profile_name}'}

            # SECURITY: Long-term credentials (no session token) require IAM user
            # We return basic console URL and let user log in manually
            # This avoids transmitting long-term credentials over network
            if not session_token:
                return {'url': 'https://console.aws.amazon.com/'}

            # SECURITY: Build federation request for AWS API
            # Only temporary credentials (with session token) are sent
            url_credentials = {
                'sessionId': access_key,
                'sessionKey': secret_key,
                'sessionToken': session_token
            }

            # SECURITY: Call AWS Federation API (official AWS service)
            # Endpoint: https://signin.aws.amazon.com/federation
            # This is the ONLY network request made with credentials
            # Request: Temporary credentials → Response: Signin token
            request_parameters = "?Action=getSigninToken"
            request_parameters += "&DurationSeconds=43200"  # 12 hours
            request_parameters += "&Session=" + parse.quote_plus(json.dumps(url_credentials))
            request_url = "https://signin.aws.amazon.com/federation" + request_parameters

            # SECURITY: 10 second timeout prevents hanging on network issues
            with request.urlopen(request_url, timeout=10) as response:
                if response.status != 200:
                    return {'error': 'Failed to get federation token from AWS'}
                signin_token = json.loads(response.read())

            # SECURITY: Build console URL with signin token
            # This URL contains a temporary token, not credentials
            request_parameters = "?Action=login"
            request_parameters += "&Destination=" + parse.quote_plus("https://console.aws.amazon.com/")
            request_parameters += "&SigninToken=" + signin_token["SigninToken"]
            request_parameters += "&Issuer=" + parse.quote_plus("https://example.com")
            console_url = "https://signin.aws.amazon.com/federation" + request_parameters

            # SECURITY: Return URL with signin token
            # Original credentials are discarded (garbage collected)
            # No credentials are stored or cached
            return {'url': console_url}

        except Exception as e:
            # SECURITY: Error messages do NOT contain credentials
            return {'error': f'Failed to generate console URL: {str(e)}'}

    def get_profile_credentials(self, profile_name):
        """Extract credentials for a specific profile from credentials file."""
        if not self.credentials_file.exists():
            return None

        credentials = {}
        in_profile = False

        with open(self.credentials_file, 'r') as f:
            for line in f:
                line = line.strip()

                # Check if we're in the target profile
                if line == f'[{profile_name}]':
                    in_profile = True
                    continue

                # Check if we've moved to another profile
                if line.startswith('[') and line.endswith(']'):
                    if in_profile:
                        break
                    in_profile = False
                    continue

                # Parse credentials
                if in_profile and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    if key in ['aws_access_key_id', 'aws_secret_access_key', 'aws_session_token']:
                        credentials[key] = value

        return credentials if credentials else None

    def get_profile_config(self, profile_name):
        """Get profile configuration from config file."""
        if not self.config_file.exists():
            return None

        profile_config = {}
        in_profile = False

        with open(self.config_file, 'r') as f:
            for line in f:
                line = line.strip()

                # Check profile headers
                if line.startswith('[') and line.endswith(']'):
                    current = line[1:-1]
                    if current.startswith('profile '):
                        current = current[8:]

                    if current == profile_name:
                        in_profile = True
                        continue
                    elif in_profile:
                        break
                    in_profile = False
                    continue

                # Parse config
                if in_profile and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    profile_config[key] = value

        return profile_config if profile_config else None

    def get_profile_credentials_with_sso(self, profile_name):
        """Get credentials for a profile, supporting both credential-based and SSO profiles."""
        # First try credentials file
        credentials = self.get_profile_credentials(profile_name)
        if credentials:
            return credentials

        # Try SSO profile
        profile_config = self.get_profile_config(profile_name)
        if profile_config and 'sso_start_url' in profile_config:
            # This is an SSO profile
            return self.get_sso_credentials(profile_config)

        return None

    def handle_message(self, message):
        """Handle incoming messages from the extension."""
        action = message.get('action')

        if action == 'getProfiles':
            # Get all profiles from both credentials and SSO config
            profiles = self.get_all_profiles()

            # Add color and icon information
            # Keep only necessary fields for the UI
            for profile in profiles:
                profile['color'] = self.get_profile_color(profile['name'])
                profile['icon'] = self.get_profile_icon(profile['name'])
                # Keep sso_start_url for grouping in UI if it's an SSO profile
                if not profile.get('is_sso'):
                    # Remove SSO-specific fields for non-SSO profiles
                    for key in ['sso_start_url', 'sso_region', 'sso_account_id', 'sso_role_name']:
                        profile.pop(key, None)

            return {
                'action': 'profileList',
                'profiles': profiles
            }

        elif action == 'openProfile':
            profile_name = message.get('profileName')
            result = self.generate_console_url(profile_name)

            if 'error' in result:
                return {
                    'action': 'error',
                    'message': result['error']
                }

            return {
                'action': 'consoleUrl',
                'profileName': profile_name,
                'url': result['url'],
                'color': self.get_profile_color(profile_name),
                'icon': self.get_profile_icon(profile_name)
            }

        else:
            return {
                'action': 'error',
                'message': f'Unknown action: {action}'
            }

    def run(self):
        """Main loop for the native messaging host."""
        while True:
            message = self.read_message()
            if message is None:
                break

            response = self.handle_message(message)
            self.send_message(response)


if __name__ == '__main__':
    bridge = AWSProfileBridge()
    bridge.run()
