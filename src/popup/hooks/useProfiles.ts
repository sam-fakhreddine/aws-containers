import { useState, useEffect, useCallback } from "react";
import browser from "webextension-polyfill";
import { AWSProfile, isErrorResponse, isProfileListResponse } from "../types";
import { sortByCredentialStatus, logProfileSummary } from "../utils/profiles";

const CACHE_KEY = "aws-profiles";
const CACHE_EXPIRATION_MS = 60000; // 1 minute
const NATIVE_APP_ID = "com.samfakhreddine.aws_profile_bridge";
const isDebugMode = process.env.NODE_ENV === "development";

interface CachedData {
  timestamp: number;
  profiles: AWSProfile[];
}

function useProfiles() {
  const [profiles, setProfiles] = useState<AWSProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const saveToCache = useCallback(async (data: AWSProfile[]) => {
    const cacheEntry: CachedData = {
      timestamp: Date.now(),
      profiles: data,
    };
    await browser.storage.local.set({ [CACHE_KEY]: cacheEntry });
  }, []);

  const processProfiles = useCallback(
    async (responseProfiles: AWSProfile[]) => {
      if (isDebugMode) {
        logProfileSummary(responseProfiles);
      }
      const sortedProfiles = sortByCredentialStatus(responseProfiles);
      setProfiles(sortedProfiles);
      await saveToCache(sortedProfiles);
    },
    [saveToCache],
  );

  const callNativeHost = useCallback(
    async (message: object) => {
      setLoading(true);
      setError(null);
      try {
        const response: unknown = await new Promise((resolve, reject) => {
          const port = browser.runtime.connectNative(NATIVE_APP_ID);
          const listener = (resp: unknown) => {
            if (browser.runtime.lastError) {
              reject(new Error(browser.runtime.lastError.message));
            } else {
              resolve(resp);
            }
            port.disconnect();
          };
          port.onMessage.addListener(listener);
          port.onDisconnect.addListener(() => {
            if (browser.runtime.lastError) {
                reject(new Error(browser.runtime.lastError.message ?? 'Port disconnected unexpectedly. Is the native host running?'));
            }
          });
          port.postMessage(message);
        });

        if (isProfileListResponse(response)) {
          await processProfiles(response.profiles);
        } else if (isErrorResponse(response)) {
          setError(response.message);
        } else {
          setError("Invalid response from native messaging host");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to connect to native messaging host");
      } finally {
        setLoading(false);
      }
    },
    [processProfiles],
  );

  const loadProfiles = useCallback(
    (force = false) => {
      callNativeHost({ action: "getProfiles" });
    },
    [callNativeHost],
  );

  const enrichSSOProfiles = useCallback(() => {
    callNativeHost({ action: "enrichSSOProfiles" });
  }, [callNativeHost]);

  useEffect(() => {
    const restoreFromCache = async () => {
      const result = await browser.storage.local.get(CACHE_KEY);
      const cachedData = result?.[CACHE_KEY] as CachedData | undefined;
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRATION_MS) {
        if (isDebugMode) {
            logProfileSummary(cachedData.profiles);
        }
        setProfiles(cachedData.profiles);
        setLoading(false);
        return true;
      }
      return false;
    };

    restoreFromCache().then((cached) => {
      if (!cached) {
        loadProfiles(true); // Force fresh load if cache is stale or missing
      }
    });
  }, []); // Run only on mount

  return { 
    profiles, 
    loading, 
    error, 
    nativeMessagingAvailable: !error || error !== "Failed to connect to native messaging host",
    loadProfiles,
    refreshProfiles: () => loadProfiles(true), 
    enrichSSOProfiles 
  };
}

export default useProfiles;