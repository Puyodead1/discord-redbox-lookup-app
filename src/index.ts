import Database from "better-sqlite3";
import { InteractionResponseType, InteractionType } from "discord-interactions";
import "dotenv/config";
import express from "express";
import { handleSearch, handleStoreLookup } from "./handlers";
import { VerifyDiscordRequest } from "./utils";

const db = new Database("data.db", {
    fileMustExist: true,
    readonly: true,
    verbose: console.log,
});
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY!) }));

app.post("/interactions", async (req, res) => {
    const { type, data, token } = req.body;

    if (type === InteractionType.PING) {
        res.send({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
        // defer
        await res.send({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });

        const { name } = data;

        // old store lookup command
        if (name === "lookup") {
            await handleStoreLookup(data, token, db);
            return;
        } else if (name === "search") {
            await handleSearch(data, token, db);
            return;
        }
    }
});

app.listen(PORT, () => {
    console.log("Listening on port", PORT);
});
