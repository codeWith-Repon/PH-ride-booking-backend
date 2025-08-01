import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { Driver } from "../driver/driver.model";
import { User } from "../user/user.model";
import { IRide, RIDE_STATUS } from "./ride.interface";
import { Ride } from "./ride.model";
import { Role } from "../user/user.interface";

const createRide = async (payload: IRide) => {
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

export const RideServices = {
    createRide,
    updateRideStatus,
    otpVerify
}
