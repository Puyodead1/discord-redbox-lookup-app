import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import BaseClient from "../lib/BaseClient";
import BaseCommand from "../lib/BaseCommand";

export default class extends BaseCommand {
    constructor(public readonly client: BaseClient) {
        super(new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"));
    }
    public async execute(interaction: ChatInputCommandInteraction): Promise<any> {
        await interaction.reply("Pong!");
    }
}
