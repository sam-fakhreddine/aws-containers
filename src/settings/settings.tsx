// React
import React, { useState, useEffect } from "react";

// Cloudscape components
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";

// Internal - services
import * as apiClient from "../services/apiClient";
import { browser } from "../services/browserUtils";

// Constants
import { STORAGE_KEYS } from "../popup/constants";

export const Settings: React.FC = () => {
    const [token, setToken] = useState("");
    const [savedToken, setSavedToken] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(
        null
    );
    const [testing, setTesting] = useState(false);
    const [isLegacy, setIsLegacy] = useState(false);
    const [regions, setRegions] = useState<Array<{ code: string; name: string }>>([]);
    const [enabledRegions, setEnabledRegions] = useState<string[]>([]);
    const [loadingRegions, setLoadingRegions] = useState(false);
    const [separateRegions, setSeparateRegions] = useState(false);

    useEffect(() => {
        loadToken();
        loadRegions();
        loadEnabledRegions();
        loadSeparateRegionsSetting();
    }, []);

    const loadToken = async () => {
        const stored = await apiClient.getApiToken();
        setSavedToken(stored);
        if (stored) {
            setToken(stored);
            setIsLegacy(apiClient.isLegacyToken(stored));
        }
    };

    const handleSave = async () => {
        const trimmedToken = token.trim();

        if (!trimmedToken) {
            setMessage({ type: "error", text: "Token cannot be empty" });
            return;
        }

        try {
            await apiClient.setApiToken(trimmedToken);
            setSavedToken(trimmedToken);

            // Check if it's a legacy token and show warning
            const legacy = apiClient.isLegacyToken(trimmedToken);
            setIsLegacy(legacy);

            if (legacy) {
                setMessage({
                    type: "warning",
                    text: "Token saved successfully, but you are using a legacy token format. Please rotate to the new format (awspc_...) for better security.",
                });
            } else {
                setMessage({ type: "success", text: "Token saved successfully" });
            }
        } catch (err) {
            if (err instanceof apiClient.ApiClientError) {
                setMessage({ type: "error", text: err.message });
            } else {
                setMessage({ type: "error", text: "Failed to save token" });
            }
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setMessage(null);

        try {
            const healthy = await apiClient.checkApiHealth();
            if (healthy) {
                setMessage({ type: "success", text: "✓ Connection successful! API server is reachable." });
            } else {
                setMessage({ type: "error", text: "✗ Connection failed. Check if API server is running." });
            }
        } catch {
            setMessage({ type: "error", text: "✗ Connection failed. Check if API server is running and token is correct." });
        } finally {
            setTesting(false);
        }
    };

    const handleClear = async () => {
        await apiClient.clearApiToken();
        setToken("");
        setSavedToken(null);
        setMessage({ type: "success", text: "Token cleared" });
    };

    const loadRegions = async () => {
        setLoadingRegions(true);
        try {
            const response = await apiClient.getRegions();
            setRegions(response.regions);
        } catch (error) {
            console.error("Failed to load regions:", error);
        } finally {
            setLoadingRegions(false);
        }
    };

    const loadEnabledRegions = async () => {
        const result = await browser.storage.local.get(STORAGE_KEYS.ENABLED_REGIONS);
        const enabled = (result[STORAGE_KEYS.ENABLED_REGIONS] as string[] | undefined) || [];
        setEnabledRegions(enabled);
    };

    const handleRegionToggle = async (regionCode: string, checked: boolean) => {
        const updated = checked
            ? [...enabledRegions, regionCode]
            : enabledRegions.filter(r => r !== regionCode);
        setEnabledRegions(updated);
        await browser.storage.local.set({ [STORAGE_KEYS.ENABLED_REGIONS]: updated });
    };

    const handleSelectAll = async () => {
        const allCodes = regions.map(r => r.code);
        setEnabledRegions(allCodes);
        await browser.storage.local.set({ [STORAGE_KEYS.ENABLED_REGIONS]: allCodes });
    };

    const handleDeselectAll = async () => {
        setEnabledRegions([]);
        await browser.storage.local.set({ [STORAGE_KEYS.ENABLED_REGIONS]: [] });
    };

    const loadSeparateRegionsSetting = async () => {
        const result = await browser.storage.local.get(STORAGE_KEYS.SEPARATE_REGIONS_IN_CONTAINERS);
        setSeparateRegions((result[STORAGE_KEYS.SEPARATE_REGIONS_IN_CONTAINERS] as boolean | undefined) || false);
    };

    const handleSeparateRegionsToggle = async (checked: boolean) => {
        setSeparateRegions(checked);
        await browser.storage.local.set({ [STORAGE_KEYS.SEPARATE_REGIONS_IN_CONTAINERS]: checked });
    };

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <Container
                header={
                    <Header variant="h1">
                        AWS Profile Containers - Settings
                    </Header>
                }
            >
                <SpaceBetween size="l">
                    <Alert type="info">
                        The API token is required to authenticate with the backend server.
                        You can find your token in <code>~/.aws/profile_bridge_config.json</code>
                    </Alert>

                    {isLegacy && savedToken && (
                        <Alert
                            type="warning"
                            header="Legacy Token Format Detected"
                            action={
                                <Button
                                    onClick={() => {
                                        window.open(
                                            "https://github.com/sam-fakhreddine/aws-containers/blob/main/docs/security/TOKEN_FORMAT_PROPOSAL.md",
                                            "_blank"
                                        );
                                    }}
                                >
                                    Learn More
                                </Button>
                            }
                        >
                            You are using an old token format. For better security, please rotate your
                            token by restarting the API server. New tokens use the format{" "}
                            <code>awspc_...</code> with built-in checksum validation.
                        </Alert>
                    )}

                    <FormField
                        label="API Token"
                        description="Enter the API token from your backend configuration file"
                    >
                        <Input
                            value={token}
                            onChange={({ detail }) => setToken(detail.value)}
                            placeholder="Enter API token"
                            type="password"
                        />
                    </FormField>

                    {message && (
                        <Alert type={message.type}>
                            {message.text}
                        </Alert>
                    )}

                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="primary" onClick={handleSave}>
                            Save Token
                        </Button>
                        <Button onClick={handleTest} loading={testing}>
                            Test Connection
                        </Button>
                        {savedToken && (
                            <Button onClick={handleClear}>
                                Clear Token
                            </Button>
                        )}
                    </SpaceBetween>

                    <Box variant="h3">How to find your API token:</Box>
                    <Box>
                        <ol>
                            <li>Open a terminal</li>
                            <li>Run: <code>cat ~/.aws/profile_bridge_config.json</code></li>
                            <li>Copy the <code>api_token</code> value</li>
                            <li>Paste it above and click &quot;Save Token&quot;</li>
                        </ol>
                    </Box>

                    <Box variant="small" color="text-body-secondary">
                        The token is stored securely in your browser&apos;s local storage and is only
                        sent to localhost (127.0.0.1:10999).
                    </Box>
                </SpaceBetween>
            </Container>

            <Container
                header={
                    <Header
                        variant="h2"
                        actions={
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button onClick={handleSelectAll} disabled={loadingRegions || regions.length === 0}>
                                    Select All
                                </Button>
                                <Button onClick={handleDeselectAll} disabled={loadingRegions || enabledRegions.length === 0}>
                                    Deselect All
                                </Button>
                            </SpaceBetween>
                        }
                    >
                        Enabled Regions
                    </Header>
                }
            >
                <SpaceBetween size="l">
                    <SpaceBetween size="s">
                        <Alert type="info">
                            Select which AWS regions to show in the region dropdown. Only selected regions will appear.
                            {enabledRegions.length === 0 && " (All regions will be shown if none are selected)"}
                        </Alert>

                        <Checkbox
                            checked={separateRegions}
                            onChange={({ detail }) => handleSeparateRegionsToggle(detail.checked)}
                        >
                            Open each region in a separate container (e.g., &quot;profile-name [us-east-1]&quot;)
                        </Checkbox>
                    </SpaceBetween>

                    {loadingRegions ? (
                        <Box>Loading regions...</Box>
                    ) : regions.length === 0 ? (
                        <Alert type="warning">
                            Unable to load regions. Ensure API server is running and token is configured.
                        </Alert>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "8px" }}>
                            {regions.map((region) => (
                                <Checkbox
                                    key={region.code}
                                    checked={enabledRegions.includes(region.code)}
                                    onChange={({ detail }) => handleRegionToggle(region.code, detail.checked)}
                                >
                                    {region.code}
                                </Checkbox>
                            ))}
                        </div>
                    )}
                </SpaceBetween>
            </Container>
        </div>
    );
};
