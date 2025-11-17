import { useState, useEffect, useCallback } from "react";
import browser from "webextension-polyfill";
import { AWSProfile } from "../types";
import { sortByCredentialStatus, logProfileSummary } from "../utils/profiles";
import * as apiClient from "../../services/apiClient";

const CACHE_KEY = "aws-profiles";
const CACHE_EXPIRATION_MS = 60000; // 1 minute
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

  const callApi = useCallback(
    async (action: "getProfiles" | "enrichSSOProfiles") => {
      setLoading(true);
      setError(null);
      try {
        const response = action === "enrichSSOProfiles" 
          ? await apiClient.getProfilesEnriched()
          : await apiClient.getProfiles();

        await processProfiles(response.profiles);
      } catch (e) {
        if (e instanceof apiClient.ApiClientError) {
          setError(e.message);
        } else {
          setError(e instanceof Error ? e.message : "Failed to connect to API server");
        }
      } finally {
        setLoading(false);
      }
    },
    [processProfiles],
  );

  const loadProfiles = useCallback(
    (force = false) => {
      callApi("getProfiles");
    },
    [callApi],
  );

  const enrichSSOProfiles = useCallback(() => {
    callApi("enrichSSOProfiles");
  }, [callApi]);

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
    apiAvailable: !error || !error.includes("Cannot connect to API server"),
    loadProfiles,
    refreshProfiles: () => loadProfiles(true), 
    enrichSSOProfiles 
  };
}

export default useProfiles;