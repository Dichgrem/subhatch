# subhatch development commands

default:
    @just --list

# format JS source files with Biome
format:
    biome format --write api/ src/

# format and lint source files (auto-fix)
lint:
    biome check --write api/ src/

# run Node.js adapter locally
run:
    ADMIN_PASSWORD=admin SUB_TOKEN=test node api/node.js

deploy:
    wrangler deploy api/cloudflare.js

# clean generated files
clean:
    rm -f data.json

# ── Tests ──
# Unit tests only (no server needed, fast)
test-unit:
    node --test "test/unit/*.test.js"

# Full test suite (server auto-started, serial API tests)
test:
    node --test --test-concurrency=1 "test/**/*.test.js"
