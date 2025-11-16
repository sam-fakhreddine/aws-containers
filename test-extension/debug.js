const HOST = "aws_profile_bridge";
let port = null;

function log(msg, type = 'info') {
    const div = document.getElementById('log');
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = type;
    line.textContent = `[${time}] ${msg}`;
    div.appendChild(line);
    div.scrollTop = div.scrollHeight;
    console.log(msg);
}

function clearLog() {
    document.getElementById('log').innerHTML = '';
}

function testBrowserAPI() {
    log('=== Testing Browser API ===');

    if (typeof browser === 'undefined') {
        log('ERROR: browser object is undefined!', 'error');
        log('This extension needs to be loaded in Firefox', 'error');
        return;
    }
    log('✓ browser object exists', 'success');

    if (!browser.runtime) {
        log('ERROR: browser.runtime is undefined!', 'error');
        return;
    }
    log('✓ browser.runtime exists', 'success');

    if (!browser.runtime.connectNative) {
        log('ERROR: browser.runtime.connectNative is undefined!', 'error');
        log('Native messaging not supported?', 'error');
        return;
    }
    log('✓ browser.runtime.connectNative exists', 'success');

    log('All APIs available! Ready to connect.', 'success');
}

function testConnect() {
    log('=== Attempting Connection ===');
    log(`Connecting to: ${HOST}`);

    try {
        port = browser.runtime.connectNative(HOST);
        log('✓ connectNative() called successfully', 'success');

        port.onMessage.addListener((msg) => {
            log(`📥 Message received: ${JSON.stringify(msg, null, 2)}`, 'success');

            if (msg.action === 'profileList') {
                const profiles = msg.profiles || [];
                const sso = profiles.filter(p => p.is_sso).length;
                const creds = profiles.length - sso;
                log(`📊 Got ${profiles.length} profiles (${sso} SSO, ${creds} credentials)`, 'success');
            }
        });

        port.onDisconnect.addListener(() => {
            const err = browser.runtime.lastError;
            if (err) {
                log(`❌ Disconnected with error: ${err.message}`, 'error');
            } else {
                log('Disconnected (clean)', 'info');
            }
            port = null;
        });

        log('✓ Port created and listeners attached', 'success');
        log('Waiting for connection...', 'info');

        setTimeout(() => {
            if (port && !browser.runtime.lastError) {
                log('✓ Connected successfully!', 'success');
            } else if (browser.runtime.lastError) {
                log(`Connection error: ${browser.runtime.lastError.message}`, 'error');
            }
        }, 100);

    } catch (error) {
        log(`❌ Exception: ${error.message}`, 'error');
        log(`Stack: ${error.stack}`, 'error');
    }
}

function testSend() {
    if (!port) {
        log('❌ Not connected! Click "Connect" first.', 'error');
        return;
    }

    log('=== Sending Message ===');
    const msg = { action: "getProfiles" };
    log(`Sending: ${JSON.stringify(msg)}`);

    try {
        port.postMessage(msg);
        log('✓ Message sent', 'success');
    } catch (error) {
        log(`❌ Send failed: ${error.message}`, 'error');
    }
}

// Setup event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    log('🚀 Test page loaded');
    log(`Host name: ${HOST}`);

    // Attach event listeners to buttons
    document.getElementById('testAPIBtn').addEventListener('click', testBrowserAPI);
    document.getElementById('connectBtn').addEventListener('click', testConnect);
    document.getElementById('sendBtn').addEventListener('click', testSend);
    document.getElementById('clearBtn').addEventListener('click', clearLog);

    // Auto-test browser API on load
    testBrowserAPI();
});
