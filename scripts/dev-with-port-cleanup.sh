#!/usr/bin/env bash

FALLBACK_CMD="pnpm run --parallel -r dev"

cleanup_and_fallback() {
    echo "⚠️  Port cleanup failed, falling back to standard dev command..."
    exec $FALLBACK_CMD
}

trap cleanup_and_fallback ERR

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_warning() {
    echo "⚠️  $1"
}

print_info() {
    echo "ℹ️  $1"
}

kill_port_processes() {
    local port=$1

    if command_exists lsof; then
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [[ -n "$pids" ]]; then
            print_warning "Found process(es) using port $port, killing them..."
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    else
        print_warning "lsof command not found, skipping port cleanup"
    fi
}

print_info "Checking for processes on development ports..."

kill_port_processes 3000 || true
kill_port_processes 5173 || true

print_info "Starting development servers..."
exec $FALLBACK_CMD

