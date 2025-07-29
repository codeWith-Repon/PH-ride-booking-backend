/* eslint-disable @typescript-eslint/no-non-null-assertion */
import dotenv from 'dotenv'


dotenv.config()

interface EnvConfig {
    PORT: string;
    DB_URL: string;
    NODE_ENV: string;
    BCRYPT_SALT_ROUND: string;
}

const loadEnvVariables = (): EnvConfig => {
    const requiredEnvVariables: string[] = [
        "PORT",
        "DB_URL",
        "NODE_ENV",
        "BCRYPT_SALT_ROUND"
    ]

    requiredEnvVariables.forEach(key => {
        if (!process.env[key]) {
            throw new Error(`Missing required environment variable ${key}`)
        }
    })

    return {
        PORT: process.env.PORT!,
        DB_URL: process.env.DB_URL!,
        NODE_ENV: process.env.NODE_ENV!,
        BCRYPT_SALT_ROUND: process.env.BCRYPT_SALT_ROUND!
    }
}

export const envVars: EnvConfig = loadEnvVariables()