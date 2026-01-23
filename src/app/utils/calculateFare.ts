const calculateFare = (distance: number) => {
    const ratePerKm = 10
    return distance * ratePerKm
}

export default calculateFare