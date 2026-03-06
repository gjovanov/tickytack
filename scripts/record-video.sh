#!/bin/bash
# Record and convert the TickyTack intro video
#
# Prerequisites:
#   - API running (bun run dev:api) or will be auto-started
#   - Frontend running (bun run dev:ui) or will be auto-started
#   - Playwright installed (cd packages/e2e && bun install && PATH=$HOME/.local/node/bin:$PATH ./node_modules/.bin/playwright install chromium)
#   - ffmpeg installed (for MP4 conversion)
#
# Usage:
#   ./scripts/record-video.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
E2E_DIR="$PROJECT_DIR/packages/e2e"

echo "=== TickyTack Intro Video Recording ==="
echo ""

# Create timestamp file to find the newest video after recording
TIMESTAMP_FILE=$(mktemp)
trap "rm -f $TIMESTAMP_FILE" EXIT

# Run the Playwright recording (video recording is always run locally, never in CI)
echo "[1/3] Recording video with Playwright..."
cd "$E2E_DIR"
PATH=$HOME/.local/node/bin:$PATH ./node_modules/.bin/playwright test video/record-intro.spec.ts --config=playwright.video.config.ts --reporter=list 2>&1
PLAYWRIGHT_EXIT=$?

if [ $PLAYWRIGHT_EXIT -ne 0 ]; then
  echo "WARNING: Playwright exited with code $PLAYWRIGHT_EXIT. Video may be incomplete."
fi

# Find the recorded video
WEBM_FILE=$(find "$E2E_DIR/test-results" -name "*.webm" -newer "$TIMESTAMP_FILE" 2>/dev/null | head -1)

if [ -z "$WEBM_FILE" ]; then
  # Try broader search
  WEBM_FILE=$(find "$E2E_DIR/test-results" -name "*.webm" 2>/dev/null | sort -r | head -1)
fi

if [ -z "$WEBM_FILE" ]; then
  echo "ERROR: No video file found in test-results/"
  echo "Check that the test ran successfully and video recording is enabled."
  exit 1
fi

echo "[2/3] Found recording: $WEBM_FILE"

# Convert to MP4 with ffmpeg
MP4_FILE="$PROJECT_DIR/tickytack-intro.mp4"

if command -v ffmpeg &>/dev/null; then
  echo "[3/3] Converting to MP4..."
  ffmpeg -y -i "$WEBM_FILE" \
    -c:v libx264 \
    -preset slow \
    -crf 18 \
    -pix_fmt yuv420p \
    -movflags +faststart \
    "$MP4_FILE" 2>/dev/null

  echo ""
  echo "=== Done ==="
  echo "WebM: $WEBM_FILE"
  echo "MP4:  $MP4_FILE"
  echo ""
  echo "Upload to YouTube, then update README.md with the video link."
else
  echo "[3/3] ffmpeg not found — skipping MP4 conversion."
  echo ""
  echo "=== Done ==="
  echo "WebM: $WEBM_FILE"
  echo ""
  echo "To convert manually:"
  echo "  ffmpeg -i \"$WEBM_FILE\" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart \"$MP4_FILE\""
fi
