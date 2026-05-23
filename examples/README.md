# Examples — Demo / Test Fixtures

These files are **sample data** for trying Portfolio Council without uploading your own real holdings. They are committed to the repo so judges/users can clone-and-run.

## Files

### `holdings.example.csv`
A sanitized sample portfolio (10 well-known Indian stocks + ETFs). Use this as a demo upload during onboarding.

### `holdings.example.json`
The same data in the structured JSON format that the agents read at runtime. Drop this at `data/holdings.json` to bypass the import-holdings skill for testing.

## Quick demo setup

```bash
# Seed the demo data:
mkdir -p data
cp examples/holdings.example.json data/holdings.json

# Then run gitclaw and complete onboarding with realistic answers
# (the agent will detect data/holdings.json exists and ask if you want to use it)
```

## Important

These are sample symbols only. **Do not use them as investment advice.** They're a curated mix for demo purposes (large-cap, mid-cap, and ETFs across sectors).
