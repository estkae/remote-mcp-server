#!/bin/bash
#
# TypeDB 3.5.5 Installation Script
# Von Vaticle GitHub Releases
#

set -e

VERSION="3.5.5"
GITHUB_RELEASES="https://github.com/typedb/typedb/releases/download/${VERSION}"

echo "🚀 TypeDB ${VERSION} Installation"
echo "=================================="

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    ARCH="x86_64"
    EXT="tar.gz"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
    if [[ $(uname -m) == "arm64" ]]; then
        ARCH="arm64"
    else
        ARCH="x86_64"
    fi
    EXT="zip"
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

FILENAME="typedb-all-${OS}-${ARCH}-${VERSION}.${EXT}"
DOWNLOAD_URL="${GITHUB_RELEASES}/${FILENAME}"

echo ""
echo "📦 Downloading: ${FILENAME}"
echo "   URL: ${DOWNLOAD_URL}"
echo ""

# Download
wget -q --show-progress "${DOWNLOAD_URL}" || {
    echo "❌ Download failed!"
    echo "   Try manually: ${DOWNLOAD_URL}"
    exit 1
}

echo ""
echo "📂 Extracting..."

if [[ "$EXT" == "tar.gz" ]]; then
    tar -xzf "${FILENAME}"
elif [[ "$EXT" == "zip" ]]; then
    unzip -q "${FILENAME}"
fi

DIR_NAME="typedb-all-${OS}-${ARCH}-${VERSION}"

echo ""
echo "✅ Installation complete!"
echo ""
echo "📍 TypeDB installed to: ./${DIR_NAME}"
echo ""
echo "🚀 Start TypeDB:"
echo "   cd ${DIR_NAME}"
echo "   ./typedb server"
echo ""
echo "🌐 TypeDB will run on: http://localhost:1729"
echo ""

# Optional: Move to /opt
read -p "📦 Install to /opt/typedb? (requires sudo) [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo mv "${DIR_NAME}" /opt/typedb
    echo "✅ Moved to /opt/typedb"
    echo ""
    echo "🚀 Start with: /opt/typedb/typedb server"
    echo ""
fi

echo "✨ Done!"
