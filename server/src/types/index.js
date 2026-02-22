

// Enums 
export const BUG_SEVERITY = {
    UNCONFIRMED : "UNCONFIRMED",
    LOW : "LOW",
    MEDIUM : "MEDIUM",
    HIGH : "HIGH",
    CRITICAL : "CRITICAL"
}

export const BUG_STATUS = {
    PENDING_REVIEW: "PENDING_REVIEW",
    OPEN : "OPEN",
    ASSIGNED : "ASSIGNED",
    REVIEW_REQUESTED : "REVIEW_REQUESTED",
    AWAITING_VERIFICATION : "AWAITING_VERIFICATION",
    RESOLVED : "RESOLVED",
    REOPENED : "REOPENED",
    REJECTED : "REJECTED"
}

export const BUG_ACTIONS = {
    BUG_CREATED: "Bug created",
    REOPEN_REQUESTED: "Reopen requested",
    REOPEN_APPROVED: "Reopen request approved",
    FIX_SUBMITTED: "Fix submitted",
    BUG_ASSIGNED: "Bug assigned",
    BUG_RESOLVED: "Bug resolved",
    BUG_REJECTED: "Bug rejected",
    BUG_REOPENED: "Bug reopened",
    SEVERITY_UPDATED: "Severity updated",
    BUG_APPROVED: "Bug approved",
    BUG_REASSIGNED: "Bug reassigned",
    STATUS_UPDATED: "Status updated",
}

export const BUG_ENVIRONMENT = {
    PRODUCTION: "PRODUCTION",
    STAGING: "STAGING",
    DEVELOPMENT: "DEVELOPMENT",
}

export const BUG_TYPE = {
    UI : "UI",
    FUNCTIONAL : "FUNCTIONAL",
    BACKEND : "BACKEND",
    DATABASE : "DATABASE",
    API : "API",
    SECURITY : "SECURITY",
    INFRA : "INFRA",
    OTHER : "OTHER",
}

