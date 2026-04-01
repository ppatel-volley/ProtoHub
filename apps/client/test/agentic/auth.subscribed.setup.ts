import { test as setup } from "@playwright/test"

import { authenticateUser } from "../functional/authHelpers"

setup("authenticate subscribed user", async ({ request, context }) => {
    await authenticateUser(request, context, {
        email: "hub-automation+subscribed@volleygames.com",
        password: "Volley123",
        authFile: "./playwright-cache/.auth/agentic-subscribed.json",
    })
})
