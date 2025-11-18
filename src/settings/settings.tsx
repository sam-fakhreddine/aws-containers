// React
import React, { useState, useEffect } from "react";

// Cloudscape components
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";

// Internal - services
import * as apiClient from "../services/apiClient";

// Constants
import { API_TOKEN_MIN_LENGTH } from "../popup/constants";

export const Settings: React.FC = () => {
    const [token, setToken] = useState("");
    const [savedToken, setSavedToken] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        loadToken();
    }, []);

    const loadToken = async () => {
        const stored = await apiClient.getApiToken();
        setSavedToken(stored);
        if (stored) {
            setToken(stored);
        }
    };

    const handleSave = async () => {
        const trimmedToken = token.trim();
        
        if (!trimmedToken) {
            setMessage({ type: "error", text: "Token cannot be empty" });
            return;
        }

        if (trimmedToken.length < API_TOKEN_MIN_LENGTH) {
            setMessage({ 
                type: "error", 
                text: `Token must be at least ${API_TOKEN_MIN_LENGTH} characters long` 
            });
            return;
        }

        try {
            await apiClient.setApiToken(trimmedToken);
            setSavedToken(trimmedToken);
            setMessage({ type: "success", text: "Token saved successfully" });
        } catch (error) {
            if (error instanceof apiClient.ApiClientError) {
                setMessage({ type: "error", text: error.message });
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
        } catch (error) {
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
                            <li>Paste it above and click "Save Token"</li>
                        </ol>
                    </Box>

                    <Box variant="small" color="text-body-secondary">
                        The token is stored securely in your browser's local storage and is only
                        sent to localhost (127.0.0.1:10999).
                    </Box>
                </SpaceBetween>
            </Container>
        </div>
    );
};
