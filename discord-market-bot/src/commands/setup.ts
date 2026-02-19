/**
 * /setup <channel> <time> — Configure daily roundup channel and time
 */
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { getScheduler } from '../scheduler.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure daily market roundup for a channel (Admin only)')
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Channel for daily roundup posts')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('time')
      .setDescription('Time for daily post (HH:MM in UTC, e.g. 09:00)')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const channel = interaction.options.getChannel('channel', true);
    const timeStr = interaction.options.getString('time') || '09:00';

    // Validate time format
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      await interaction.editReply('❌ Invalid time format. Use HH:MM (e.g. 09:00)');
      return;
    }

    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      await interaction.editReply('❌ Invalid time. Hours: 0-23, Minutes: 0-59');
      return;
    }

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply('❌ This command can only be used in a server.');
      return;
    }

    const scheduler = getScheduler();
    scheduler.setGuildConfig(guildId, channel.id, hour, minute);

    await interaction.editReply(
      `✅ Daily roundup configured!\n` +
      `📢 Channel: <#${channel.id}>\n` +
      `🕐 Time: ${timeStr} UTC\n\n` +
      `The bot will post a daily market summary at the configured time.`
    );
  } catch (error) {
    console.error('Error in /setup:', error);
    await interaction.editReply('❌ Failed to configure roundup. Please try again.');
  }
}
