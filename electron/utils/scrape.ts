import * as cheerio from "cheerio";
import fetch from "node-fetch";

export const extractTextFromURL = async(url: string): Promise<string> => {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const body = $("body").text();
    const cleanText = body.replace(/\s+/g, " ").trim();

    return cleanText;
}
