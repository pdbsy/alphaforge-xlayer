#!/bin/sh
# Bound only this isolated test child. Executable and entry are quoted argv data.
set -eu
[ "$#" -eq 2 ] || exit 2
limit=$(ulimit -S -n)
case "$limit" in
  unlimited) limit=128 ;;
  *) if [ "$limit" -gt 128 ]; then limit=128; fi ;;
esac
ulimit -n "$limit" || exit 77
ulimit -S -n > fd-soft-limit
ulimit -H -n > fd-hard-limit
exec "$1" "$2"
