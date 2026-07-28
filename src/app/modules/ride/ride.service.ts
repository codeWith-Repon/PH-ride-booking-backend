/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { Driver } from "../driver/driver.model";
import { IRide, RIDE_STATUS, RIDER_TRACKABLE_STATUSES } from "./ride.interface";
import { Ride, RideDocument } from "./ride.model";
import { Role } from "../user/user.interface";
import { DRIVER_STATUS } from "../driver/driver.interface";
import { Payment } from "../payment/payment.model";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "../payment/payment.interface";
import mongoose from "mongoose";
import { sendEmail } from "../../utils/sendEmail";
import { User } from "../user/user.model";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { rideNestedFilterMapping, rideNestedSearchMapping, rideSearchableFields } from "./ride.constant";
import calculateFare from "../../utils/calculateFare";
import getTransactionId from "../../utils/transactionId";
import { deleteRideOtp, getRideOtp, setRideOtp } from "./rideOtp.radis";
import { NotificationServices } from "../notification/notification.service";
import { wsBroadcast } from "../../ws";
import { matchingService } from "../matching/matching.service";


type CreateRidePayload = IRide & {
    pickupCoordinates?: { lat: number; lng: number };
};

const createRide = async (payload: CreateRidePayload, decodedToken: JwtPayload) => {
    const generateOtp = Math.floor(100000 + Math.random() * 900000)

    const { driver, distance, paymentMethod, pickupCoordinates } = payload
    const { userId } = decodedToken

    const session = await mongoose.startSession()

    session.startTransaction()

    try {
        const isUserExist = await User.findById(userId)
        if (!isUserExist) {
            throw new AppError(400, "User does't exist")
        }

        // Resolve the effective driver — either the one the rider picked, or
        // the best server-side match against the rider's pickupCoordinates.
        let effectiveDriverId: string | undefined =
            driver ? driver.toString() : undefined;

        if (!effectiveDriverId) {
            if (!pickupCoordinates) {
                throw new AppError(400, "pickupCoordinates is required for auto-match")
            }
            const best = await matchingService.getBest({
                lat: pickupCoordinates.lat,
                lng: pickupCoordinates.lng,
            })
            if (!best) {
                throw new AppError(404, "No drivers nearby right now. Try again in a moment.")
            }
            effectiveDriverId = best.driverId
        }

        const isDriverExist = await Driver.findById(effectiveDriverId)

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
            rideStatus: {
                $in: [RIDE_STATUS.ACCEPTED, RIDE_STATUS.PICKED_UP, RIDE_STATUS.IN_TRANSIT]
            }
        })

        if (checkRiderOngoingRide) {
            throw new AppError(400, "You already have an ongoing ride")
        }

        const checkDriverOngoingRide = await Ride.findOne({
            driver: effectiveDriverId,
            rideStatus: {
                $in: [RIDE_STATUS.ACCEPTED, RIDE_STATUS.PICKED_UP, RIDE_STATUS.IN_TRANSIT]
            }
        })

        if (checkDriverOngoingRide) {
            throw new AppError(400, "Driver is currently on another ride")
        }

        const fare = distance ? calculateFare(distance) : 0

        // Don't persist pickupCoordinates on the ride doc — the schema doesn't have it
        // and it's only used for matching above.
        const { pickupCoordinates: _omitted, ...persistedPayload } = payload

        const ride = await Ride.create([
            {
                ...persistedPayload,
                driver: effectiveDriverId,
                user: userId,
                rideOtp: generateOtp,
                fare,
                paymentStatus: PAYMENT_STATUS.UNPAID
            }
        ], { session })

        await NotificationServices.createNotification({
            recipient: isDriverExist?.user,
            ride: ride[0]._id,
            title: "Ride Request",
            message: "You have a new ride request"
        });

        let payment = null;

        if (paymentMethod !== PAYMENT_METHOD.CASH) {
            payment = await Payment.create([{
                ride: ride[0]._id,
                transactionId: getTransactionId(paymentMethod),
                amount: ride[0].fare,
                status: PAYMENT_STATUS.UNPAID,
                paymentMethod
            }], { session })

            await Ride
                .findByIdAndUpdate(
                    ride[0]._id,
                    { payment: payment[0]._id },
                    { new: true, session }
                )
        }

        await setRideOtp(ride[0]._id.toString(), generateOtp, 30 * 60) //30 minutes

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


        const result = await Ride.findById(ride[0]._id)
            .populate("user", "name email image")
            .populate("driver", "_id user vehicle licenseNumber experience totalRides")
            .populate("payment", "ride transactionId paymentMethod status amount");

        if (result) {
            wsBroadcast.toRideParticipants(result._id.toString(), {
                type: "ride:status",
                rideId: result._id,
                rideStatus: result.rideStatus,
                ride: result
            });
        }

        return result;

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
        throw new AppError(400, "Ride is already requested");
    }

    if (!rideId) {
        throw new AppError(400, "Ride Id is required");
    }

    let ride: RideDocument | null = null;

    // ────────────────────────────────────────────────
    // Rider can only cancel
    // ────────────────────────────────────────────────
    if (role === Role.RIDER) {
        if (payload.rideStatus !== RIDE_STATUS.CANCELLED) {
            throw new AppError(403, "Rider can only cancel ride!");
        }

        ride = await Ride.findOne({ _id: rideId, user: userId });

        if (!ride) {
            throw new AppError(404, "No active ride found to update.");
        }

        if (ride.rideStatus === RIDE_STATUS.CANCELLED) {
            throw new AppError(400, "Ride is already cancelled.");
        }

        const restrictedStatuses = [RIDE_STATUS.ACCEPTED, RIDE_STATUS.PICKED_UP, RIDE_STATUS.IN_TRANSIT];
        if (restrictedStatuses.includes(ride.rideStatus as RIDE_STATUS)) {
            throw new AppError(400, "Ride is already accepted or ongoing. You can't cancel now.");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            ride = await Ride.findByIdAndUpdate(
                rideId,
                { rideStatus: RIDE_STATUS.CANCELLED },
                { new: true, runValidators: true, session }
            );

            await Payment.findOneAndUpdate(
                { ride: ride!._id },
                { status: PAYMENT_STATUS.CANCELLED },
                { session }
            );

            if (ride?.driver) {
                const driverProfile = await Driver.findById(ride.driver);

                await NotificationServices.createNotification({
                    recipient: driverProfile?.user,
                    ride: ride._id,
                    title: "Ride Cancelled",
                    message: "The rider has cancelled the ride request."
                });
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    // ────────────────────────────────────────────────
    // Driver logic
    // ────────────────────────────────────────────────
    else if (role === Role.DRIVER) {
        const driverInfo = await Driver.findOne({ user: userId });

        if (!driverInfo) {
            throw new AppError(404, "Driver profile not found!");
        }

        if ([DRIVER_STATUS.PENDING, DRIVER_STATUS.SUSPENDED].includes(driverInfo.status)) {
            const reason = driverInfo.status === DRIVER_STATUS.PENDING ? "pending approval" : "suspended";
            throw new AppError(403, `Driver is ${reason} and cannot accept rides.`);
        }

        ride = await Ride.findById(rideId);

        if (!ride) {
            throw new AppError(404, "No ongoing ride found for driver");
        }

        if (ride.rideStatus === RIDE_STATUS.COMPLETED) {
            throw new AppError(403, "Completed rides cannot be modified.");
        }

        // Case: Accept ride
        if (payload.rideStatus === RIDE_STATUS.ACCEPTED) {
            if (ride.rideStatus !== RIDE_STATUS.REQUESTED) {
                throw new AppError(400, "Ride is no longer available to accept");
            }

            const driverOngoingRide = await Ride.findOne({
                driver: driverInfo._id,
                rideStatus: { $in: [RIDE_STATUS.ACCEPTED, RIDE_STATUS.PICKED_UP, RIDE_STATUS.IN_TRANSIT] }
            });

            if (driverOngoingRide) {
                throw new AppError(400, "You already have an ongoing ride.");
            }

            ride = await Ride.findOneAndUpdate(
                { _id: rideId, rideStatus: RIDE_STATUS.REQUESTED },
                { $set: { rideStatus: RIDE_STATUS.ACCEPTED, driver: driverInfo._id } },
                { new: true, runValidators: true }
            );

            await NotificationServices.createNotification({
                recipient: ride?.user,
                ride: ride?._id,
                title: "Ride Accepted",
                message: "A driver has accepted your ride request and is on the way!"
            });
        }

        // Case: Reject ride
        else if (payload.rideStatus === RIDE_STATUS.REJECTED) {
            ride = await Ride.findOneAndUpdate(
                { _id: rideId, rideStatus: { $in: [RIDE_STATUS.REQUESTED, RIDE_STATUS.ACCEPTED] } },
                { $set: { rideStatus: RIDE_STATUS.REJECTED, driver: driverInfo._id } },
                { new: true, runValidators: true }
            );

            await NotificationServices.createNotification({
                recipient: ride?.user,
                ride: ride?._id,
                title: "Ride Rejected",
                message: "The driver has rejected your ride request."
            });
        }

        // Case: Progress ride (PICKED_UP, IN_TRANSIT, COMPLETED)
        else if ([RIDE_STATUS.PICKED_UP, RIDE_STATUS.IN_TRANSIT, RIDE_STATUS.COMPLETED].includes(payload.rideStatus as RIDE_STATUS)) {
            if (!ride.isOtpVerified) {
                throw new AppError(400, "OTP not verified. Can't start/complete the ride.");
            }

            if (payload.rideStatus === RIDE_STATUS.PICKED_UP) {
                ride.startedAt = new Date();

                await NotificationServices.createNotification({
                    recipient: ride.user,
                    ride: ride._id,
                    title: "Ride Started",
                    message: "Your ride has officially started. Safe travels!"
                });
            }

            if (payload.rideStatus === RIDE_STATUS.IN_TRANSIT) {
                await NotificationServices.createNotification({
                    recipient: ride.user,
                    ride: ride._id,
                    title: "Ride In Transit",
                    message: "You are on the way to your destination."
                });
            }

            if (payload.rideStatus === RIDE_STATUS.COMPLETED) {
                ride.completedAt = new Date();

                if (ride.paymentMethod === PAYMENT_METHOD.CASH) {
                    await Payment.create({
                        ride: ride._id,
                        transactionId: getTransactionId(PAYMENT_METHOD.CASH),
                        amount: ride.fare,
                        paymentMethod: PAYMENT_METHOD.CASH,
                        status: PAYMENT_STATUS.PAID
                    });
                }

                await NotificationServices.createNotification({
                    recipient: ride.user,
                    ride: ride._id,
                    title: "Ride Completed",
                    message: `You have reached your destination. Fare: ${ride.fare} TK.`
                });
            }

            ride.rideStatus = payload.rideStatus as RIDE_STATUS;
            await ride.save({ validateBeforeSave: true });
        }

        else {
            throw new AppError(400, "Invalid status transition for driver");
        }
    }

    else {
        throw new AppError(403, "You can't change ride status!");
    }

    if (ride) {
        wsBroadcast.toRideParticipants(ride._id.toString(), {
            type: "ride:status",
            rideId: ride._id,
            rideStatus: ride.rideStatus,
            ride
        });
    }

    return ride;
};

const otpVerify = async (payload: { otp: string }, decodedToken: JwtPayload, rideId: string) => {
    const { role } = decodedToken


    if ([Role.SUPER_ADMIN, Role.ADMIN].includes(role)) {
        throw new AppError(400, "You are not allowed to verify ride OTP!")
    }

    const rideInfo = await Ride.findById({ _id: rideId })

    if (!rideInfo) {
        throw new AppError(400, "No ongoing ride found!")
    }

    if (!payload.otp) {
        throw new AppError(400, "OTP is required");
    }

    const rideOtp = await getRideOtp(rideInfo._id.toString())

    if (!rideOtp) {
        throw new AppError(400, "OTP expired or not found");
    }

    if (rideOtp.toString() !== payload.otp.toString()) {
        throw new AppError(400, "Invalid OTP")
    }

    if (rideInfo.isOtpVerified) {
        throw new AppError(400, "Already verify this ride!!")
    }

    rideInfo.isOtpVerified = true;

    await rideInfo.save();
    await deleteRideOtp(rideInfo._id.toString());

    wsBroadcast.toRideParticipants(rideInfo._id.toString(), {
        type: "ride:otp-verified",
        rideId: rideInfo._id
    });

    return
}

const getAllRide = async (query: Record<string, string>) => {
    const queryBuilder = new QueryBuilder(Ride.find(), query)

    await queryBuilder.filter(rideNestedFilterMapping);
    await queryBuilder.search(rideSearchableFields, rideNestedSearchMapping);

    const rides = await queryBuilder
        .sort()
        .fields()
        .paginate()
        .populate("user", "name email image _id")
        .populate("driver", "user vehicle licenseNumber experience totalRides availabilityStatus")
        .populate("payment", "status amount transactionId")

    const [data, meta] = await Promise.all([
        rides.build(),
        queryBuilder.getMeta()
    ])
    return {
        meta,
        data,
    }
}


const getSingleRide = async (rideId: string) => {
    const ride = await Ride
        .findById(rideId)
        .populate("user", "name email image _id")
        .populate("driver", "user vehicle licenseNumber experience totalRides availabilityStatus")
        .populate({
            path: "driver",
            select: "user licenseNumber experience totalRides",
            populate: {
                path: "user",
                select: "name email image"
            }
        })
        .populate("payment", "status amount transactionId")

    return ride
}
const getRideHistory = async (decodedToken: JwtPayload) => {

    const { userId, role } = decodedToken

    if (role === Role.DRIVER) {
        const driverInfo = await Driver.findOne({ user: userId })

        if (!driverInfo) {
            throw new AppError(404, "Driver profile not found!")
        }

        const rides = await Ride
            .find({ driver: driverInfo._id })
            .populate("user", "name email image")

        if (rides.length === 0) {
            throw new AppError(404, "No ride history found for rider!");
        }

        return rides
    }

    if (role === Role.RIDER) {
        const rides = await Ride
            .find({ user: userId })
            .populate({
                path: "driver",
                select: "user licenseNumber experience totalRides",
                populate: {
                    path: "user",
                    select: "name email image"
                }
            })
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

    let currentRide

    if (role === Role.RIDER) {
        currentRide = await Ride.findOne(filter)
            .populate({
                path: "driver",
                select: "user licenseNumber experience totalRides currentLocation lastLocationAt",
                populate: {
                    path: "user",
                    select: "name email image _id"
                }
            })
            .populate("payment", "status amount transactionId")
    } else {
        currentRide = await Ride.findOne(filter)
            .populate({
                path: "user",
                select: "name email image _id"
            })
            .populate("payment", "status amount transactionId")
    }


    if (!currentRide) {
        throw new AppError(404, "No ongoing ride found!")
    }

    return currentRide
}

const rateRide = async (
    rideId: string,
    payload: { rating: number; comment?: string },
    decodedToken: JwtPayload
) => {
    const ride = await Ride.findById(rideId)
    if (!ride) {
        throw new AppError(404, "Ride not found")
    }
    if (ride.user.toString() !== decodedToken.userId) {
        throw new AppError(403, "Only the rider can rate this ride")
    }
    if (ride.rideStatus !== RIDE_STATUS.COMPLETED) {
        throw new AppError(400, "You can only rate a completed ride")
    }
    if (ride.rating) {
        throw new AppError(400, "This ride has already been rated")
    }

    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        ride.rating = payload.rating
        if (payload.comment) ride.ratingComment = payload.comment
        ride.ratedAt = new Date()
        await ride.save({ session })

        // Roll the new rating into the driver's running average
        const driver = await Driver.findById(ride.driver).session(session)
        if (driver) {
            const prevCount = driver.ratingCount ?? 0
            const prevAvg = driver.rating ?? 0
            const nextCount = prevCount + 1
            const nextAvg =
                (prevAvg * prevCount + payload.rating) / nextCount
            driver.rating = Number(nextAvg.toFixed(2))
            driver.ratingCount = nextCount
            await driver.save({ session })
        }

        await session.commitTransaction()
        return ride
    } catch (error) {
        await session.abortTransaction()
        throw error
    } finally {
        session.endSession()
    }
}

const updateMyLocationAsRider = async (
    userId: string,
    coords: { lat: number; lng: number }
) => {
    const ride = await Ride.findOneAndUpdate(
        { user: userId, rideStatus: { $in: RIDER_TRACKABLE_STATUSES } },
        {
            riderCurrentLocation: {
                type: "Point",
                coordinates: [coords.lng, coords.lat], // GeoJSON: [lng, lat]
            },
            riderLastLocationAt: new Date(),
        },
        { new: true, projection: { riderCurrentLocation: 1, riderLastLocationAt: 1, driver: 1 } }
    )

    if (!ride) {
        throw new AppError(404, "No trackable ride found")
    }

    if (ride.driver) {
        const driver = await Driver.findById(ride.driver).select("user")
        if (driver) {
            wsBroadcast.toUser(driver.user.toString(), {
                type: "rider-location:update",
                rideId: ride._id.toString(),
                lat: coords.lat,
                lng: coords.lng,
                updatedAt: ride.riderLastLocationAt
            })
        }
    }

    return ride
}

export const RideServices = {
    createRide,
    updateRideStatus,
    otpVerify,
    getAllRide,
    getSingleRide,
    getRideHistory,
    getCurrentRide,
    rateRide,
    updateMyLocationAsRider
}