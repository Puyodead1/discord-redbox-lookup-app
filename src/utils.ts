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

export async function DiscordRequest(endpoint: string, body: any, isForm = false, method = "POST") {
    const url = "https://discord.com/api/v10/" + endpoint;

    const additionalHeaders = isForm
        ? undefined
        : {
              "Content-Type": "application/json",
          };
    const res = await fetch(url, {
        headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            ...additionalHeaders,
        },
        method: method,
        body: isForm ? body : JSON.stringify(body),
    });

    if (!res.ok) {
        const data = await res.json();
        console.error("Response Error:", data);
        throw new Error(`Discord API error: ${data.message} (code ${data.code})`);
    }

    return res.json();
}

export async function InstallGlobalCommands(appId: string, commands: any[]) {
    // API endpoint to overwrite global commands
    const endpoint = `applications/${appId}/commands`;

    try {
        // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
        await DiscordRequest(endpoint, commands, false, "PUT");
    } catch (err) {
        console.error(err);
    }
}

export function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function FollowUpMessage(token: string, data: any, isForm = false) {
    const endpoint = `webhooks/${process.env.APP_ID}/${token}`;
    try {
        await DiscordRequest(endpoint, data, isForm, "POST");
    } catch (err) {
        console.error("Error in FollowUpMessage:", err);
    }
}
