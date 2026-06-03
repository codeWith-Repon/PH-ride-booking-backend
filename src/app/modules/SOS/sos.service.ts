/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtPayload } from "jsonwebtoken"
import { User } from "../user/user.model"
import AppError from "../../errorHelpers/AppError"
import { Ride } from "../ride/ride.model"
import { Role } from "../user/user.interface"
import { Driver } from "../driver/driver.model"
import { RIDE_STATUS } from "../ride/ride.interface"
import { SOS } from "./sos.model"
import { sendEmail } from "../../utils/sendEmail"
import { SOS_STATUS } from "./sos.interface"

const addEmergencyContact = async (decodedToken: JwtPayload, emergencyContact: string) => {
    const userId = decodedToken.userId

    const isUserExist = await User.findById(userId)

    if (!isUserExist) {
        throw new AppError(401, "User does not exist")
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { $addToSet: { emergencyContactEmail: { $each: [emergencyContact] } } }, { new: true })

    return updatedUser
}

const sendSosMessage = async (rideId: string, payload: { message?: string, location?: string }, decodedToken: JwtPayload) => {

    const { userId, role } = decodedToken

    const filter: Record<string, any> = {
        _id: rideId,
        rideStatus: {
            $in: [RIDE_STATUS.PICKED_UP, RIDE_STATUS.IN_TRANSIT]
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

    if (!currentRide) {
        throw new AppError(404, "No ongoing ride found!")
    }

    const user = await User.findById(userId).select("emergencyContactEmail")

    if (!user?.emergencyContactEmail) {
        throw new AppError(404, "No emergency contact found!")
    }

    await sendEmail({
        to: user.emergencyContactEmail,
        subject: "🚨 Emergency SOS Alert",
        templateName: "sos-alert",
        templateData: {
            rideId: currentRide._id || "",
            location: payload?.location || "",
            message: payload?.message,
            user: userId
        }
    })

    const sos = await SOS.create({
        ride: currentRide._id,
        location: payload?.location,
        message: payload?.message,
        sender: userId,
        contactEmails: user.emergencyContactEmail,
    });

    return sos
}

const updateSosStatus = async (sosId: string, payload: { status: SOS_STATUS }) => {
    const sos = await SOS.findById(sosId)
    if (!sos) {
        throw new AppError(404, "SOS not found")
    }
    sos.status = payload.status

    return await sos.save()
}

const getAllSos = async (query: Record<string, string>) => {
    const filter: Record<string, any> = {}
    if (query.status) filter.status = query.status

    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Number(query.limit) || 20)
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
        SOS.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("sender", "name email phone image")
            .populate({
                path: "ride",
                select: "user driver pickupLocation dropLocation rideStatus",
                populate: [
                    { path: "user", select: "name email phone" },
                    {
                        path: "driver",
                        select: "user vehicle",
                        populate: [
                            { path: "user", select: "name email phone" },
                            { path: "vehicle", select: "brand model vehicleLicense" }
                        ]
                    }
                ]
            }),
        SOS.countDocuments(filter)
    ])

    return {
        data: items,
        meta: {
            page,
            limit,
            total,
            totalPage: Math.max(1, Math.ceil(total / limit))
        }
    }
}



export const SOSServices = {
    addEmergencyContact,
    sendSosMessage,
    updateSosStatus,
    getAllSos
}