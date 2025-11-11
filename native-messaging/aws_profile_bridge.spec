# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for AWS Profile Bridge
# This creates a standalone executable that includes Python and all dependencies
# Updated for modular package structure

block_cipher = None

a = Analysis(
    ['src/aws_profile_bridge/aws_profile_bridge.py'],
    pathex=['src'],  # Add src to path for imports
    binaries=[],
    datas=[],
    hiddenimports=[
        'boto3',
        'botocore',
        'botocore.exceptions',
        'aws_profile_bridge.native_messaging',
        'aws_profile_bridge.file_parsers',
        'aws_profile_bridge.sso_manager',
        'aws_profile_bridge.credential_provider',
        'aws_profile_bridge.profile_metadata',
        'aws_profile_bridge.console_url_generator',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude unused modules to reduce size
        'tkinter',
        'matplotlib',
        'scipy',
        'numpy',
        'pandas',
        'PIL',
        'setuptools',
        'pytest',
        'pytest_cov',
        'pytest_mock',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='aws_profile_bridge',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Native messaging requires console mode
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
