import config from "@/config"
import { createAuthClient } from "better-auth/react"

export const { signIn, signUp, signOut, useSession } = createAuthClient({
    baseURL: config.auth.BETTER_AUTH_URL,
})