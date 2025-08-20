import { Router } from "express";
import { userRoutes } from "../modules/user/user.route";
import { AuthRoutes } from "../modules/auth/auth.route";
import { vehicleRoutes } from "../modules/vehicle/vehicle.route";
import { driverRoutes } from "../modules/driver/driver.routes";
import { rideRoutes } from "../modules/ride/ride.route";
import { OtpRoutes } from "../modules/otp/otp.route";


export const router = Router()

const moduleRoutes = [
    {
        path: "/auth",
        route: AuthRoutes
    },
    {
        path: "/user",
        route: userRoutes
    },
    {
        path: "/driver",
        route: driverRoutes
    },
    {
        path: "/vehicle",
        route: vehicleRoutes
    },
    {
        path: "/ride",
        route: rideRoutes
    },
    {
        path: "/otp",
        route: OtpRoutes
    }
]

moduleRoutes.forEach((route) => {
    router.use(route.path, route.route)
})