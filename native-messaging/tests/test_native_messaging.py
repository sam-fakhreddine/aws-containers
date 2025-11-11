#!/usr/bin/env python3
"""
Unit tests for native_messaging module.

Tests the native messaging protocol implementation.
"""

import pytest
import json
import struct
from unittest.mock import Mock, MagicMock
from io import BytesIO

from aws_profile_bridge.native_messaging import (
    NativeMessagingReader,
    NativeMessagingWriter,
    NativeMessagingHost
)


class TestNativeMessagingReader:
    """Test NativeMessagingReader class."""

    def test_read_message_decodes_valid_message(self):
        """Test read_message correctly decodes a valid message."""
        message = {'action': 'test', 'data': 'value'}
        message_json = json.dumps(message)
        message_bytes = message_json.encode('utf-8')
        length_bytes = struct.pack('I', len(message_bytes))

        input_stream = BytesIO(length_bytes + message_bytes)
        reader = NativeMessagingReader(input_stream)

        result = reader.read_message()

        assert result == message

    def test_read_message_returns_none_on_empty_stream(self):
        """Test read_message returns None when stream is empty."""
        input_stream = BytesIO(b'')
        reader = NativeMessagingReader(input_stream)

        result = reader.read_message()

        assert result is None

    def test_read_message_handles_incomplete_length(self):
        """Test read_message returns None when length is incomplete."""
        input_stream = BytesIO(b'\x01\x02')  # Only 2 bytes instead of 4
        reader = NativeMessagingReader(input_stream)

        result = reader.read_message()

        assert result is None

    def test_read_message_handles_incomplete_content(self):
        """Test read_message returns None when message content is incomplete."""
        length_bytes = struct.pack('I', 100)  # Says 100 bytes
        input_stream = BytesIO(length_bytes + b'short')  # But only has 5 bytes
        reader = NativeMessagingReader(input_stream)

        result = reader.read_message()

        assert result is None

    def test_read_message_handles_invalid_json(self):
        """Test read_message returns None for invalid JSON."""
        invalid_json = b'not valid json'
        length_bytes = struct.pack('I', len(invalid_json))
        input_stream = BytesIO(length_bytes + invalid_json)
        reader = NativeMessagingReader(input_stream)

        result = reader.read_message()

        assert result is None

    def test_read_message_handles_multiple_messages(self):
        """Test read_message can read multiple messages sequentially."""
        message1 = {'action': 'first'}
        message2 = {'action': 'second'}

        msg1_bytes = json.dumps(message1).encode('utf-8')
        msg2_bytes = json.dumps(message2).encode('utf-8')

        length1 = struct.pack('I', len(msg1_bytes))
        length2 = struct.pack('I', len(msg2_bytes))

        input_stream = BytesIO(length1 + msg1_bytes + length2 + msg2_bytes)
        reader = NativeMessagingReader(input_stream)

        result1 = reader.read_message()
        result2 = reader.read_message()

        assert result1 == message1
        assert result2 == message2


class TestNativeMessagingWriter:
    """Test NativeMessagingWriter class."""

    def test_write_message_encodes_message_correctly(self):
        """Test write_message correctly encodes message."""
        message = {'action': 'test', 'data': 'value'}
        output_stream = BytesIO()
        writer = NativeMessagingWriter(output_stream)

        writer.write_message(message)

        # Read back and verify
        output_stream.seek(0)
        length = struct.unpack('I', output_stream.read(4))[0]
        message_bytes = output_stream.read(length)
        decoded_message = json.loads(message_bytes.decode('utf-8'))

        assert decoded_message == message

    def test_write_message_writes_correct_length(self):
        """Test write_message writes correct message length."""
        message = {'action': 'test'}
        output_stream = BytesIO()
        writer = NativeMessagingWriter(output_stream)

        writer.write_message(message)

        # Check length
        output_stream.seek(0)
        length = struct.unpack('I', output_stream.read(4))[0]
        message_json = json.dumps(message).encode('utf-8')

        assert length == len(message_json)

    def test_write_message_handles_unicode(self):
        """Test write_message handles unicode characters correctly."""
        message = {'text': 'Hello 世界 🌍'}
        output_stream = BytesIO()
        writer = NativeMessagingWriter(output_stream)

        writer.write_message(message)

        # Read back and verify
        output_stream.seek(0)
        length = struct.unpack('I', output_stream.read(4))[0]
        message_bytes = output_stream.read(length)
        decoded_message = json.loads(message_bytes.decode('utf-8'))

        assert decoded_message == message

    def test_write_message_handles_write_errors_silently(self):
        """Test write_message handles write errors without raising."""
        message = {'action': 'test'}

        # Create a mock stream that raises an error
        mock_stream = Mock()
        mock_stream.write.side_effect = Exception('Write error')

        writer = NativeMessagingWriter(mock_stream)

        # Should not raise exception
        writer.write_message(message)

    def test_write_message_flushes_output(self):
        """Test write_message flushes the output stream."""
        message = {'action': 'test'}
        mock_stream = Mock()

        writer = NativeMessagingWriter(mock_stream)
        writer.write_message(message)

        # Verify flush was called
        mock_stream.flush.assert_called_once()


class TestNativeMessagingHost:
    """Test NativeMessagingHost class."""

    def test_run_reads_handles_and_writes_messages(self):
        """Test run loop reads, handles, and writes messages."""
        # Setup mocks
        mock_reader = Mock()
        mock_writer = Mock()
        mock_handler = Mock()

        # Setup message flow
        input_message = {'action': 'test'}
        output_message = {'result': 'success'}

        mock_reader.read_message.side_effect = [input_message, None]  # Message then EOF
        mock_handler.handle_message.return_value = output_message

        host = NativeMessagingHost(mock_reader, mock_writer, mock_handler)
        host.run()

        # Verify flow
        assert mock_reader.read_message.call_count == 2  # Message + EOF
        mock_handler.handle_message.assert_called_once_with(input_message)
        mock_writer.write_message.assert_called_once_with(output_message)

    def test_run_handles_multiple_messages(self):
        """Test run loop handles multiple messages."""
        mock_reader = Mock()
        mock_writer = Mock()
        mock_handler = Mock()

        messages = [
            {'action': 'first'},
            {'action': 'second'},
            {'action': 'third'},
            None  # EOF
        ]

        mock_reader.read_message.side_effect = messages
        mock_handler.handle_message.side_effect = [
            {'result': '1'},
            {'result': '2'},
            {'result': '3'}
        ]

        host = NativeMessagingHost(mock_reader, mock_writer, mock_handler)
        host.run()

        assert mock_reader.read_message.call_count == 4
        assert mock_handler.handle_message.call_count == 3
        assert mock_writer.write_message.call_count == 3

    def test_run_stops_on_none_message(self):
        """Test run loop stops when reader returns None."""
        mock_reader = Mock()
        mock_writer = Mock()
        mock_handler = Mock()

        mock_reader.read_message.return_value = None  # Immediate EOF

        host = NativeMessagingHost(mock_reader, mock_writer, mock_handler)
        host.run()

        # Should read once, then stop
        mock_reader.read_message.assert_called_once()
        mock_handler.handle_message.assert_not_called()
        mock_writer.write_message.assert_not_called()

    def test_run_uses_dependency_injection(self):
        """Test host uses injected dependencies (DIP)."""
        custom_reader = Mock()
        custom_writer = Mock()
        custom_handler = Mock()

        custom_reader.read_message.return_value = None

        host = NativeMessagingHost(custom_reader, custom_writer, custom_handler)
        host.run()

        # Verify our custom dependencies were used
        custom_reader.read_message.assert_called_once()
