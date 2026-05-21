/* eslint-disable no-console */
import http, { Server } from 'http'
import mongoose from 'mongoose';
import app from './app';
import { envVars } from './app/config/env';
import { seedSuperAdmin } from './app/utils/seedSuperAdmin';
import { connectRedis } from './app/config/radis.config';
import { initSocket } from './app/socket';
import dns from 'dns';

let server: Server;
dns.setServers(['1.1.1.1', '8.8.8.8']);

const startServer = async () => {
    try {
        await mongoose.connect(envVars.DB_URL)

        console.log('connected to DB!')

        server = http.createServer(app);
        initSocket(server);

        server.listen(envVars.PORT, () => {
            console.log(`Server is listening to port ${envVars.PORT}`)
        })
    } catch (error) {
        console.log(error)
    }
}

(
    async () => {
        await connectRedis()
        await startServer()
        await seedSuperAdmin()
    }
)()

process.on('unhandledRejection', (error) => {
    console.log("Unhandled Rejection detected... server shutting down..", error);

    if (server) {
        server.close(() => {
            process.exit(1)
        })
    }

    process.exit(1)
})


process.on('uncaughtException', (error) => {
    console.log("Uncaught Exceptions detected... server shutting down..", error);

    if (server) {
        server.close(() => {
            process.exit(1)
        })
    }

    process.exit(1)
})


process.on('SIGTERM', () => {
    console.log("SIGTERM signal received... server shutting down..");

    if (server) {
        server.close(() => {
            process.exit(1)
        })
    }

    process.exit(1)
})

process.on('SIGINT', () => {
    console.log("SIGINT signal recieved... server shutting down..");

    if (server) {
        server.close(() => {
            process.exit(1)
        })
    }

    process.exit(1)
})

