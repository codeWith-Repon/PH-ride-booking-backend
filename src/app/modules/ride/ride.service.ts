import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { Driver } from "../driver/driver.model";
import { IRide, RIDE_STATUS } from "./ride.interface";
import { Ride } from "./ride.model";
import { Role } from "../user/user.interface";

const createRide = async (payload: IRide, decodedToken: JwtPayload) => {
    const generateOtp = Math.floor(100000 + Math.random() * 900000)

    const { driver } = payload
    const { userId } = decodedToken


    const isDriverExist = await Driver.findById(driver)

    if (!isDriverExist) {
        throw new AppError(400, "Driver does't exist")
    }

    const checkRiderOngoingRide = await Ride.findOne({
        user: userId,
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
    const alreadyRequestedUser = await Ride.findOne({ user: userId })
    if (alreadyRequestedUser &&
        alreadyRequestedUser.status === RIDE_STATUS.REQUESTED &&
        payload.user) {
        throw new AppError(400, "You are already sent request")
    }
    payload.rideOtp = generateOtp
    payload.user = userId
    const ride = await Ride.create(payload)

    return ride
}

const updateRideStatus = async (payload: Partial<IRide>, decodedToken: JwtPayload) => {
    const { role, userId } = decodedToken;

    if (role === Role.RIDER) {
        if (payload.status === RIDE_STATUS.CANCELLED ||
            payload.status === RIDE_STATUS.REQUESTED
        ) {
            return await Ride.findOneAndUpdate({ user: userId }, payload, { new: true })
        }
        throw new AppError(400, "Rider can only cancel or request the ride!")
    }

    if (role !== Role.DRIVER) {
        throw new AppError(400, "You can't change ride status!")
    }

    if (role === Role.DRIVER) {
        const driverInfo = await Driver.findOne({ user: userId })

        if (!driverInfo) {
            throw new AppError(404, "Driver profile not found!")
        }

        const currentRide = await Ride.findOne({ driver: driverInfo._id, status: { $ne: RIDE_STATUS.COMPLETED } })

        if (!currentRide) {
            throw new AppError(400, "No ongoing ride found for driver")
        }

        if (payload.status === RIDE_STATUS.PICKED_UP ||
            payload.status === RIDE_STATUS.IN_TRANSIT ||
            payload.status === RIDE_STATUS.COMPLETED
        ) {
            if (!currentRide.isOtpVerified) {
                throw new AppError(400, "OTP is not verified yet. Can't start the ride.")
            }
        }

        if (payload.status === RIDE_STATUS.PICKED_UP && currentRide.isOtpVerified) {
            currentRide.startedAt = new Date()
            await currentRide.save()
        }

        if (payload.status === RIDE_STATUS.COMPLETED && currentRide.isOtpVerified) {
            currentRide.completedAt = new Date()
            await currentRide.save()
        }


        return await Ride.findOneAndUpdate({ driver: driverInfo._id }, payload, { new: true })

    }
}

const otpVerify = async (payload: { otp: string }, decodedToken: JwtPayload) => {
    const { userId, role } = decodedToken

    if ([Role.SUPER_ADMIN, Role.ADMIN, Role.DRIVER].includes(role)) {
        throw new AppError(400, "You are not allowed to verify ride OTP!")
    }

    const rideInfo = await Ride.findOne({ user: userId, status: { $ne: RIDE_STATUS.COMPLETED } })

    if (!rideInfo) {
        throw new AppError(400, "No ongoing ride found!")
    }

    if (!payload.otp) {
        throw new AppError(400, "OTP is required");
    }

    if (rideInfo.rideOtp !== Number(payload.otp)) {
        throw new AppError(400, "Invalid OTP")
    }

    rideInfo.isOtpVerified = true;
    await rideInfo.save();

    return
}

const getAllRide = async () => {
    const rides = await Ride.find()

    return rides
}

const getSingleRide = async (rideId: string) => {
    const ride = await Ride.findById(rideId)

    return ride
}

const getRideHistory = async (decodedToken: JwtPayload) => {

    const { userId, role } = decodedToken

    if (role === Role.DRIVER) {
        const driverInfo = await Driver.findOne({ user: userId })

        if (!driverInfo) {
            throw new AppError(404, "Driver profile not found!")
        }

        const rides = await Ride.find({ driver: driverInfo._id })

        if (rides.length === 0) {
            throw new AppError(404, "No ride history found for driver!");
        }
        return rides
    }

    if (role === Role.RIDER) {
        const rides = await Ride.find({ user: userId })

        if (rides.length === 0) {
            throw new AppError(404, "No ride history found for rider!");
        }

        return rides
    }
    throw new AppError(403, "Unauthorized role for ride history");
}



export const RideServices = {
    createRide,
    updateRideStatus,
    otpVerify,
    getAllRide,
    getSingleRide,
    getRideHistory
}
