export function isPaidSubscription(status?: string | null) {
    if (!status) return false;

    const normalizedStatus = status.trim().toUpperCase();
    return normalizedStatus === "ACTIVE" || normalizedStatus === "SUBSCRIPTION";
}
