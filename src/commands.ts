import "dotenv/config";
import { InstallGlobalCommands } from "./utils";

const LOOKUP_COMMAND = {
    name: "lookup",
    type: 1,
    description: "Lookup a store by its ID",
    integration_types: [1, 2],
    contexts: [1, 2, 3],
    options: [
        {
            name: "store_id",
            description: "The store ID to lookup",
            type: 10,
            required: true,
        },
    ],
};

const ALL_COMMANDS = [LOOKUP_COMMAND];

InstallGlobalCommands(process.env.APP_ID!, ALL_COMMANDS)
    .then(() => console.log("Commands installed"))
    .catch(console.error);
