import type { GenericGameState } from "@volley/vgf/types"
import type z from "zod"

import type { HubStateSchema } from "../schemas/HubStateSchema"

export type HubState = z.infer<typeof HubStateSchema> & GenericGameState
