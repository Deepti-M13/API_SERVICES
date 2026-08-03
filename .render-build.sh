#!/bin/bash
set -e

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building..."
npm run build

echo "📊 Running database migrations..."
npx prisma migrate deploy || npx prisma db push

echo "✅ Build complete!"
