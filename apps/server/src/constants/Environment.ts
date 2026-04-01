import dotenv from "dotenv"

import { envVar } from "../utils/environment/envVar"

dotenv.config({ path: ".env" })

export const STAGE = envVar("STAGE", "local")

export const PORT = envVar("PORT", 8000, (s) => parseInt(s))

export const REDIS_HOST = envVar("REDIS_HOST", "")

export const AWS_REGION = envVar("AWS_REGION", "us-east-1")
