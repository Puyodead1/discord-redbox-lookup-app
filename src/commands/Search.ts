import {
    ActionRowData,
    APIActionRowComponent,
    APIMessageActionRowComponent,
    AttachmentBuilder,
    ButtonStyle,
    CacheType,
    ChatInputCommandInteraction,
    CommandInteractionOption,
    ComponentType,
    EmbedBuilder,
    JSONEncodable,
    MessageActionRowComponentBuilder,
    MessageActionRowComponentData,
    SlashCommandBuilder,
} from "discord.js";
import fs from "fs";
import BaseClient from "../lib/BaseClient";
import BaseCommand from "../lib/BaseCommand";

export default class extends BaseCommand {
    gameMissingImage: Buffer<ArrayBufferLike>;
    movieMissingImage: Buffer<ArrayBufferLike>;

    constructor(public readonly client: BaseClient) {
        super(
            new SlashCommandBuilder()
                .setName("search")
                .setDescription("Search for a product or store")
                .addSubcommandGroup((group) =>
                    group
                        .setName("product")
                        .setDescription("Search for a product")
                        // by-name
                        .addSubcommand((option) =>
                            option
                                .addStringOption((option) =>
                                    option.setName("name").setDescription("Product Name").setRequired(true)
                                )
                                .setName("by-name")
                                .setDescription("Search by product name")
                        )
                        // by-id
                        .addSubcommand((option) =>
                            option
                                .addIntegerOption((option) =>
                                    option.setName("id").setDescription("Product ID").setRequired(true)
                                )
                                .setName("by-id")
                                .setDescription("Search by product ID")
                        )
                        // by-barcode
                        .addSubcommand((option) =>
                            option
                                .addStringOption((option) =>
                                    option.setName("barcode").setDescription("Barcode").setRequired(true)
                                )
                                .setName("by-barcode")
                                .setDescription("Search for product by barcode")
                        )
                )
                .addSubcommandGroup((group) =>
                    group
                        .setName("store")
                        .setDescription("Search for a store")
                        // by-id
                        .addSubcommand((option) =>
                            option
                                .addIntegerOption((option) =>
                                    option.setName("id").setDescription("Store ID").setRequired(true)
                                )
                                .setName("by-id")
                                .setDescription("Search for a store by ID")
                        )
                )
        );

        this.gameMissingImage = fs.readFileSync("./assets/game-missing-image.png");
        this.movieMissingImage = fs.readFileSync("./assets/game-missing-image.png");
    }

    public parseDateString = (date: string) => date.toString().replace(/(\d{4})(\d{2})(\d{2})(\d{6})/, "$2/$3/$1");
    public parseDateStringToYear = (date: string) => date.toString().substring(0, 4);
    public parseDateToObject = (date: string) => {
        const year = parseInt(date.slice(0, 4), 10);
        const month = parseInt(date.slice(4, 6), 10) - 1;
        const day = parseInt(date.slice(6, 8), 10);
        const hours = parseInt(date.slice(8, 10), 10);
        const minutes = parseInt(date.slice(10, 12), 10);
        const seconds = parseInt(date.slice(12, 14), 10);

        return new Date(year, month, day, hours, minutes, seconds);
    };

    public handleStoreLookup = async (interaction: ChatInputCommandInteraction, client: BaseClient) => {
        const storeId = interaction.options.getNumber("id", true);
        const store = client.db.prepare("SELECT * FROM Store WHERE Id = ?").get(storeId) as any;

        // If the store doesn't exist, respond with an error message
        if (!store) {
            // await res.send({
            //     type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            //     data: {
            //         content: `Store with ID ${storeId} not found`,
            //     },
            // });

            console.log("Store not found, sending follow up");
            await interaction.followUp({
                content: `Store with ID ${storeId} not found`,
            });
            return;
        }

        if (store.VendorId) {
            console.log("Store has a vendor id, looking up vendor");
            const vendor = client.db.prepare("SELECT * FROM Vendor WHERE Id = ?").get(store.VendorId.toString()) as any;
            if (vendor) {
                console.log(vendor);
                store.Vendor = vendor.Name;
            }
        }

        if (store.BannerId) {
            console.log("Store has a banner id, looking up banner");
            const banner = client.db.prepare("SELECT * FROM Banner WHERE Id = ?").get(store.BannerId.toString()) as any;
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
            const openDate = this.parseDateString(store.OpenDate);
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
        await interaction.followUp({
            embeds: [embed],
        });
        return;
    };

    public searchItems = (query: string, client: BaseClient) => {
        const exactMatchStmt = client.db.prepare("SELECT * FROM ProductCatalog WHERE LongName = ?");
        const partialMatchStmt = client.db.prepare("SELECT * FROM ProductCatalog WHERE LongName LIKE ?");

        const exactMatches = exactMatchStmt.all(query);

        if (exactMatches.length > 0) {
            return exactMatches;
        }

        const partialMatches = partialMatchStmt.all(`%${query}%`);

        return partialMatches;
    };

    public assembleProductEmbed = (product: any, client: BaseClient) => {
        const description = product.Description || "N/A";
        let imageFileName = product.ImageFile;
        // const genresIds = product.GenreIds ? JSON.parse(product.GenreIds) : [];
        // const genres = genresIds.map((id: number) => {
        //     const genre = client.db.prepare("SELECT * FROM Genres WHERE Id = ?").get(id) as any;
        //     if (genre) return genre.Name;
        //     return "N/A";
        // });
        const productTypeId = product.ProductTypeId;
        const productType = client.db.prepare("SELECT * FROM ProductType WHERE Id = ?").get(productTypeId) as any;
        const raitingId = product.RatingId;
        const rating = client.db.prepare("SELECT * FROM ProductRating WHERE Id = ?").get(raitingId) as any;

        let desc = description.split("\\r")[0].substring(0, 4096);
        if (description.length > 4096) {
            // remove the last word
            desc = desc.substring(0, desc.lastIndexOf(" "));
            // add ellipsis
            desc += "...";
        }

        let imageBuffer;

        if (imageFileName) {
            const img = client.db.prepare("SELECT Data FROM Cache WHERE Name = ?").get(imageFileName) as any;
            if (img) imageBuffer = img.Data;
            else {
                console.warn(`Missing poster for ${product.LongName}: ${imageFileName}`);
            }
        }

        if (!imageFileName || !imageBuffer) {
            if (productTypeId === 1) {
                imageBuffer = this.movieMissingImage;
                imageFileName = "movie-missing-image.png";
            } else {
                imageBuffer = this.gameMissingImage;
                imageFileName = "game-missing-image.png";
            }
        }

        const fields = [
            { name: "Product Type", value: productType?.ProductTypeName || "Unknown", inline: true },
            { name: "Rating", value: rating?.Name || "Unknown", inline: true },
            { name: "Runtime", value: product?.RunningTime || "Unknown", inline: true },
            {
                name: "Release Date",
                value: product.ReleaseDate ? this.parseDateString(product.ReleaseDate) : "N/A",
                inline: true,
            },
            {
                name: "National Street Date",
                value: product.NationalStreetDate ? this.parseDateString(product.NationalStreetDate) : "N/A",
                inline: true,
            },
            {
                name: "Merchandise Date",
                value: product.MerchandiseDate ? this.parseDateString(product.MerchandiseDate) : "N/A",
                inline: true,
            },
        ];

        // add DNR date if present
        if (product.DoNotRentDate) {
            fields.push({
                name: "DNR Date",
                value: product.DoNotRentDate ? this.parseDateString(product.DoNotRentDate) : "N/A",
                inline: true,
            });
        }

        // rest of normal fields
        fields.push(
            ...[
                {
                    name: "Studio",
                    value: product?.Studio ?? "N/A",
                    inline: true,
                },
            ]
        );

        const embed = new EmbedBuilder()
            .setTitle(`${product.LongName} - ${product.Id}${product.DoNotRentDate ? " ⚠" : ""}`)
            .setDescription(desc)
            .setColor(0xc6162c)
            .setFields(fields)
            .setImage(`attachment://${imageFileName}`);

        return {
            title: product.LongName,
            embed,
            image: imageBuffer ? new AttachmentBuilder(imageBuffer, { name: imageFileName }) : null,
        };
    };

    public handleProductLookup = async (
        subcommandName: string,
        interaction: ChatInputCommandInteraction,
        client: BaseClient
    ) => {
        let option: CommandInteractionOption<CacheType>;
        let productMatches;
        let searchType;
        let query;

        if (subcommandName === "by-name") {
            option = interaction.options.get("name", true);
            query = option.value as string;
        } else if (subcommandName === "by-id") {
            option = interaction.options.get("id", true);
            query = option.value as number;
        } else if (subcommandName === "by-barcode") {
            option = interaction.options.get("barcode", true);
            query = option.value as string;
        } else return;

        if (option.name === "id") {
            searchType = "ID";
            const a = client.db.prepare("SELECT * FROM ProductCatalog WHERE Id = ?").get(query) as any;
            productMatches = [a];
        } else if (option.name === "name") {
            searchType = "Name";
            productMatches = client.db
                .prepare("SELECT * FROM ProductCatalog WHERE LongName LIKE '%' || ? || '%'")
                .all(`%${query}%`);

            // productMatches = searchItems(productName, db);
        } else if (option.name === "barcode") {
            searchType = "Barcode";
            const pid = client.db.prepare("SELECT * FROM Barcodes WHERE Barcode = ?").get(query) as any;
            if (!pid)
                return await interaction.followUp({
                    content: `Barcode '${query}' not found`,
                });
            const a = client.db.prepare("SELECT * FROM ProductCatalog WHERE Id = ?").get(pid.ProductId) as any;
            productMatches = [a];
        }

        if (!productMatches || !productMatches.length) {
            return await interaction.followUp({
                content: `Product with ${searchType} '${query}' not found`,
            });
        }

        if (productMatches.length > 1) {
            productMatches = productMatches.sort((a, b) => {
                if (a.ReleaseDate && b.ReleaseDate) {
                    const aDate = this.parseDateToObject(a.ReleaseDate);
                    const bDate = this.parseDateToObject(b.ReleaseDate);
                    return bDate.getTime() - aDate.getTime();
                }
                return 0;
            });

            const embeds: { title: string; embed: EmbedBuilder; image: AttachmentBuilder | null }[] = [];

            for (const product of productMatches) {
                const embed = this.assembleProductEmbed(product, client);
                embeds.push(embed);
            }

            let currentPage = 0;

            const createComponents = () => {
                const results: (
                    | JSONEncodable<APIActionRowComponent<APIMessageActionRowComponent>>
                    | ActionRowData<MessageActionRowComponentData | MessageActionRowComponentBuilder>
                    | APIActionRowComponent<APIMessageActionRowComponent>
                )[] = [];

                if (productMatches.length <= 25)
                    results.push({
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.SelectMenu,
                                customId: "select",
                                placeholder: "Select Result",
                                options: embeds.slice(0, 24).map((e, index) => ({
                                    label: e.title,
                                    value: index.toString(),
                                })),
                            },
                        ],
                    });

                results.push({
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Primary,
                            customId: "prev",
                            label: "Previous",
                            disabled: currentPage === 0,
                        },
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Primary,
                            customId: "next",
                            label: "Next",
                            disabled: currentPage === embeds.length - 1,
                        },
                    ],
                });

                return results;
            };

            const msgEmbed = embeds[currentPage];
            msgEmbed.embed.setFooter({
                text: `Page: ${currentPage + 1}/${embeds.length} - Created by Puyodead1`,
            });
            const message = await interaction.followUp({
                embeds: [msgEmbed.embed],
                files: msgEmbed.image ? [msgEmbed.image] : [],
                components: createComponents(),
                fetchReply: true,
            });

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000,
            });

            collector.on("collect", async (i) => {
                if (i.isButton()) {
                    switch (i.customId) {
                        case "prev":
                            if (currentPage > 0) currentPage--;
                            break;
                        case "next":
                            if (currentPage < embeds.length - 1) currentPage++;
                            break;
                    }
                } else if (i.isStringSelectMenu()) {
                    currentPage = parseInt(i.values[0]);
                }

                const msgEmbed = embeds[currentPage];
                msgEmbed.embed.setFooter({
                    text: `Page: ${currentPage + 1}/${embeds.length} - Created by Puyodead1`,
                });
                await i.update({
                    embeds: [msgEmbed.embed],
                    files: msgEmbed.image ? [msgEmbed.image] : [],
                    components: createComponents(),
                });
            });

            collector.on("end", () => {
                interaction.editReply({
                    components: [],
                });
            });
        } else {
            const product = productMatches[0];

            const embed = this.assembleProductEmbed(product, client);

            return await interaction.followUp({
                embeds: [embed.embed],
                files: embed.image ? [embed.image] : [],
            });
        }
    };

    public async execute(interaction: ChatInputCommandInteraction): Promise<any> {
        await interaction.deferReply();

        const commandName = interaction.options.getSubcommandGroup();
        const subcommandName = interaction.options.getSubcommand();

        // if (!interaction.options || !interaction.options) {
        //     return await interaction.followUp({
        //         content: "No options provided",
        //     });
        // }
        if (commandName === "store") {
            if (subcommandName === "by-id") {
                return await this.handleStoreLookup(interaction, this.client);
            } else {
                return await interaction.followUp({
                    content: "wtf, report this.. store search bad sub-option",
                });
            }
        }

        if (commandName === "product") {
            if (["by-name", "by-id", "by-barcode"].includes(subcommandName)) {
                return await this.handleProductLookup(subcommandName, interaction, this.client);
            } else {
                return await interaction.followUp({
                    content: "wtf, report this.. product search bad sub-option",
                });
            }
        }

        return await interaction.followUp({
            content: "Unknown Command",
        });
    }
}
