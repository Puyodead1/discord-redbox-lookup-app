import "dotenv/config";
import fs from "fs";
import path from "path";
import BaseClient from "./lib/BaseClient";
import BaseCommand from "./lib/BaseCommand";
import BaseEvent from "./lib/BaseEvent";

const client = new BaseClient({
    intents: ["GuildMessages", "GuildMessageReactions", "DirectMessages", "DirectMessageReactions"],
});

const eventsPath = path.join(__dirname, "events");
const commandsPath = path.join(__dirname, "commands");
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"));
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

// register events
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event: new <T extends BaseEvent>(client: BaseClient) => T = require(filePath).default;
    const eventInstance = new event(client);
    if (eventInstance.options.once)
        client.once(eventInstance.options.event, (...args) => eventInstance.execute(...args));
    else client.on(eventInstance.options.event, (...args) => eventInstance.execute(...args));
    console.log(`[Event Load] Loaded event ${eventInstance.options.event}!`);
}

// register commands
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command: new <T extends BaseCommand>(client: BaseClient) => T = require(filePath).default;
    const cmdInstance = new command(client);
    client.commands.set(cmdInstance.cmd.name, cmdInstance);
    console.log(`[Command Load] Loaded command ${cmdInstance.cmd.name}!`);
}

client.login(process.env.TOKEN);
