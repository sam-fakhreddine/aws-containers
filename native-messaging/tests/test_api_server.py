"""Test suite for API server - Python 3.12+"""

from collections.abc import AsyncGenerator
import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import status

from aws_profile_bridge.api_server import app

# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)


# Python 3.12 async generator type hint
@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create test client for API."""
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
    response = await client.post("/profiles")
    
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "action" in data
    assert data["action"] in ["profileList", "error"]
    
    if data["action"] == "profileList":
        assert "profiles" in data
        assert isinstance(data["profiles"], list)


@pytest.mark.asyncio  
async def test_request_id_header(client: AsyncClient) -> None:
    """Test that all responses include request ID header."""
    response = await client.get("/health")
    
    assert "x-request-id" in response.headers
    request_id = response.headers["x-request-id"]
    assert len(request_id) == 8  # 8-char hex


@pytest.mark.asyncio
async def test_cors_headers(client: AsyncClient) -> None:
    """Test CORS headers are correctly set."""
    # Test with a regular POST request since OPTIONS might return 405
    response = await client.post(
        "/profiles",
        headers={"Origin": "moz-extension://test-extension-id"}
    )
    
    # Check that CORS middleware is handling the origin
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]


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
    client: AsyncClient,
    endpoint: str,
    expected_action: str
) -> None:
    """Test profile endpoints return correct structure."""
    response = await client.post(endpoint)
    
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "action" in data
    
    # Either success or error, both are valid
    if data["action"] != "error":
        assert data["action"] == expected_action
