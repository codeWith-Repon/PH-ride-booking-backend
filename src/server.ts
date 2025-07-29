/* eslint-disable no-console */
import { Server } from 'http'
import mongoose from 'mongoose';
import app from './app';


let server: Server;

const PORT = 5000;

const startServer = async () => {
    try {
        await mongoose.connect("mongodb+srv://mongodb:mongodb@cluster0.lpi7o.mongodb.net/ph-ride-booking?retryWrites=true&w=majority&appName=Cluster0")

        console.log('connected to DB!')

        server = app.listen(PORT, () => {
            console.log(`Server is listening to port ${PORT}`)
        })
    } catch (error) {
        console.log(error)
    }
}

startServer()


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

