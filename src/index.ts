import {
  App,
  ImageElement,
  PlainTextElement,
  SayArguments,
  SayFn,
} from "@slack/bolt";
import { Profile, User } from "@slack/web-api/dist/response/UsersInfoResponse";

const app = new App({
  token: process.env.WOB_TOKEN,
  signingSecret: process.env.WOB_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.WOB_APP_TOKEN,
});

const recentlyHandledMessageIds: string[] = [];

app.message(
  /^\s*not my fault\s*$/i,
  async ({ message: notMyFaultMessage, say }) => {
    console.log(notMyFaultMessage);
    if (notMyFaultMessage.subtype) {
      return;
    }

    // in case of reconnecting, the client will sometime receive the same message twice
    if (recentlyHandledMessageIds.includes(notMyFaultMessage.ts)) {
      console.log(`ignoring duplicate message ${notMyFaultMessage.ts}`);
      return;
    }

    recentlyHandledMessageIds.unshift(notMyFaultMessage.ts);
    recentlyHandledMessageIds.splice(20, 1);

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

    if (blamee && hasProfile(blamee)) {
      const postEditableMessage = editableMessagePoster(say);

      const updateBlameMessagePromise = postEditableMessage({
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

      const updateBlameMessage = await takeAtLeast(
        1500,
        updateBlameMessagePromise
      );

      if (!updateBlameMessage) {
        return;
      }

      await takeAtLeast(1500, updateBlameMessage(":grin:"));
      await takeAtLeast(1500, updateBlameMessage(":point_left:"));
      await takeAtLeast(1500, updateBlameMessage(":point_right:"));
      await takeAtLeast(1500, updateBlameMessage(":point_left:"));
      await takeAtLeast(1500, updateBlameMessage(":bulb:"));
      await takeAtLeast(
        2500,
        updateBlameMessage(buildFinalBlameMessage(blamee, "drumroll"))
      );
      updateBlameMessage(buildFinalBlameMessage(blamee, "reveal"));
    } else {
      await say(`Of course it is your fault.`);
    }
  }
);

(async () => {
  await app.start();
  console.log(`running as ${process.pid}`);
})();

/** Resolves to the same result as the passed-in promise, but guarantees to take
 * at least the given number of milliseconds before resolving.
 */
function takeAtLeast<T>(ms: number, promise: Promise<T>): Promise<T> {
  const timePromise = new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
  return Promise.all([promise, timePromise]).then(([result, _]) => result);
}

function isLegalBlamee(user: User) {
  return !(user.is_bot || user.deleted);
}

function hasProfile(user: User): user is { profile: Profile } {
  return !!user.profile;
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

function buildFinalBlameMessage(
  blamee: User & { profile: Profile },
  phase: "drumroll" | "reveal"
): SayArguments {
  const blameeProfile = blamee.profile;
  const name = blameeProfile.display_name || blameeProfile.real_name || "";
  const mention = `<@${blamee.id}>`;
  const possessiveMention = /s$/.test(name) ? `${mention}'` : `${mention}'s`;
  const text =
    phase === "drumroll"
      ? "*It's … :drum_with_drumsticks:*"
      : `*It's ${possessiveMention} fault!*`;

  if (blameeProfile.image_48) {
    const blameeBlock: PlainTextElement | ImageElement =
      phase === "drumroll"
        ? {
            type: "plain_text",
            emoji: true,
            text: ":question:",
          }
        : {
            type: "image",
            image_url: blameeProfile.image_48,
            alt_text: "avatar",
          };

    return {
      blocks: [
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text,
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "plain_text",
              emoji: true,
              text: ":point_right::point_right:",
            },
            blameeBlock,
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
      text,
    };
  } else {
    return {
      text: `*${text}*`,
      mrkdwn: true,
    };
  }
}
