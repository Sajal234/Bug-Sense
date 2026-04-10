import mongoose from "mongoose";

const { Schema } = mongoose;

const sessionSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
        },
        tokenHash: {
            type: String,
            required: [true, "Token hash is required"],
            select: false,
        },
        userAgent: {
            type: String,
            trim: true,
            maxlength: [512, "User agent cannot exceed 512 characters"],
            default: "",
        },
        ipAddress: {
            type: String,
            trim: true,
            maxlength: [128, "IP address cannot exceed 128 characters"],
            default: "",
        },
        lastUsedAt: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        revokedAt: {
            type: Date,
            default: null,
        }
    },
    {
        timestamps: true,
    }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ user: 1, revokedAt: 1, lastUsedAt: -1 });

export const Session = mongoose.model("Session", sessionSchema);
