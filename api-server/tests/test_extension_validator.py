"""Tests for extension origin validation middleware."""

from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import Request, status
from fastapi.responses import JSONResponse

from aws_profile_bridge.middleware.extension_validator import (
    ALLOWED_EXTENSION_ID,
    validate_extension_origin,
)


class TestExtensionValidatorMiddleware:
    """Test extension origin validation middleware."""

    @pytest.mark.asyncio
    async def test_health_endpoint_bypasses_validation(self):
        """Test that /health endpoint bypasses validation."""
        request = Mock(spec=Request)
        request.url.path = "/health"

        call_next = AsyncMock(return_value="response")

        result = await validate_extension_origin(request, call_next)

        assert result == "response"
        call_next.assert_called_once_with(request)

    @pytest.mark.asyncio
    async def test_non_extension_origin_passes(self):
        """Test that non-extension origins pass validation."""
        request = Mock(spec=Request)
        request.url.path = "/profiles"
        request.headers.get.return_value = "https://example.com"

        call_next = AsyncMock(return_value="response")

        result = await validate_extension_origin(request, call_next)

        assert result == "response"
        call_next.assert_called_once_with(request)

    @pytest.mark.asyncio
    async def test_no_origin_header_passes(self):
        """Test that requests without origin header pass validation."""
        request = Mock(spec=Request)
        request.url.path = "/profiles"
        request.headers.get.return_value = ""

        call_next = AsyncMock(return_value="response")

        result = await validate_extension_origin(request, call_next)

        assert result == "response"
        call_next.assert_called_once_with(request)

    @pytest.mark.asyncio
    async def test_authorized_extension_passes(self):
        """Test that authorized extension passes validation."""
        request = Mock(spec=Request)
        request.url.path = "/profiles"

        def get_header(key, default=""):
            if key == "origin":
                return "moz-extension://some-extension-id"
            elif key == "user-agent":
                return f"Mozilla/5.0 {ALLOWED_EXTENSION_ID}"
            return default

        request.headers.get = get_header

        call_next = AsyncMock(return_value="response")

        result = await validate_extension_origin(request, call_next)

        assert result == "response"
        call_next.assert_called_once_with(request)

    @pytest.mark.asyncio
    async def test_unauthorized_extension_blocked(self):
        """Test that unauthorized extension is blocked."""
        request = Mock(spec=Request)
        request.url.path = "/profiles"

        def get_header(key, default=""):
            if key == "origin":
                return "moz-extension://unauthorized-extension"
            elif key == "user-agent":
                return "Mozilla/5.0"  # Missing ALLOWED_EXTENSION_ID
            return default

        request.headers.get = get_header

        call_next = AsyncMock()

        result = await validate_extension_origin(request, call_next)

        # Should not call next
        call_next.assert_not_called()

        # Should return 403
        assert isinstance(result, JSONResponse)
        assert result.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_non_moz_extension_origin_passes(self):
        """Test that non moz-extension origins pass even with missing extension ID."""
        request = Mock(spec=Request)
        request.url.path = "/profiles"

        def get_header(key, default=""):
            if key == "origin":
                return "chrome-extension://some-extension"
            elif key == "user-agent":
                return "Chrome"
            return default

        request.headers.get = get_header

        call_next = AsyncMock(return_value="response")

        result = await validate_extension_origin(request, call_next)

        assert result == "response"
        call_next.assert_called_once_with(request)
