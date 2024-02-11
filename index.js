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
    (payload) => {
      console.log("New post: ", payload.new.id);
      if (payload.new.is_checked) {
        const channel1 = client.channels.cache.get("1187380052829143121");
        const channel2 = client.channels.cache.get("1205923807257432106");

        if (!channel1 || !channel2) {
          console.error(`Channel with ID ${CHANNEL_ID} not found.`);
          return;
        }

        // Creating an embed
        const embed = new EmbedBuilder()
          .setTitle("New Post!")
          .setColor("#3498db")
          .setDescription(payload.new.description)
          .addFields(
            { name: "StoreId", value: "" + payload.new.store },
            { name: "Price", value: "" + payload.new.price + "Kč" }
          )
          .setImage(payload.new.image)
          .setFooter({
            text: "TurboDeal",
            iconURL:
              "https://wwrhodyufftnwdbafguo.supabase.co/storage/v1/object/public/profile_pics/kauf_logo.png",
          });

        // Sending the embed to the specific channel

        channel1.send({ embeds: [embed] });
        channel2.send({ embeds: [embed] });

        //Send to websocket
        wss.emit("connection", JSON.stringify(payload.new));
      }
    }
  )
  .subscribe();
