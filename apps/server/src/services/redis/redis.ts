import Redis from "ioredis"

import { REDIS_HOST } from "../../constants/Environment"

export const redis = new Redis({
    host: REDIS_HOST,
    lazyConnect: true,
})
