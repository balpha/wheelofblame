import { App, SayArguments, SayFn } from "@slack/bolt";
import { Profile, User } from "@slack/web-api/dist/response/UsersInfoResponse";

const app = new App({
  token: process.env.WOB_TOKEN,
  signingSecret: process.env.WOB_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.WOB_APP_TOKEN,
});

app.message(
  /^\s*not my fault\s*$/i,
  async ({ message: notMyFaultMessage, say }) => {
    console.log(notMyFaultMessage);
    if (notMyFaultMessage.subtype) {
      return;
    }

    const channelMembers =
      (
        await app.client.conversations.members({
          channel: notMyFaultMessage.channel,
        })
      ).members ?? [];

    let blamee: User | undefined = undefined;
    const remainingCandidates = [...channelMembers];
    while (remainingCandidates.length) {
      const index = (Math.random() * remainingCandidates.length) | 0;
      const candidateId = remainingCandidates.splice(index, 1)[0];
      if (candidateId === notMyFaultMessage.user) {
        // don't blame the user who said "not my fault"
        continue;
      }
      const candidateInfo = await app.client.users.info({
        user: candidateId,
      });
      if (candidateInfo.user && isLegalBlamee(candidateInfo.user)) {
        blamee = candidateInfo.user;
        break;
      }
    }

    console.log(blamee);

    if (blamee && blamee.profile) {
      const postEditableMessage = editableMessagePoster(say);

      const updateBlameMessage = await postEditableMessage({
        // If "not my fault" was said in a thread, respond in that thread.
        thread_ts: notMyFaultMessage.thread_ts,
        blocks: [
          {
            type: "section",
            text: { type: "plain_text", text: ":thinking_face:" },
          },
        ],
        text: ":thinking_face:",
      });

      if (!updateBlameMessage) {
        return;
      }

      await wait(1500);
      updateBlameMessage(":grin:");
      await wait(1500);
      updateBlameMessage(":point_left:");
      await wait(1500);
      updateBlameMessage(":point_right:");
      await wait(1500);
      updateBlameMessage(":point_left:");
      await wait(1500);
      updateBlameMessage(":bulb:");
      await wait(1500);
      updateBlameMessage(buildFinalBlameMessage(blamee.profile));
    } else {
      await say(`Of course it is your fault.`);
    }
  }
);

(async () => {
  await app.start();
  console.log(`running as ${process.pid}`);
})();

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isLegalBlamee(user: User) {
  return !(user.is_bot || user.deleted);
}

// Takes the original say function and returns a modified version
// that itself, instead of a "posted message" response, returns
// a say-like function that modifies the original message.
function editableMessagePoster(say: SayFn) {
  return async (...sayArgs: Parameters<SayFn>) => {
    // post the initial message ...
    const postedMessage = await say(...sayArgs);
    const postedMessageTs = postedMessage.ts;
    const postedMessageChannel = postedMessage.channel;
    if (!postedMessage.ok || !postedMessageTs || !postedMessageChannel) {
      console.error("message posting failed", postedMessage);
      return null;
    }

    // ... and return a function that updates it
    const updateMessage: SayFn = async (sayArg) => {
      if (typeof sayArg === "string") {
        return app.client.chat.update({
          channel: postedMessageChannel,
          ts: postedMessageTs,
          blocks: [
            { type: "section", text: { type: "plain_text", text: sayArg } },
          ],
          text: sayArg,
        });
      } else {
        return app.client.chat.update({
          ...sayArg,
          channel: postedMessageChannel,
          ts: postedMessageTs,
        });
      }
    };
    return updateMessage;
  };
}

function buildFinalBlameMessage(blameeProfile: Profile): SayArguments {
  const name = blameeProfile.display_name || blameeProfile.real_name || "";
  const possessive = /s$/.test(name) ? `${name}'` : `${name}'s`;

  if (blameeProfile.image_48) {
    return {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `It's ${possessive} fault!`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "plain_text",
              emoji: true,
              text: ":point_right::point_right:",
            },
            {
              type: "image",
              image_url: blameeProfile.image_48,
              alt_text: "avatar",
            },
            {
              type: "plain_text",
              text: " ",
            },
            {
              type: "plain_text",
              emoji: true,
              text: ":point_left::point_left:",
            },
          ],
        },
      ],
      text: `It's ${possessive} fault!`,
    };
  } else {
    return {
      text: `*It's ${possessive} fault!*`,
      mrkdwn: true,
    };
  }
}
