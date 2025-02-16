import Sqlite, { Database } from "better-sqlite3";
import { Client, ClientOptions } from "discord.js";
import BaseCommand from "./BaseCommand";

export interface Config {
    ownerIds?: string[];
    databasePath?: string;
    prefix?: string;
}

const defaultConfig: Config = {
    ownerIds: [],
};

export interface CustomClientOptions extends ClientOptions {
    config?: Config;
}

export default class BaseClient extends Client {
    public readonly commands: Map<string, BaseCommand>;
    public readonly config: Config;
    public readonly db: Database;

    constructor(options: CustomClientOptions) {
        super(options);
        this.config = { ...defaultConfig, ...options.config };
        this.commands = new Map();
        this.db = new Sqlite("data.db", {
            fileMustExist: true,
            readonly: true,
            verbose: console.log,
        });

        for (const e of this.eventNames()) {
            this.on(e, (...args) => {
                console.log(`Event ${e as any} emitted with args: ${args}`);
            });
        }
    }
}
