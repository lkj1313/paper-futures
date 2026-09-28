#!/bin/sh
# DB 볼륨이 처음 만들어질 때 한 번 실행된다: e2e 테스트 전용 DB 생성
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -c "CREATE DATABASE \"${POSTGRES_DB}_test\";"
