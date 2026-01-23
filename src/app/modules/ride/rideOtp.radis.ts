import { redisClient } from "../../config/radis.config";

export const setRideOtp = async (
    rideId: string,
    otp: number,
    expirationTime: number = 30 * 60 //30 minutes
) => {
    const key = `ride:otp:${rideId}`;

    await redisClient.set(key, otp.toString(), {
        expiration: {
            type: "EX",
            value: expirationTime
        }
    })
}

export const getRideOtp = async (rideId: string) => {
    const key = `ride:otp:${rideId}`;
    const otp = redisClient.get(key);
    return otp 
};

export const deleteRideOtp = async (rideId: string) => {
    const key = `ride:otp:${rideId}`;
    await redisClient.del(key);
};
