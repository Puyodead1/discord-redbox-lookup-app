import "dotenv/config";
import { InstallGlobalCommands } from "./utils";

const SEARCH_COMMAND = {
    name: "search",
    description: "Search the database",
    type: 1, // CHAT_INPUT
    options: [
        {
            name: "store",
            description: "Search for stores",
            type: 2, // SUB_COMMAND_GROUP
            options: [
                {
                    name: "by-id",
                    description: "Search store by ID",
                    type: 1, // SUB_COMMAND
                    options: [
                        {
                            name: "id",
                            description: "Store ID",
                            type: 3, // STRING
                            required: true,
                        },
                    ],
                },
            ],
        },
        {
            name: "product",
            description: "Search for products",
            type: 2, // SUB_COMMAND_GROUP
            options: [
                {
                    name: "by-name",
                    description: "Search product by name",
                    type: 1,
                    options: [
                        {
                            name: "name",
                            description: "Product name",
                            type: 3,
                            required: true,
                        },
                    ],
                },
                {
                    name: "by-id",
                    description: "Search product by ID",
                    type: 1,
                    options: [
                        {
                            name: "id",
                            description: "Product ID",
                            type: 3,
                            required: true,
                        },
                    ],
                },
                {
                    name: "by-barcode",
                    description: "Search product by barcode",
                    type: 1,
                    options: [
                        {
                            name: "barcode",
                            description: "Product barcode",
                            type: 3,
                            required: true,
                        },
                    ],
                },
            ],
        },
    ],
};

const ALL_COMMANDS = [SEARCH_COMMAND];

InstallGlobalCommands(process.env.APP_ID!, ALL_COMMANDS)
    .then(() => console.log("Commands installed"))
    .catch(console.error);
