#!/usr/bin/env python3
"""Setup script for AWS Profile Bridge."""

from setuptools import setup, find_packages
from pathlib import Path

# Read requirements
requirements_file = Path(__file__).parent / "requirements.txt"
with open(requirements_file) as f:
    requirements = [
        line.strip() for line in f if line.strip() and not line.startswith("#")
    ]

# Separate runtime and test requirements
runtime_requirements = [
    req
    for req in requirements
    if not any(test_pkg in req for test_pkg in ["pytest", "coverage", "mock"])
]

test_requirements = [
    req
    for req in requirements
    if any(test_pkg in req for test_pkg in ["pytest", "coverage", "mock"])
]

setup(
    name="aws-profile-bridge",
    version="2.0.0",
    description="AWS Profile Bridge - Native Messaging Host for Browser Extensions",
    author="AWS Containers Team",
    python_requires=">=3.12",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    install_requires=runtime_requirements,
    extras_require={
        "test": test_requirements,
    },
    entry_points={
        "console_scripts": [
            "aws-profile-bridge=aws_profile_bridge.__main__:main",
            "aws-profile-bridge-api=aws_profile_bridge.api_server:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
    ],
)
