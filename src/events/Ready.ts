import { Events } from "discord.js";
import BaseClient from "../lib/BaseClient";
import BaseEvent from "../lib/BaseEvent";

export default class extends BaseEvent {
    constructor(public readonly client: BaseClient) {
        super({
            event: Events.ClientReady,
            once: true,
        });
    }

    public async execute(): Promise<void> {
        console.log(`Logged in as ${this.client.user?.tag}`);
    }
}
