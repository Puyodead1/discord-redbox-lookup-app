import { Database } from "better-sqlite3";
import { File, FormData } from "formdata-node";
import { FollowUpMessage } from "./utils";

export const parseDateString = (date: string) => date.toString().replace(/(\d{4})(\d{2})(\d{2})(\d{6})/, "$2/$3/$1");

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
    await FollowUpMessage(token, payloadData);
    return;
};

export const handleProductLookup = async (data: any, token: string, db: Database) => {
    const option = data.options[0];
    const optionName = option.name;
    let product;
    let searchType;
    let query;

    if (optionName === "product_id") {
        searchType = "ID";
        const productId = option.value.toString();
        query = productId;
        product = db.prepare("SELECT * FROM ProductCatalog WHERE Id = ?").get(productId) as any;
    } else if (optionName === "product_name") {
        searchType = "Name";
        const productName = option.value.toString();
        query = productName;
        product = db.prepare("SELECT * FROM ProductCatalog WHERE LongName LIKE ?").get(`%${productName}%`) as any;
    }

    if (!product) {
        await FollowUpMessage(token, {
            content: `Product with ${searchType} '${query}' not found`,
        });
        return;
    }

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

    await FollowUpMessage(token, formdata, true);
    return;
};

export const handleSearch = async (data: any, token: string, db: Database) => {
    if (!data.options.length) {
        await FollowUpMessage(token, {
            content: "No options provided",
        });
        return;
    }
    const option = data.options[0];

    if (option.name === "store_id") {
        await handleStoreLookup(data, token, db);
        return;
    }

    if (option.name === "product_id" || option.name === "product_name") {
        await handleProductLookup(data, token, db);
        return;
    }

    // if (option.name === "barcode") {
    //     await handleBarcodeLookup(data, token, db);
    //     return;
    // }

    await FollowUpMessage(token, {
        content: "Unknown Command",
    });
    return;
};
