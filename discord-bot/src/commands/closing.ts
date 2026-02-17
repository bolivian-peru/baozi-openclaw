/**
 * /closing — Markets closing within 24h
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { listMarkets, listRaceMarkets } from '../mcp/client.js';
import { buildMarketListEmbed } from '../embeds/market.js';
import { buildRaceListEmbed } from '../embeds/race.js';
import { errorEmbed } from '../embeds/helpers.js';

export const data = new SlashCommandBuilder()
    .setName('closing')
    .setDescription('Markets closing within 24 hours');

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
        const now = Date.now();
        const in24h = now + 24 * 60 * 60 * 1000;

        // Boolean markets closing soon
        const boolMarkets = await listMarkets('Active');
        const closingBool = boolMarkets
            .filter((m) => {
                const closeTime = new Date(m.closingTime).getTime();
                return closeTime > now && closeTime <= in24h;
            })
            .sort((a, b) => new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime());

        // Race markets closing soon
        const raceMarkets = await listRaceMarkets('Active');
        const closingRace = raceMarkets
            .filter((m) => {
                const closeTime = new Date(m.closingTime).getTime();
                return closeTime > now && closeTime <= in24h;
            })
            .sort((a, b) => new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime());

        const embeds = [];

        if (closingBool.length > 0) {
            const { embed } = buildMarketListEmbed(closingBool, '⏰ Markets Closing Soon (24h)');
            embeds.push(embed);
        }

        if (closingRace.length > 0) {
            embeds.push(buildRaceListEmbed(closingRace, '🏇 Race Markets Closing Soon'));
        }

        if (embeds.length === 0) {
            embeds.push(errorEmbed('No Markets Closing', 'No markets are closing within the next 24 hours.'));
        }

        await interaction.editReply({ embeds });
    } catch (err) {
        console.error('[/closing] Error:', err);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to fetch market data. Please try again later.')],
        });
    }
}
