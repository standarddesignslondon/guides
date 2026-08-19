#!/bin/bash
set -e
cd "$(dirname "$0")"
python3 build_site.py hub
git add -A
git commit -m "Update guides $(date '+%Y-%m-%d %H:%M')" || echo "nothing new to commit"
git push
echo "published → https://standarddesignslondon.github.io/guides/"
