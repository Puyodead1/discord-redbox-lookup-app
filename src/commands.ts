import { BaseClient, REST, RESTPutAPIApplicationCommandsResult, Routes } from "discord.js";
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import BaseCommand from "./lib/BaseCommand";

if (!process.env.DISCORD_TOKEN) {
    console.error("No token provided");
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error("No client id provided");
    process.exit(1);
}
const guildId = process.env.GUILD_ID;

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

const commands = [];
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command: new <T extends BaseCommand>(client: BaseClient) => T = require(filePath).default;
    const cmdInstance = new command(null as any);

    commands.push(cmdInstance.cmd.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN as string);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        let data: RESTPutAPIApplicationCommandsResult;
        if (guildId) {
            data = (await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID as string, process.env.GUILD_ID as string),
                { body: commands }
            )) as RESTPutAPIApplicationCommandsResult;
        } else {
            data = (await rest.put(Routes.applicationCommands(process.env.CLIENT_ID as string), {
                body: commands,
            })) as RESTPutAPIApplicationCommandsResult;
        }

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
