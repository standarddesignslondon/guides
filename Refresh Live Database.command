#!/bin/bash
# Double-click this to copy Ableton's Live Database into the Guides folder.
# It opens in Terminal, which (unlike an unsigned .app) can be granted
# permission to read ~/Documents and ~/Library/Application Support.

cd "$(dirname "$0")"
clear
echo "─────────────────────────────────────────"
echo "  Refresh Live Database"
echo "─────────────────────────────────────────"
echo ""

/bin/bash "./library/_source/sync-live-db.sh"
STATUS=$?

echo ""
if [ $STATUS -eq 0 ]; then
  echo "Done. You can close this window."
else
  echo "✗ Failed (exit $STATUS)."
  echo ""
  echo "  If it says 'Operation not permitted', give Terminal access:"
  echo "  System Settings > Privacy & Security > Files and Folders"
  echo "  (or Full Disk Access) > enable Terminal, then try again."
fi
echo ""
