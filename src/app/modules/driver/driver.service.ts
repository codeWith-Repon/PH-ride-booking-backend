import { JwtPayload } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { AVAILABILITY_STATUS, DRIVER_STATUS, IDriver } from "./driver.interface";
import { Driver } from "./driver.model";
import { Role } from "../user/user.interface";
import { Vehicle } from "../vehicle/vehicle.model";
import { RIDE_STATUS } from "../ride/ride.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { nestedFilterMapping, nestedSearchMapping } from "./driver.constant";


const createDriver = async (payload: IDriver) => {
    const { user, vehicle } = payload

    const existDriver = await Driver.findOne({ user })


    if (existDriver) {
        throw new AppError(400, "Driver profile already exists.");
    }

    const driverVehicle = await Driver.findOne({ vehicle })

    if (driverVehicle) {
        throw new AppError(400, "This vehicle is already assigned to another driver.")
    }

    const isVehicleExist = await Vehicle.findById(vehicle)

    if (!isVehicleExist) {
        throw new AppError(400, "Vehicle is not exist!!")
    }
    const newDriver = (await (await Driver.create(payload)).populate("user", "name email")).populate("vehicle", "vehicleType brand model images vehicleLicense")

    return newDriver
}

// const changeDriverStatus = async (driverId: string, decodedToken: JwtPayload, payload: IDriver) => {
//     const { role } = decodedToken

//     if (role !== Role.ADMIN && role !== Role.SUPER_ADMIN) {
//         throw new AppError(403, "You are not authorize to change driver status.")
//     }

//     const updatedDriver = await Driver.findOneAndUpdate(
//         { user: driverId },
//         payload,
//         { new: true, runValidators: true }
//     )

//     return updatedDriver

// }


const updateDriver = async (driverId: string, decodedToken: JwtPayload, payload: IDriver) => {

    const existDriver = await Driver.findById(driverId)


    if (!existDriver) {
        throw new AppError(400, "Driver doesn't exists!!")
    }

    if (payload.status !== undefined &&
        decodedToken.role !== Role.ADMIN &&
        decodedToken.role !== Role.SUPER_ADMIN) {
        throw new AppError(400, "You can not authorized to change approve status")
    }

    const updatedDriver = await Driver.findByIdAndUpdate(driverId, payload, { new: true, runValidators: true })

    return updatedDriver
}
const getAllDriver = async (query: Record<string, string>) => {
    const queryBuilder = new QueryBuilder(Driver.find(), query);


    // Note: Use 'await' for filter because it now does DB lookups
    await queryBuilder.filter(nestedFilterMapping);

    // 2. Search (Handles searchTerm=Toyota or searchTerm=John)
    await queryBuilder.search(["licenseNumber", "user.name", "user.email", "vehicle.brand"], nestedSearchMapping);

    queryBuilder
        .sort()
        .paginate()
        .populate("user", "name email")
        .populate("vehicle", "vehicleType brand model images vehicleLicense");

    const [data, meta] = await Promise.all([
        queryBuilder.build(),
        queryBuilder.getMeta()
    ]);

    return { meta, data };
};

const getAllFreeDriver = async () => {
    const freeDrivers = await Driver.aggregate([
        {
            $match: {
                availabilityStatus: AVAILABILITY_STATUS.ONLINE,
                status: DRIVER_STATUS.APPROVED
            }
        },
        {
            $lookup: {
                from: "rides",
                let: { driverId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$driver", "$$driverId"] },
                            rideStatus: { $in: [RIDE_STATUS.ACCEPTED, RIDE_STATUS.PICKED_UP, RIDE_STATUS.IN_TRANSIT] }
                        }
                    }
                ],
                as: "activeRides"
            }
        },
        {
            $match: {
                activeRides: { $size: 0 }
            }
        },
        { $limit: 10 },
        //  user lookup
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        // vehicle lookup 
        {
            $lookup: {
                from: "vehicles",
                localField: "vehicle",
                foreignField: "_id",
                as: "vehicle",
            },
        },
        { $unwind: "$vehicle" },

        {
            $project: {
                _id: 1,
                licenseNumber: 1,
                experience: 1,
                availabilityStatus: 1,
                status: 1,
                "vehicle.vehicleType": 1,
                "vehicle.brand": 1,
                "vehicle.model": 1,
                "vehicle.images": 1,
                "user.name": 1,
                "user.email": 1,
                "user.phone": 1,
                "user.image": 1
            }
        }
    ])

    return freeDrivers
}
const getSingleDriver = async (driverId: string) => {

    const driver = await Driver.findById(driverId).populate("user").populate("vehicle")

    return driver
}

const updateMyLocation = async (
    userId: string,
    coords: { lat: number; lng: number }
) => {
    const driver = await Driver.findOneAndUpdate(
        { user: userId },
        {
            currentLocation: {
                type: "Point",
                coordinates: [coords.lng, coords.lat], // GeoJSON: [lng, lat]
            },
            lastLocationAt: new Date(),
        },
        { new: true, projection: { currentLocation: 1, lastLocationAt: 1 } }
    )

    if (!driver) {
        throw new AppError(404, "Driver profile not found")
    }

    return driver
}

export const driverService = {
    createDriver,
    // changeDriverStatus,
    updateDriver,
    getAllDriver,
    getSingleDriver,
    getAllFreeDriver,
    updateMyLocation
}