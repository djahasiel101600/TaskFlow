#!/bin/sh
set -e
cd /app
python manage.py migrate --noinput
python manage.py create_roles 2>/dev/null || true
exec "$@"
