import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const aliasSchema = v.object({
    id: v.string(),
    name: v.string(),
    eliminated: v.boolean(),
});

export default defineSchema({
    games: defineTable({
        code: v.string(),
        aliases: v.array(aliasSchema),
        hostId: v.string(),
        round: v.number(),
        state: v.union(
            v.literal("lobby"),
            v.literal("active"),
            v.literal("round_over"),
            v.literal("inactive"),
        ),
        // Round timer, in ms since epoch
        startedAt: v.optional(v.number()),
        endedAt: v.optional(v.number()),
    }).index("by_code", ["code"]),
});
