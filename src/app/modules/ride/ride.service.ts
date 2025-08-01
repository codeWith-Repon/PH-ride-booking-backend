import AppError from "../../errorHelpers/AppError";
import { Driver } from "../driver/driver.model";
import { User } from "../user/user.model";
import { IRide, RIDE_STATUS } from "./ride.interface";
import { Ride } from "./ride.model";

const createRide = async (payload: Partial<IRide>) => {
    const generateOtp = Math.floor(100000 + Math.random() * 900000)

    const { user, driver } = payload

    const isUserExist = await User.findById(user)
    const isDriverExist = await Driver.findById(driver)

    if (!isUserExist) {
        throw new AppError(400, "User doesn't exist")
    }
    if (!isDriverExist) {
        throw new AppError(400, "Driver does't exist")
    }

    const checkRiderOngoingRide = await Ride.findOne({
        user,
        status: {
            $in: [RIDE_STATUS.ACCEPTED, RIDE_STATUS.PICKED_UP, RIDE_STATUS.IN_TRANSIT]
        }
    })

    if (checkRiderOngoingRide) {
        throw new AppError(400, "You already have an ongoing ride")
    }

    const checkDriverOngoingRide = await Ride.findOne({
        driver,
        status: {
            $in: [RIDE_STATUS.ACCEPTED, RIDE_STATUS.PICKED_UP, RIDE_STATUS.IN_TRANSIT]
        }
    })

    if (checkDriverOngoingRide) {
        throw new AppError(400, "Driver is currently on another ride")
    }
    const alreadyRequestedUser = await Ride.findOne({ user })
    if (alreadyRequestedUser &&
        alreadyRequestedUser.status === RIDE_STATUS.REQUESTED &&
        payload.user) {
        throw new AppError(400, "You are already sent request")
    }
    payload.rideOtp = generateOtp
    const ride = await Ride.create(payload)

    return ride
}

export const RideServices = {
    createRide
}
