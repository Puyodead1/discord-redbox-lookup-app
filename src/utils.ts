import { verifyKey } from "discord-interactions";
import "dotenv/config";
import { Request, Response } from "express";

export function VerifyDiscordRequest(clientKey: string) {
    return function (req: Request, res: Response, buf: Buffer) {
        const signature = req.get("X-Signature-Ed25519") as string;
        const timestamp = req.get("X-Signature-Timestamp") as string;
        console.log(signature, timestamp, clientKey);

        const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
        if (!isValidRequest) {
            res.status(401).send("Bad request signature");
            throw new Error("Bad request signature");
        }
    };
}

export async function DiscordRequest(endpoint: string, options: Record<string, any> = {}) {
    // append endpoint to root API URL
    const url = "https://discord.com/api/v10/" + endpoint;
    // Stringify payloads
    if (options.body) options.body = JSON.stringify(options.body);
    const res = await fetch(url, {
        headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            "Content-Type": "application/json; charset=UTF-8",
            "User-Agent": "DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)",
        },
        ...options,
    });
    // throw API errors
    if (!res.ok) {
        const data = await res.json();
        console.log(res.status);
        throw new Error(JSON.stringify(data));
    }
    // return original response
    return res;
}

export async function InstallGlobalCommands(appId: string, commands: any[]) {
    // API endpoint to overwrite global commands
    const endpoint = `applications/${appId}/commands`;

    try {
        // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
        await DiscordRequest(endpoint, { method: "PUT", body: commands });
    } catch (err) {
        console.error(err);
    }
}

export function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// create follow up message
export async function FollowUpMessage(token: string, data: Record<string, any>) {
    const endpoint = `webhooks/${process.env.APP_ID}/${token}`;
    try {
        await DiscordRequest(endpoint, { method: "POST", body: data });
    } catch (err) {
        console.error(err);
    }
}
