#!/bin/bash
# Genera i 5 video tutorial nuovi e li copia in /home/claude/ubi/video/
set -e

SORGENTI="$(dirname "$0")"
DEST="/home/claude/ubi/video"
COMPOSE="$SORGENTI/compose.py"

run_video() {
  local script="$1"   # es. cap_radio.py
  local func="$2"     # es. radioamatori
  local folder="$3"   # es. /home/claude/video/radioamatori
  local outname="$4"  # es. Ubi-tutorial-radioamatori.mp4

  echo ""
  echo "=== $outname ==="
  echo "→ Cattura schermate ($func)…"
  python3 "$SORGENTI/$script" $func

  echo "→ Monta video…"
  python3 "$COMPOSE" "$folder" "$DEST/$outname"
  echo "✓ $outname"
}

run_video cap_radio.py      radioamatori  /home/claude/video/radioamatori  Ubi-tutorial-radioamatori.mp4
run_video cap_sosmontagna.py sosmontagna  /home/claude/video/sosmontagna   Ubi-tutorial-sos-montagna.mp4
run_video cap_montagna.py   montagna      /home/claude/video/montagna      Ubi-tutorial-montagna.mp4
run_video cap_wedding.py    wedding       /home/claude/video/wedding        Ubi-tutorial-wedding.mp4
run_video cap_eventi.py     eventi        /home/claude/video/eventi         Ubi-tutorial-eventi.mp4

echo ""
echo "=== Tutti i video pronti ==="
ls -lh "$DEST"/Ubi-tutorial-{radioamatori,sos-montagna,montagna,wedding,eventi}.mp4
