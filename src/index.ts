import Database from "better-sqlite3";
import { InteractionResponseType, InteractionType } from "discord-interactions";
import "dotenv/config";
import express from "express";
import { FollowUpMessage, VerifyDiscordRequest } from "./utils";

const db = new Database("stores.db", {
    fileMustExist: true,
    readonly: true,
    verbose: console.log,
});
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY!) }));

app.post("/interactions", async (req, res) => {
    const { type, data, token } = req.body;

    if (type === InteractionType.PING) {
        res.send({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
        // defer
        await res.send({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });

        const { name } = data;

        if (name === "lookup") {
            const storeId = data.options[0].value.toString();
            const store = db.prepare("SELECT * FROM Store WHERE Id = ?").get(storeId) as any;
            console.log(store);

            // If the store doesn't exist, respond with an error message
            if (!store) {
                // await res.send({
                //     type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                //     data: {
                //         content: `Store with ID ${storeId} not found`,
                //     },
                // });

                console.log("Store not found, sending follow up");
                // follow up
                await FollowUpMessage(token, {
                    content: `Store with ID ${storeId} not found`,
                });
                return;
            }

            if (store.VendorId) {
                console.log("Store has a vendor id, looking up vendor");
                const vendor = db.prepare("SELECT * FROM Vendor WHERE Id = ?").get(store.VendorId.toString()) as any;
                if (vendor) {
                    console.log(vendor);
                    store.Vendor = vendor.Name;
                }
            }

            if (store.BannerId) {
                console.log("Store has a banner id, looking up banner");
                const banner = db.prepare("SELECT * FROM Banner WHERE Id = ?").get(store.BannerId.toString()) as any;
                if (banner) {
                    console.log(banner);
                    store.Banner = banner.Name;
                }
            }

            let fields: { name: string; value: any; inline?: boolean }[] = [];

            if (store.Address2)
                fields.push({
                    name: "Address 2",
                    value: store.Address2,
                });

            fields = fields.concat([
                {
                    name: "City",
                    value: store.City || "N/A",
                    inline: true,
                },
                {
                    name: "State",
                    value: store.State || "N/A",
                    inline: true,
                },
                {
                    name: "County",
                    value: store.County || "N/A",
                    inline: true,
                },
                {
                    name: "Zip",
                    value: store.Zip || "N/A",
                    inline: true,
                },
            ]);

            if (store.Vendor)
                fields.push({
                    name: "Vendor",
                    value: store.Vendor,
                    inline: true,
                });

            if (store.Banner && !store.Vendor)
                fields.push({
                    name: "Banner",
                    value: store.Banner,
                    inline: true,
                });

            if (store.OpenDate) {
                // open date is yyyyddmm with 6 digits, format as mm/dd/yyyy
                const openDate = store.OpenDate.toString().replace(/(\d{4})(\d{2})(\d{2})(\d{6})/, "$2/$3/$1");
                fields.push({
                    name: "Open Date",
                    value: openDate,
                    inline: true,
                });
            }

            fields.push({
                name: "Address",
                value: store.Address,
            });

            const embed = {
                type: "rich",
                title: `Store ${storeId}`,
                color: 0xc6162c,
                fields,
                footer: {
                    text: "Created by Puyodead1",
                },
            };

            let payloadData = {
                embeds: [embed],
            };

            console.log("Sending follow up", JSON.stringify(payloadData, null, 4));
            await FollowUpMessage(token, payloadData);
            return;
        }
    }
});

app.listen(PORT, () => {
    console.log("Listening on port", PORT);
});
