import { startOfMonth, endOfMonth } from "date-fns";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";
import { IsActive } from "../user/user.interface";


const getMonthlyStats = async (month?: number, year?: number) => {


    const now = new Date();
    const m = month !== undefined ? month - 1 : now.getMonth();
    const y = year || now.getFullYear();


    const monthStart = startOfMonth(new Date(y, m))
    const monthEnd = endOfMonth(new Date(y, m));

    const userStats = await User.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
        {
            $addFields: {
                week: {
                    $add: [
                        {
                            $floor: {
                                $divide: [
                                    {
                                        $divide: [
                                            {
                                                $subtract: ["$createdAt", monthStart]
                                            }, 1000 * 60 * 60 * 24]
                                    }, 7
                                ]
                            }
                        },
                        1
                    ]
                }
            }
        },
        { $group: { _id: "$week", users: { $sum: 1 } } }
    ]);

    const driverStats = await Driver.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
        {
            $addFields: {
                week: {
                    $add: [
                        {
                            $floor: {
                                $divide: [
                                    {
                                        $divide: [
                                            {
                                                $subtract: ["$createdAt", monthStart]
                                            },
                                            1000 * 60 * 60 * 24
                                        ]
                                    },
                                    7
                                ]
                            }
                        },
                        1
                    ]
                }
            }
        },
        {
            $group: {
                _id: "$week",
                drivers: { $sum: 1 }
            }
        }
    ]);

    const stats = [
        { week: 'Week 1', users: 0, drivers: 0 },
        { week: 'Week 2', users: 0, drivers: 0 },
        { week: 'Week 3', users: 0, drivers: 0 },
        { week: 'Week 4', users: 0, drivers: 0 },
    ]

    userStats.forEach(u => {
        if (u._id >= 1 && u._id <= 4) stats[u._id - 1].users = u.users
    });

    driverStats.forEach(d => {
        if (d._id >= 1 && d._id <= 4) stats[d._id - 1].drivers = d.drivers
    });

    return { month: m + 1, year: y, stats };
}

const getWeeklyUserStats = async (month?: number, year?: number, status?: IsActive) => {
    const now = new Date();

    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const startDate = startOfMonth(new Date(targetYear, targetMonth - 1))
    const endDate = endOfMonth(new Date(targetYear, targetMonth - 1));

    const userStats = await User.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                },
                ...(status && { isActive: status })
            }
        },
        {
            $project: {
                day: {
                    $dayOfMonth: "$createdAt"
                },
                isActive: 1
            }
        },
        {
            $group: {
                _id: {
                    week: {
                        $ceil: {
                            $divide: ["$day", 7]
                        }
                    },
                    status: "$isActive"
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { "_id.week": 1 }
        }
    ])

    // week default structure
    const stats = [
        { week: "Week 1", active: 0, inactive: 0, blocked: 0 },
        { week: "Week 2", active: 0, inactive: 0, blocked: 0 },
        { week: "Week 3", active: 0, inactive: 0, blocked: 0 },
        { week: "Week 4", active: 0, inactive: 0, blocked: 0 }
    ];

    userStats.forEach(u => {
        const weekIndex = u._id.week - 1;
        if (weekIndex >= 0 && weekIndex < 4) {
            if (u._id.status === IsActive.ACTIVE) stats[weekIndex].active = u.count;
            else if (u._id.status === IsActive.INACTIVE) stats[weekIndex].inactive = u.count;
            else if (u._id.status === IsActive.BLOCKED) stats[weekIndex].blocked = u.count;
        }
    })

    return {
        month: targetMonth,
        year: targetYear,
        status: status || "ALL",
        stats
    };

}

export const statsService = {
    getMonthlyStats,
    getWeeklyUserStats
}