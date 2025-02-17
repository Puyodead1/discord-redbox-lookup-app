# Redbox Utils Discord App

Contains features for looking up a store by id, searching for products by id or name, and barcode lookup

## Running app locally

Configuring the app is covered in detail in the [tutorial](http://discord.com/developers/docs/tutorials/developing-a-user-installable-app).

Before you start, you'll need to install [NodeJS](https://nodejs.org/en/download/) and [create a Discord app](https://discord.com/developers/applications) with the proper configuration:

### Default Install Settings

Click on the **Installation** page in your app's settings and go to the **Default Install Settings** section.

For user install:

-   `applications.commands`

For guild install:

-   `applications.commands`
-   `bot` (with Send Messages enabled)

### Setup project

First clone the project:

```
git clone https://github.com/discord/user-install-example.git
```

Then navigate to its directory and install dependencies:

```
cd discord-redbox-lookup-app
pnpm install
```

### Get app credentials

Fetch the credentials from your app's settings and add them to a `.env` file (see `.env.sample` for an example). You'll need your app ID (`APP_ID`), bot token (`DISCORD_TOKEN`), and public key (`PUBLIC_KEY`).

Fetching credentials is covered in detail in the [tutorial](http://discord.com/developers/docs/tutorials/developing-a-user-installable-app).

> 🔑 Environment variables can be added to the `.env` file in Glitch or when developing locally, and in the Secrets tab in Replit (the lock icon on the left).

### Install slash commands

```
pnpm run register
```

### Run the app

After your credentials are added, go ahead and run the app:

```
pnpm start
```

### Set up interactivity

The project needs a public endpoint where Discord can send requests. To develop and test locally, you can use something like [`ngrok`](https://ngrok.com/) to tunnel HTTP traffic.

Install ngrok if you haven't already, then start listening on port `3000`:

```
ngrok http 3000
```

You should see your connection open:

```
Tunnel Status                 online
Version                       2.0/2.0
Web Interface                 http://127.0.0.1:4040
Forwarding                    http://1234-someurl.ngrok.io -> localhost:3000
Forwarding                    https://1234-someurl.ngrok.io -> localhost:3000

Connections                  ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

Copy the forwarding address that starts with `https`, in this case `https://1234-someurl.ngrok.io`, then go to your [app's settings](https://discord.com/developers/applications).

On the **General Information** tab, there will be an **Interactions Endpoint URL**. Paste your ngrok address there, and append `/interactions` to it (`https://1234-someurl.ngrok.io/interactions` in the example).

Click **Save Changes**, and your app should be ready to run 🚀

## Database File

The database file is too large to be in Git, you can download it from the [rbnextcloud](https://rbnextcloud.mooo.com/s/Ft9ZxWaAP7jxnmL/download?path=%2FData&files=bot_database.7z)
