/**
 * /setup #channel HH:MM — Configure daily roundup
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from 'discord.js';
import { loadGuildConfig, saveGuildConfig } from '../roundup/scheduler.js';
import { errorEmbed, EMBED_COLORS, baoziFooter } from '../embeds/helpers.js';
import { EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure daily market roundup for this server')
    .addChannelOption((opt) =>
        opt
            .setName('channel')
            .setDescription('Channel to post daily roundup in')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
    )
    .addStringOption((opt) =>
        opt
            .setName('time')
            .setDescription('Time to post (HH:MM in UTC, e.g., 09:00)')
            .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const channel = interaction.options.getChannel('channel', true);
        const timeStr = interaction.options.getString('time', true).trim();

        // Validate time format
        const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        if (!timeMatch) {
            await interaction.editReply({
                embeds: [errorEmbed('Invalid Time', 'Please use HH:MM format (e.g., 09:00, 14:30). Time is in UTC.')],
            });
            return;
        }

        const hour = parseInt(timeMatch[1], 10);
        const minute = parseInt(timeMatch[2], 10);
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            await interaction.editReply({
                embeds: [errorEmbed('Invalid Time', 'Hour must be 0-23 and minute must be 0-59.')],
            });
            return;
        }

        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.editReply({
                embeds: [errorEmbed('Error', 'This command can only be used in a server.')],
            });
            return;
        }

        // Save config
        const config = loadGuildConfig();
        config[guildId] = {
            channelId: channel.id,
            hour,
            minute,
            enabled: true,
        };
        saveGuildConfig(config);

        const timeFormatted = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        const embed = new EmbedBuilder()
            .setColor(EMBED_COLORS.SUCCESS)
            .setTitle('✅ Daily Roundup Configured')
            .setDescription(
                [
                    `**Channel:** <#${channel.id}>`,
                    `**Time:** ${timeFormatted} UTC`,
                    '',
                    'A daily summary of top markets, new markets, and resolved markets will be posted automatically.',
                ].join('\n')
            )
            .setFooter(baoziFooter())
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (err) {
        console.error('[/setup] Error:', err);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to save configuration. Please try again.')],
        });
    }
}
