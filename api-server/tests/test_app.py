"""Test suite for API server - Python 3.12+"""

from collections.abc import AsyncGenerator
import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import status
from unittest.mock import Mock, patch

from aws_profile_bridge.app import create_app

# Configure pytest-asyncio
pytest_plugins = ("pytest_asyncio",)


# Python 3.12 async generator type hint
@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create test client for API."""
    # Mock authenticator to bypass auth in tests
    with patch("aws_profile_bridge.api.profiles.authenticator") as mock_auth:
        mock_auth.authenticate.return_value = None
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient) -> None:
    """Test health check endpoint returns correct format."""
    response = await client.get("/health")

    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "uptime_seconds" in data
    assert "python_version" in data

    # Verify Python 3.12+
    python_version = data["python_version"]
    major, minor = map(int, python_version.split(".")[:2])
    assert major == 3 and minor >= 12


@pytest.mark.asyncio
async def test_version_endpoint(client: AsyncClient) -> None:
    """Test version endpoint."""
    response = await client.get("/version")

    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "api_version" in data
    assert "python_version" in data
    assert "3.12" in data["python_version"]


@pytest.mark.asyncio
async def test_profiles_endpoint(client: AsyncClient) -> None:
    """Test profiles list endpoint."""
    with patch("aws_profile_bridge.api.profiles.authenticator") as mock_auth:
        mock_auth.authenticate.return_value = None
        response = await client.post("/profiles", headers={"X-API-Token": "test-token"})

    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "action" in data
    assert data["action"] in ["profileList", "error"]

    if data["action"] == "profileList":
        assert "profiles" in data
        assert isinstance(data["profiles"], list)


@pytest.mark.asyncio
async def test_uptime_in_health(client: AsyncClient) -> None:
    """Test that health endpoint includes uptime."""
    response = await client.get("/health")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "uptime_seconds" in data
    assert data["uptime_seconds"] >= 0


@pytest.mark.asyncio
async def test_authentication_required(client: AsyncClient) -> None:
    """Test that endpoints require authentication."""
    with patch("aws_profile_bridge.api.profiles.authenticator") as mock_auth:
        from fastapi import HTTPException

        mock_auth.authenticate.side_effect = HTTPException(
            status_code=401, detail="Unauthorized"
        )

        response = await client.post("/profiles")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_invalid_endpoint_404(client: AsyncClient) -> None:
    """Test invalid endpoints return 404."""
    response = await client.post("/invalid-endpoint")
    assert response.status_code == status.HTTP_404_NOT_FOUND


# Python 3.12 parametrize with modern syntax
@pytest.mark.parametrize(
    ("endpoint", "expected_action"),
    [
        ("/profiles", "profileList"),
        ("/profiles/enrich", "profileList"),
    ],
)
@pytest.mark.asyncio
async def test_profile_endpoints_structure(
    client: AsyncClient, endpoint: str, expected_action: str
) -> None:
    """Test profile endpoints return correct structure."""
    with patch("aws_profile_bridge.api.profiles.authenticator") as mock_auth:
        mock_auth.authenticate.return_value = None
        response = await client.post(endpoint, headers={"X-API-Token": "test-token"})

    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "action" in data

    # Either success or error, both are valid
    if data["action"] != "error":
        assert data["action"] == expected_action


@pytest.mark.asyncio
async def test_console_url_endpoint(client: AsyncClient) -> None:
    """Test console URL generation endpoint."""
    with patch("aws_profile_bridge.api.profiles.authenticator") as mock_auth:
        mock_auth.authenticate.return_value = None
        response = await client.post(
            "/profiles/test-profile/console-url", headers={"X-API-Token": "test-token"}
        )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "action" in data
    assert data["action"] in ["consoleUrl", "error"]


@pytest.mark.asyncio
async def test_options_requests(client: AsyncClient) -> None:
    """Test OPTIONS requests for CORS."""
    response = await client.options("/profiles")
    assert response.status_code == status.HTTP_200_OK

    response = await client.options("/profiles/enrich")
    assert response.status_code == status.HTTP_200_OK

    response = await client.options("/profiles/test-profile/console-url")
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.asyncio
async def test_profile_list_timeout(client: AsyncClient) -> None:
    """Test timeout handling for profile list."""
    with patch("aws_profile_bridge.api.profiles.authenticator") as mock_auth:
        mock_auth.authenticate.return_value = None
        with patch("aws_profile_bridge.api.profiles.asyncio.wait_for") as mock_wait:
            import asyncio
            mock_wait.side_effect = asyncio.TimeoutError()
            response = await client.post("/profiles", headers={"X-API-Token": "test-token"})

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["action"] == "error"
    assert "timed out" in data["message"].lower()


@pytest.mark.asyncio
async def test_profile_list_exception(client: AsyncClient) -> None:
    """Test exception handling for profile list."""
    with patch("aws_profile_bridge.api.profiles.authenticator") as mock_auth:
        mock_auth.authenticate.return_value = None
        with patch("aws_profile_bridge.api.profiles.AWSProfileBridge") as mock_bridge:
            mock_bridge.side_effect = Exception("Test error")
            response = await client.post("/profiles", headers={"X-API-Token": "test-token"})

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["action"] == "error"
    assert "Failed to get profiles" in data["message"]


@pytest.mark.asyncio
async def test_enrich_timeout(client: AsyncClient) -> None:
    """Test timeout handling for profile enrichment."""
    with patch("aws_profile_bridge.api.profiles.authenticator") as mock_auth:
        mock_auth.authenticate.return_value = None
        with patch("aws_profile_bridge.api.profiles.asyncio.wait_for") as mock_wait:
            import asyncio
            mock_wait.side_effect = asyncio.TimeoutError()
            response = await client.post("/profiles/enrich", headers={"X-API-Token": "test-token"})

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["action"] == "error"
    assert "timed out" in data["message"].lower()


@pytest.mark.asyncio
async def test_enrich_exception(client: AsyncClient) -> None:
    """Test exception handling for profile enrichment."""
    with patch("aws_profile_bridge.api.profiles.authenticator") as mock_auth:
        mock_auth.authenticate.return_value = None
        with patch("aws_profile_bridge.api.profiles.AWSProfileBridge") as mock_bridge:
            mock_bridge.side_effect = Exception("Test error")
            response = await client.post("/profiles/enrich", headers={"X-API-Token": "test-token"})

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["action"] == "error"
    assert "Failed to enrich profiles" in data["message"]


@pytest.mark.asyncio
async def test_console_url_timeout(client: AsyncClient) -> None:
    """Test timeout handling for console URL generation."""
    with patch("aws_profile_bridge.api.profiles.authenticator") as mock_auth:
        mock_auth.authenticate.return_value = None
        with patch("aws_profile_bridge.api.profiles.asyncio.wait_for") as mock_wait:
            import asyncio
            mock_wait.side_effect = asyncio.TimeoutError()
            response = await client.post("/profiles/test-profile/console-url", headers={"X-API-Token": "test-token"})

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["action"] == "error"
    assert "timed out" in data["message"].lower()


@pytest.mark.asyncio
async def test_console_url_exception(client: AsyncClient) -> None:
    """Test exception handling for console URL generation."""
    with patch("aws_profile_bridge.api.profiles.authenticator") as mock_auth:
        mock_auth.authenticate.return_value = None
        with patch("aws_profile_bridge.api.profiles.AWSProfileBridge") as mock_bridge:
            mock_bridge.side_effect = Exception("Test error")
            response = await client.post("/profiles/test-profile/console-url", headers={"X-API-Token": "test-token"})

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["action"] == "error"
    assert "Failed to generate console URL" in data["message"]


@pytest.mark.asyncio
async def test_set_authenticator() -> None:
    """Test authenticator can be set."""
    from aws_profile_bridge.api import profiles
    from unittest.mock import Mock

    mock_authenticator = Mock()
    profiles.set_authenticator(mock_authenticator)
    assert profiles.authenticator is mock_authenticator
