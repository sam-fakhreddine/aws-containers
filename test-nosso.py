import pytest
from pathlib import Path
from unittest.mock import MagicMock
from native_messaging.src.aws_profile_bridge.credential_provider import (
    ProfileAggregator,
)


@pytest.fixture
def aws_dir(tmp_path):
    """Create a temporary ~/.aws directory for testing."""
    d = tmp_path / ".aws"
    d.mkdir()
    return d


@pytest.fixture
def mock_dependencies():
    """Create mock objects for ProfileAggregator dependencies."""
    return (
        MagicMock(),  # credentials_parser
        MagicMock(),  # config_parser
        MagicMock(),  # sso_enricher
        MagicMock(),  # config_reader
    )


def test_should_skip_sso_profiles_returns_false_when_nosso_file_does_not_exist(
    aws_dir, mock_dependencies
):
    """
    Verify that _should_skip_sso_profiles() returns False when .nosso does not exist.
    """
    # Arrange
    aggregator = ProfileAggregator(*mock_dependencies, aws_dir=aws_dir)

    # Act
    result = aggregator._should_skip_sso_profiles()

    # Assert
    assert result is False, "Should return False when .nosso file is absent"


def test_should_skip_sso_profiles_returns_true_when_nosso_file_exists(
    aws_dir, mock_dependencies
):
    """
    Verify that _should_skip_sso_profiles() returns True when .nosso exists.
    """
    # Arrange
    nosso_file = aws_dir / ".nosso"
    nosso_file.touch()
    aggregator = ProfileAggregator(*mock_dependencies, aws_dir=aws_dir)

    # Act
    result = aggregator._should_skip_sso_profiles()

    # Assert
    assert result is True, "Should return True when .nosso file is present"
