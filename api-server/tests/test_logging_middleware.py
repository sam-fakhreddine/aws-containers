"""Tests for request logging middleware."""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import Request
from fastapi.responses import Response

from aws_profile_bridge.middleware.logging import log_requests


class TestLoggingMiddleware:
    """Test request logging middleware."""

    @pytest.mark.asyncio
    async def test_log_requests_successful_request(self):
        """Test logging of successful request."""
        request = Mock(spec=Request)
        request.method = "GET"
        request.url.path = "/profiles"

        response = Response(status_code=200)
        call_next = AsyncMock(return_value=response)

        with patch("aws_profile_bridge.middleware.logging.logger") as mock_logger:
            result = await log_requests(request, call_next)

            # Verify call_next was called
            call_next.assert_called_once_with(request)

            # Verify response is returned
            assert result is response

            # Verify logging calls
            assert mock_logger.info.call_count == 2

            # Check request log
            first_call = mock_logger.info.call_args_list[0][0][0]
            assert "GET" in first_call
            assert "/profiles" in first_call

            # Check response log
            second_call = mock_logger.info.call_args_list[1][0][0]
            assert "200" in second_call
            assert "ms" in second_call

    @pytest.mark.asyncio
    async def test_log_requests_adds_request_id_header(self):
        """Test that request ID is added to response headers."""
        request = Mock(spec=Request)
        request.method = "POST"
        request.url.path = "/api"

        response = Response(status_code=201)
        call_next = AsyncMock(return_value=response)

        with patch("aws_profile_bridge.middleware.logging.logger"):
            result = await log_requests(request, call_next)

            # Verify X-Request-ID header is added
            assert "X-Request-ID" in result.headers
            assert len(result.headers["X-Request-ID"]) == 8  # 8 hex chars

    @pytest.mark.asyncio
    async def test_log_requests_different_methods(self):
        """Test logging with different HTTP methods."""
        methods = ["GET", "POST", "PUT", "DELETE", "PATCH"]

        for method in methods:
            request = Mock(spec=Request)
            request.method = method
            request.url.path = "/test"

            response = Response(status_code=200)
            call_next = AsyncMock(return_value=response)

            with patch("aws_profile_bridge.middleware.logging.logger") as mock_logger:
                await log_requests(request, call_next)

                # Verify method is in log
                first_call = mock_logger.info.call_args_list[0][0][0]
                assert method in first_call

    @pytest.mark.asyncio
    async def test_log_requests_different_status_codes(self):
        """Test logging with different status codes."""
        status_codes = [200, 201, 204, 400, 404, 500]

        for status_code in status_codes:
            request = Mock(spec=Request)
            request.method = "GET"
            request.url.path = "/test"

            response = Response(status_code=status_code)
            call_next = AsyncMock(return_value=response)

            with patch("aws_profile_bridge.middleware.logging.logger") as mock_logger:
                await log_requests(request, call_next)

                # Verify status code is in log
                second_call = mock_logger.info.call_args_list[1][0][0]
                assert str(status_code) in second_call

    @pytest.mark.asyncio
    async def test_log_requests_exception_handling(self):
        """Test that exceptions are logged and re-raised."""
        request = Mock(spec=Request)
        request.method = "GET"
        request.url.path = "/error"

        error = ValueError("Test error")
        call_next = AsyncMock(side_effect=error)

        with patch("aws_profile_bridge.middleware.logging.logger") as mock_logger:
            with pytest.raises(ValueError) as exc_info:
                await log_requests(request, call_next)

            assert exc_info.value is error

            # Verify exception was logged
            mock_logger.exception.assert_called_once()
            exception_call = mock_logger.exception.call_args[0][0]
            assert "Error" in exception_call
            assert "ms" in exception_call

    @pytest.mark.asyncio
    async def test_log_requests_unique_request_ids(self):
        """Test that each request gets a unique request ID."""
        request = Mock(spec=Request)
        request.method = "GET"
        request.url.path = "/test"

        request_ids = set()

        for _ in range(10):
            response = Response(status_code=200)
            call_next = AsyncMock(return_value=response)

            with patch("aws_profile_bridge.middleware.logging.logger"):
                result = await log_requests(request, call_next)
                request_ids.add(result.headers["X-Request-ID"])

        # All request IDs should be unique
        assert len(request_ids) == 10
