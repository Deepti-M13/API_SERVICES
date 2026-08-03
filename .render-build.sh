#!/bin/bash
set -e

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building..."
npm run build

echo "✅ Build complete!"
