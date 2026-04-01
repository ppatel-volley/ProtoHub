import { test as setup } from "@playwright/test"

import { authenticateUser } from "../functional/authHelpers"

setup("authenticate unsubscribed user", async ({ request, context }) => {
    await authenticateUser(request, context, {
        email: "hub-automation+unsubscribed@volleygames.com",
        password: "Volley123",
        authFile: "./playwright-cache/.auth/agentic-unsubscribed.json",
    })
})
