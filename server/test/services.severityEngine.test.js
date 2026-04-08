import test from "node:test";
import assert from "node:assert/strict";

import { calculateSeverity } from "../src/services/severityEngine.js";
import { BUG_SEVERITY } from "../src/types/index.js";

test("calculateSeverity returns CRITICAL for critical keywords", () => {
    const result = calculateSeverity({
        title: "Production crash on checkout",
        description: "Users hit data loss during payment flow",
        environment: "PRODUCTION"
    });

    assert.equal(result.suggestedSeverity, BUG_SEVERITY.CRITICAL);
});

test("calculateSeverity returns HIGH for production issues without critical keywords", () => {
    const result = calculateSeverity({
        title: "Dashboard loads slowly",
        description: "Needs investigation",
        environment: "PRODUCTION"
    });

    assert.equal(result.suggestedSeverity, BUG_SEVERITY.HIGH);
});

test("calculateSeverity returns LOW for minor UI issues outside production", () => {
    const result = calculateSeverity({
        title: "CSS typo in navbar",
        description: "There is a color issue on mobile",
        environment: "DEVELOPMENT"
    });

    assert.equal(result.suggestedSeverity, BUG_SEVERITY.LOW);
});

test("calculateSeverity returns MEDIUM by default", () => {
    const result = calculateSeverity({
        title: "Profile refresh inconsistency",
        description: "Data appears stale until a second reload",
        environment: "STAGING"
    });

    assert.equal(result.suggestedSeverity, BUG_SEVERITY.MEDIUM);
});
