import { type Page } from "@playwright/test"
import OpenAI from "openai"

import { logger } from "../../src/utils/logger"

export interface AgentAction {
    type: "press" | "done"
    key?: string
    reason: string
}

interface AgentObservation {
    visibleElements: string[]
    focusedElement: string | null
    pageTitle: string
    url: string
    screenshot: string
}

export interface AgentResult {
    success: boolean
    observations: string[]
    actions: AgentAction[]
    finalAssessment: string
}

interface AgentResponse {
    thinking: string
    action: AgentAction
    goalComplete: boolean
    success?: boolean
    assessment?: string
}

/**
 * A simple AI-powered browser agent for testing Hub UI.
 * Uses GPT-4 to interpret page state and decide on actions.
 */
export class BrowserAgent {
    private client: OpenAI

    private maxSteps: number

    private static readonly VALID_KEYS = new Set([
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Enter",
        "Escape",
    ])

    private verbose: boolean

    constructor(options: { maxSteps?: number; verbose?: boolean } = {}) {
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            throw new Error(
                "OPENAI_API_KEY environment variable is required for agentic tests"
            )
        }

        this.client = new OpenAI({ apiKey })
        this.maxSteps = options.maxSteps ?? 10
        this.verbose = options.verbose ?? false
    }

    public async run(page: Page, goal: string): Promise<AgentResult> {
        const observations: string[] = []
        const actions: AgentAction[] = []
        let step = 0

        if (this.verbose) {
            logger.info(`[Agent] Starting with goal: ${goal}`)
        }

        while (step < this.maxSteps) {
            step++

            const observation = await this.observePage(page)
            const observationText = `
Step ${step}/${this.maxSteps}
Page: ${observation.pageTitle} (${observation.url})
Focused: ${observation.focusedElement ?? "none"}
Visible elements:
${observation.visibleElements.map((e) => `  - ${e}`).join("\n")}
`.trim()

            observations.push(observationText)

            if (this.verbose) {
                logger.info(`[Agent] Observation:\n${observationText}`)
            }

            const actionHistory =
                actions.length > 0
                    ? `\n\nActions already taken:\n${actions.map((a, i) => `  ${i + 1}. ${a.type}${a.key ? ` "${a.key}"` : ""}`).join("\n")}`
                    : ""

            const isLastStep = step === this.maxSteps
            const urgentNotice = isLastStep
                ? "\n\n⚠️ THIS IS YOUR FINAL STEP. You MUST set goalComplete=true and provide your assessment NOW."
                : step >= this.maxSteps - 2
                  ? `\n\n⚠️ Only ${this.maxSteps - step} steps remaining. Wrap up soon with goalComplete=true.`
                  : ""

            const response = await this.client.chat.completions.create({
                model: "gpt-4o-mini",
                max_tokens: 500,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: `You are a visual QA testing agent for the Volley Hub, a TV game launcher app.
Hub runs on Fire TV, LG webOS, Samsung Tizen. Users navigate with TV remotes (arrow keys + Enter).

TV PLATFORM BEHAVIOR (NOT bugs):
- "Focused: none" in DOM is NORMAL - TV apps show focus VISUALLY (glowing highlight in screenshot)
- QR code modals have NO buttons - users scan with phones
- Escape dismisses modals - this is EXPECTED

HOW TO CHECK IF GOAL IS ACHIEVED (look at screenshot and class names):
- no modal in screenshot and "_modalHidden_" in class = modal is dismissed
- modal in screenshot and "_modalVisible_" in class = modal is showing  
- game tiles in screenshot and "_gameTile_" in class = game tiles are showing
- focused element in screenshot and "_focused_" in class = element has focus

DECISION MAKING - BE SMART:
1. If the goal says "exactly N actions" or lists specific steps, complete ALL of them before marking done.
2. If the goal is observational (see modal, confirm visible), mark done immediately when you see it.
3. Same key = different effects. First Escape closes modal, second Escape opens exit dialog. ONE is enough.
4. Don't spam the same key without confirming the first one failed.
5. Count your actions in "thinking" to track progress toward the goal.

WHAT COUNTS AS FAILURE (real bugs only):
- Visual glitches, broken layouts, stuck states, missing elements

Valid keys: ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Enter, Escape

JSON response:
{
  "thinking": "Current state vs goal. Did I achieve it?",
  "action": { "type": "press" | "done", "key": "..." },
  "goalComplete": true | false,
  "success": true | false,
  "assessment": "summary (REQUIRED when goalComplete=true)"
}`,
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Goal: ${goal}${actionHistory}${urgentNotice}\n\nCurrent page state:\n${observationText}`,
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${observation.screenshot}`,
                                    detail: "low",
                                },
                            },
                        ],
                    },
                ],
            })

            const content = response.choices[0]?.message?.content
            if (!content) {
                throw new Error("No response content from OpenAI")
            }

            let parsed: AgentResponse

            try {
                parsed = JSON.parse(content) as AgentResponse
            } catch {
                logger.error(`[Agent] Failed to parse response: ${content}`)
                throw new Error("Failed to parse agent response")
            }

            if (this.verbose) {
                logger.info(`[Agent] Thinking: ${parsed.thinking}`)
                logger.info(`[Agent] Action: ${JSON.stringify(parsed.action)}`)
            }

            actions.push(parsed.action)

            const isDone = parsed.goalComplete || parsed.action.type === "done"
            const shouldRunRetrospective = isDone
                ? parsed.success === false || parsed.success === undefined
                : isLastStep

            if (shouldRunRetrospective) {
                const retrospective = await this.evaluateRetrospectively(
                    goal,
                    observations,
                    actions
                )
                return {
                    success: retrospective.success,
                    observations,
                    actions,
                    finalAssessment: retrospective.assessment,
                }
            }

            if (isDone) {
                return {
                    success: parsed.success ?? false,
                    observations,
                    actions,
                    finalAssessment:
                        parsed.assessment ?? "Goal completed successfully",
                }
            }

            await this.executeAction(page, parsed.action)
            await page.waitForTimeout(300)
        }

        return {
            success: false,
            observations,
            actions,
            finalAssessment: `Agent did not complete goal within ${this.maxSteps} steps`,
        }
    }

    private async executeAction(
        page: Page,
        action: AgentAction
    ): Promise<void> {
        switch (action.type) {
            case "press":
                if (action.key) {
                    if (!BrowserAgent.VALID_KEYS.has(action.key)) {
                        logger.warn(
                            `[Agent] Invalid key "${action.key}", skipping`
                        )
                        return
                    }
                    await page.keyboard.press(action.key)
                }
                break
            case "done":
                break
        }
    }

    private async evaluateRetrospectively(
        goal: string,
        observations: string[],
        actions: AgentAction[]
    ): Promise<{ success: boolean; assessment: string }> {
        const actionsSummary = actions
            .map((a, i) => `${i + 1}. ${a.type}${a.key ? ` "${a.key}"` : ""}`)
            .join("\n")

        const observationsSummary = observations
            .map((o, i) => `--- Step ${i + 1} ---\n${o}`)
            .join("\n\n")

        if (this.verbose) {
            logger.info(`[Agent] Running retrospective evaluation...`)
        }

        const response = await this.client.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 300,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Review the test session to check if the goal was achieved.

KEY PRINCIPLE: If the goal was achieved, it's SUCCESS - even if the agent kept going afterward.
- Goal: "dismiss modal" → Modal was dismissed in step 2? SUCCESS. Ignore what happened after.
- Goal: "see tiles" → Tiles were visible at some point? SUCCESS.
- Goal: "open and close modal" → Modal opened then closed? SUCCESS.

IGNORE agent confusion. If the agent achieved the goal but then got confused and kept pressing keys, that's still SUCCESS. Judge the goal, not the agent's behavior after.

FAILURE means: The goal was NEVER achieved. Something actually broke. Real bugs.

TV platform notes:
- "Focused: none" is normal
- QR modals have no buttons
- Modals disappearing after Escape is correct

JSON: { "success": true | false, "assessment": "brief explanation" }`,
                },
                {
                    role: "user",
                    content: `Goal: ${goal}

Actions taken:
${actionsSummary}

Full observation history:
${observationsSummary}

Did this test session achieve its goal? Review the ENTIRE history.`,
                },
            ],
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            return {
                success: false,
                assessment: "Failed to get retrospective evaluation",
            }
        }

        try {
            const parsed = JSON.parse(content) as {
                success: boolean
                assessment: string
            }
            if (this.verbose) {
                logger.info(
                    `[Agent] Retrospective: success=${parsed.success}, ${parsed.assessment}`
                )
            }
            return parsed
        } catch {
            return {
                success: false,
                assessment: `Failed to parse retrospective: ${content}`,
            }
        }
    }

    private async observePage(page: Page): Promise<AgentObservation> {
        const screenshot = await page.screenshot({
            type: "jpeg",
            quality: 50,
            scale: "css",
        })
        const screenshotBase64 = screenshot.toString("base64")

        const observation = await page.evaluate(() => {
            const getVisibleElements = (): string[] => {
                const elements: string[] = []
                const selectors = [
                    "[class*='gameTile']",
                    "[class*='heroSection']",
                    "button",
                    "[role='button']",
                    "a",
                    "[tabindex]",
                    "[class*='modal']",
                    "[data-testid]",
                ]

                for (const selector of selectors) {
                    document.querySelectorAll(selector).forEach((el) => {
                        const rect = el.getBoundingClientRect()
                        if (rect.width > 0 && rect.height > 0) {
                            const text = (el as HTMLElement).innerText
                                ?.slice(0, 50)
                                .trim()
                            const testId = el.getAttribute("data-testid")
                            const className = el.className
                                .toString()
                                .slice(0, 50)
                            const tagName = el.tagName.toLowerCase()

                            let desc = `<${tagName}`
                            if (testId) desc += ` data-testid="${testId}"`
                            if (className) desc += ` class="${className}"`
                            desc += ">"
                            if (text) desc += ` "${text}"`

                            elements.push(desc)
                        }
                    })
                }

                return [...new Set(elements)].slice(0, 30)
            }

            const getFocusedElement = (): string | null => {
                const focused = document.activeElement
                if (
                    focused &&
                    focused !== document.body &&
                    focused !== document.documentElement
                ) {
                    const testId = focused.getAttribute("data-testid")
                    const className = focused.className.toString().slice(0, 50)
                    return `<${focused.tagName.toLowerCase()} ${testId ? `data-testid="${testId}"` : ""} class="${className}">`
                }
                return null
            }

            return {
                visibleElements: getVisibleElements(),
                focusedElement: getFocusedElement(),
                pageTitle: document.title,
                url: window.location.href,
            }
        })

        return {
            ...observation,
            screenshot: screenshotBase64,
        }
    }
}
