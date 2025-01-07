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

interface DiscordResponse {
    data: {
        content?: string;
        components?: any[];
        embeds?: any[];
        files?: any[];
    };
}

export async function DiscordRequest(
    endpoint: string,
    body: any,
    options: {
        isForm?: boolean;
        method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
        requireJson?: boolean;
    } = {}
) {
    const { isForm = false, method = "POST", requireJson = true } = options;
    const url = "https://discord.com/api/v10/" + endpoint;

    try {
        const res = await fetch(url, {
            method,
            headers: {
                Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
                ...(isForm ? {} : { "Content-Type": "application/json" }),
            },
            body: isForm ? body : JSON.stringify(body),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(`Discord API error: ${error.message} (code ${error.code})`);
        }

        return requireJson ? res.json() : res;
    } catch (err) {
        console.error(`Error in Discord request to ${endpoint}:`, err);
        throw err;
    }
}

export async function FollowUpMessage(
    token: string,
    content: string | DiscordResponse,
    options: {
        isForm?: boolean;
        ephemeral?: boolean;
    } = {}
) {
    const { isForm = false, ephemeral = false } = options;
    const endpoint = `webhooks/${process.env.APP_ID}/${token}`;

    if (isForm) {
        const formData = new FormData();
        const payload =
            typeof content === "string"
                ? { content }
                : {
                      ...content.data,
                      ...(ephemeral && { flags: 64 }),
                  };

        formData.append("payload_json", JSON.stringify(payload));

        if (content && typeof content !== "string" && content.data.files) {
            content.data.files.forEach((file: any, index: number) => {
                formData.append(`files[${index}]`, file);
            });
        }

        return DiscordRequest(endpoint, formData, { isForm });
    }

    const payload =
        typeof content === "string"
            ? { content }
            : {
                  ...content.data,
                  ...(ephemeral && { flags: 64 }),
              };

    return DiscordRequest(endpoint, payload, { isForm });
}

export async function EditOriginalResponse(token: string, content: string | DiscordResponse) {
    const endpoint = `webhooks/${process.env.APP_ID}/${token}/messages/@original`;
    const payload = typeof content === "string" ? { content } : content.data;

    return DiscordRequest(endpoint, payload, { method: "PATCH" });
}

export async function DeleteOriginalResponse(token: string) {
    const endpoint = `webhooks/${process.env.APP_ID}/${token}/messages/@original`;
    return DiscordRequest(endpoint, null, { method: "DELETE", requireJson: false });
}

export async function InstallGlobalCommands(appId: string, commands: any[]) {
    const endpoint = `applications/${appId}/commands`;
    return DiscordRequest(endpoint, commands, { method: "PUT" });
}

export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
