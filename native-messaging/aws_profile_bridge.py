#!/usr/bin/env python3
"""
AWS Profile Bridge - Native Messaging Host for Firefox Extension

SECURITY NOTICE:
This script handles sensitive AWS credentials. It:
- Reads ~/.aws/credentials (local filesystem only)
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


class AWSProfileBridge:
    def __init__(self):
        self.credentials_file = Path.home() / '.aws' / 'credentials'
        self.config_file = Path.home() / '.aws' / 'config'

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
        """Parse the AWS credentials file and extract profile information."""
        profiles = []

        if not self.credentials_file.exists():
            return profiles

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
        1. Reads credentials from ~/.aws/credentials (local filesystem)
        2. Sends credentials to AWS Federation API (HTTPS only)
        3. Receives temporary signin token (12 hour expiry)
        4. Returns console URL with token (no raw credentials)

        Credentials are:
        - NEVER stored or cached
        - NEVER logged
        - ONLY sent to AWS's official federation endpoint
        - Used once per profile open
        """
        try:
            # SECURITY: Read credentials from local filesystem
            # Only this profile's credentials are accessed
            credentials = self.get_profile_credentials(profile_name)
            if not credentials:
                return {'error': f'No credentials found for profile: {profile_name}'}

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
        """Extract credentials for a specific profile."""
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

    def handle_message(self, message):
        """Handle incoming messages from the extension."""
        action = message.get('action')

        if action == 'getProfiles':
            profiles = self.parse_credentials_file()

            # Add color and icon information
            for profile in profiles:
                profile['color'] = self.get_profile_color(profile['name'])
                profile['icon'] = self.get_profile_icon(profile['name'])

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
