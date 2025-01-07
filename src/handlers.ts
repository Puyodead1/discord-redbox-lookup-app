import { Database } from "better-sqlite3";
import { FollowUpMessage } from "./utils";

export const parseDateString = (date: string) => date.toString().replace(/(\d{4})(\d{2})(\d{2})(\d{6})/, "$2/$3/$1");
export const parseDateStringToYear = (date: string) => date.toString().substring(0, 4);

export const handleStoreLookup = async (data: any, token: string, db: Database) => {
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
            data: { content: `Store with ID ${storeId} not found` },
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
        const openDate = parseDateString(store.OpenDate);
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
    await FollowUpMessage(token, {
        data: {
            content: `Store with ID ${storeId} found`,
            embeds: [embed],
        },
    });
    return;
};

function searchItems(query: string, db: Database) {
    const exactMatchStmt = db.prepare("SELECT * FROM ProductCatalog WHERE LongName = ?");
    const partialMatchStmt = db.prepare("SELECT * FROM ProductCatalog WHERE LongName LIKE '%' || ? || '%'");

    const exactMatches = exactMatchStmt.all(query);

    if (exactMatches.length > 0) {
        return exactMatches;
    }

    const partialMatches = partialMatchStmt.all(query);

    return partialMatches;
}

export const handleProductLookup = async (data: any, token: string, db: Database) => {
    const option = data.options[0];
    const optionName = option.name;
    let productMatches;
    let searchType;
    let query;

    if (optionName === "id") {
        searchType = "ID";
        const productId = option.value.toString();
        query = productId;
        const a = db.prepare("SELECT * FROM ProductCatalog WHERE Id = ?").get(productId) as any;
        productMatches = [a];
    } else if (optionName === "name") {
        searchType = "Name";
        const productName = option.value.toString();
        query = productName;
        productMatches = db
            .prepare("SELECT * FROM ProductCatalog WHERE LongName LIKE '%' || ? || '%'")
            .all(`%${productName}%`);

        // productMatches = searchItems(productName, db);
    } else if (optionName === "barcode") {
        searchType = "Barcode";
        const barcode = option.value.toString();
        query = barcode;
        const pid = db.prepare("SELECT * FROM Barcodes WHERE Barcode = ?").get(barcode) as any;
        if (!pid)
            return await FollowUpMessage(token, {
                data: { content: `Barcode '${barcode}' not found` },
            });
        const a = db.prepare("SELECT * FROM ProductCatalog WHERE Id = ?").get(pid.ProductId) as any;
        productMatches = [a];
    }

    if (!productMatches || !productMatches.length) {
        await FollowUpMessage(token, {
            data: { content: `Product with ${searchType} '${query}' not found` },
        });
        return;
    }

    if (productMatches.length > 1) {
        if (productMatches.length > 15) {
            await FollowUpMessage(token, {
                data: { content: `Too many results (${productMatches.length}) for ${searchType} '${query}'` },
            });
            return;
        }
        const embed = {
            title: `Multiple Products found for ${searchType} '${query}'`,
            description: `Use the ID to select a specific product`,
            color: 0xc6162c,
            fields: productMatches.map((result: any) => {
                const releaseDate = result.ReleaseDate ? parseDateString(result.ReleaseDate) : null;
                const releaseDateStr = releaseDate ? `\nReleased: ${releaseDate}` : "";
                return {
                    name: `ID: ${result.Id}`,
                    value: `${result.LongName}${releaseDateStr}`,
                };
            }),
        };

        await FollowUpMessage(token, {
            data: { embeds: [embed] },
        });
        return;
    }

    const product = productMatches[0];

    const description = product.Description || "N/A";
    const imageFileName = product.ImageFile;
    const genresIds = product.GenreIds ? JSON.parse(product.GenreIds) : [];
    const genres = genresIds.map((id: number) => {
        const genre = db.prepare("SELECT * FROM Genres WHERE Id = ?").get(id) as any;
        if (genre) return genre.Name;
        return "N/A";
    });
    const productTypeId = product.ProductTypeId;
    const productType = db.prepare("SELECT * FROM ProductType WHERE Id = ?").get(productTypeId) as any;
    const raitingId = product.RatingId;
    const rating = db.prepare("SELECT * FROM ProductRating WHERE Id = ?").get(raitingId) as any;

    let desc = description.split("\\r")[0].substring(0, 4096);
    if (description.length > 4096) {
        // remove the last word
        desc = desc.substring(0, desc.lastIndexOf(" "));
        // add ellipsis
        desc += "...";
    }

    let imageBuffer;

    if (imageFileName) {
        const img = db.prepare("SELECT Data FROM Cache WHERE Name = ?").get(imageFileName) as any;
        if (img) imageBuffer = img.Data;
    }

    const fields = [
        { name: "Product Type", value: productType?.ProductTypeName ?? "Unknown", inline: true },
        { name: "Rating", value: rating?.Name ?? "Unknown", inline: true },
        { name: "Runtime", value: product?.RunningTime ?? "Unknown", inline: true },
        {
            name: "Release Date",
            value: product.ReleaseDate ? parseDateString(product.ReleaseDate) : "N/A",
            inline: true,
        },
        {
            name: "National Street Date",
            value: product.NationalStreetDate ? parseDateString(product.NationalStreetDate) : "N/A",
            inline: true,
        },
        {
            name: "Merchandise Date",
            value: product.MerchandiseDate ? parseDateString(product.MerchandiseDate) : "N/A",
            inline: true,
        },
        {
            name: "Genres",
            value: genres.length ? genres.join(", ") : "N/A",
            inline: true,
        },
        {
            name: "Stars",
            value: product.Stars,
            inline: true,
        },
        {
            name: "Studio",
            value: product?.Studio ?? "N/A",
            inline: true,
        },
    ];

    const embed = {
        title: product.LongName,
        description: desc,
        color: 0xc6162c,
        fields,
        image: {
            url: `attachment://${imageFileName}`,
        },
        footer: {
            text: "Created by Puyodead1",
        },
    };

    const payloadData = {
        embeds: [embed],
    };

    const formdata = new FormData();
    formdata.append("payload_json", JSON.stringify(payloadData));

    const file = new File([imageBuffer], imageFileName);
    formdata.set("file", file);

    // await FollowUpMessage(token, formdata, true);
    await FollowUpMessage(
        token,
        {
            data: {
                embeds: [embed],
                files: [file],
            },
        },
        { isForm: true }
    );
    return;
};

export const handleSearch = async (data: any, token: string, db: Database) => {
    if (!data.options || !data.options.length) {
        await FollowUpMessage(token, {
            data: { content: "No options provided" },
        });
        return;
    }
    const option = data.options[0];

    if (option.name === "store") {
        const subOption = option.options[0];
        if (subOption.name === "by-id") {
            await handleStoreLookup(subOption, token, db);
            return;
        } else {
            await FollowUpMessage(token, {
                data: { content: "wtf, report this.. store search bad sub-option" },
            });
            return;
        }
    }

    if (option.name === "product") {
        const subOption = option.options[0];
        if (["by-name", "by-id", "by-barcode"].includes(subOption.name)) {
            await handleProductLookup(subOption, token, db);
            return;
        } else {
            await FollowUpMessage(token, {
                data: { content: "wtf, report this.. product search bad sub-option" },
            });
            return;
        }
    }

    // await FollowUpMessage(token, {
    //     type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    //     data: { content: "Unknown Command" },
    // });
    console.log(JSON.stringify(data, null, 4));
    await FollowUpMessage(token, "Unknown Command");
    return;
};
