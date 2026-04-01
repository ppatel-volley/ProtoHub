# Hub Server

## Getting Started

_Please refer to the root [README](../../README.md) for information on how to start the application._

1. Set up environment variables:
   - Copy `.env.template` to create your environment file for the environment you are working in `.env`
   - Ask a teammate for a PrivateBin drop with the required environment secrets

2. Install Redis (Optional)

   _This only applies if you don't want to use the `dev` Redis instance for your project._

   ```bash
      brew install redis
      brew services start redis
   ```

   OR

   ```bash
      redis-server
   ```
   Note: Using `brew services` runs Redis as a background service that starts automatically on system boot. Using `redis-server` directly gives you more control but requires manual startup each time.