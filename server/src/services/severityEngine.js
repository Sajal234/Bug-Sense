import { BUG_SEVERITY } from "../types/index.js";

export const calculateSeverity = ({ title, description, environment }) => {
    const text = `${title} ${description}`.toLowerCase();

    let suggestedSeverity = BUG_SEVERITY.LOW;
    const matchedRules = [];

    // Critical keywords
    const criticalKeywords = ["crash", "data loss", "payment failed", "security breach"];
    if (criticalKeywords.some(word => text.includes(word))) {
        suggestedSeverity = BUG_SEVERITY.CRITICAL;
        matchedRules.push("Critical keyword detected");
    }

    // Production environment boost
    if (environment === "PRODUCTION" && suggestedSeverity !== BUG_SEVERITY.CRITICAL) {
        suggestedSeverity = BUG_SEVERITY.HIGH;
        matchedRules.push("Production environment");
    }

    // Minor keywords
    const lowKeywords = ["typo", "ui alignment", "color issue", "css"];
    if (lowKeywords.some(word => text.includes(word))) {
        suggestedSeverity = BUG_SEVERITY.LOW;
        matchedRules.push("Minor UI keyword detected");
    }

    return {
        suggestedSeverity,
        matchedRules
    };
};