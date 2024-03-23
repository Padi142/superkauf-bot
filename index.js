const { createClient } = require("@supabase/supabase-js");
const { EmbedBuilder } = require("discord.js");
const { WebSocketServer } = require("ws");
const dotenv = require("dotenv");
const { Client, Events, GatewayIntentBits } = require("discord.js");

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

//Websocket server
const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", function connection(ws) {
  console.log("Client connected!");

  ws.on("message", function message(data) {
    const decodedData = data.toString("utf8");

    console.log("Ws message: %s", decodedData);
    ws.send(JSON.stringify(decodedData));
  });
});

supabase
  .channel("room1")
  .on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "posts" },
    async (payload) => {
      console.log("Detected change post_id: ", payload.new.id);
      if (!payload.old.is_checked && payload.new.is_checked) {
        const channel1 = client.channels.cache.get("1187380052829143121");
        const channel2 = client.channels.cache.get("1205923807257432106");

        if (!channel1 || !channel2) {
          console.error(`Channel with ID ${CHANNEL_ID} not found.`);
          return;
        }

        // Creating an embed
        const embed = new EmbedBuilder()
          .setColor("#715df2")
          .setDescription(payload.new.description)
          .addFields({
            name: "Price",
            value: "" + payload.new.price + "Kč",
            inline: true,
          })
          .setImage(payload.new.image)
          .setAuthor({
            name: "SuperKauf",
            url: "https://superkauf.krejzac.cz",
            iconURL: "https://storage.googleapis.com/superkauf/logos/logo1.png",
          });
        // Get store data
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select()
          .eq("id", payload.new.store)
          .limit(1);

        if (storeError) {
          console.error();
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select()
          .eq("id", payload.new.author)
          .limit(1);

        if (userError) {
          console.error();
        }

        // Add store info into embed
        if (storeData.length > 0) {
          embed.addFields({
            name: "Store",
            value: storeData[0]?.name,
            inline: true,
          });
        }

        // Add user info into embed
        if (userData.length > 0) {
          embed.setFooter({
            text: userData[0]?.username,
            iconURL: userData[0]?.profile_picture,
          });
        }

        // Sending the embed to the specific channel

        channel1.send({ embeds: [embed] });
        channel2.send({ embeds: [embed] });

        //Send to websocket
        wss.broadcast(
          JSON.stringify({
            post: payload.new,
            user: userData[0],
            store: storeData[0],
          })
        );

        console.log("New post! :" + payload.new.id);
      }
    }
  )
  .subscribe();

supabase
  .channel("room1")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "reports" },
    async (payload) => {
      console.log("Detected reported post: ", payload.new.id);
      if (!payload.old.is_checked && payload.new.is_checked) {
        const channel1 = client.channels.cache.get("1187380052829143121");

        if (!channel1) {
          console.error(`Channel with ID ${CHANNEL_ID} not found.`);
          return;
        }

        // Creating an embed
        const embed = new EmbedBuilder()
          .setColor("#FF0000")
          .setDescription(payload.new.description)
          .setTitle("⚠️ Report on post: " + payload.new.post_id)
          .setImage(payload.new.image)
          .setAuthor({
            name: "SuperKauf",
            url: "https://superkauf.krejzac.cz",
            iconURL: "https://storage.googleapis.com/superkauf/logos/logo1.png",
          });

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select()
          .eq("id", payload.new.author)
          .limit(1);

        if (userError) {
          console.error();
        }
        // Add user info into embed
        if (userData.length > 0) {
          embed.setFooter({
            text: userData[0]?.username + " - " + userData[0]?.id,
            iconURL: userData[0]?.profile_picture,
          });
        }

        // Sending the embed to the specific channel

        channel1.send({ embeds: [embed] });

        console.log("New report! :" + payload.new.id);
      }
    }
  )
  .subscribe();

wss.broadcast = function broadcast(msg) {
  wss.clients.forEach(function each(client) {
    client.send(msg);
  });
};
