# Wheel of Blame

## Introduction

This is a Slack bot that assigns blame.

You trigger it by saying "not my fault" in a channel which the app is a member of, and it will let you know whose fault it actually is (the "blamee").

![animation of the Wheel of Blame in action](https://i.imgur.com/BqjmYGH.gif)

It does this by randomly picking a member of the channel, anyone except for the person who said "not my fault" (unless there's nobody else there), because, well, it wasn't their fault.

If you want to use this app to find out who you should punish for a mistake, please go away. The purpose of this bot is just some [silly little fun](https://twitter.com/Nick_Craver/status/1277316476131856387) that originated in Stack Overflow's internal chat (which was not originally a Slack instance).

## Installation

This is a quickly hacked-together [single-workspace app](https://api.slack.com/start/distributing#single_workspace_apps). That means there's no simple "Add to Slack" button somewhere; you'll have to host the app yourself somewhere and manually add it to your Slack instance.

### Prerequisites

You need

- a Slack instance where you have permission to install apps, and
- an environment to run Node apps. It doesn't have to be available on the public internet; the app does not expose an HTTP endpoint, instead it uses [socket mode](https://api.slack.com/apis/connections/socket). This means you can easily run it on your personal machine (assuming you leave it running).

### Setting up the code

Clone the repository, and run `yarn` or `npm install` to get the dependencies.

Use `yarn start` or `npm run start` to start it up, but right now that's not going to work because first you need to set up a Slack app and get a few tokens that will then be passed to the code as environment variables. These three variables are

- `WOB_TOKEN` (the bot token for actually doing things as a bot)
- `WOB_SIGNING_SECRET` (the Slack signing secret to validate messages that come via the API)
- `WOB_APP_TOKEN` (the app token that allows the app to run in socket mode)

You'll get all three of these once you've created a Slack app in your workspace, which we'll do next.

### Creating a Slack app and adding it to your workspace

Make sure you're signed in to Slack and go to the [Your Apps page](https://api.slack.com/apps). Click **Create New App** and in the popup click **From an app manifest**.

Next, pick the workspace where you want to install the Wheel of Blame.

Then, in the "Enter app manifest below" step, copy & paste the contents of one of the two app manifest files in the `slack-assets` folder.

- `app-manifest.conservative.yml` only allows the bot to participate in _public_ channels (where it's been invited) and in 1:1 DMs (which only makes sense for testing; you can DM the bot "not my fault" to check if it's up and running).
- `app-manifest.exhaustive.yml` also allows the bot to work in _private_ channels (where it's been invited) and in group DMs (that include it).

Click **Next** and **Create**.

Congratualations, you have an app! Click **Install to Workspace** and then **Allow** to enable it.

On the **Basic Information** page, scroll down to **Display Information** and give your bot an Avatar (**App icon**). If you've worked at Stack Overflow in the past, the file `slack-assets/wheel.png` may give you that nostalgic feeling, but pick whatever image you want.

Next, in the **App-Level Tokens** section, click **Generate Token and Scopes**.

For "token name", pick anything you want -- "websocket" might be a good choice, because this token is what's going to allow us to use socket mode.

Click **Add Scope** and chose **connections:write**. Click **Generate**.

The token you see now is one of the three secrets that you need to run the code. You can copy & paste it right here or click **Done** for now and get back to it later in the next section.

Finally, on the **App Home** page, check the box **Allow users to send Slash commands and messages from the messages tab**, which will allow you to DM the bot to check that it's up and running.

### Starting up the actual app code

As mentioned above, the app code needs three secrets passed to it via environment variables. Whether you have an elaborate CI/CD environment where these secrets are stored, or you just use a command line -- it's up to you.

In the latter case, it looks like this:

```
WOB_TOKEN=xoxb-XXX WOB_SIGNING_SECRET=XXX WOB_APP_TOKEN=xapp-XXX yarn start
```

and all that's left now is to tell you where to find those secrets.

- `WOB_TOKEN` is on the **Install App** page where it's called **Bot User OAuth Token**.
- `WOB_SIGNING_SECRET` is on the **Basic Information** page in the **App Credentials** section. It's called **Signing Secret**. Click "Show" to see and copy it.
- `WOB_APP_TOKEN` is on the **Basic Information** page as well. Under **App-Level Tokens** you'll find the token we created for the websocket connection. Click the token name and you'll see the value.

With that, you can start the code as shown above! If all is well, it'll say `running as 12345` (where the number is the process id) and then just sit there and wait for messages.

### Adding the bot to channels

First, you might want to send a direct message to the bot, to check that it's running. Say "not my fault" (it doesn't respond to anything else). If it replies with "Of course it is your fault.", all is well!

The Wheel of Blame is only active in channels to which it has been invited. Mention it `@Wheel of Blame` and confirm that you want to add/invite it. From this point on, whenever someone says "not my fault" in that channel, it'll respond.

## License

The code is distributed under the MIT license. See `LICENSE.txt`.
