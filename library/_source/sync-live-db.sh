#!/bin/bash
# Copy Ableton's Live Database into the Guides folder so Claude can read it.
# ~/Library/Application Support is a macOS protected location and cannot be
# connected to a Cowork session, so the databases have to be copied in.
#
# Run this with Ableton Live CLOSED, then ask Claude to refresh the library.

set -e
cd "$(dirname "$0")"

SRC="$HOME/Library/Application Support/Ableton/Live Database"
DEST="./live-db"

if [ ! -d "$SRC" ]; then
  echo "✗ Can't find: $SRC"
  exit 1
fi

if pgrep -x "Live" > /dev/null; then
  if [ "$SYNC_FORCE" = "1" ]; then
    # Caller has already confirmed (e.g. the Refresh Live Database app).
    echo "⚠️  Live is running — copying anyway."
  else
    echo "⚠️  Ableton Live is running."
    echo "   Recent changes sit in the -wal files until Live checkpoints them,"
    echo "   so the copy may be stale. Quit Live and run this again."
    read -p "   Copy anyway? [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]] || exit 1
  fi
fi

mkdir -p "$DEST"
rsync -a --delete "$SRC/" "$DEST/"

echo "✓ Copied to Guides/library/_source/live-db/"
ls -lh "$DEST"
echo ""
echo "Now tell Claude: \"refresh the plugin library\""
