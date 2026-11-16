#!/bin/sh
# Cambia il numero di versione dei file, così i telefoni scaricano subito l'ultima versione dopo ogni pubblicazione.
V=$(date +%Y%m%d%H%M)
sed -i -E "s#href=\"style.css(\?v=[0-9]+)?\"#href=\"style.css?v=$V\"#; s#src=\"app.js(\?v=[0-9]+)?\"#src=\"app.js?v=$V\"#" index.html
sed -i -E "s#from './config.js(\?v=[0-9]+)?'#from './config.js?v=$V'#" app.js
echo "versione $V"
