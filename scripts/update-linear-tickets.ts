import { execSync } from "child_process"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const LINEAR_API_URL = "https://api.linear.app/graphql"

interface LinearIssue {
    id: string
    identifier: string
    title: string
    state: {
        id: string
        name: string
    }
    team: {
        id: string
        key: string
        name: string
    }
}

interface LinearWorkflowState {
    id: string
    name: string
    team: {
        key: string
    }
}

interface UpdateResult {
    success: boolean
    ticket: string
    error?: Error
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, "..", ".env.local")
try {
    const envFile = readFileSync(envPath, "utf-8")
    envFile.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split("=")
        if (key && valueParts.length > 0) {
            const value = valueParts.join("=").trim()
            if (!process.env[key]) {
                process.env[key] = value
            }
        }
    })
} catch {
    // .env.local doesn't exist, that's fine
}

async function extractTicketIds(
    version: string,
    previousVersion: string,
): Promise<string[]> {
    console.log(`Extracting ticket IDs for version ${version}...`)
    console.log(
        `Comparing v${previousVersion}..v${version} using --format="%s|||%D"`,
    )

    try {
        const commits = execSync(
            `git log v${previousVersion}..v${version} --format="%s|||%D"`,
            { encoding: "utf-8" },
        )
            .trim()
            .split("\n")
            .filter(Boolean)

        const ticketIds = new Set<string>()
        const prNumbers = new Set<number>()

        const ticketRegex = /\b(HUB-\d+)\b/gi
        const prRegex = /\(#(\d+)\)/

        for (const line of commits) {
            const parts = line.split("|||")
            const message = parts[0]
            const refs = parts[1]

            if (message) {
                const messageMatches = message.match(ticketRegex)
                if (messageMatches) {
                    messageMatches.forEach((id) => ticketIds.add(id.toUpperCase()))
                }

                const prMatch = message.match(prRegex)
                if (prMatch?.[1]) {
                    prNumbers.add(parseInt(prMatch[1], 10))
                }
            }

            if (refs) {
                const refsMatches = refs.match(ticketRegex)
                if (refsMatches) {
                    refsMatches.forEach((id) => ticketIds.add(id.toUpperCase()))
                }
            }
        }

        // Extract ticket IDs from PR branch names
        if (prNumbers.size > 0) {
            console.log(`Found ${prNumbers.size} PRs, fetching branch names...`)
            for (const prNumber of prNumbers) {
                try {
                    const prInfo = execSync(
                        `gh pr view ${prNumber} --json headRefName --jq .headRefName`,
                        { encoding: "utf-8" },
                    ).trim()

                    const branchMatches = prInfo.match(ticketRegex)
                    if (branchMatches) {
                        branchMatches.forEach((id) => {
                            console.log(`  Found ${id} in PR #${prNumber} branch: ${prInfo}`)
                            ticketIds.add(id.toUpperCase())
                        })
                    }
                } catch {
                    console.log(`  ⚠️  Could not fetch PR #${prNumber} info`)
                }
            }
        }

        console.log(`Found ${ticketIds.size} unique ticket IDs:`, [...ticketIds])
        return [...ticketIds]
    } catch (error) {
        const err = error as Error
        console.error("Error extracting ticket IDs:", err.message)
        return []
    }
}

async function linearGraphQL<T = Record<string, unknown>>(
    query: string,
    variables: Record<string, unknown>,
    apiKey: string,
): Promise<T> {
    const response = await fetch(LINEAR_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: apiKey,
        },
        body: JSON.stringify({ query, variables }),
    })

    const result = (await response.json()) as {
        data?: T
        errors?: Array<{ message: string }>
    }

    if (result.errors) {
        throw new Error(`Linear API error: ${JSON.stringify(result.errors)}`)
    }

    return result.data as T
}

async function getTeamByKey(
    teamKey: string,
    apiKey: string,
): Promise<{ id: string; key: string; name: string }> {
    const query = `
    query {
      teams {
        nodes {
          id
          key
          name
        }
      }
    }
  `

    const data = await linearGraphQL<{
        teams: { nodes: Array<{ id: string; key: string; name: string }> }
    }>(query, {}, apiKey)

    const team = data.teams.nodes.find(
        (t) => t.key.toLowerCase() === teamKey.toLowerCase(),
    )

    if (!team) {
        throw new Error(`Team with key "${teamKey}" not found`)
    }

    return team
}

async function getTeamWorkflowStates(
    teamId: string,
    apiKey: string,
): Promise<LinearWorkflowState[]> {
    const query = `
    query($teamId: String!) {
      team(id: $teamId) {
        states {
          nodes {
            id
            name
            team {
              key
            }
          }
        }
      }
    }
  `

    const data = await linearGraphQL<{
        team: { states: { nodes: LinearWorkflowState[] } }
    }>(query, { teamId }, apiKey)
    return data.team.states.nodes
}

async function getTicketDetails(
    ticketIds: string[],
    apiKey: string,
): Promise<LinearIssue[]> {
    // Query each ticket individually since Linear API doesn't support bulk identifier queries
    const tickets: LinearIssue[] = []

    for (const ticketId of ticketIds) {
        try {
            const query = `
        query($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            state {
              id
              name
            }
            team {
              id
              key
              name
            }
          }
        }
      `

            const data = await linearGraphQL<{ issue: LinearIssue | null }>(
                query,
                { id: ticketId },
                apiKey,
            )
            if (data.issue) {
                tickets.push(data.issue)
            }
        } catch {
            console.log(`⚠️  ${ticketId} not found in Linear`)
        }
    }

    return tickets
}

async function updateTicketState(
    ticketId: string,
    stateId: string,
    apiKey: string,
): Promise<{
    success: boolean
    issue: { identifier: string; state: { name: string } }
}> {
    const mutation = `
    mutation($issueId: String!, $stateId: String!) {
      issueUpdate(id: $issueId, input: { stateId: $stateId }) {
        success
        issue {
          identifier
          state {
            name
          }
        }
      }
    }
  `

    const data = await linearGraphQL<{
        issueUpdate: {
            success: boolean
            issue: { identifier: string; state: { name: string } }
        }
    }>(mutation, { issueId: ticketId, stateId }, apiKey)
    return data.issueUpdate
}

async function main(): Promise<void> {
    const version = process.env.VERSION
    const previousVersion = process.env.PREVIOUS_VERSION
    const apiKey = process.env.LINEAR_API_KEY
    const sourceState = process.env.SOURCE_STATE
    const targetState = process.env.TARGET_STATE
    const teamKey = process.env.TEAM_KEY
    const dryRun =
        process.env.DRY_RUN === "true" || process.argv.includes("--dry-run")

    if (!version) {
        console.error("❌ VERSION environment variable is required")
        process.exit(1)
    }

    if (!apiKey && !dryRun) {
        console.error("❌ LINEAR_API_KEY environment variable is required")
        process.exit(1)
    }

    if (!apiKey && dryRun) {
        console.log(
            "⚠️  LINEAR_API_KEY not set - running minimal dry run (git only)",
        )
    }

    if (!sourceState) {
        console.error("❌ SOURCE_STATE environment variable is required")
        process.exit(1)
    }

    if (!targetState) {
        console.error("❌ TARGET_STATE environment variable is required")
        process.exit(1)
    }

    if (!teamKey) {
        console.error("❌ TEAM_KEY environment variable is required")
        process.exit(1)
    }

    if (dryRun) {
        console.log("🔍 DRY RUN MODE - No tickets will be updated")
    }

    console.log("🎯 Starting Linear ticket update process...")
    console.log(`   Moving tickets from "${sourceState}" → "${targetState}"`)

    if (!previousVersion) {
        console.log("⚠️  No previous version found - skipping Linear ticket update")
        console.log(
            "   This is expected on the first deployment to this environment",
        )
        return
    }

    console.log(`   Previous deployed version: ${previousVersion}`)

    // Extract ticket IDs from git commits
    const ticketIdentifiers = await extractTicketIds(version, previousVersion)

    if (ticketIdentifiers.length === 0) {
        console.log("✅ No tickets found in this version")
        return
    }

    if (!apiKey && dryRun) {
        console.log("\n🔍 MINIMAL DRY RUN - Would attempt to update these tickets:")
        ticketIdentifiers.forEach((id) => {
            console.log(`   ${id}: (if in "${sourceState}" state) → "${targetState}"`)
        })
        console.log(
            `\n✅ Dry run complete. ${ticketIdentifiers.length} ticket(s) found from git.`,
        )
        console.log(
            "   Set LINEAR_API_KEY to see actual ticket states and get full dry run.",
        )
        return
    }

    console.log(`Looking up team ${teamKey}...`)
    const team = await getTeamByKey(teamKey, apiKey!)
    console.log(`✅ Found team: ${team.name} (${team.key})`)

    console.log(`Fetching workflow states for team ${team.name}...`)
    const states = await getTeamWorkflowStates(team.id, apiKey!)
    const targetStateObj = states.find((s) => s.name === targetState)

    if (!targetStateObj) {
        console.error(
            `❌ Could not find "${targetState}" state in team ${team.name}`,
        )
        console.log(
            "Available states:",
            states.map((s) => s.name),
        )
        process.exit(1)
    }

    console.log(`✅ Found "${targetState}" state (ID: ${targetStateObj.id})`)

    console.log("Fetching ticket details...")
    const tickets = await getTicketDetails(ticketIdentifiers, apiKey!)

    if (tickets.length === 0) {
        console.log("⚠️  None of the extracted ticket IDs exist in Linear")
        return
    }

    console.log(`Found ${tickets.length} tickets in Linear`)

    // Verify all tickets are in the expected team
    const ticketsInOtherTeams = tickets.filter((t) => t.team.key !== team.key)
    if (ticketsInOtherTeams.length > 0) {
        console.log(
            `⚠️  Warning: ${ticketsInOtherTeams.length} ticket(s) are in different teams:`,
        )
        ticketsInOtherTeams.forEach((t) => {
            console.log(
                `   - ${t.identifier} is in team ${t.team.name} (${t.team.key})`,
            )
        })
        console.log(`   These tickets will be skipped.`)
    }

    // Filter to only tickets in the specified team
    const ticketsInTeam = tickets.filter((t) => t.team.key === team.key)

    if (ticketsInTeam.length === 0) {
        console.log(`⚠️  No tickets found in team ${team.name}`)
        return
    }

    const ticketsToUpdate = ticketsInTeam.filter(
        (t) => t.state.name === sourceState,
    )

    if (ticketsToUpdate.length === 0) {
        console.log(`✅ No tickets in "${sourceState}" state to update`)
        console.log("Current ticket states:")
        ticketsInTeam.forEach((t) => {
            console.log(`  - ${t.identifier}: ${t.state.name}`)
        })
        return
    }

    console.log(
        `Found ${ticketsToUpdate.length} tickets in "${sourceState}" state to update:`,
    )
    ticketsToUpdate.forEach((t) => {
        console.log(`  - ${t.identifier}: ${t.title}`)
    })

    if (dryRun) {
        console.log("\n🔍 DRY RUN - Would update the following tickets:")
        ticketsToUpdate.forEach((t) => {
            console.log(`   ${t.identifier}: "${t.state.name}" → "${targetState}"`)
        })
        console.log(
            `\n✅ Dry run complete. ${ticketsToUpdate.length} tickets would be updated.`,
        )
    } else {
        console.log("\nUpdating tickets...")
        const results = await Promise.all(
            ticketsToUpdate.map(async (ticket): Promise<UpdateResult> => {
                try {
                    const result = await updateTicketState(
                        ticket.id,
                        targetStateObj.id,
                        apiKey!,
                    )
                    if (result.success) {
                        console.log(
                            `✅ ${ticket.identifier}: Moved to "${result.issue.state.name}"`,
                        )
                        return { success: true, ticket: ticket.identifier }
                    } else {
                        console.error(`❌ ${ticket.identifier}: Update failed`)
                        return { success: false, ticket: ticket.identifier }
                    }
                } catch (error) {
                    const err = error as Error
                    console.error(`❌ ${ticket.identifier}: ${err.message}`)
                    return { success: false, ticket: ticket.identifier, error: err }
                }
            }),
        )

        const successful = results.filter((r) => r.success).length
        const failed = results.filter((r) => !r.success).length

        console.log("\n📊 Summary:")
        console.log(`  ✅ Successfully updated: ${successful}`)
        console.log(`  ❌ Failed: ${failed}`)

        if (failed > 0) {
            process.exit(1)
        }
    }
}

main().catch((error: Error) => {
    console.error("❌ Unexpected error:", error)
    process.exit(1)
})
