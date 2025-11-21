// Manual mock for webextension-polyfill
const mockBrowser = {
    storage: {
        local: {
            get: jest.fn().mockResolvedValue({}),
            set: jest.fn().mockResolvedValue(undefined),
            remove: jest.fn().mockResolvedValue(undefined),
        },
        onChanged: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
        },
    },
    permissions: {
        contains: jest.fn().mockResolvedValue(true),
        request: jest.fn().mockResolvedValue(true),
    },
    runtime: {
        getBrowserInfo: jest.fn().mockResolvedValue({ name: 'Firefox', version: '100.0' }),
        sendMessage: jest.fn().mockResolvedValue({}),
        connectNative: jest.fn(),
        lastError: null,
        onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
        },
    },
    tabs: {
        getCurrent: jest.fn(),
        create: jest.fn(),
        remove: jest.fn(),
        query: jest.fn(),
    },
    windows: {
        WINDOW_ID_CURRENT: -2,
    },
    contextualIdentities: {
        query: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    },
};

export default mockBrowser;
export const { storage, permissions, runtime, tabs, windows, contextualIdentities } = mockBrowser;
