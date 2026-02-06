#!/bin/bash

# Script para corregir automáticamente errores de lint
# Ejecuta lint:fix y muestra un resumen

set -e

echo "🔧 Corrigiendo errores de lint automáticamente..."
echo ""

cd "$(dirname "$0")"

# Ejecutar lint:fix
npm run lint:fix

echo ""
echo "✅ Corrección automática completada"
echo ""
echo "Ejecutando verificación final..."
npm run lint

echo ""
echo "✓ Proceso completado"
