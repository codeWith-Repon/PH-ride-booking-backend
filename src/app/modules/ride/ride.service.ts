/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { Driver } from "../driver/driver.model";
import { IRide, RIDE_STATUS } from "./ride.interface";
import { Ride } from "./ride.model";
import { Role } from "../user/user.interface";
import { DRIVER_STATUS } from "../driver/driver.interface";
import { Payment } from "../payment/payment.model";
import { PAYMENT_STATUS } from "../payment/payment.interface";
import mongoose from "mongoose";
import { sendEmail } from "../../utils/sendEmail";
import { User } from "../user/user.model";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { rideSearchableFields } from "./ride.constant";


const getTransactionId = () => {
    return `tran_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

const createRide = async (payload: IRide, decodedToken: JwtPayload) => {
    const generateOtp = Math.floor(100000 + Math.random() * 900000)
    const transactionId = getTransactionId()

    const { driver } = payload
    const { userId } = decodedToken

    const session = await mongoose.startSession()

    session.startTransaction()

    try {
        const isDriverExist = await Driver.findById(driver)
        const isUserExist = await User.findById(userId)

        if (!isUserExist) {
            throw new AppError(400, "User does't exist")
        }

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
        const ride = await Ride.create([payload], { session })

        const payment = await Payment.create([{
            ride: ride[0]._id,
            status: PAYMENT_STATUS.UNPAID,
            transactionId: transactionId,
            amount: ride[0].fare
        }], { session })

        const updatedBooking = await Ride
            .findByIdAndUpdate(
                ride[0]._id,
                { payment: payment[0]._id },
                { new: true, runValidators: true, session }
            )
            .populate("user", "name email _id")
            .populate("driver", "_id user vehicle licenseNumber experience totalRides")
            .populate("payment")

        sendEmail({
            to: isUserExist.email,
            subject: "Your Ride Request OTP",
            templateName: "rideOtp",
            templateData: {
                name: isUserExist.name,
                otp: generateOtp
            }
        })

        await session.commitTransaction()
        return updatedBooking

    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        session.endSession()
    }
}

const updateRideStatus = async (payload: Partial<IRide>, decodedToken: JwtPayload, rideId: string) => {
    const { role, userId } = decodedToken;

    if (payload.rideStatus === RIDE_STATUS.REQUESTED) {
        throw new AppError(400, "Ride is already requested")
    }

    if (!rideId) {
        throw new AppError(400, "Ride Id is required")
    }

    //Rider logic
    if (role === Role.RIDER) {

        if (payload.rideStatus === RIDE_STATUS.CANCELLED
        ) {
            const currentRide = await Ride.findOne({ _id: rideId, user: userId })

            if (!currentRide) {
                throw new AppError(404, "No active ride found to update.")
            }

            if (currentRide.rideStatus === RIDE_STATUS.CANCELLED && payload.rideStatus === RIDE_STATUS.CANCELLED) {
                throw new AppError(400, "Ride is already cancelled.")
            }

            if (
                currentRide.rideStatus === RIDE_STATUS.ACCEPTED ||
                currentRide.rideStatus === RIDE_STATUS.PICKED_UP ||
                currentRide.rideStatus === RIDE_STATUS.IN_TRANSIT
            ) {
                throw new AppError(400, "Ride is already accepted or ongoing. You can't cancel now.")
            }

            const session = await mongoose.startSession()

            session.startTransaction()

            try {

                const updatedRide = await Ride.findByIdAndUpdate(rideId, payload, { new: true, runValidators: true, session })
                await Payment.findOneAndUpdate({ ride: currentRide._id }, { status: PAYMENT_STATUS.CANCELLED }, { session })
                await session.commitTransaction()

                return updatedRide
            } catch (error) {
                await session.abortTransaction()
                throw error
            } finally {
                session.endSession()
            }

        }
        throw new AppError(403, "Rider can only cancel ride!")

    }


    if (role !== Role.DRIVER) {
        throw new AppError(403, "You can't change ride status!")
    }

    const driverInfo = await Driver.findOne({ user: userId })

    if (!driverInfo) {
        throw new AppError(404, "Driver profile not found!")
    }

    if ([DRIVER_STATUS.PENDING, DRIVER_STATUS.SUSPENDED].includes(driverInfo.status)) {
        const reason =
            driverInfo.status === DRIVER_STATUS.PENDING
                ? "pending approval" :
                "suspended"

        throw new AppError(403, `Driver is ${reason} and cannot accept rides.`);
    }


    const currentRide = await Ride.findById(rideId)

    if (!currentRide) {
        throw new AppError(400, "No ongoing ride found for driver")
    }

    if (currentRide.rideStatus === RIDE_STATUS.COMPLETED) {
        throw new AppError(403, "Completed rides cannot be modified.");
    }


    //accept ride logic
    if (payload.rideStatus === RIDE_STATUS.ACCEPTED) {

        if (currentRide.fare === 0) {
            throw new AppError(400, "Fare is not set for this ride. Please set the fare before accepting the ride.");
        }

        const driverOngoingRide = await Ride.findOne({
            driver: driverInfo._id,
            rideStatus: {
                $in: [RIDE_STATUS.ACCEPTED, RIDE_STATUS.PICKED_UP, RIDE_STATUS.IN_TRANSIT]
            }
        })

        if (driverOngoingRide) {
            throw new AppError(400, "You already have an ongoing ride. Complete it before accepting a new one.");
        }

        const updatedRide = await Ride.findOneAndUpdate(
            { _id: rideId, rideStatus: RIDE_STATUS.REQUESTED },
            { $set: { rideStatus: RIDE_STATUS.ACCEPTED, driver: driverInfo._id } },
            { new: true }
        )

        return updatedRide
    }

    /// picked up / In transit /completed
    if (payload.rideStatus === RIDE_STATUS.PICKED_UP ||
        payload.rideStatus === RIDE_STATUS.IN_TRANSIT ||
        payload.rideStatus === RIDE_STATUS.COMPLETED
    ) {
        if (!currentRide.isOtpVerified) {
            throw new AppError(400, "OTP not verified. Can't start/complete the ride.");
        }
    }

    if (payload.rideStatus === RIDE_STATUS.PICKED_UP) {
        currentRide.startedAt = new Date()
        await currentRide.save()
    }

    if (payload.rideStatus === RIDE_STATUS.COMPLETED) {
        currentRide.completedAt = new Date()
        await currentRide.save()
    }

    return await Ride.findOneAndUpdate({ _id: rideId, driver: driverInfo._id }, payload, { new: true })

}

const setRideFare = async (payload: { fare: number }, decodedToken: JwtPayload, rideId: string) => {

    const { userId, role } = decodedToken

    if (!rideId) {
        throw new AppError(400, "Ride Id is required")
    }

    if (role !== Role.DRIVER) {
        throw new AppError(403, "You can't set the fare!")
    }

    const driverInfo = await Driver.findOne({ user: userId })

    if (!driverInfo) {
        throw new AppError(404, "Driver profile not found!")
    }

    if ([DRIVER_STATUS.PENDING, DRIVER_STATUS.SUSPENDED].includes(driverInfo.status)) {
        const reason =
            driverInfo.status === DRIVER_STATUS.PENDING
                ? "pending approval" :
                "suspended"

        throw new AppError(403, `Driver is ${reason} and can not set the fare.`);
    }

    const currentRide = await Ride.findOne({
        _id: rideId,
        driver: driverInfo._id,
        rideStatus: {
            $nin: [RIDE_STATUS.REJECTED, RIDE_STATUS.CANCELLED, RIDE_STATUS.COMPLETED]
        }
    })

    if (!currentRide) {
        throw new AppError(400, "No ongoing ride found for driver")
    }

    currentRide.fare = payload.fare

    await currentRide.save()

    return currentRide

}

const otpVerify = async (payload: { otp: string }, decodedToken: JwtPayload) => {
    const { userId, role } = decodedToken

    if ([Role.SUPER_ADMIN, Role.ADMIN].includes(role)) {
        throw new AppError(400, "You are not allowed to verify ride OTP!")
    }

    const rideInfo = await Ride.findOne({ user: userId, rideStatus: { $nin: [RIDE_STATUS.COMPLETED, RIDE_STATUS.CANCELLED, RIDE_STATUS.REJECTED] } })


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

const getAllRide = async (query: Record<string, string>) => {
    const queryBuilder = new QueryBuilder(Ride.find(), query)
    const rides = await queryBuilder
        .search(rideSearchableFields)
        .filter()
        .sort()
        .fields()
        .paginate()
        .populate("user", "name email _id")
        .populate("driver", "user vehicle licenseNumber experience totalRides availabilityStatus")
        .populate("payment", "status amount transactionId")

    const [data, meta] = await Promise.all([
        rides.build(),
        queryBuilder.getMeta()
    ])
    return {
        data,
        meta
    }
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

const getCurrentRide = async (decodedToken: JwtPayload) => {

    const { userId, role } = decodedToken
    const filter: Record<string, any> = {
        rideStatus: {
            $nin: [RIDE_STATUS.REJECTED, RIDE_STATUS.CANCELLED, RIDE_STATUS.COMPLETED]
        }
    }

    if (role === Role.DRIVER) {
        const driver = await Driver.findOne({ user: userId })
        if (!driver) throw new AppError(404, "Driver not found")
        filter.driver = driver._id
    } else if (role === Role.RIDER) {
        filter.user = userId
    }


    const currentRide = await Ride.findOne(filter)
        .populate("user", "name email _id")
        .populate("driver", "user vehicle licenseNumber experience totalRides availabilityStatus")
        .populate("payment", "status amount transactionId")


    if (!currentRide) {
        throw new AppError(404, "No ongoing ride found!")
    }

    return currentRide
}


export const RideServices = {
    createRide,
    updateRideStatus,
    setRideFare,
    otpVerify,
    getAllRide,
    getSingleRide,
    getRideHistory,
    getCurrentRide
}
