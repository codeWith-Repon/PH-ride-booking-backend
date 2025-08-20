import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { Driver } from "../driver/driver.model";
import { IRide, RIDE_STATUS } from "./ride.interface";
import { Ride } from "./ride.model";
import { Role } from "../user/user.interface";
import { DRIVER_STATUS } from "../driver/driver.interface";

const createRide = async (payload: IRide, decodedToken: JwtPayload) => {
    const generateOtp = Math.floor(100000 + Math.random() * 900000)

    const { driver } = payload
    const { userId } = decodedToken


    const isDriverExist = await Driver.findById(driver)

    if (!isDriverExist) {
        throw new AppError(400, "Driver does't exist")
    }

    if ([DRIVER_STATUS.PENDING, DRIVER_STATUS.SUSPENDED].includes(isDriverExist.status)) {
        const reason =
            isDriverExist.status === DRIVER_STATUS.PENDING
                ? "pending approval" :
                "suspended"

        throw new AppError(403, `Driver is ${reason} and cannot accept rides.`);
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
    const alreadyRequestedUser = await Ride.findOne({ user: userId, rideStatus: RIDE_STATUS.REQUESTED })
    if (alreadyRequestedUser) {
        throw new AppError(400, "You are already sent request")
    }
    payload.rideOtp = generateOtp
    payload.user = userId
    const ride = await Ride.create(payload)

    return ride
}

const updateRideStatus = async (payload: Partial<IRide>, decodedToken: JwtPayload) => {
    const { role, userId } = decodedToken;

    if (payload.rideStatus === RIDE_STATUS.REQUESTED) {
        throw new AppError(400, "Ride is already requested")
    }

    if (role === Role.RIDER) {

        if (payload.rideStatus === RIDE_STATUS.CANCELLED
        ) {
            const currentRide = await Ride.findOne({ user: userId })

            if (!currentRide) {
                throw new AppError(404, "No active ride found to update.")
            }

            if (
                currentRide.rideStatus === RIDE_STATUS.ACCEPTED ||
                currentRide.rideStatus === RIDE_STATUS.PICKED_UP ||
                currentRide.rideStatus === RIDE_STATUS.IN_TRANSIT
            ) {
                throw new AppError(400, "Ride is already accepted or ongoing. You can't cancel now.")
            }


            const updatedRide = await Ride.findOneAndUpdate({ user: userId }, payload, { new: true })

            if (!updatedRide) {
                throw new AppError(404, "No active ride found to update.")
            }
            return updatedRide
        }
        throw new AppError(403, "Rider can only cancel the ride!")
    }

    const driverInfo = await Driver.findOne({ user: userId })

    if (!driverInfo) {
        throw new AppError(404, "Driver profile not found!")
    }
    const currentRide = await Ride.findOne({ driver: driverInfo._id })


    if (!currentRide) {
        throw new AppError(400, "No ongoing ride found for driver")
    }

    if (role !== Role.DRIVER) {
        throw new AppError(403, "You can't change ride status!")
    }


    if ([DRIVER_STATUS.PENDING, DRIVER_STATUS.SUSPENDED].includes(driverInfo.status)) {
        const reason =
            driverInfo.status === DRIVER_STATUS.PENDING
                ? "pending approval" :
                "suspended"

        throw new AppError(403, `Driver is ${reason} and cannot accept rides.`);
    }


    if (currentRide.rideStatus === RIDE_STATUS.COMPLETED) {
        throw new AppError(403, "Completed rides cannot be modified.");
    }

    if (payload.rideStatus === RIDE_STATUS.ACCEPTED) {
        const existingAcceptedRideForDriver = await Ride.findOne({
            driver: driverInfo._id,
            status: RIDE_STATUS.ACCEPTED,
        });

        if (existingAcceptedRideForDriver) {
            throw new AppError(400, "You already have an accepted ride. Complete it before accepting a new one.");
        }
        payload.rideStatus = RIDE_STATUS.ACCEPTED
    }


    if (payload.rideStatus === RIDE_STATUS.PICKED_UP ||
        payload.rideStatus === RIDE_STATUS.IN_TRANSIT ||
        payload.rideStatus === RIDE_STATUS.COMPLETED
    ) {
        if (!currentRide.isOtpVerified) {
            throw new AppError(400, "OTP is not verified yet. Can't start the ride.")
        }
    }

    if (payload.rideStatus === RIDE_STATUS.PICKED_UP && currentRide.isOtpVerified) {
        currentRide.startedAt = new Date()
        await currentRide.save()
    }

    if (payload.rideStatus === RIDE_STATUS.COMPLETED && currentRide.isOtpVerified) {
        currentRide.completedAt = new Date()
        await currentRide.save()
    }

    return await Ride.findOneAndUpdate({ driver: driverInfo._id }, payload, { new: true })

}

const otpVerify = async (payload: { otp: string }, decodedToken: JwtPayload) => {
    const { userId, role } = decodedToken

    if ([Role.SUPER_ADMIN, Role.ADMIN].includes(role)) {
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

    if (rideInfo.isOtpVerified) {
        throw new AppError(400, "Already verify this ride!!")
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
