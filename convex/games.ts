import { v } from "convex/values";
import { nanoid } from "nanoid";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

export const createGame = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return;

        const code = nanoid(6).toUpperCase();
        await ctx.db.insert("games", {
            code,
            aliases: [],
            hostId: user.subject,
            round: 1,
            state: "lobby",
        });

        return code;
    },
});

export const getGame = query({
    args: {
        code: v.string(),
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query("games")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .first();
    },
});

export const updateGameState = mutation({
    args: {
        code: v.string(),
        state: v.union(
            v.literal("lobby"),
            v.literal("active"),
            v.literal("round_over"),
            v.literal("inactive"),
        ),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return;
        const game = await ctx.db
            .query("games")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .first();
        if (!game) return;

        if (game.hostId !== user.subject) return;

        await ctx.db.patch(game._id, {
            state: args.state,
            ...(args.state === "active" && { startedAt: Date.now(), endedAt: undefined }),
        });

        return game;
    },
});

export const newRound = mutation({
    args: {
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return;
        const game = await ctx.db
            .query("games")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .first();
        if (!game) return;

        if (game.hostId !== user.subject) return;

        await ctx.db.patch(game._id, {
            round: game.round + 1,
            aliases: [],
            state: "lobby",
            startedAt: undefined,
            endedAt: undefined,
        });

        return game;
    },
});

export const checkForWinner = internalMutation({
    args: {
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db
            .query("games")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .first();
        if (!game) return;

        if (game.aliases.filter((a) => !a.eliminated).length === 1) {
            await ctx.db.patch(game._id, {
                state: "round_over",
                endedAt: Date.now(),
            });
        }

        return game;
    },
});

export const addAlias = mutation({
    args: {
        code: v.string(),
        alias: v.string(),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db
            .query("games")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .first();
        if (!game) return;

        const newAlias = {
            id: nanoid(6),
            name: args.alias,
            eliminated: false,
        };
        await ctx.db.patch(game._id, {
            aliases: [...game.aliases, newAlias],
        });

        return newAlias;
    },
});

export const toggleAliasEliminated = mutation({
    args: {
        code: v.string(),
        aliasId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return;
        const game = await ctx.db
            .query("games")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .first();
        if (!game) return;

        if (game.hostId !== user.subject) return;

        const alias = game.aliases.find((a) => a.id === args.aliasId);
        if (!alias) return;

        await ctx.db.patch(game._id, {
            aliases: game.aliases.map((a) =>
                a.id === args.aliasId ? { ...a, eliminated: !a.eliminated } : a,
            ),
        });

        await ctx.scheduler.runAfter(0, internal.games.checkForWinner, {
            code: args.code,
        });

        return alias;
    },
});
