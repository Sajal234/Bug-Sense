import { BUG_SEVERITY } from "../types/index.js";

export const calculateSeverity = ({ title, description, environment }) => {
    const text = `${title} ${description}`.toLowerCase();
    const matchedRules = [];

    // CRITICAL takes highest priority
    const criticalKeywords = ["crash", "data loss", "payment failed", "security breach"];
    if (criticalKeywords.some(word => text.includes(word))) {
        matchedRules.push("Critical keyword detected");
        return { suggestedSeverity: BUG_SEVERITY.CRITICAL, matchedRules };
    }

    // Production environment boost
    if (environment === "PRODUCTION") {
        matchedRules.push("Production environment");
        return { suggestedSeverity: BUG_SEVERITY.HIGH, matchedRules };
    }

    // Minor keywords (lowest priority)
    const lowKeywords = ["typo", "ui alignment", "color issue", "css"];
    if (lowKeywords.some(word => text.includes(word))) {
        matchedRules.push("Minor UI keyword detected");
        return { suggestedSeverity: BUG_SEVERITY.LOW, matchedRules };
    }

    // Default
    return { suggestedSeverity: BUG_SEVERITY.MEDIUM, matchedRules };
};
