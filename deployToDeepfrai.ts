import {createClient} from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.DEEPFRAI_SUPABASE_URL;
const supabaseServiceKey = process.env.DEEPFRAI_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase URL or Service Key not set in .env file");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ASSETS_PATH = "/assets/thumbnail.png";
const NEW_GAMES_CATEGORY = 6;

interface GameDbFields {
    game_id: string;
    game_name: string;
    game_url: string;
    thumbnail_url: string;
    resolution: [number, number];
    category_id: number;
    description: string | null;
    created_at: string;
}

function formatString(input: string): string {
    return input
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function findGameById(game_id: string) {
    const {data, error} = await supabase
      .from("game")
      .select("id")
      .eq("game_id", game_id)
      .single();

    if (error && error.code !== "PGRST116") {
        console.error(`Error fetching game ${game_id}:`, error.message);
        throw error;
    }

    return data;
}

async function findGameStatsByGameId(game_id: string) {
    const {data, error} = await supabase
      .from("game_stat")
      .select("id, game_id")
      .eq("game_id", game_id)
      .single();

    if (error && error.code !== "PGRST116") {
        console.error(`Error fetching stats for game ${game_id}:`, error.message);
        throw error;
    }

    return data;
}

async function insertGame(game_id: string, data: GameDbFields): Promise<number> {
    const {error, data: insertData} = await supabase
      .from("game")
      .insert({
          game_id: game_id,
          game_name: formatString(data.game_name),
          game_url: data.game_url,
          thumbnail_url: data.thumbnail_url,
          resolution: data.resolution,
          created_at: data.created_at,
          category_id: data.category_id,
          description: data.description,
      })
      .select("id")
      .single();

    if (error) {
        console.error(`Error inserting game ${game_id}:`, error.message);
        throw error;
    }

    if (!insertData) {
        throw new Error("Failed to insert game");
    }

    console.log(`Inserted game: ${game_id}`);
    return insertData.id;
}

async function updateGame(game_id: string, data: GameDbFields): Promise<number> {
    const {error, data: updateData} = await supabase
      .from("game")
      .update({
          game_name: formatString(data.game_name),
          game_url: data.game_url,
          thumbnail_url: data.thumbnail_url,
          resolution: data.resolution,
          category_id: data.category_id,
          description: data.description,
      })
      .eq("game_id", game_id)
      .select("id")
      .single();

    if (error) {
        console.error(`Error updating game ${game_id}:`, error.message);
        throw error;
    }

    if (!updateData) {
        throw new Error("Failed to update game");
    }

    console.log(`Updated game: ${game_id}`);
    return updateData.id;
}

async function updateGameStats(
  gameStatsId: number,
  gameId: string,
  gameFk: number
) {
    const {error} = await supabase
      .from("game_stat")
      .update({game_id: gameId, game_fk: gameFk})
      .eq("id", gameStatsId);

    if (error) {
        console.error(`Error updating game stats for id ${gameStatsId}:`, error.message);
        throw error;
    }

    console.log(`Updated game stats for id ${gameStatsId}`);
}

async function updateCategory(gameFk: number): Promise<void> {
    const {data: highestOrder, error: orderError} = await supabase
      .from("category_games")
      .select("game_order")
      .eq("category_fk", NEW_GAMES_CATEGORY)
      .order("game_order", {ascending: false})
      .limit(1)
      .single();

    if (orderError && orderError.code !== "PGRST116") {
        console.error("Error fetching highest game order:", orderError.message);
        throw orderError;
    }

    const newGameOrder = (highestOrder?.game_order || 0) + 1;

    const {error: insertError} = await supabase
      .from("category_games")
      .insert({
          category_fk: NEW_GAMES_CATEGORY,
          game_fk: gameFk,
          game_order: newGameOrder,
      });

    if (insertError) {
        console.error(`Error inserting into category_games:`, insertError.message);
        throw insertError;
    }

    console.log(`Added game ${gameFk} to category ${NEW_GAMES_CATEGORY} with order ${newGameOrder}`);
}

function generateRandomStats() {
    const plays = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
    const likes = Math.floor(plays * (Math.random() * (0.08 - 0.04) + 0.04));
    const dislikes = Math.floor(plays * Math.random() * 0.05);

    return {plays, likes, dislikes};
}

async function insertGameStats(game_id: string, gameFk: number) {
    const {plays, likes, dislikes} = generateRandomStats();

    const {error} = await supabase
      .from("game_stat")
      .insert({
          game_id,
          game_fk: gameFk,
          plays,
          likes,
          dislikes,
          created_at: new Date().toISOString(),
      });

    if (error) {
        console.error(`Error inserting game stats for ${game_id}:`, error.message);
        throw error;
    }

    console.log(`Inserted game stats for ${game_id}`);
}

async function processGameStats(gameId: string, gameFk: number) {
    const gameStats = await findGameStatsByGameId(gameId);

    if (gameStats) {
        await updateGameStats(gameStats.id, gameId, gameFk);
    } else {
        await insertGameStats(gameId, gameFk);
    }
}

async function processVolterConfig(rawConfig: Record<string, any>): Promise<GameDbFields> {
    const {game_name} = rawConfig;
    if (!game_name) {
        throw new Error("game_name is required in volter.json");
    }

    return {
        game_id: rawConfig.game_id ?? game_name.toLowerCase(),
        game_name: game_name,
        game_url: rawConfig.game_url ?? '',
        thumbnail_url: rawConfig.game_url ? `${rawConfig.game_url}${ASSETS_PATH}` : '',
        resolution: rawConfig.default_resolution ?? [800, 600],
        category_id: NEW_GAMES_CATEGORY,
        description: rawConfig.description ?? null,
        created_at: new Date().toISOString()
    };
}

async function upsertGameManually(gameId: string, data: GameDbFields) {
    const existingGame = await findGameById(gameId);
    const gameFk = existingGame
      ? await updateGame(gameId, data)
      : await insertGame(gameId, data);

    if (!existingGame) {
        await updateCategory(gameFk);
    }

    await processGameStats(gameId, gameFk);
}

async function main() {
    const volterContent = await fs.promises.readFile("volter.json", "utf-8");
    const rawConfig: Record<string, any> = JSON.parse(volterContent);

    const gameData = await processVolterConfig(rawConfig);
    await upsertGameManually(gameData.game_id, gameData);

    console.log("Game and stats have been processed successfully.");
}

main();