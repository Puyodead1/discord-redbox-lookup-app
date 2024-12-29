import "dotenv/config";
import { InstallGlobalCommands } from "./utils";

const STORE_LOOKUP_OLD = {
    name: "lookup",
    type: 1,
    description: "Lookup a store by its ID",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
        {
            name: "store_id",
            description: "The store ID to lookup",
            type: 10,
            required: true,
        },
    ],
};

const SEARCH_COMMAND = {
    name: "search",
    type: 1,
    description: "Search for a store or product",
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
        {
            name: "store_id",
            description: "The store ID to search for",
            type: 10,
            required: false,
        },
        {
            name: "product_id",
            description: "The product ID to search for",
            type: 10,
            required: false,
        },
        {
            name: "barcode",
            description: "The barcode to search for",
            type: 10,
            required: false,
        },
        {
            name: "product_name",
            description: "The product name to search for",
            type: 3,
            required: false,
        },
    ],
};

const ALL_COMMANDS = [STORE_LOOKUP_OLD, SEARCH_COMMAND];

InstallGlobalCommands(process.env.APP_ID!, ALL_COMMANDS)
    .then(() => console.log("Commands installed"))
    .catch(console.error);
