#!/usr/bin/env python3
"""
Native Messaging Protocol Handler

Handles Chrome/Firefox native messaging protocol.
Follows Single Responsibility Principle.
"""

import json
import struct
import sys
import logging
from typing import Optional, Dict, BinaryIO
from abc import ABC, abstractmethod

# Configure logging (file only - stderr interferes with native messaging protocol)
from pathlib import Path

# Create log directory
log_dir = Path.home() / '.aws' / 'logs'
log_dir.mkdir(parents=True, exist_ok=True)
log_file = log_dir / 'aws_profile_bridge_errors.log'

# Clear any existing handlers from root logger
root_logger = logging.getLogger()
root_logger.handlers.clear()

# Configure ONLY file logging (no stderr!)
logging.basicConfig(
    level=logging.ERROR,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler(str(log_file))],
    force=True  # Override any existing configuration
)

# Ensure boto3/botocore don't log to stderr
logging.getLogger('boto3').setLevel(logging.CRITICAL)
logging.getLogger('botocore').setLevel(logging.CRITICAL)
logging.getLogger('urllib3').setLevel(logging.CRITICAL)

logger = logging.getLogger(__name__)


class MessageReader(ABC):
    """Abstract base class for reading messages."""

    @abstractmethod
    def read_message(self) -> Optional[Dict]:
        """Read a message and return as dict."""
        pass


class MessageWriter(ABC):
    """Abstract base class for writing messages."""

    @abstractmethod
    def write_message(self, message: Dict):
        """Write a message dict."""
        pass


class NativeMessagingReader(MessageReader):
    """
    Reads messages from stdin using native messaging protocol.

    Protocol:
    - 4 bytes: message length (uint32, native byte order)
    - N bytes: JSON message (UTF-8)
    """

    def __init__(self, input_stream: BinaryIO = None):
        self.input_stream = input_stream or sys.stdin.buffer

    def read_message(self) -> Optional[Dict]:
        """Read a message from the input stream."""
        try:
            # Read message length (4 bytes)
            length_bytes = self.input_stream.read(4)

            if len(length_bytes) == 0:
                # End of stream
                return None

            if len(length_bytes) < 4:
                raise ValueError("Incomplete message length")

            # Unpack message length
            message_length = struct.unpack('I', length_bytes)[0]

            # Read message content
            message_bytes = self.input_stream.read(message_length)

            if len(message_bytes) < message_length:
                raise ValueError("Incomplete message content")

            # Decode and parse JSON
            message_text = message_bytes.decode('utf-8')
            return json.loads(message_text)

        except ValueError as e:
            logger.error(f"Message format error: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error reading message: {e}", exc_info=True)
            return None


class NativeMessagingWriter(MessageWriter):
    """
    Writes messages to stdout using native messaging protocol.

    Protocol:
    - 4 bytes: message length (uint32, native byte order)
    - N bytes: JSON message (UTF-8)
    """

    def __init__(self, output_stream: BinaryIO = None):
        self.output_stream = output_stream or sys.stdout.buffer

    def write_message(self, message: Dict):
        """Write a message to the output stream."""
        try:
            # Encode message as JSON
            message_json = json.dumps(message)
            message_bytes = message_json.encode('utf-8')

            # Write message length (4 bytes)
            length_bytes = struct.pack('I', len(message_bytes))
            self.output_stream.write(length_bytes)

            # Write message content
            self.output_stream.write(message_bytes)

            # Flush to ensure message is sent
            self.output_stream.flush()

        except IOError as e:
            # Log I/O errors but don't crash - stream may be closed
            logger.error(f"Failed to write message (I/O error): {e}")
        except Exception as e:
            # Log unexpected errors with full traceback
            logger.error(f"Unexpected error writing message: {e}", exc_info=True)


class MessageHandler(ABC):
    """Abstract base class for handling messages."""

    @abstractmethod
    def handle_message(self, message: Dict) -> Dict:
        """
        Handle a message and return a response.

        Args:
            message: Input message dict

        Returns:
            Response message dict
        """
        pass


class NativeMessagingHost:
    """
    Native messaging host that coordinates reading, handling, and writing messages.

    Follows Dependency Inversion Principle - depends on abstractions.
    """

    def __init__(
        self,
        reader: MessageReader,
        writer: MessageWriter,
        handler: MessageHandler
    ):
        self.reader = reader
        self.writer = writer
        self.handler = handler

    def run(self):
        """Main loop - read messages, handle them, send responses."""
        while True:
            # Read message
            message = self.reader.read_message()

            if message is None:
                # End of stream or error
                break

            # Handle message
            response = self.handler.handle_message(message)

            # Send response
            self.writer.write_message(response)
